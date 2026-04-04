"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [status, router]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    await signIn("google", { callbackUrl: "/" });
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-5 h-5 border border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background ornaments */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-1/3 bg-gradient-to-b from-transparent via-[#C9A84C]/20 to-transparent" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-1/3 bg-gradient-to-t from-transparent via-[#C9A84C]/20 to-transparent" />
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-px w-1/3 bg-gradient-to-r from-transparent via-[#C9A84C]/20 to-transparent" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 h-px w-1/3 bg-gradient-to-l from-transparent via-[#C9A84C]/20 to-transparent" />
        {/* Corner diamonds */}
        {["top-8 left-8", "top-8 right-8", "bottom-8 left-8", "bottom-8 right-8"].map((pos, i) => (
          <div key={i} className={`absolute ${pos} w-2 h-2 rotate-45 border border-[#C9A84C]/20`} />
        ))}
        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#C9A84C]/3 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm animate-fade-up">
        {/* Logo mark */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 border border-[#C9A84C]/40 rotate-45 flex items-center justify-center mb-6 relative">
            <div className="w-8 h-8 border border-[#C9A84C]/20 rotate-0 absolute" />
            <span className="text-[#C9A84C] text-lg font-display rotate-[-45deg] font-bold">CP</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-[#F5F0E8] tracking-tight mb-1">
            CampaignPilot
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-px w-8 bg-[#C9A84C]/40" />
            <span className="text-[10px] tracking-[0.25em] uppercase text-[#C9A84C]/70">
              AI Content Studio
            </span>
            <div className="h-px w-8 bg-[#C9A84C]/40" />
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#0e0e0e] border border-[#242424] p-8 relative">
          {/* Corner accents */}
          {["-top-px -left-px", "-top-px -right-px", "-bottom-px -left-px", "-bottom-px -right-px"].map((pos, i) => (
            <div key={i} className={`absolute ${pos} w-4 h-4 border-[#C9A84C]/50 ${
              i === 0 ? "border-t border-l" : i === 1 ? "border-t border-r" : i === 2 ? "border-b border-l" : "border-b border-r"
            }`} />
          ))}

          <div className="text-center mb-8">
            <p className="text-[#9A9080] text-sm leading-relaxed">
              Sign in to access your autonomous<br />marketing content factory.
            </p>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-5 bg-[#141414] border border-[#2a2520] hover:border-[#C9A84C]/40 text-[#F5F0E8] text-sm font-medium transition-all duration-300 hover:bg-[#1a1a14] group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#C9A84C]/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            {loading ? (
              <div className="w-4 h-4 border border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span className="relative">{loading ? "Signing in…" : "Continue with Google"}</span>
          </button>

          <div className="mt-6 pt-6 border-t border-[#1a1a1a] text-center">
            <p className="text-xs text-[#4A4540]">
              Your campaigns are stored locally on your device.
              <br />No data is sent to our servers.
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          {[
            { icon: "◈", label: "3 AI Agents" },
            { icon: "◇", label: "Multi-Channel" },
            { icon: "◉", label: "Fact-Checked" },
          ].map((f) => (
            <div key={f.label} className="flex flex-col items-center gap-1.5">
              <span className="text-[#C9A84C]/50 text-lg">{f.icon}</span>
              <span className="text-[10px] tracking-widest uppercase text-[#4A4540]">{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
