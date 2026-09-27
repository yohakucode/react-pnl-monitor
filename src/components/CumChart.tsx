import { useEffect, useRef, useState } from "react";
import type { CumPoint } from "../api";
import { jstMonthDay, jstTime, pairParts } from "../format";
import { Pct, Pnl } from "./Signed";

const H = 240;
const M = { l: 66, r: 22, t: 20, b: 26 };
const nf = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 });

function niceStep(span: number, n: number): number {
  const raw = span / n || 1;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
}

function fmtTick(v: number, pct: boolean): string {
  if (!pct) return nf.format(v);
  const d = Math.abs(v) >= 10 || Number.isInteger(v) ? 0 : Math.abs(v) >= 1 ? 1 : 2;
  return v.toFixed(d) + "%";
}

/**
 * 累積実現損益(単一系列)。ゼロ線を境に上を朱・下を藍のウォッシュで塗り、極性を面で示す。
 * principal(投入現金)を渡すと縦軸を収益率 % に切り替える。
 */
export function CumChart({ cum, principal }: { cum: CumPoint[]; principal?: number | null }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(720);
  const [hi, setHi] = useState<number | null>(null);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver((es) => setW(Math.max(280, Math.floor(es[0].contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (cum.length < 2) {
    return (
      <div ref={wrap} className="flex h-[240px] items-center justify-center text-[12px] text-(--fg-dim)">
        決済が 2 件たまると累積損益を描画します
      </div>
    );
  }

  const pct = typeof principal === "number" && principal > 0;
  const scale = pct ? 100 / (principal as number) : 1;
  const xs = cum.map((c) => Date.parse(c.time));
  const ys = cum.map((c) => c.cum * scale);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const yMin = Math.min(0, ...ys);
  const yMax = Math.max(0, ...ys);
  const step = niceStep(yMax - yMin, 5);
  const y0 = Math.floor(yMin / step) * step;
  const y1 = Math.ceil(yMax / step) * step || step;
  const X = (t: number) => M.l + ((t - x0) / (x1 - x0 || 1)) * (w - M.l - M.r);
  const Y = (v: number) => H - M.b - ((v - y0) / (y1 - y0)) * (H - M.t - M.b);
  const ticks: number[] = [];
  for (let v = y0; v <= y1 + 1e-9; v += step) ticks.push(v);

  const line = cum.map((_, i) => `${i ? "L" : "M"}${X(xs[i]).toFixed(1)} ${Y(ys[i]).toFixed(1)}`).join(" ");
  const area = `${line} L${X(xs[xs.length - 1]).toFixed(1)} ${Y(0).toFixed(1)} L${X(xs[0]).toFixed(1)} ${Y(0).toFixed(1)} Z`;
  const last = cum.length - 1;
  const lv = ys[last];
  const lastColor = lv > 0 ? "var(--up)" : lv < 0 ? "var(--down)" : "var(--fg-mute)";
  const endRight = X(xs[last]) > w - 110;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * w;
    let best = 0;
    let bd = Infinity;
    for (let i = 0; i < xs.length; i++) {
      const d = Math.abs(X(xs[i]) - mx);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    setHi(best);
  };
  const onKey = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (e.key === "ArrowLeft") setHi((h) => Math.max(0, (h ?? last) - 1));
    else if (e.key === "ArrowRight") setHi((h) => Math.min(last, (h ?? -1) + 1));
    else if (e.key === "Escape") setHi(null);
    else return;
    e.preventDefault();
  };

  const h = hi !== null ? cum[hi] : null;
  const tipLeft = hi !== null ? Math.min(X(xs[hi]) + 12, w - 190) : 0;

  return (
    <div ref={wrap} className="relative">
      <svg
        viewBox={`0 0 ${w} ${H}`}
        width={w}
        height={H}
        role="img"
        aria-label="累積実現損益の推移。矢印キーで各決済を辿れます"
        tabIndex={0}
        className="block w-full touch-none select-none"
        onPointerMove={onMove}
        onPointerLeave={() => setHi(null)}
        onBlur={() => setHi(null)}
        onKeyDown={onKey}
      >
        <defs>
          <clipPath id="cum-above">
            <rect x={M.l} y={M.t} width={w - M.l - M.r} height={Math.max(0, Y(0) - M.t)} />
          </clipPath>
          <clipPath id="cum-below">
            <rect x={M.l} y={Y(0)} width={w - M.l - M.r} height={Math.max(0, H - M.b - Y(0))} />
          </clipPath>
        </defs>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={M.l} x2={w - M.r} y1={Y(v)} y2={Y(v)} stroke={v === 0 ? "var(--fg-dim)" : "var(--line-soft)"} strokeWidth={1} />
            <text x={M.l - 10} y={Y(v) + 3.5} textAnchor="end" fontSize={10} fill="var(--fg-dim)" className="num">
              {fmtTick(v, pct)}
            </text>
          </g>
        ))}
        {[x0, (x0 + x1) / 2, x1].map((t, i) => (
          <text
            key={i}
            x={X(t)}
            y={H - 8}
            textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}
            fontSize={10}
            fill="var(--fg-dim)"
            className="num"
          >
            {jstMonthDay(t)}
          </text>
        ))}
        <path d={area} fill="var(--up)" fillOpacity={0.12} clipPath="url(#cum-above)" />
        <path d={area} fill="var(--down)" fillOpacity={0.12} clipPath="url(#cum-below)" />
        <path d={line} fill="none" stroke="var(--ink-line)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {h && (
          <>
            <line x1={X(xs[hi!])} x2={X(xs[hi!])} y1={M.t} y2={H - M.b} stroke="var(--fg-mute)" strokeWidth={1} />
            <circle cx={X(xs[hi!])} cy={Y(ys[hi!])} r={4.5} fill="var(--fg)" stroke="var(--panel)" strokeWidth={2} />
          </>
        )}
        <circle cx={X(xs[last])} cy={Y(lv)} r={4.5} fill={lastColor} stroke="var(--panel)" strokeWidth={2} />
        <text
          x={endRight ? X(xs[last]) - 9 : X(xs[last]) + 9}
          y={Y(lv) - 12}
          textAnchor={endRight ? "end" : "start"}
          fontSize={12}
          fontWeight={600}
          fill={lastColor}
          stroke="var(--panel)"
          strokeWidth={3}
          paintOrder="stroke"
          className="num"
        >
          {lv > 0 ? "+" : lv < 0 ? "−" : "±"}
          {pct ? Math.abs(lv).toFixed(2) + "%" : nf.format(Math.abs(lv))}
        </text>
      </svg>
      {h && (
        <div
          className="num pointer-events-none absolute top-3 z-10 rounded-md border border-(--line) bg-(--panel) px-2.5 py-1.5 text-[11px] leading-[1.7] shadow-sm"
          style={{ left: tipLeft }}
          role="status"
        >
          <div className="text-(--fg-mute)">{jstTime(h.time)}</div>
          <div>
            累積 <Pnl v={h.cum} className="font-semibold" />
            {pct && (
              <>
                {" "}
                <Pct v={h.cum / (principal as number)} />
              </>
            )}
          </div>
          <div className="text-(--fg-mute)">
            {pairParts(h.pair).label} <Pnl v={h.pnl} />
          </div>
        </div>
      )}
    </div>
  );
}
