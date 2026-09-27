// 表示用の整形。金額は JPY、時刻は JST。

const nf2 = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 });

export function yen(v: number, digits: 0 | 2 = 2): string {
  return "¥" + (digits === 0 ? nf0 : nf2).format(v);
}

/** 符号付き金額の部品。色は呼び出し側(Signed コンポーネント)で付ける。 */
export function signParts(v: number): { sign: "+" | "−" | "±"; abs: string; tone: Tone } {
  if (v > 0) return { sign: "+", abs: nf2.format(v), tone: "up" };
  if (v < 0) return { sign: "−", abs: nf2.format(-v), tone: "down" };
  return { sign: "±", abs: "0", tone: "flat" };
}

export type Tone = "up" | "down" | "flat";

export function pctParts(v: number): { sign: "+" | "−" | "±"; abs: string; tone: Tone } {
  const p = Math.abs(v * 100).toFixed(2) + "%";
  if (v > 0) return { sign: "+", abs: p, tone: "up" };
  if (v < 0) return { sign: "−", abs: p, tone: "down" };
  return { sign: "±", abs: p, tone: "flat" };
}

/** 価格。1 万以上は整数、1 以上は小数 3 桁まで、1 未満(アルトの JPY 建て)は 5 桁まで。 */
export function price(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const a = Math.abs(v);
  const digits = a >= 10_000 ? 0 : a >= 1 ? 3 : 5;
  return new Intl.NumberFormat("ja-JP", { maximumFractionDigits: digits }).format(v);
}

export function amount(v: number): string {
  return new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 8 }).format(v);
}

export function jstTime(x: string | number): string {
  return new Date(x).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function jstClock(d: Date): string {
  return d.toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour12: false });
}

export function jstDateStr(d: Date): string {
  return d.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

export function jstMonthDay(x: string | number): string {
  return new Date(x).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", month: "2-digit", day: "2-digit" });
}

/** 経過時間。1 時間未満は分、2 日未満は時間、それ以上は日+時間。 */
export function dur(ms: number): string {
  if (ms < 0) ms = 0;
  const h = ms / 3_600_000;
  if (h < 1) return Math.max(0, Math.round(ms / 60_000)) + "分";
  if (h < 48) return h.toFixed(1) + "h";
  return Math.floor(h / 24) + "日" + Math.round(h % 24) + "h";
}

/** "btc_jpy" → { base: "BTC", quote: "JPY", label: "BTC/JPY" } */
export function pairParts(key: string): { base: string; quote: string; label: string } {
  const [base, quote] = key.split("_");
  const b = (base ?? key).toUpperCase();
  const q = (quote ?? "").toUpperCase();
  return { base: b, quote: q, label: q ? `${b}/${q}` : b };
}

export function channelLabel(source: string): string {
  const i = source.lastIndexOf("_");
  if (i < 0) return source.toUpperCase();
  return `${source.slice(0, i).toUpperCase()} · ${source.slice(i + 1).toUpperCase()}`;
}

export const dirJp: Record<string, string> = { long: "ロング", short: "ショート" };

const REASON: Record<string, string> = {
  stop_loss: "損切り",
  trail_stop: "トレール決済",
  take_profit: "利確",
  time_stop: "タイムストップ",
};
const EXEC: Record<string, string> = { maker: "指値", taker: "成行" };

/** "take_profit:maker" → "利確 · 指値"。未知のコードはそのまま。 */
export function reasonLabel(reason: string): string {
  if (!reason) return "";
  const [head, ...rest] = reason.split(":");
  const base = REASON[head] ?? head;
  const tail = rest.map((x) => EXEC[x] ?? x).filter(Boolean);
  return tail.length ? `${base} · ${tail.join(" · ")}` : base;
}
