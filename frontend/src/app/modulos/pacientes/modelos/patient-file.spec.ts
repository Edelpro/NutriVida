import { describe, expect, it } from 'vitest';

import {
  PatientFileData,
  buildStages,
  buildTimeline,
  nextConsultation,
  nextPendingStage,
} from './patient-file';

const empty: PatientFileData = {
  assessments: [],
  measurements: [],
  diagnoses: [],
  energy: [],
  plans: [],
  followUps: [],
  consultations: [],
  messages: [],
};

const measure = (id: string, measuredAtUtc: string, weightKg: number) =>
  ({ id, measuredAtUtc, weightKg, heightCm: 164 }) as PatientFileData['measurements'][number];

const consultation = (id: string, startsAtUtc: string, status = 'Scheduled') =>
  ({ id, startsAtUtc, status, reason: 'Control' }) as PatientFileData['consultations'][number];

describe('ficha del paciente', () => {
  it('sin datos marca todo pendiente y propone la evaluación', () => {
    const stages = buildStages(empty);
    expect(stages.every((stage) => stage.state === 'pending')).toBe(true);
    expect(nextPendingStage(stages)?.key).toBe('assessment');
  });

  it('calcula el IMC y el cambio con la medición anterior', () => {
    const stages = buildStages({
      ...empty,
      measurements: [
        measure('2', '2026-10-31T00:00:00Z', 66.9),
        measure('1', '2026-10-03T00:00:00Z', 68.4),
      ],
    });
    const summary = stages.find((stage) => stage.key === 'anthropometry')?.summary;
    expect(summary).toBe('66.9 kg · IMC 24.9 · -1.5 kg desde la anterior');
  });

  it('distingue un diagnóstico en borrador de uno aprobado', () => {
    const diagnosis = (status: number) =>
      buildStages({
        ...empty,
        diagnoses: [{ id: '1', status, problemStatement: 'Ingesta', createdAtUtc: '2026-10-01T10:00:00Z' }],
      } as PatientFileData).find((stage) => stage.key === 'diagnosis')?.stateLabel;
    expect(diagnosis(0)).toBe('Borrador');
    expect(diagnosis(1)).toBe('Aprobado');
  });

  it('no pide seguimiento ni entrega como siguiente paso', () => {
    const stages = buildStages(empty).map((stage) =>
      stage.key === 'followUp' || stage.key === 'delivery'
        ? stage
        : { ...stage, state: 'done' as const },
    );
    expect(nextPendingStage(stages)).toBeNull();
  });

  it('una medición conserva su día aunque en Ecuador sea el día anterior en UTC', () => {
    const stage = buildStages({
      ...empty,
      measurements: [measure('1', '2026-10-31T00:00:00Z', 70)],
    }).find((item) => item.key === 'anthropometry');
    expect(stage?.date).toBe('2026-10-31T00:00:00');
  });

  it('la próxima atención ignora pasadas, canceladas y completadas', () => {
    const now = new Date('2026-11-02T12:00:00Z');
    const next = nextConsultation(
      [
        consultation('pasada', '2026-11-01T14:00:00Z'),
        consultation('cancelada', '2026-11-03T14:00:00Z', 'Cancelled'),
        consultation('lejana', '2026-11-20T14:00:00Z'),
        consultation('cercana', '2026-11-05T14:00:00Z'),
      ],
      now,
    );
    expect(next?.id).toBe('cercana');
  });

  it('la línea de tiempo va de lo más reciente a lo más antiguo y omite citas futuras', () => {
    const events = buildTimeline(
      {
        ...empty,
        measurements: [measure('1', '2026-10-03T00:00:00Z', 70)],
        consultations: [
          consultation('futura', '2026-12-01T14:00:00Z'),
          consultation('pasada', '2026-10-20T14:00:00Z', 'Completed'),
        ],
      },
      new Date('2026-11-02T12:00:00Z'),
    );
    expect(events.map((event) => event.key)).toEqual(['consultation-pasada', 'measurement-1']);
    expect(events[0].detail).toBe('Control · Completada');
  });
});
