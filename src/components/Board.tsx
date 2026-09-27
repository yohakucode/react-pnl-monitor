import type { Pending, Position, Process, Status } from "../api";
import { amount, channelLabel, dirJp, dur, pairParts, price, yen } from "../format";
import { ChannelCard, STALE_MS } from "./ChannelCard";
import { PositionLadder } from "./PositionLadder";
import { Chip, Empty, Eyebrow, Pct, Pnl, SectionHead } from "./Signed";

/** live → 稼働中 paper → 停滞 paper の順。同順位は名前順。 */
function orderProcesses(ps: Process[], nowMs: number): Process[] {
  const rank = (p: Process) => (p.mode === "live" ? 0 : nowMs - p.state_mtime > STALE_MS ? 2 : 1);
  return [...ps].sort((a, b) => rank(a) - rank(b) || a.source.localeCompare(b.source));
}

function PairName({ pair }: { pair: string }) {
  const pp = pairParts(pair);
  return (
    <span className="num inline-flex items-baseline gap-1.5 text-[14px] font-medium">
      <span>
        {pp.base}
        <span className="text-(--fg-mute)">/{pp.quote}</span>
      </span>
    </span>
  );
}

function PositionRow({ p, q, nowMs }: { p: Process; q: Position; nowMs: number }) {
  const pp = pairParts(q.pair);
  return (
    <li className="grid gap-x-6 gap-y-1 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto]">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Chip>{channelLabel(p.source)}</Chip>
        <PairName pair={q.pair} />
        <Chip>{dirJp[q.direction] ?? q.direction}</Chip>
        {q.margin && <Chip kind="dashed">信用</Chip>}
        <span className="num text-[11px] text-(--fg-mute)">
          {amount(q.amount)} {pp.base} · {yen(q.entry_price * q.amount, 0)}
        </span>
      </div>
      <div className="num flex flex-wrap items-baseline gap-x-4 text-[11px] text-(--fg-mute) md:justify-end">
        <span className="flex items-baseline gap-1.5">
          <Pnl v={q.unrealized} className="text-[16px] font-medium" />
          <Pct v={q.unrealized_pct} />
        </span>
        <span>
          現在値 <span className="text-(--fg)">{price(q.current_price)}</span>
        </span>
        <span>保有 {dur(nowMs - q.entry_ts)}</span>
      </div>
      <div className="md:col-span-2">
        <PositionLadder p={q} />
      </div>
    </li>
  );
}

function WorkingRow({ p, w, nowMs }: { p: Process; w: Pending; nowMs: number }) {
  const pp = pairParts(w.pair);
  return (
    <tr>
      <td className="l">
        <Chip>{channelLabel(p.source)}</Chip>
      </td>
      <td className="l">
        <PairName pair={w.pair} />
      </td>
      <td className="l">
        <Chip>{dirJp[w.direction] ?? w.direction}</Chip>
        {w.margin && <Chip kind="dashed" className="ml-1">信用</Chip>}
      </td>
      <td>{price(w.limit_price)}</td>
      <td>
        {amount(w.amount)} {pp.base}
      </td>
      <td className="text-(--fg-mute)">{dur(nowMs - w.placed_ts)}</td>
    </tr>
  );
}

export function Board({ status }: { status: Status | null }) {
  const nowMs = status?.now_ms ?? Date.now();
  const procs = status ? orderProcesses(status.processes, nowMs) : [];
  const heroSource = (procs.find((p) => p.mode === "live") ?? procs[0])?.source;
  const held = procs.flatMap((p) => p.positions.map((q) => ({ p, q })));
  const working = procs.flatMap((p) => p.pending.map((w) => ({ p, w })));
  const unrealTotal = held.reduce((s, { q }) => s + (q.unrealized ?? 0), 0);

  return (
    <div className="mx-auto max-w-[1200px] px-5 pb-10">
      <Eyebrow kanji="時価" text="稼働チャネルと建玉 — 未確定の評価" />

      <SectionHead title="稼働チャネル" meta={status ? `${procs.length}` : undefined} />
      {!status ? (
        <Empty>読み込み中…</Empty>
      ) : procs.length === 0 ? (
        <Empty>
          稼働中のチャネルはありません
        </Empty>
      ) : (
        <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(270px,1fr))]">
          {procs.map((p) => (
            <ChannelCard key={p.source} p={p} nowMs={nowMs} hero={p.source === heroSource} />
          ))}
        </div>
      )}

      {status && procs.length > 0 && (
        <>
          <SectionHead
            title="建玉"
            meta={
              <>
                {held.length}
                {held.length > 0 && (
                  <>
                    {" "}
                    · 含み <Pnl v={unrealTotal} />
                  </>
                )}
              </>
            }
          />
          <div className="rounded-lg border border-(--line) bg-(--panel)">
            {held.length === 0 ? (
              <Empty>建玉なし。シグナル待機中です</Empty>
            ) : (
              <ul className="divide-y divide-(--line-soft)">
                {held.map(({ p, q }) => (
                  <PositionRow key={`${p.source}:${q.pair}`} p={p} q={q} nowMs={nowMs} />
                ))}
              </ul>
            )}
          </div>

          {working.length > 0 && (
            <>
              <SectionHead title="未約定の指値エントリー" meta={`${working.length}`} />
              <div className="overflow-x-auto rounded-lg border border-(--line) bg-(--panel)">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th className="l">チャネル</th>
                      <th className="l">ペア</th>
                      <th className="l">方向</th>
                      <th>指値</th>
                      <th>数量</th>
                      <th>経過</th>
                    </tr>
                  </thead>
                  <tbody>
                    {working.map(({ p, w }) => (
                      <WorkingRow key={`${p.source}:${w.pair}`} p={p} w={w} nowMs={nowMs} />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
