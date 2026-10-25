// The color multiplied over the screen, like the system's Night Shift: takes
// out blue and some green. Multiplying keeps black black (a translucent amber
// layer would lighten the Black theme) and dark text stays dark.
const MAX_GREEN_CUT = 0.22
const MAX_BLUE_CUT = 0.5

export function warmthColor(percent: number): string {
  const amount = Math.min(100, Math.max(0, percent)) / 100
  const green = Math.round(255 * (1 - MAX_GREEN_CUT * amount))
  const blue = Math.round(255 * (1 - MAX_BLUE_CUT * amount))
  return `rgb(255,${green},${blue})`
}
