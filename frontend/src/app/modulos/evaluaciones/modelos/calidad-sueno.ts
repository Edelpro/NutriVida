export const SLEEP_QUALITY_OPTIONS = ['Mala', 'Regular', 'Buena', 'Muy buena'] as const;

export function isLegacySleepQuality(value: string | null | undefined): boolean {
  return Boolean(
    value && !SLEEP_QUALITY_OPTIONS.includes(value as (typeof SLEEP_QUALITY_OPTIONS)[number]),
  );
}
