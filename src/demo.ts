// 架空データ。実在の口座・取引・相場とは関係ない。
// 乱数の種を固定しているので毎回同じ履歴になる。日時だけは開いた時刻を基準にずらす。
import type { Aggregate, Filter, Pending, Position, Process, Status, Trade, TradesResponse } from "./api";
import { jstDateStr } from "./format";

/** 種を固定できる小さな乱数(mulberry32) */
function rng(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PAIRS: Record<string, { price: number; lot: number }> = {
  btc_jpy: { price: 12_000_000, lot: 0.01 },
  eth_jpy: { price: 450_000, lot: 0.2 },
  xrp_jpy: { price: 350, lot: 300 },
};
const SOURCES = ["sample_a", "sample_b", "sample_c"];
const PRINCIPAL = 1_000_000;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const LOADED = Date.now();

const tick = (p: number) => (p >= 10_000 ? Math.round(p) : Math.round(p * 1000) / 1000);

/** 過去 60 日の決済 90 件(新しい順)。先頭 3 件は今日の分 */
const TRADES: Trade[] = (() => {
  const r = rng(20260927);
  const sinceMidnight = LOADED - Date.parse(`${jstDateStr(new Date(LOADED))}T00:00:00+09:00`);
  const out: Trade[] = [];
  for (let i = 0; i < 90; i++) {
    const pair = Object.keys(PAIRS)[Math.floor(r() * 3)];
    const { price, lot } = PAIRS[pair];
    const long = r() < 0.6;
    const exitMs = LOADED - (i < 3 ? r() * sinceMidnight : r() * 60 * DAY);
    const entry = tick(price * (0.9 + r() * 0.2));
    const move = (r() - 0.45) * 0.04; // −1.8% 〜 +2.2%。わずかに利益側へ寄せる
    const exit = tick(long ? entry * (1 + move) : entry * (1 - move));
    const reason = move > 0.012 ? "take_profit:maker" : move < -0.01 ? "stop_loss:taker" : r() < 0.5 ? "trail_stop:taker" : "time_stop:taker";
    out.push({
      // 今日の分は、止まっている扱いの sample_c に付けない
      source: SOURCES[i < 3 ? i % 2 : i % 3],
      pair,
      direction: long ? "long" : "short",
      entry_time: new Date(exitMs - (1 + r() * 30) * HOUR).toISOString(),
      entry_price: entry,
      exit_time: new Date(exitMs).toISOString(),
      exit_price: exit,
      amount: lot,
      pnl: Math.round((long ? exit - entry : entry - exit) * lot),
      reason,
    });
  }
  return out.sort((a, b) => Date.parse(b.exit_time) - Date.parse(a.exit_time));
})();

// 建玉の現在値。取得のたびに少しずつ動かす
const walk = rng(7);
const cur: Record<string, number> = { btc_jpy: 12_096_000, eth_jpy: 441_000 };

function position(pair: string, direction: "long" | "short", entry: number, extra: Partial<Position>): Position {
  const amount = PAIRS[pair].lot;
  const c = cur[pair];
  const unrealized = Math.round((direction === "long" ? c - entry : entry - c) * amount);
  return {
    pair,
    direction,
    margin: direction === "short", // 売りから入るのは信用取引
    amount,
    entry_price: entry,
    entry_ts: LOADED - 5 * HOUR,
    current_price: c,
    unrealized,
    unrealized_pct: unrealized / (entry * amount),
    stop: null,
    take: null,
    ...extra,
  };
}

export function demoStatus(now: number): Status {
  for (const k in cur) cur[k] = tick(cur[k] * (1 + (walk() - 0.5) * 0.003));
  const today = jstDateStr(new Date(now));
  const held: Record<string, Position[]> = {
    sample_a: [position("btc_jpy", "long", 12_000_000, { stop: 11_760_000, take: 12_360_000 })],
    // トレール中のショート。損切りは建値より有利側へ動いている
    sample_b: [position("eth_jpy", "short", 450_000, { stop: 445_500, take: 432_000, peak: 438_750, trail_on: true })],
    sample_c: [],
  };
  const pending: Record<string, Pending[]> = {
    sample_b: [{ pair: "xrp_jpy", direction: "long", margin: false, limit_price: 340, amount: 300, placed_ts: now - 40 * 60_000 }],
  };
  const processes: Process[] = SOURCES.map((source) => {
    const mine = TRADES.filter((t) => t.source === source);
    const realized = mine.reduce((s, t) => s + t.pnl, 0);
    const unrealized = held[source].reduce((s, q) => s + (q.unrealized ?? 0), 0);
    return {
      source,
      strategy: "sample",
      mode: "paper",
      equity: PRINCIPAL + realized,
      unrealized,
      equity_mark: PRINCIPAL + realized + unrealized,
      halted: false,
      positions: held[source],
      pending: pending[source] ?? [],
      // sample_c は 3 時間更新が止まっている扱い
      state_mtime: source === "sample_c" ? now - 3 * HOUR : now - 5_000,
      today_realized: mine.filter((t) => jstDateStr(new Date(t.exit_time)) === today).reduce((s, t) => s + t.pnl, 0),
      realized_total: realized,
      principal: PRINCIPAL,
      realized_return: realized / PRINCIPAL,
    };
  });
  return { now_ms: now, processes };
}

function add(m: Record<string, { n: number; pnl: number }>, k: string, pnl: number) {
  const v = (m[k] ??= { n: 0, pnl: 0 });
  v.n++;
  v.pnl += pnl;
}

function aggregate(trades: Trade[]): Aggregate {
  const n = trades.length;
  const total_pnl = trades.reduce((s, t) => s + t.pnl, 0);
  const wins = trades.filter((t) => t.pnl > 0).length;
  const per_pair = {};
  const per_source = {};
  for (const t of trades) {
    add(per_pair, t.pair, t.pnl);
    add(per_source, t.source, t.pnl);
  }
  let cum = 0;
  const cumulative = [...trades].reverse().map((t) => ({ time: t.exit_time, cum: (cum += t.pnl), pnl: t.pnl, pair: t.pair }));
  return { n, total_pnl, wins, win_rate: n ? wins / n : null, avg_pnl: n ? total_pnl / n : null, per_pair, per_source, cumulative };
}

export function demoTrades(f: Filter): TradesResponse {
  const trades = TRADES.filter((t) => {
    const d = jstDateStr(new Date(t.exit_time));
    return (!f.from || d >= f.from) && (!f.to || d <= f.to) && (!f.pair || t.pair === f.pair) && (!f.source || t.source === f.source);
  });
  return {
    trades,
    aggregate: aggregate(trades),
    pairs: Object.keys(PAIRS),
    sources: SOURCES,
    principals: Object.fromEntries(SOURCES.map((s) => [s, PRINCIPAL])),
  };
}
