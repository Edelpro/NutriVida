export type QuickTemplateScope = 'assessment' | 'followUp' | 'menuPlan' | 'communication';

export interface QuickTemplate {
  id: string;
  scope: QuickTemplateScope;
  name: string;
  category: string;
  objective: string;
  summary: string;
  values: Record<string, string>;
}

export type QuickTemplateRequest = Omit<QuickTemplate, 'id'>;

export interface QuickTemplateField {
  key: string;
  label: string;
  help: string;
  kind: 'input' | 'textarea' | 'select';
  options?: { value: string; label: string }[];
  rows?: number;
  maxLength: number;
  required?: boolean;
}

export interface QuickTemplateScopeConfig {
  title: string;
  description: string;
  editorHelp: string;
  fields: QuickTemplateField[];
}

export const QUICK_TEMPLATE_SCOPE_CONFIG: Record<QuickTemplateScope, QuickTemplateScopeConfig> = {
  assessment: {
    title: 'Estructuras para la entrevista',
    description: 'Completa los campos vacíos de toda la evaluación; nunca reemplaza datos ya registrados.',
    editorHelp: 'Llena solo lo que quieras reutilizar. Todo queda editable y el diagnóstico siempre debe aprobarse para cada paciente.',
    fields: [
      { key: 'dailyIntake', label: 'Recordatorio de ingesta', help: 'Estructura para comidas, bebidas y suplementos.', kind: 'textarea', rows: 5, maxLength: 4000 },
      { key: 'eatingSchedule', label: 'Horarios y contexto', help: 'Guía para horarios, lugar y compañía.', kind: 'textarea', rows: 4, maxLength: 1000 },
      { key: 'allergies', label: 'Alergias', help: 'Preguntas para confirmar reacción y fuente.', kind: 'textarea', rows: 3, maxLength: 2000 },
      { key: 'intolerances', label: 'Intolerancias', help: 'Guía para alimento, síntoma y contexto.', kind: 'textarea', rows: 3, maxLength: 2000 },
      { key: 'sleepQuality', label: 'Calidad del sueño', help: 'Aspectos cualitativos; las horas se registran manualmente.', kind: 'textarea', rows: 2, maxLength: 500 },
      { key: 'exerciseType', label: 'Tipo de ejercicio', help: 'Guía descriptiva; no completa minutos.', kind: 'textarea', rows: 2, maxLength: 500 },
      { key: 'exerciseSchedule', label: 'Horario de ejercicio', help: 'Días, horario y contexto.', kind: 'textarea', rows: 2, maxLength: 1000 },
      { key: 'bowelFrequency', label: 'Frecuencia intestinal', help: 'Guía descriptiva; Bristol se selecciona manualmente.', kind: 'textarea', rows: 2, maxLength: 500 },
      { key: 'clinicalNotes', label: 'Notas clínicas', help: 'Señales de alarma y acuerdos.', kind: 'textarea', rows: 5, maxLength: 4000 },
      { key: 'medicalHistory', label: 'Antecedentes personales', help: 'Enfermedades, cirugías y condiciones.', kind: 'textarea', rows: 3, maxLength: 2000 },
      { key: 'familyHistory', label: 'Antecedentes familiares', help: 'Diabetes, hipertensión u otras.', kind: 'textarea', rows: 3, maxLength: 2000 },
      { key: 'medications', label: 'Medicación', help: 'Nombre y dosis.', kind: 'textarea', rows: 2, maxLength: 1000 },
      { key: 'supplements', label: 'Suplementos', help: 'Vitaminas, proteínas u otros.', kind: 'textarea', rows: 2, maxLength: 1000 },
      { key: 'labResults', label: 'Laboratorios', help: 'Estudios a solicitar o revisar.', kind: 'textarea', rows: 3, maxLength: 2000 },
      { key: 'reproductiveStatus', label: 'Embarazo o lactancia', help: 'Solo si aplica a la plantilla.', kind: 'select', maxLength: 60, options: [{ value: 'Embarazo', label: 'Embarazo' }, { value: 'Lactancia', label: 'Lactancia' }] },
      { key: 'sleepHours', label: 'Horas de sueño', help: 'Valor de partida; confírmalo con el paciente.', kind: 'input', maxLength: 10 },
      { key: 'exerciseMinutesPerWeek', label: 'Minutos de ejercicio por semana', help: 'Valor de partida.', kind: 'input', maxLength: 10 },
      { key: 'hasConstipation', label: 'Estreñimiento', help: 'Valor de partida.', kind: 'select', maxLength: 10, options: [{ value: 'true', label: 'Sí' }, { value: 'false', label: 'No' }] },
      { key: 'bristolStoolType', label: 'Tipo de Bristol', help: 'Del 1 al 7.', kind: 'select', maxLength: 10, options: ['1', '2', '3', '4', '5', '6', '7'].map((value) => ({ value, label: `Tipo ${value}` })) },
      { key: 'problemCode', label: 'Código del diagnóstico', help: 'Ej. NI-1.3.', kind: 'input', maxLength: 80 },
      { key: 'problemStatement', label: 'Problema', help: 'Se guarda como borrador hasta que lo apruebes.', kind: 'textarea', rows: 2, maxLength: 1000 },
      { key: 'etiology', label: 'Etiología', help: 'Relacionado con…', kind: 'textarea', rows: 2, maxLength: 2000 },
      { key: 'signsAndSymptoms', label: 'Signos y síntomas', help: 'Evidenciado por…', kind: 'textarea', rows: 2, maxLength: 2000 },
    ],
  },
  followUp: {
    title: 'Guías para la nota de seguimiento',
    description: 'Completa los campos vacíos del seguimiento; nunca reemplaza datos ya registrados.',
    editorHelp: 'Llena solo lo que quieras reutilizar. El peso y las fechas siempre se registran con el control real.',
    fields: [
      { key: 'professionalNotes', label: 'Estructura de la nota profesional', help: 'Cambios, logros, barreras, ajustes y próximo control.', kind: 'textarea', rows: 7, maxLength: 4000, required: true },
      { key: 'symptoms', label: 'Síntomas o dificultades', help: 'Hambre, digestión, energía, barreras.', kind: 'textarea', rows: 3, maxLength: 2000 },
      { key: 'adjustments', label: 'Ajustes acordados', help: 'Porciones, horarios, actividad.', kind: 'textarea', rows: 3, maxLength: 2000 },
      { key: 'exerciseType', label: 'Tipo de ejercicio', help: 'Tipo e intensidad.', kind: 'input', maxLength: 300 },
      { key: 'exerciseMinutes', label: 'Minutos de ejercicio', help: 'Valor de partida.', kind: 'input', maxLength: 10 },
      { key: 'averageSleepHours', label: 'Sueño promedio', help: 'Horas por día.', kind: 'input', maxLength: 10 },
      { key: 'planAdherencePercent', label: 'Adherencia', help: 'Porcentaje de partida.', kind: 'input', maxLength: 10 },
      { key: 'bristolStoolType', label: 'Tipo de Bristol', help: 'Del 1 al 7.', kind: 'select', maxLength: 10, options: ['1', '2', '3', '4', '5', '6', '7'].map((value) => ({ value, label: `Tipo ${value}` })) },
      { key: 'objectiveStatus', label: 'Estado del objetivo', help: 'Conclusión de partida.', kind: 'select', maxLength: 10, options: [{ value: '1', label: 'En progreso' }, { value: '2', label: 'Alcanzado' }, { value: '3', label: 'Sin cambios' }, { value: '4', label: 'Requiere ajuste' }] },
      { key: 'followUpIntervalDays', label: 'Frecuencia del próximo control', help: 'Días.', kind: 'input', maxLength: 10 },
    ],
  },
  menuPlan: {
    title: 'Bases de planes de menú',
    description: 'Reutiliza nombre, notas, meta y alimentos. Usa "Guardar como plantilla" para guardar un menú completo.',
    editorHelp: 'Guarda una base editable. El plan siempre debe revisarse y aprobarse para cada paciente.',
    fields: [
      { key: 'planName', label: 'Nombre sugerido del plan', help: 'Se puede cambiar antes de guardar.', kind: 'input', maxLength: 180, required: true },
      { key: 'energyTargetKcal', label: 'Meta energética', help: 'Kcal por día; confírmala con el cálculo del paciente.', kind: 'input', maxLength: 10 },
      { key: 'professionalNotes', label: 'Notas profesionales reutilizables', help: 'Incluye verificaciones pendientes, no indicaciones universales.', kind: 'textarea', rows: 7, maxLength: 2000, required: true },
    ],
  },
  communication: {
    title: 'Mensajes frecuentes',
    description: 'Prepara asunto y texto; nunca envía ni adjunta documentos automáticamente.',
    editorHelp: 'Evita datos clínicos sensibles. El mensaje siempre debe revisarse con el paciente y canal seleccionados.',
    fields: [
      { key: 'subject', label: 'Asunto', help: 'Breve y sin información clínica sensible.', kind: 'input', maxLength: 180, required: true },
      { key: 'message', label: 'Mensaje', help: 'Texto base que se personaliza antes de preparar el envío.', kind: 'textarea', rows: 7, maxLength: 4000, required: true },
    ],
  },
};
