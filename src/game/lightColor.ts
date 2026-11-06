/** Saturate pale source colors while preserving their hue. */
export const saturatedPoolColor = (color: number): number => {
  const r = ((color >> 16) & 255) / 255;
  const g = ((color >> 8) & 255) / 255;
  const b = (color & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  let hue = delta === 0 ? 0 : max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  if (hue < 0) hue += 6;
  const saturation = Math.min(1, (max === 0 ? 0 : delta / max) * 2.4 + 0.3);
  const x = saturation * (1 - Math.abs(hue % 2 - 1));
  const rgb = hue < 1 ? [saturation, x, 0] : hue < 2 ? [x, saturation, 0] : hue < 3 ? [0, saturation, x] :
    hue < 4 ? [0, x, saturation] : hue < 5 ? [x, 0, saturation] : [saturation, 0, x];
  const [rr = 0, gg = 0, bb = 0] = rgb.map((v) => Math.round((v + 1 - saturation) * 255));
  return (rr << 16) | (gg << 8) | bb;
};