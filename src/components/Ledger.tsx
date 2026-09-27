import { useState } from "react";
import type { Filter, Preset, TradesResponse } from "../api";
import { channelLabel, dirJp, jstDateStr, jstTime, pairParts, price, reasonLabel, yen } from "../format";
import { CumChart } from "./CumChart";
import { Chip, Empty, Eyebrow, Pct, Pnl, SectionHead, Segmented } from "./Signed";

const PRESETS: { key: Preset; label: string }[] = [
  // "custom" は日付入力で入る状態で、ボタンにはない
  { key: "today", label: "今日" },
  { key: "7d", label: "7日" },
  { key: "30d", label: "30日" },
  { key: "all", label: "全期間" },
];

function presetRange(name: Preset): [string, string] {
  const today = jstDateStr(new Date());
  if (name === "today") return [today, today];
  if (name === "7d") return [jstDateStr(new Date(Date.now() - 6 * 86_400_000)), today];
  if (name === "30d") return [jstDateStr(new Date(Date.now() - 29 * 86_400_000)), today];
  return ["", ""];
}

const pairOption = (key: string) => pairParts(key).label;

function Filters({ f, onChange, pairs, sources }: { f: Filter; onChange: (f: Filter) => void; pairs: string[]; sources: string[] }) {
  const setPreset = (key: Preset) => {
    const [from, to] = presetRange(key);
    onChange({ ...f, preset: key, from, to });
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Segmented value={f.preset} options={PRESETS} onChange={setPreset} label="期間プリセット" />
      <input
        type="date"
        className="ctl"
        aria-label="開始日"
        value={f.from}
        onChange={(e) => onChange({ ...f, preset: "custom", from: e.target.value })}
      />
      <span className="text-(--fg-dim)">–</span>
      <input
        type="date"
        className="ctl"
        aria-label="終了日"
        value={f.to}
        onChange={(e) => onChange({ ...f, preset: "custom", to: e.target.value })}
      />
      <select className="ctl" aria-label="通貨ペア" value={f.pair} onChange={(e) => onChange({ ...f, pair: e.target.value })}>
        <option value="">全ペア</option>
        {pairs.map((p) => (
          <option key={p} value={p}>
            {pairOption(p)}
          </option>
        ))}
      </select>
      <select className="ctl" aria-label="チャネル" value={f.source} onChange={(e) => onChange({ ...f, source: e.target.value })}>
        <option value="">全チャネル</option>
        {sources.map((s) => (
          <option key={s} value={s}>
            {channelLabel(s)}
          </option>
        ))}
      </select>
    </div>
  );
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-(--line) bg-(--panel) px-4 py-3">
      <div className="text-[11px] text-(--fg-mute)">{label}</div>
      <div className="num mt-1 text-[22px] font-medium leading-none">{children}</div>
    </div>
  );
}

type Unit = "jpy" | "pct";
const UNITS: { key: Unit; label: string }[] = [
  { key: "jpy", label: "円" },
  { key: "pct", label: "%" },
];

export function Ledger({ data, loading, filter, onFilter }: { data: TradesResponse | null; loading: boolean; filter: Filter; onFilter: (f: Filter) => void }) {
  const [unit, setUnit] = useState<Unit>("jpy");
  const a = data?.aggregate;
  const perPair = a ? Object.entries(a.per_pair).sort((x, y) => y[1].pnl - x[1].pnl) : [];
  const maxAbs = perPair.reduce((m, [, v]) => Math.max(m, Math.abs(v.pnl)), 0) || 1;
  // 収益率の分母 = 集計対象チャネルの投入現金の合計(チャネル指定時はそのチャネルのみ)
  const scopeSources = data ? (filter.source ? [filter.source] : Object.keys(a?.per_source ?? {})) : [];
  const principalScope = scopeSources.reduce((sum, src) => sum + (data?.principals[src] ?? 0), 0);
  const scopeReturn = a && a.n && principalScope > 0 ? a.total_pnl / principalScope : null;
  const perSource = a
    ? Object.entries(a.per_source)
        .map(([src, v]) => ({ src, ...v, principal: data?.principals[src] ?? null }))
        .sort((x, y) => y.pnl - x.pnl)
    : [];

  return (
    <div className="mx-auto max-w-[1200px] px-5 pt-6 pb-14">
      <Eyebrow kanji="実現" text="決済済みの損益 — JST 日付で集計" />

      <SectionHead title="期間・ペア集計" meta={a ? `${a.n} 件` : undefined} />
      <Filters f={filter} onChange={onFilter} pairs={data?.pairs ?? []} sources={data?.sources ?? []} />

      <div className={`transition-opacity ${loading && data ? "opacity-60" : ""}`}>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Tile label="合計損益">
            <Pnl v={a && a.n ? a.total_pnl : null} />
          </Tile>
          <Tile label={filter.source ? "収益率 投入現金比" : "収益率 投入現金合計比"}>
            {scopeReturn === null ? <span className="text-(--fg-dim)">—</span> : <Pct v={scopeReturn} />}
          </Tile>
          <Tile label="決済数">{a ? a.n : "—"}</Tile>
          <Tile label="勝率">{a && a.win_rate !== null ? Math.round(a.win_rate * 100) + "%" : "—"}</Tile>
          <Tile label="平均損益">
            <Pnl v={a?.avg_pnl ?? null} />
          </Tile>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[3fr_2fr]">
          <section aria-label="累積実現損益" className="rounded-lg border border-(--line) bg-(--panel) p-3">
            <div className="mb-1 flex items-center gap-3 px-1 text-[11px] text-(--fg-mute)">
              <span>{unit === "pct" ? "累積収益率(投入現金比)" : "累積実現損益"}</span>
              <span className="ml-auto">
                <Segmented value={unit} options={UNITS} onChange={setUnit} label="縦軸の単位" size="sm" />
              </span>
            </div>
            <CumChart cum={a?.cumulative ?? []} principal={unit === "pct" ? principalScope : null} />
          </section>
          <div className="grid content-start gap-4">
            {perSource.length > 0 && (
              <section aria-label="チャネル別" className="overflow-auto rounded-lg border border-(--line) bg-(--panel)">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th className="l">チャネル</th>
                      <th>投入現金</th>
                      <th>決済数</th>
                      <th>実現損益</th>
                      <th>収益率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perSource.map((r) => (
                      <tr key={r.src}>
                        <td className="l">
                          <Chip>{channelLabel(r.src)}</Chip>
                        </td>
                        <td>{r.principal === null ? "—" : yen(r.principal, 0)}</td>
                        <td>{r.n}</td>
                        <td>
                          <Pnl v={r.pnl} />
                        </td>
                        <td>{r.principal !== null && r.principal > 0 ? <Pct v={r.pnl / r.principal} /> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          <section aria-label="ペア別" className="max-h-[300px] overflow-auto rounded-lg border border-(--line) bg-(--panel)">
            {perPair.length === 0 ? (
              <Empty>この条件の決済はありません</Empty>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th className="l">ペア</th>
                    <th>決済数</th>
                    <th>損益</th>
                    <th className="l w-[38%]" aria-label="損益の大きさ"></th>
                  </tr>
                </thead>
                <tbody>
                  {perPair.map(([k, v]) => (
                    <tr key={k}>
                      <td className="l">{pairOption(k)}</td>
                      <td>{v.n}</td>
                      <td>
                        <Pnl v={v.pnl} />
                      </td>
                      <td className="l">
                        <div
                          className="h-[6px] rounded-r-[4px]"
                          style={{
                            width: `${(Math.abs(v.pnl) / maxAbs) * 100}%`,
                            background: v.pnl > 0 ? "var(--up)" : v.pnl < 0 ? "var(--down)" : "var(--line)",
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
          </div>
        </div>

        <SectionHead title="決済履歴" meta={data ? `直近 ${data.trades.length} 件` : undefined} />
        <div className="max-h-[560px] overflow-auto rounded-lg border border-(--line) bg-(--panel)">
          {!data ? (
            <Empty>読み込み中…</Empty>
          ) : data.trades.length === 0 ? (
            <Empty>この条件の決済はありません</Empty>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th className="l">決済(JST)</th>
                  <th className="l">チャネル</th>
                  <th className="l">ペア</th>
                  <th className="l">方向</th>
                  <th>エントリー</th>
                  <th>エグジット</th>
                  <th>損益</th>
                  <th className="l">理由</th>
                </tr>
              </thead>
              <tbody>
                {data.trades.map((t, i) => (
                  <tr key={`${t.source}:${t.pair}:${t.exit_time}:${i}`}>
                    <td className="l text-(--fg-mute)">{jstTime(t.exit_time)}</td>
                    <td className="l">
                      <Chip>{channelLabel(t.source)}</Chip>
                    </td>
                    <td className="l">{pairOption(t.pair)}</td>
                    <td className="l">
                      <Chip>{dirJp[t.direction] ?? "—"}</Chip>
                    </td>
                    <td className="text-(--fg-mute)">{price(t.entry_price)}</td>
                    <td>{price(t.exit_price)}</td>
                    <td>
                      <Pnl v={t.pnl} />
                    </td>
                    <td className="l jp text-(--fg-mute)">{reasonLabel(t.reason)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
