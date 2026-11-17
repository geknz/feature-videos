// All time arguments are seconds. Pure helpers, no framework dependencies.
export const clamp01 = value => Math.max(0, Math.min(1, value));
export function progress(time, start, duration) {
  if (!(duration > 0)) throw new RangeError('duration must be positive');
  return clamp01((time - start) / duration);
}
export const lerp = (from, to, p) => from + (to - from) * clamp01(p);
export function cameraPose(from, to, time, start, duration = 0.6) {
  const p = progress(time, start, duration);
  return { x: lerp(from.x, to.x, p), y: lerp(from.y, to.y, p), scale: lerp(from.scale, to.scale, p) };
}
export function pressFeedback(elapsed, down = 0.08, up = 0.12) {
  if (!(down > 0 && up > 0)) throw new RangeError('press durations must be positive');
  const amount = elapsed < 0 ? 0 : elapsed <= down ? clamp01(elapsed / down) : 1 - clamp01((elapsed - down) / up);
  return { scale: 1 - 0.02 * amount, highlightOpacity: 0.05 * amount };
}
