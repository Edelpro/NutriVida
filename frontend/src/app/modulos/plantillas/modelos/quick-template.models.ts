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
  kind: 'input' | 'textarea';
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
    description: 'Agrega guías solo a los campos vacíos; nunca reemplaza datos ya registrados.',
    editorHelp: 'Guarda preguntas o estructuras de entrevista. No incluyas diagnósticos ni mediciones predeterminadas.',
    fields: [
      { key: 'dailyIntake', label: 'Recordatorio de ingesta', help: 'Estructura para comidas, bebidas y suplementos.', kind: 'textarea', rows: 5, maxLength: 4000 },
      { key: 'eatingSchedule', label: 'Horarios y contexto', help: 'Guía para horarios, lugar y compañía.', kind: 'textarea', rows: 4, maxLength: 1000 },
      { key: 'allergies', label: 'Alergias', help: 'Preguntas para confirmar reacción y fuente.', kind: 'textarea', rows: 3, maxLength: 2000 },
      { key: 'intolerances', label: 'Intolerancias', help: 'Guía para alimento, síntoma y contexto.', kind: 'textarea', rows: 3, maxLength: 2000 },
      { key: 'sleepQuality', label: 'Calidad del sueño', help: 'Aspectos cualitativos; las horas se registran manualmente.', kind: 'textarea', rows: 2, maxLength: 500 },
      { key: 'exerciseType', label: 'Tipo de ejercicio', help: 'Guía descriptiva; no completa minutos.', kind: 'textarea', rows: 2, maxLength: 500 },
      { key: 'exerciseSchedule', label: 'Horario de ejercicio', help: 'Días, horario y contexto.', kind: 'textarea', rows: 2, maxLength: 1000 },
      { key: 'bowelFrequency', label: 'Frecuencia intestinal', help: 'Guía descriptiva; Bristol se selecciona manualmente.', kind: 'textarea', rows: 2, maxLength: 500 },
      { key: 'clinicalNotes', label: 'Notas clínicas', help: 'Antecedentes, señales de alarma y acuerdos.', kind: 'textarea', rows: 5, maxLength: 4000 },
    ],
  },
  followUp: {
    title: 'Guías para la nota de seguimiento',
    description: 'Completa solo una nota profesional vacía; las mediciones siguen siendo datos reales.',
    editorHelp: 'Crea una estructura de revisión. Peso, adherencia, sueño y síntomas nunca se autocompletan.',
    fields: [
      { key: 'professionalNotes', label: 'Estructura de la nota profesional', help: 'Cambios, logros, barreras, ajustes y próximo control.', kind: 'textarea', rows: 7, maxLength: 4000, required: true },
    ],
  },
  menuPlan: {
    title: 'Bases de planes de menú',
    description: 'Reutiliza un nombre y notas de planificación; alimentos y porciones se agregan manualmente.',
    editorHelp: 'Guarda una base editable. La plantilla no agrega alimentos, prescribe porciones ni aprueba el plan.',
    fields: [
      { key: 'planName', label: 'Nombre sugerido del plan', help: 'Se puede cambiar antes de guardar.', kind: 'input', maxLength: 180, required: true },
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
