export function calculateBmi(weightKg: number, heightCm: number): number {
  if (weightKg <= 0 || heightCm <= 0) throw new RangeError('Peso y estatura deben ser positivos.');
  return weightKg / Math.pow(heightCm / 100, 2);
}

export function completionPercent(values: readonly unknown[]): number {
  if (!values.length) return 0;
  const completed = values.filter(
    (value) => value !== null && value !== undefined && value !== '',
  ).length;
  return Math.round((completed / values.length) * 100);
}
