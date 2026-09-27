import type { Process } from "../api";
import { channelLabel, dur, yen } from "../format";
import { Chip, Pct, Pnl } from "./Signed";

export const STALE_MS = 120_000;

export function ChannelCard({ p, nowMs, hero }: { p: Process; nowMs: number; hero: boolean }) {
  const age = nowMs - p.state_mtime;
  const stale = age > STALE_MS;
  const live = p.mode === "live";
  return (
    <section
      aria-label={channelLabel(p.source)}
      className={`rounded-lg border bg-(--panel) ${live ? "border-(--fg-mute)" : "border-(--line)"} ${stale ? "opacity-70" : ""}`}
    >
      <div className="num flex flex-wrap items-center gap-2 border-b border-(--line-soft) px-4 py-2.5 text-[11px] tracking-[0.1em]">
        <span className="font-semibold">{channelLabel(p.source)}</span>
        <Chip kind={live ? "solid" : "line"}>{live ? "LIVE 実発注" : "PAPER"}</Chip>
        {p.halted && <Chip kind="warn">HALT 停止中</Chip>}
        <span className={`ml-auto flex items-center gap-1.5 text-[10px] ${stale ? "text-(--warn)" : "text-(--fg-mute)"}`}>
          {stale ? (
            <>
              <span className="inline-block size-[7px] rounded-full border border-(--warn)" aria-hidden="true" />
              最終更新 {dur(age)}前
            </>
          ) : (
            <>
              <span className="lamp inline-block size-[7px] rounded-full bg-(--fg)" aria-hidden="true" />
              稼働中
            </>
          )}
        </span>
      </div>
      <div className="px-4 pt-3 pb-4">
        <div className="text-[11px] text-(--fg-dim)">
          評価資産 <span className="num">実現 + 含み</span>
        </div>
        <div className={`num mt-1 font-medium leading-none ${hero ? "text-[40px]" : "text-[26px]"}`}>{yen(p.equity_mark)}</div>
        <dl className="mt-3.5 grid grid-cols-3 gap-x-2 gap-y-3">
          <div>
            <dt className="text-[10px] text-(--fg-dim)">投入現金</dt>
            <dd className="num text-[12px]">{yen(p.principal, 0)}</dd>
          </div>
          <div>
            <dt className="text-[10px] text-(--fg-dim)">実現損益 累計</dt>
            <dd className="text-[12px]">
              <Pnl v={p.realized_total} />
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-(--fg-dim)">収益率</dt>
            <dd className="text-[12px]">
              {p.realized_return === null ? <span className="num text-(--fg-dim)">—</span> : <Pct v={p.realized_return} />}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-(--fg-dim)">本日実現</dt>
            <dd className="text-[12px]">
              <Pnl v={p.today_realized} />
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-(--fg-dim)">含み損益</dt>
            <dd className="text-[12px]">
              <Pnl v={p.positions.length ? p.unrealized : null} />
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-(--fg-dim)">建玉 / 指値</dt>
            <dd className="num text-[12px]">
              {p.positions.length} / {p.pending.length}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
