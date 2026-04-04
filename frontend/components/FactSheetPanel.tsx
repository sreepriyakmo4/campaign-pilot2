"use client";
import type { FactSheet } from "@/lib/types";

interface Props { factSheet: FactSheet; }

function Section({ title, items, accent = "#C9A84C" }: { title: string; items: string[]; accent?: string }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="text-[9px] tracking-[0.25em] uppercase mb-2.5 flex items-center gap-2" style={{ color: accent + "60" }}>
        <div className="h-px flex-1" style={{ background: accent + "20" }} />
        {title}
        <div className="h-px flex-1" style={{ background: accent + "20" }} />
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-[#9A9080]">
            <span className="mt-1.5 flex-shrink-0 w-1 h-1 rounded-full" style={{ background: accent + "50" }} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function FactSheetPanel({ factSheet: fs }: Props) {
  return (
    <div className="space-y-6">
      {/* Header */}
      {(fs.product_name || fs.value_proposition) && (
        <div className="border border-[#1a1a1a] p-5">
          {fs.product_name && (
            <div className="mb-3">
              <div className="text-[9px] tracking-[0.25em] uppercase text-[#4A4540] mb-1">Product</div>
              <h2 className="text-xl font-bold text-[#F5F0E8]" style={{fontFamily:"'Playfair Display',serif"}}>{fs.product_name}</h2>
            </div>
          )}
          {fs.value_proposition && (
            <div>
              <div className="text-[9px] tracking-[0.25em] uppercase text-[#4A4540] mb-1">Value Proposition</div>
              <p className="text-sm text-[#C9A84C]/80 italic leading-relaxed">"{fs.value_proposition}"</p>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      {fs.source_summary && (
        <div className="bg-[#0a0a0a] border border-[#141414] p-4">
          <div className="text-[9px] tracking-[0.25em] uppercase text-[#4A4540] mb-2">Source Summary</div>
          <p className="text-xs text-[#9A9080] leading-relaxed">{fs.source_summary}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Section title="Target Audience"  items={fs.target_audience}  accent="#7A9E9A" />
        <Section title="Core Features"    items={fs.core_features}    accent="#C9A84C" />
        <Section title="Technical Specs"  items={fs.technical_specs}  accent="#9A9E7A" />
        <Section title="Key Messages"     items={fs.key_messages}     accent="#9A7E9A" />
      </div>

      {fs.ambiguous_statements?.length > 0 && (
        <div className="border border-[#4a3a1a] bg-[#1a1505] p-4">
          <div className="text-[9px] tracking-[0.25em] uppercase text-[#8A6A2A] mb-2">⚠ Flagged Ambiguities</div>
          <ul className="space-y-1">
            {fs.ambiguous_statements.map((s, i) => (
              <li key={i} className="text-xs text-[#8A6A2A]/70">{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
