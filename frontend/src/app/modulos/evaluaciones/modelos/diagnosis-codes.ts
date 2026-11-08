/**
 * Códigos del diagnóstico nutricional (terminología NCP). La clínica debe confirmarlos
 * contra su edición vigente; "Otro código" permite registrar los que no estén aquí.
 */
export interface DiagnosisCode {
  code: string;
  label: string;
}

export interface DiagnosisCodeGroup {
  domain: string;
  codes: DiagnosisCode[];
}

export const OTHER_DIAGNOSIS_CODE = '__otro__';

export const DIAGNOSIS_CODE_GROUPS: DiagnosisCodeGroup[] = [
  {
    domain: 'NI · Ingesta: energía',
    codes: [
      { code: 'NI-1.1', label: 'Aumento del gasto energético' },
      { code: 'NI-1.2', label: 'Ingesta inadecuada de energía' },
      { code: 'NI-1.3', label: 'Ingesta excesiva de energía' },
      { code: 'NI-1.4', label: 'Ingesta subóptima predicha de energía' },
      { code: 'NI-1.5', label: 'Ingesta excesiva predicha de energía' },
    ],
  },
  {
    domain: 'NI · Ingesta: alimentos y bebidas, vías',
    codes: [
      { code: 'NI-2.1', label: 'Ingesta oral inadecuada' },
      { code: 'NI-2.2', label: 'Ingesta oral excesiva' },
      { code: 'NI-2.3', label: 'Infusión de nutrición enteral inadecuada' },
      { code: 'NI-2.4', label: 'Infusión de nutrición enteral excesiva' },
      { code: 'NI-2.5', label: 'Composición de nutrición enteral menos que óptima' },
      { code: 'NI-2.6', label: 'Infusión de nutrición parenteral inadecuada' },
      { code: 'NI-2.7', label: 'Infusión de nutrición parenteral excesiva' },
      { code: 'NI-2.8', label: 'Composición de nutrición parenteral menos que óptima' },
      { code: 'NI-2.9', label: 'Aceptación limitada de alimentos' },
    ],
  },
  {
    domain: 'NI · Ingesta: líquidos',
    codes: [
      { code: 'NI-3.1', label: 'Ingesta inadecuada de líquidos' },
      { code: 'NI-3.2', label: 'Ingesta excesiva de líquidos' },
    ],
  },
  {
    domain: 'NI · Ingesta: sustancias bioactivas y alcohol',
    codes: [
      { code: 'NI-4.1', label: 'Ingesta inadecuada de sustancias bioactivas' },
      { code: 'NI-4.2', label: 'Ingesta excesiva de sustancias bioactivas' },
      { code: 'NI-4.3', label: 'Ingesta excesiva de alcohol' },
    ],
  },
  {
    domain: 'NI · Ingesta: nutrientes',
    codes: [
      { code: 'NI-5.1', label: 'Aumento de las necesidades de nutrientes' },
      { code: 'NI-5.3', label: 'Ingesta inadecuada de proteína y energía' },
      { code: 'NI-5.4', label: 'Disminución de las necesidades de nutrientes' },
      { code: 'NI-5.5', label: 'Desequilibrio de nutrientes' },
      { code: 'NI-5.6.1', label: 'Ingesta inadecuada de grasa' },
      { code: 'NI-5.6.2', label: 'Ingesta excesiva de grasa' },
      { code: 'NI-5.6.3', label: 'Tipo de grasa menos que óptimo' },
      { code: 'NI-5.7.1', label: 'Ingesta inadecuada de proteína' },
      { code: 'NI-5.7.2', label: 'Ingesta excesiva de proteína' },
      { code: 'NI-5.7.3', label: 'Proteína o aminoácidos menos que óptimos' },
      { code: 'NI-5.8.1', label: 'Ingesta inadecuada de carbohidratos' },
      { code: 'NI-5.8.2', label: 'Ingesta excesiva de carbohidratos' },
      { code: 'NI-5.8.3', label: 'Tipo de carbohidrato menos que óptimo' },
      { code: 'NI-5.8.4', label: 'Ingesta inconsistente de carbohidratos' },
      { code: 'NI-5.8.5', label: 'Ingesta inadecuada de fibra' },
      { code: 'NI-5.8.6', label: 'Ingesta excesiva de fibra' },
      { code: 'NI-5.9.1', label: 'Ingesta inadecuada de vitamina' },
      { code: 'NI-5.9.2', label: 'Ingesta excesiva de vitamina' },
      { code: 'NI-5.10.1', label: 'Ingesta inadecuada de mineral' },
      { code: 'NI-5.10.2', label: 'Ingesta excesiva de mineral' },
      { code: 'NI-5.11.1', label: 'Ingesta subóptima predicha de nutrientes' },
      { code: 'NI-5.11.2', label: 'Ingesta excesiva predicha de nutrientes' },
    ],
  },
  {
    domain: 'NC · Clínico: funcional',
    codes: [
      { code: 'NC-1.1', label: 'Dificultad para deglutir' },
      { code: 'NC-1.2', label: 'Dificultad para morder o masticar' },
      { code: 'NC-1.3', label: 'Dificultad para la lactancia' },
      { code: 'NC-1.4', label: 'Función gastrointestinal alterada' },
    ],
  },
  {
    domain: 'NC · Clínico: bioquímico',
    codes: [
      { code: 'NC-2.1', label: 'Utilización de nutrientes alterada' },
      { code: 'NC-2.2', label: 'Valores de laboratorio relacionados con la nutrición alterados' },
      { code: 'NC-2.3', label: 'Interacción alimento-medicamento' },
      { code: 'NC-2.4', label: 'Interacción alimento-medicamento predicha' },
    ],
  },
  {
    domain: 'NC · Clínico: peso',
    codes: [
      { code: 'NC-3.1', label: 'Bajo peso' },
      { code: 'NC-3.2', label: 'Pérdida de peso no intencionada' },
      { code: 'NC-3.3', label: 'Sobrepeso u obesidad' },
      { code: 'NC-3.3.1', label: 'Sobrepeso' },
      { code: 'NC-3.3.2', label: 'Exceso de adiposidad' },
      { code: 'NC-3.3.3', label: 'Obesidad, clase I' },
      { code: 'NC-3.3.4', label: 'Obesidad, clase II' },
      { code: 'NC-3.3.5', label: 'Obesidad, clase III' },
      { code: 'NC-3.4', label: 'Aumento de peso no intencionado' },
      { code: 'NC-3.5', label: 'Velocidad de crecimiento menor a la esperada' },
    ],
  },
  {
    domain: 'NC · Clínico: desnutrición',
    codes: [
      { code: 'NC-4.1', label: 'Desnutrición' },
      { code: 'NC-4.1.1', label: 'Desnutrición aguda relacionada con enfermedad' },
      { code: 'NC-4.1.2', label: 'Desnutrición crónica relacionada con enfermedad' },
      { code: 'NC-4.1.3', label: 'Desnutrición aguda relacionada con inanición' },
      { code: 'NC-4.1.4', label: 'Desnutrición crónica relacionada con inanición' },
      { code: 'NC-4.1.5', label: 'Desnutrición relacionada con circunstancias sociales o ambientales' },
    ],
  },
  {
    domain: 'NB · Conducta: conocimientos y creencias',
    codes: [
      { code: 'NB-1.1', label: 'Déficit de conocimientos sobre alimentación y nutrición' },
      { code: 'NB-1.2', label: 'Creencias o actitudes no respaldadas sobre alimentación' },
      { code: 'NB-1.3', label: 'No preparado para el cambio de dieta o estilo de vida' },
      { code: 'NB-1.4', label: 'Déficit de automonitoreo' },
      { code: 'NB-1.5', label: 'Patrón alimentario alterado' },
      { code: 'NB-1.6', label: 'Adherencia limitada a las recomendaciones' },
      { code: 'NB-1.7', label: 'Elecciones de alimentos indeseables' },
    ],
  },
  {
    domain: 'NB · Conducta: actividad física y función',
    codes: [
      { code: 'NB-2.1', label: 'Inactividad física' },
      { code: 'NB-2.2', label: 'Actividad física excesiva' },
      { code: 'NB-2.3', label: 'Incapacidad para el autocuidado' },
      { code: 'NB-2.4', label: 'Capacidad alterada para preparar alimentos' },
      { code: 'NB-2.5', label: 'Calidad de vida nutricional deficiente' },
      { code: 'NB-2.6', label: 'Dificultad para alimentarse por sí mismo' },
    ],
  },
  {
    domain: 'NB · Conducta: inocuidad y acceso',
    codes: [
      { code: 'NB-3.1', label: 'Ingesta de alimentos no inocuos' },
      { code: 'NB-3.2', label: 'Acceso limitado a alimentos o agua' },
      { code: 'NB-3.3', label: 'Acceso limitado a suministros relacionados con la nutrición' },
    ],
  },
  {
    domain: 'NO · Otros',
    codes: [{ code: 'NO-1.1', label: 'Sin diagnóstico nutricional en este momento' }],
  },
];

export function findDiagnosisCode(code: string): DiagnosisCode | undefined {
  for (const group of DIAGNOSIS_CODE_GROUPS) {
    const match = group.codes.find((item) => item.code === code);
    if (match) return match;
  }
  return undefined;
}
