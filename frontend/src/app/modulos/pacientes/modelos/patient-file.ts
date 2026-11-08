import {
  AnthropometrySummary,
  AssessmentRecord,
  DiagnosisRecord,
  EnergyRecord,
  MenuPlanSummary,
} from '../../../nucleo/api.service';
import { IconName } from '../../../compartido/icono/icon.component';
import { calculateBmi } from '../../../nucleo/nutrition-math';
import { ConsultationListItem } from '../../atencion/modelos/consultation.models';

export interface PatientFileFollowUp {
  id: string;
  followUpDate: string;
  nextAppointmentOn: string | null;
  weightKg: number | null;
  planAdherencePercent: number | null;
}

export interface PatientFileMessage {
  id: string;
  createdAtUtc: string;
  channel: string;
  status: string;
}

/** Los listados de la API llegan del registro más reciente al más antiguo. */
export interface PatientFileData {
  assessments: AssessmentRecord[];
  measurements: AnthropometrySummary[];
  diagnoses: DiagnosisRecord[];
  energy: EnergyRecord[];
  plans: MenuPlanSummary[];
  followUps: PatientFileFollowUp[];
  consultations: ConsultationListItem[];
  messages: PatientFileMessage[];
}

export type StageState = 'done' | 'draft' | 'pending';

export interface PatientFileStage {
  key: string;
  title: string;
  icon: IconName;
  route: string;
  state: StageState;
  stateLabel: string;
  summary: string;
  date: string | null;
  pendingAction: string;
}

export interface TimelineEvent {
  key: string;
  date: string;
  type: string;
  detail: string;
  route: string;
}

/** Fechas clínicas sin hora: se leen como día local para que no retrocedan por la zona horaria. */
const dayOnly = (value: string): string => `${value.slice(0, 10)}T00:00:00`;

const formatKg = (value: number): string => `${Number(value).toFixed(1)} kg`;

const CHANNEL_LABELS: Record<string, string> = { Email: 'Correo', WhatsApp: 'WhatsApp' };
const MESSAGE_LABELS: Record<string, string> = {
  Draft: 'preparado, sin confirmar envío',
  Queued: 'pendiente de confirmación',
  Sent: 'enviado',
  Delivered: 'entregado',
  Read: 'leído',
  Failed: 'con error',
};
const CONSULTATION_LABELS: Record<string, string> = {
  Scheduled: 'Programada',
  InProgress: 'En curso',
  Completed: 'Completada',
  Cancelled: 'Cancelada',
};

export function consultationStatusLabel(status: string): string {
  return CONSULTATION_LABELS[status] ?? status;
}

const isApproved = (status: number | string): boolean => status === 1 || status === 'Approved';

export function buildStages(data: PatientFileData): PatientFileStage[] {
  const assessment = data.assessments[0];
  const measurement = data.measurements[0];
  const previous = data.measurements[1];
  const diagnosis = data.diagnoses[0];
  const energy = data.energy[0];
  const plan = data.plans[0];
  const followUp = data.followUps[0];
  const message = data.messages[0];

  const weightChange =
    measurement && previous ? Number(measurement.weightKg) - Number(previous.weightKg) : null;

  return [
    {
      key: 'assessment',
      title: 'Evaluación',
      icon: 'clipboard',
      route: '/evaluaciones',
      state: assessment ? 'done' : 'pending',
      stateLabel: assessment ? 'Registrada' : 'Pendiente',
      summary: assessment
        ? `Sueño ${assessment.sleepHours} h · ejercicio ${assessment.exerciseMinutesPerWeek} min/semana`
        : 'Aún no hay historia alimentaria ni hábitos registrados.',
      date: assessment?.recordedAtUtc ?? null,
      pendingAction: 'Registrar la primera evaluación',
    },
    {
      key: 'anthropometry',
      title: 'Antropometría',
      icon: 'activity',
      route: '/antropometria',
      state: measurement ? 'done' : 'pending',
      stateLabel: measurement ? 'Registrada' : 'Pendiente',
      summary: measurement
        ? [
            formatKg(measurement.weightKg),
            `IMC ${calculateBmi(Number(measurement.weightKg), Number(measurement.heightCm)).toFixed(1)}`,
            weightChange === null
              ? ''
              : `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} kg desde la anterior`,
          ]
            .filter(Boolean)
            .join(' · ')
        : 'Aún no hay medidas de peso ni estatura.',
      date: measurement ? dayOnly(measurement.measuredAtUtc) : null,
      pendingAction: 'Registrar la primera medición',
    },
    {
      key: 'diagnosis',
      title: 'Diagnóstico PES',
      icon: 'check',
      route: '/diagnosticos',
      state: !diagnosis ? 'pending' : isApproved(diagnosis.status) ? 'done' : 'draft',
      stateLabel: !diagnosis ? 'Pendiente' : isApproved(diagnosis.status) ? 'Aprobado' : 'Borrador',
      summary: diagnosis?.problemStatement || 'Aún no hay un diagnóstico nutricional.',
      date: diagnosis?.createdAtUtc ?? null,
      pendingAction: 'Registrar el diagnóstico',
    },
    {
      key: 'energy',
      title: 'Cálculo energético',
      icon: 'energy',
      route: '/calculos',
      state: energy ? 'done' : 'pending',
      stateLabel: energy ? 'Calculado' : 'Pendiente',
      summary: energy
        ? `${Math.round(Number(energy.totalEnergyKcal))} kcal/día`
        : 'Aún no hay requerimiento energético calculado.',
      date: energy?.createdAtUtc ?? null,
      pendingAction: 'Calcular el requerimiento',
    },
    {
      key: 'plan',
      title: 'Plan de menú',
      icon: 'menu',
      route: '/menus',
      state: !plan ? 'pending' : plan.status === 2 ? 'done' : 'draft',
      stateLabel: !plan ? 'Pendiente' : plan.status === 2 ? 'Aprobado' : 'Borrador',
      summary: plan
        ? `${plan.name} · ${Math.round(Number(plan.energyTargetKcal))} kcal/día`
        : 'Aún no hay un menú guardado.',
      date: plan ? dayOnly(plan.startsOn) : null,
      pendingAction: 'Armar el menú',
    },
    {
      key: 'followUp',
      title: 'Seguimiento',
      icon: 'clock',
      route: '/seguimientos',
      state: followUp ? 'done' : 'pending',
      stateLabel: followUp ? 'Registrado' : 'Sin controles',
      summary: followUp
        ? [
            followUp.weightKg === null ? '' : formatKg(followUp.weightKg),
            followUp.planAdherencePercent === null
              ? ''
              : `${followUp.planAdherencePercent} % de adherencia`,
          ]
            .filter(Boolean)
            .join(' · ') || 'Control registrado sin indicadores.'
        : 'Se registra cuando exista un control real.',
      date: followUp ? dayOnly(followUp.followUpDate) : null,
      pendingAction: 'Registrar un control',
    },
    {
      key: 'delivery',
      title: 'Entrega al paciente',
      icon: 'send',
      route: '/mensajeria',
      state: message ? 'done' : 'pending',
      stateLabel: message ? 'Con historial' : 'Sin envíos',
      summary: message
        ? `${CHANNEL_LABELS[message.channel] ?? message.channel}: ${MESSAGE_LABELS[message.status] ?? message.status}`
        : 'Aún no se ha compartido ningún documento.',
      date: message?.createdAtUtc ?? null,
      pendingAction: 'Preparar un envío',
    },
  ];
}

/** Primer paso clínico pendiente. Seguimiento y entrega dependen de que ocurran, no se exigen. */
export function nextPendingStage(stages: PatientFileStage[]): PatientFileStage | null {
  return (
    stages.find(
      (stage) => stage.state === 'pending' && stage.key !== 'followUp' && stage.key !== 'delivery',
    ) ?? null
  );
}

export function nextConsultation(
  consultations: ConsultationListItem[],
  now: Date = new Date(),
): ConsultationListItem | null {
  return (
    consultations
      .filter(
        (item) =>
          new Date(item.startsAtUtc) >= now &&
          item.status !== 'Cancelled' &&
          item.status !== 'Completed',
      )
      .sort((a, b) => new Date(a.startsAtUtc).getTime() - new Date(b.startsAtUtc).getTime())[0] ??
    null
  );
}

export function buildTimeline(data: PatientFileData, now: Date = new Date()): TimelineEvent[] {
  const events: TimelineEvent[] = [
    ...data.consultations
      .filter((item) => new Date(item.startsAtUtc) <= now)
      .map((item) => ({
        key: `consultation-${item.id}`,
        date: item.startsAtUtc,
        type: 'Atención',
        detail: `${item.reason} · ${consultationStatusLabel(item.status)}`,
        route: '/atencion',
      })),
    ...data.assessments.map((item) => ({
      key: `assessment-${item.id}`,
      date: item.recordedAtUtc,
      type: 'Evaluación',
      detail: `Sueño ${item.sleepHours} h · ejercicio ${item.exerciseMinutesPerWeek} min/semana`,
      route: '/evaluaciones',
    })),
    ...data.measurements.map((item) => ({
      key: `measurement-${item.id}`,
      date: dayOnly(item.measuredAtUtc),
      type: 'Antropometría',
      detail: `${formatKg(item.weightKg)} · ${Number(item.heightCm)} cm`,
      route: '/antropometria',
    })),
    ...data.diagnoses.map((item) => ({
      key: `diagnosis-${item.id}`,
      date: item.createdAtUtc,
      type: 'Diagnóstico PES',
      detail: `${isApproved(item.status) ? 'Aprobado' : 'Borrador'} · ${item.problemStatement}`,
      route: '/diagnosticos',
    })),
    ...data.energy.map((item) => ({
      key: `energy-${item.id}`,
      date: item.createdAtUtc,
      type: 'Cálculo energético',
      detail: `${Math.round(Number(item.totalEnergyKcal))} kcal/día`,
      route: '/calculos',
    })),
    ...data.plans.map((item) => ({
      key: `plan-${item.id}`,
      date: dayOnly(item.startsOn),
      type: 'Plan de menú',
      detail: `${item.name} · ${Math.round(Number(item.energyTargetKcal))} kcal/día`,
      route: '/menus',
    })),
    ...data.followUps.map((item) => ({
      key: `followup-${item.id}`,
      date: dayOnly(item.followUpDate),
      type: 'Seguimiento',
      detail:
        [
          item.weightKg === null ? '' : formatKg(item.weightKg),
          item.planAdherencePercent === null ? '' : `${item.planAdherencePercent} % de adherencia`,
        ]
          .filter(Boolean)
          .join(' · ') || 'Control registrado',
      route: '/seguimientos',
    })),
    ...data.messages.map((item) => ({
      key: `message-${item.id}`,
      date: item.createdAtUtc,
      type: 'Entrega',
      detail: `${CHANNEL_LABELS[item.channel] ?? item.channel}: ${MESSAGE_LABELS[item.status] ?? item.status}`,
      route: '/mensajeria',
    })),
  ];
  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
