/** Wall-clock deltas remain correct when a background tab throttles intervals. */
export function elapsedSeconds(
  base: number,
  startedAt: number,
  now: number,
  limit = Infinity
) {
  return Math.min(
    limit,
    Math.max(0, base + Math.floor((now - startedAt) / 1000))
  );
}
export function formatTimer(seconds: number) {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
