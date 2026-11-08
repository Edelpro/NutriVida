export type MeasureKey =
  | 'sittingHeightCm'
  | 'armSpanCm'
  | 'tricepsSkinfoldMm'
  | 'subscapularSkinfoldMm'
  | 'bicepsSkinfoldMm'
  | 'iliacCrestSkinfoldMm'
  | 'supraspinaleSkinfoldMm'
  | 'abdominalSkinfoldMm'
  | 'frontThighSkinfoldMm'
  | 'medialCalfSkinfoldMm'
  | 'armRelaxedCm'
  | 'armFlexedCm'
  | 'forearmCm'
  | 'chestCm'
  | 'midThighCm'
  | 'calfCm'
  | 'neckCm'
  | 'headCm'
  | 'humerusBreadthCm'
  | 'wristBreadthCm'
  | 'femurBreadthCm'
  | 'usualWeightKg'
  | 'kneeHeightCm'
  | 'gripStrengthKg';

export interface MeasureField {
  key: MeasureKey;
  label: string;
  unit: string;
  min: number;
  max: number;
}

export interface MeasureGroup {
  title: string;
  help: string;
  fields: MeasureField[];
}

const skinfold = (key: MeasureKey, label: string): MeasureField => ({ key, label, unit: 'mm', min: 1, max: 100 });

export const MEASURE_GROUPS: MeasureGroup[] = [
  {
    title: 'Pliegues cutáneos (ISAK)',
    help: 'Se calcula la suma de 6 y de 8 pliegues.',
    fields: [
      skinfold('tricepsSkinfoldMm', 'Tríceps'),
      skinfold('subscapularSkinfoldMm', 'Subescapular'),
      skinfold('bicepsSkinfoldMm', 'Bíceps'),
      skinfold('iliacCrestSkinfoldMm', 'Cresta ilíaca'),
      skinfold('supraspinaleSkinfoldMm', 'Supraespinal'),
      skinfold('abdominalSkinfoldMm', 'Abdominal'),
      skinfold('frontThighSkinfoldMm', 'Muslo frontal'),
      skinfold('medialCalfSkinfoldMm', 'Pantorrilla medial'),
    ],
  },
  {
    title: 'Perímetros (ISAK)',
    help: 'Cintura y cadera se registran arriba.',
    fields: [
      { key: 'armRelaxedCm', label: 'Brazo relajado', unit: 'cm', min: 5, max: 100 },
      { key: 'armFlexedCm', label: 'Brazo flexionado en tensión', unit: 'cm', min: 5, max: 100 },
      { key: 'forearmCm', label: 'Antebrazo máximo', unit: 'cm', min: 5, max: 100 },
      { key: 'chestCm', label: 'Tórax mesoesternal', unit: 'cm', min: 30, max: 250 },
      { key: 'midThighCm', label: 'Muslo medio', unit: 'cm', min: 10, max: 150 },
      { key: 'calfCm', label: 'Pantorrilla máxima', unit: 'cm', min: 5, max: 100 },
    ],
  },
  {
    title: 'Diámetros y longitudes (ISAK)',
    help: 'Diámetros óseos, talla sentada y envergadura.',
    fields: [
      { key: 'humerusBreadthCm', label: 'Húmero biepicondíleo', unit: 'cm', min: 1, max: 20 },
      { key: 'wristBreadthCm', label: 'Muñeca biestiloidea', unit: 'cm', min: 1, max: 20 },
      { key: 'femurBreadthCm', label: 'Fémur bicondíleo', unit: 'cm', min: 1, max: 25 },
      { key: 'sittingHeightCm', label: 'Talla sentada', unit: 'cm', min: 40, max: 150 },
      { key: 'armSpanCm', label: 'Envergadura', unit: 'cm', min: 60, max: 260 },
    ],
  },
  {
    title: 'Paciente clínico',
    help: 'Útil en pacientes encamados o con cambios de peso.',
    fields: [
      { key: 'usualWeightKg', label: 'Peso habitual', unit: 'kg', min: 20, max: 350 },
      { key: 'kneeHeightCm', label: 'Altura de rodilla', unit: 'cm', min: 20, max: 80 },
      { key: 'neckCm', label: 'Circunferencia de cuello', unit: 'cm', min: 10, max: 100 },
      { key: 'headCm', label: 'Perímetro cefálico', unit: 'cm', min: 20, max: 80 },
      { key: 'gripStrengthKg', label: 'Fuerza de agarre', unit: 'kg', min: 0, max: 150 },
    ],
  },
];

export const EDEMA_OPTIONS = ['Sin edema', '+', '++', '+++', '++++'];
export const ASCITES_OPTIONS = ['Sin ascitis', 'Leve', 'Moderada', 'Severa'];

export type MeasureValues = Partial<Record<MeasureKey, number | null | undefined>> & {
  weightKg?: number | null;
  heightCm?: number | null;
  waistCm?: number | null;
  hipCm?: number | null;
};

export interface DerivedIndicator {
  label: string;
  value: string;
  help: string;
}

const SIX_SKINFOLDS: MeasureKey[] = [
  'tricepsSkinfoldMm',
  'subscapularSkinfoldMm',
  'supraspinaleSkinfoldMm',
  'abdominalSkinfoldMm',
  'frontThighSkinfoldMm',
  'medialCalfSkinfoldMm',
];
const EIGHT_SKINFOLDS: MeasureKey[] = [...SIX_SKINFOLDS, 'bicepsSkinfoldMm', 'iliacCrestSkinfoldMm'];

const sumIfComplete = (values: MeasureValues, keys: MeasureKey[]): number | null => {
  const numbers = keys.map((key) => values[key]);
  return numbers.every((value) => value != null && Number(value) > 0)
    ? numbers.reduce<number>((sum, value) => sum + Number(value), 0)
    : null;
};

/** Solo operaciones sobre lo medido: no clasifica ni diagnostica. */
export function deriveIndicators(values: MeasureValues): DerivedIndicator[] {
  const indicators: DerivedIndicator[] = [];
  const weight = Number(values.weightKg);
  const height = Number(values.heightCm);
  const waist = Number(values.waistCm);
  const hip = Number(values.hipCm);
  const usual = Number(values.usualWeightKg);
  const arm = Number(values.armRelaxedCm);
  const triceps = Number(values.tricepsSkinfoldMm);

  if (weight > 0 && height > 0)
    indicators.push({ label: 'IMC', value: (weight / (height / 100) ** 2).toFixed(1), help: 'kg/m²' });
  if (waist > 0 && hip > 0)
    indicators.push({ label: 'Cintura/cadera', value: (waist / hip).toFixed(2), help: 'índice' });
  if (waist > 0 && height > 0)
    indicators.push({ label: 'Cintura/talla', value: (waist / height).toFixed(2), help: 'índice' });
  if (usual > 0 && weight > 0) {
    const change = ((usual - weight) / usual) * 100;
    indicators.push({
      label: change >= 0 ? 'Pérdida de peso' : 'Ganancia de peso',
      value: `${Math.abs(change).toFixed(1)} %`,
      help: 'frente al peso habitual',
    });
  }
  if (arm > 0 && triceps > 0) {
    const muscle = arm - Math.PI * (triceps / 10);
    indicators.push({ label: 'Circunferencia muscular del brazo', value: `${muscle.toFixed(1)} cm`, help: 'brazo − π × tríceps' });
    indicators.push({ label: 'Área muscular del brazo', value: `${((muscle * muscle) / (4 * Math.PI)).toFixed(1)} cm²`, help: 'sin corrección ósea' });
  }
  const six = sumIfComplete(values, SIX_SKINFOLDS);
  if (six !== null) indicators.push({ label: 'Suma de 6 pliegues', value: `${six.toFixed(1)} mm`, help: 'ISAK' });
  const eight = sumIfComplete(values, EIGHT_SKINFOLDS);
  if (eight !== null) indicators.push({ label: 'Suma de 8 pliegues', value: `${eight.toFixed(1)} mm`, help: 'ISAK' });
  return indicators;
}
