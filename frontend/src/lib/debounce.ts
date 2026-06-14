/**
 * 針對「同一把 key」做 debounce 的工具。
 * 用途:Slider 連續拖曳時,每個 input 事件都即時更新本地畫面,
 * 但真正昂貴的動作(打 API 持久化)只在停止拖曳約 300ms 後對「該零件」觸發一次,
 * 避免拖曳過程中送出數十次請求 / 卡住瀏覽器。
 */
export function createKeyedDebouncer<T extends unknown[]>(
  fn: (key: string, ...args: T) => void,
  wait = 300,
) {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  function trigger(key: string, ...args: T): void {
    const existing = timers.get(key);
    if (existing) clearTimeout(existing);
    timers.set(
      key,
      setTimeout(() => {
        timers.delete(key);
        fn(key, ...args);
      }, wait),
    );
  }

  /** 立刻送出某把 key 的待處理動作(例如失焦時) */
  function flush(key: string, ...args: T): void {
    const existing = timers.get(key);
    if (existing) {
      clearTimeout(existing);
      timers.delete(key);
    }
    fn(key, ...args);
  }

  return { trigger, flush };
}
