import { useState } from "react";
import { fetchStatus, fetchTrades, type Filter } from "./api";
import { Board } from "./components/Board";
import { Header } from "./components/Header";
import { Ledger } from "./components/Ledger";
import { usePoll } from "./hooks/usePoll";
import { useTheme } from "./hooks/useTheme";

export default function App() {
  const [theme, setTheme] = useTheme();
  const status = usePoll(fetchStatus, 15_000, "status");
  const [filter, setFilter] = useState<Filter>({ preset: "all", from: "", to: "", pair: "", source: "" });
  const key = [filter.from, filter.to, filter.pair, filter.source].join("|");
  const trades = usePoll(() => fetchTrades(filter), 60_000, key);

  return (
    <div className="min-h-screen bg-(--bg) text-(--fg)">
      <div className="surface-board border-b border-(--line) bg-(--bg-deep)">
        <Header at={status.at} error={status.error} theme={theme} onTheme={setTheme} />
        <Board status={status.data} />
      </div>
      <div className="bg-(--bg)">
        <Ledger data={trades.data} loading={trades.loading} filter={filter} onFilter={setFilter} />
      </div>
    </div>
  );
}
