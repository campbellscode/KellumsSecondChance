type ClassValue = string | number | bigint | boolean | null | undefined;

/** Joins truthy class names. Deliberately tiny — no dependency needed. */
export function cn(...values: ClassValue[]): string {
  let out = '';
  for (const value of values) {
    if (!value && value !== 0) continue;
    out = out ? `${out} ${value}` : String(value);
  }
  return out;
}
