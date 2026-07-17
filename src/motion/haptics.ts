// Haptic grammar, defined once like the springs. Android Chrome vibrates;
// iOS Safari ignores navigator.vibrate — harmless either way.

export const HAPTIC = {
  tap: 12,
  stamp: [16, 40, 16],
  levelup: [30, 50, 30],
  subrank: [30, 50, 60],
  rankup: [40, 60, 40, 60, 140],
  gatefail: 80,
} as const;

export function haptic(pattern: number | readonly number[]): void {
  try {
    navigator.vibrate?.(pattern as number | number[]);
  } catch {
    // Unsupported or blocked — feel is a bonus, never a requirement.
  }
}
