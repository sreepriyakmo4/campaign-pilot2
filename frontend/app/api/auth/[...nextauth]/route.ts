/**
 * NextAuth route — updated to upsert the user into MongoDB on every Google login.
 * The user's database ID (dbUserId) is stored in the session so every page
 * can use it to query the correct campaigns.
 */

import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Calls the FastAPI backend to upsert the user in MongoDB.
 * Returns the user's database _id as a string.
 */
async function upsertUserInDB(user: {
  id: string;          // Google's sub (unique ID)
  name?: string | null;
  email?: string | null;
  image?: string | null;
}): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/users/upsert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        googleId: user.id,
        name: user.name ?? "Unknown",
        email: user.email ?? "",
        image: user.image ?? null,
        provider: "google",
      }),
    });

    if (!res.ok) {
      console.error("[NextAuth] upsert user failed:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    return data.id as string;   // MongoDB _id
  } catch (err) {
    console.error("[NextAuth] upsert user error:", err);
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  pages: {
    signIn: "/login",
  },

  callbacks: {
    /**
     * Called after a successful sign-in.
     * We upsert the user in MongoDB and attach their DB id to the JWT token.
     */
    async jwt({ token, user, account }) {
      // `user` and `account` are only present on the *first* sign-in
      if (account && user) {
        const dbUserId = await upsertUserInDB({
          id: token.sub!,         // Google's unique user ID
          name: user.name,
          email: user.email,
          image: user.image,
        });
        token.dbUserId = dbUserId;
      }
      return token;
    },

    /**
     * Expose dbUserId on the session so client components can read it via
     * useSession() as session.user.dbUserId
     */
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).dbUserId = token.dbUserId ?? null;
        (session.user as any).googleId = token.sub ?? null;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };