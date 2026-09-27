import { pctParts, signParts, type Tone } from "../format";

const toneCls: Record<Tone, string> = {
  up: "text-(--up)",
  down: "text-(--down)",
  flat: "text-(--fg-dim)",
};

/** 符号付き損益(JPY)。利益 = 朱、損失 = 藍、常に符号併記。null は "—"。 */
export function Pnl({ v, className = "" }: { v: number | null | undefined; className?: string }) {
  if (v === null || v === undefined || Number.isNaN(v)) {
    return <span className={`num text-(--fg-dim) ${className}`}>—</span>;
  }
  const p = signParts(v);
  return (
    <span className={`num ${toneCls[p.tone]} ${className}`}>
      {p.sign}
      {p.abs}
    </span>
  );
}

export function Pct({ v, className = "" }: { v: number | null | undefined; className?: string }) {
  if (v === null || v === undefined || Number.isNaN(v)) return null;
  const p = pctParts(v);
  return (
    <span className={`num ${toneCls[p.tone]} ${className}`}>
      {p.sign}
      {p.abs}
    </span>
  );
}

export type ChipKind = "line" | "solid" | "warn" | "dashed";

export function Chip({ kind = "line", children, className = "" }: { kind?: ChipKind; children: React.ReactNode; className?: string }) {
  const k: Record<ChipKind, string> = {
    line: "border border-(--line) text-(--fg-mute)",
    solid: "border border-(--fg) bg-(--fg) text-(--bg) font-semibold",
    warn: "border border-(--warn) text-(--warn)",
    dashed: "border border-dashed border-(--fg-mute) text-(--fg-mute)",
  };
  return (
    <span className={`num inline-block whitespace-nowrap rounded-[4px] px-1.5 py-px text-[10px] leading-[16px] tracking-[0.08em] ${k[kind]} ${className}`}>
      {children}
    </span>
  );
}

export function SectionHead({ title, meta, children }: { title: string; meta?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mt-7 mb-3 flex items-baseline gap-3">
      <h2 className="text-[13px] font-medium tracking-[0.04em]">{title}</h2>
      {meta && <span className="num text-[11px] text-(--fg-dim)">{meta}</span>}
      <span className="h-px flex-1 self-center bg-(--line)" aria-hidden="true" />
      {children}
    </div>
  );
}

export function Eyebrow({ kanji, text }: { kanji: string; text: string }) {
  return (
    <div className="flex items-center gap-3 num text-[10px] tracking-[0.18em] text-(--fg-dim)">
      <span className="font-sans text-[12px] font-medium tracking-[0.3em] text-(--fg-mute)">{kanji}</span>
      <span>{text}</span>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-7 text-center text-[12px] text-(--fg-dim)">{children}</div>;
}

export interface SegOption<T extends string> {
  key: T;
  label: string;
}

/** セグメント切替。期間プリセットと配色切替で同じ見た目・同じ操作にする。 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  size = "md",
}: {
  value: T;
  options: SegOption<T>[];
  onChange: (v: T) => void;
  label: string;
  size?: "sm" | "md";
}) {
  const h = size === "sm" ? "h-[24px] px-2 text-[10px]" : "h-[28px] px-3 text-[11px]";
  return (
    <div className="flex overflow-hidden rounded-md border border-(--line) bg-(--panel)" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={value === o.key}
          onClick={() => onChange(o.key)}
          className={`num ${h} tracking-[0.04em] border-r border-(--line) last:border-r-0 ${
            value === o.key ? "bg-(--fg) font-semibold text-(--bg)" : "text-(--fg-mute) hover:bg-(--panel-2)"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
