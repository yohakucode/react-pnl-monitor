import { useEffect, useRef, useState } from "react";

export interface PollState<T> {
  data: T | null;
  error: boolean;
  at: number | null;
  loading: boolean;
}

/**
 * 一定間隔で取得。失敗しても直近データは保持し error だけ立てる。
 * key が変わると即時に再取得する(フィルタ変更用)。タブ非表示中は間隔取得を止める。
 */
export function usePoll<T>(load: () => Promise<T>, intervalMs: number, key: string): PollState<T> {
  const loadRef = useRef(load);
  loadRef.current = load;
  const [state, setState] = useState<PollState<T>>({ data: null, error: false, at: null, loading: true });

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    const tick = async () => {
      try {
        const d = await loadRef.current();
        if (alive) setState({ data: d, error: false, at: Date.now(), loading: false });
      } catch {
        if (alive) setState((s) => ({ ...s, error: true, loading: false }));
      }
    };
    void tick();
    const id = window.setInterval(() => {
      if (document.visibilityState !== "hidden") void tick();
    }, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [key, intervalMs]);

  return state;
}
