/**
 * Haptic feedback for key actions (copy, confirm, success).
 * Uses Vibration API where available — silent no-op elsewhere.
 */
export type HapticKind = "light" | "medium" | "success" | "error";

const PATTERNS: Record<HapticKind, number | number[]> = {
  light: 10,
  medium: 25,
  success: [12, 40, 12],
  error: [30, 40, 30],
};

export function haptic(kind: HapticKind = "light"): void {
  try {
    if (typeof navigator === "undefined" || !navigator.vibrate) return;
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    // ignore — not supported
  }
}

/** Copy text + light haptic + returns success boolean */
export async function copyWithHaptic(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    haptic("success");
    return true;
  } catch {
    haptic("error");
    return false;
  }
}
