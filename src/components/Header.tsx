import { useEffect, useState } from "react";
import { jstClock } from "../format";
import type { ThemePref } from "../hooks/useTheme";
import { Chip, Segmented } from "./Signed";

const THEMES: { key: ThemePref; label: string }[] = [
  { key: "system", label: "自動" },
  { key: "light", label: "ライト" },
  { key: "dark", label: "ダーク" },
];

export function Header({
  at,
  error,
  theme,
  onTheme,
}: {
  at: number | null;
  error: boolean;
  theme: ThemePref;
  onTheme: (t: ThemePref) => void;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <header className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-3 gap-y-2 px-5 pt-4 pb-4">
      <div className="num text-[15px] font-semibold tracking-[0.16em]">pnl-monitor</div>
      <div className="text-[13px] text-(--fg-mute)">損益モニター</div>
      <Chip kind="warn">架空データ</Chip>
      <div className="num ml-auto flex items-center gap-4 text-[11px] text-(--fg-mute)">
        <span aria-live="off">{jstClock(now)} JST</span>
        {error ? (
          <span className="text-(--warn)" role="status">
            接続エラー。再試行しています
          </span>
        ) : (
          <span role="status">更新 {at ? jstClock(new Date(at)) : "…"}</span>
        )}
      </div>
      <Segmented value={theme} options={THEMES} onChange={onTheme} label="配色" size="sm" />
    </header>
  );
}
