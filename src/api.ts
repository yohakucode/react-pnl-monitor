import { demoStatus, demoTrades } from "./demo";

// 画面が受け取るデータの型と取得関数。

export type Direction = "long" | "short";

export interface Position {
  pair: string;
  direction: Direction;
  margin: boolean;
  amount: number;
  entry_price: number;
  entry_ts: number;
  current_price: number | null;
  unrealized: number | null;
  unrealized_pct: number | null;
  stop: number | null;
  take: number | null;
  atr?: number;
  peak?: number;
  trail_on?: boolean;
}

export interface Pending {
  pair: string;
  direction: Direction;
  margin: boolean;
  limit_price: number;
  amount: number;
  placed_ts: number;
}

export interface Process {
  source: string;
  strategy: string;
  mode: "live" | "paper";
  equity: number;
  unrealized: number;
  equity_mark: number;
  halted: boolean;
  positions: Position[];
  pending: Pending[];
  state_mtime: number;
  today_realized: number;
  /** journal の実現損益累計 */
  realized_total: number;
  /** 投入現金 = 実現資産 − 実現損益累計(利確・損切りで増減した分を除いた元本) */
  principal: number;
  /** 実現損益累計 / 投入現金。元本 0 以下なら null */
  realized_return: number | null;
}

export interface Status {
  now_ms: number;
  processes: Process[];
}

export interface Trade {
  source: string;
  pair: string;
  direction: string;
  entry_time: string | null;
  entry_price: number | null;
  exit_time: string;
  exit_price: number;
  amount: number;
  pnl: number;
  reason: string;
}

export interface CumPoint {
  time: string;
  cum: number;
  pnl: number;
  pair: string;
}

export interface Aggregate {
  n: number;
  total_pnl: number;
  wins: number;
  win_rate: number | null;
  avg_pnl: number | null;
  per_pair: Record<string, { n: number; pnl: number }>;
  per_source: Record<string, { n: number; pnl: number }>;
  cumulative: CumPoint[];
}

export interface TradesResponse {
  trades: Trade[];
  aggregate: Aggregate;
  pairs: string[];
  sources: string[];
  /** チャネルごとの投入現金(収益率の分母) */
  principals: Record<string, number>;
}

export type Preset = "today" | "7d" | "30d" | "all" | "custom";

export interface Filter {
  preset: Preset;
  from: string;
  to: string;
  pair: string;
  source: string;
}

// 本番ではここで fetch("/api/status") などを呼ぶ。サンプルは demo.ts の架空データを返す
export const fetchStatus = async (): Promise<Status> => demoStatus(Date.now());
export const fetchTrades = async (f: Filter): Promise<TradesResponse> => demoTrades(f);
