import type { Position } from "../api";
import { price } from "../format";

/**
 * 建玉ラダー(このページのシグネチャ)。
 * 損切り(左端)→ 建値 → 利確(右端)の価格帯を 1 本の目盛にし、現在値をマーカーで置く。
 * f(p) = (p − stop) / (take − stop) なのでショートでも「右 = 利益方向」に揃う。
 * トレール発動中は損切りが動くため、目盛を [トレール損切り, ピーク] に切り替える(建値は損切りより
 * 不利側にあり利益は確保済み)。peak は確定足ベースなのでティッカーの現在値が超えることがあり、
 * 通常時の目盛には出さない(現在値より低い「ピーク」は誤読を招く)。
 */
interface Geometry {
  entry: number | null;
  cur: number;
  beyond: "stop" | "take" | null;
  leftLabel: string;
  rightLabel: string;
  leftPrice: number;
  rightPrice: number;
}

export function ladderGeometry(p: Position): Geometry | null {
  const { stop, take, entry_price: entry, current_price: cur, peak, trail_on } = p;
  if (stop === null || cur === null) return null;
  const trailing = !!trail_on && typeof peak === "number";
  const right = trailing ? (peak as number) : take;
  if (right === null || right === undefined || right === stop) return null;
  const f = (x: number) => (x - stop) / (right - stop);
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const raw = f(cur);
  return {
    entry: trailing ? null : clamp(f(entry)),
    cur: clamp(raw),
    // トレール中は現在値がピーク(確定足)を超えていて正常なので警告しない
    beyond: raw < 0 ? "stop" : raw > 1 && !trailing ? "take" : null,
    leftLabel: trailing ? "トレール損切り" : "損切り",
    rightLabel: trailing ? "ピーク" : "利確",
    leftPrice: stop,
    rightPrice: right,
  };
}

const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

export function PositionLadder({ p }: { p: Position }) {
  const g = ladderGeometry(p);
  if (!g) return null;
  const u = p.unrealized ?? 0;
  const color = u > 0 ? "var(--up)" : u < 0 ? "var(--down)" : "var(--fg-mute)";
  const fillL = g.entry === null ? 0 : Math.min(g.entry, g.cur);
  const fillW = g.entry === null ? g.cur : Math.abs(g.cur - g.entry);
  return (
    <div
      className="relative pt-4 pb-5"
      role="img"
      aria-label={`${g.leftLabel} ${price(g.leftPrice)}、建値 ${price(p.entry_price)}、現在値 ${price(p.current_price)}、${g.rightLabel} ${price(g.rightPrice)}`}
    >
      {g.entry !== null && (
        <div
          className="num absolute top-0 -translate-x-1/2 whitespace-nowrap text-[10px] text-(--fg-dim)"
          style={{ left: pct(g.entry) }}
        >
          建値 <span className="text-(--fg-mute)">{price(p.entry_price)}</span>
        </div>
      )}
      <div className="relative h-[10px]">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-(--line)" />
        <div className="absolute top-0 left-0 h-full w-px bg-(--fg-dim)" />
        <div className="absolute top-0 right-0 h-full w-px bg-(--fg-dim)" />
        <div
          className="ladder-move absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full"
          style={{ left: pct(fillL), width: pct(fillW), background: color }}
        />
        {g.entry !== null && <div className="absolute top-0 h-full w-px bg-(--fg-mute)" style={{ left: pct(g.entry) }} />}
        <div
          className="ladder-move absolute top-1/2 size-[10px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: pct(g.cur), background: color, boxShadow: "0 0 0 2px var(--panel)" }}
        />
      </div>
      <div className="num absolute bottom-0 left-0 whitespace-nowrap text-[10px] text-(--fg-dim)">
        {g.leftLabel} <span className="text-(--fg-mute)">{price(g.leftPrice)}</span>
        {g.beyond === "stop" && <span className="ml-1 text-(--warn)">▼ 割れ</span>}
      </div>
      <div className="num absolute right-0 bottom-0 whitespace-nowrap text-[10px] text-(--fg-dim)">
        {g.beyond === "take" && <span className="mr-1 text-(--warn)">▲ 超え</span>}
        <span className="text-(--fg-mute)">{price(g.rightPrice)}</span> {g.rightLabel}
      </div>
    </div>
  );
}
