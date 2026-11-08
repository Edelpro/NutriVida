import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from './configuracion/api.tokens';
import { apiErrorMessage } from './http/api-error';
import { MeasureKey } from '../modulos/antropometria/modelos/anthropometry-fields';

export interface Patient {
  id: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  goal: string;
  status: string;
  assignedNutritionistUserId: string | null;
  assignedNutritionistName: string | null;
}
export interface PatientDetails extends Patient {
  sexAtBirth: number;
  occupation: string;
  emailConsent: boolean;
  whatsAppConsent: boolean;
  rowVersion: string;
}
export interface PagedPatients {
  items: Patient[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
export interface Food {
  id: string;
  name: string;
  group: string;
  exchangeGroup: string;
  portionGrams: number;
  householdMeasure: string;
  energyKcal: number;
  proteinG: number;
  carbohydrateG: number;
  fatG: number;
  fiberG: number;
  sodiumMg: number;
  source: number;
  sourceEdition: string;
  sourceReference: string;
}
export interface SavePersonalizedFood {
  name: string;
  group: string;
  portionGrams: number;
  householdMeasure: string;
  energyKcal: number;
  proteinG: number;
  carbohydrateG: number;
  fatG: number;
  fiberG: number;
  sodiumMg: number;
  sourceReference: string;
}
export interface FoodCatalogImport {
  id: string;
  source: number;
  sourceEdition: string;
  sourceReference: string;
  originalFileName: string;
  sha256: string;
  importedRows: number;
  updatedRows: number;
  importedByEmail: string;
  importedAtUtc: string;
}
export interface AuditEvent {
  id: string;
  occurredAtUtc: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  changedFields: string;
  correlationId: string;
}
export interface DashboardData {
  activePatients: number;
  consultationsToday: number;
  pendingFollowUps: number;
  appointments: {
    id: string;
    patientId: string;
    patientName: string;
    startsAtUtc: string;
    reason: string;
    status: string;
  }[];
  latestMeasurements: {
    id: string;
    patientName: string;
    weightKg: number;
    heightCm: number;
    measuredAtUtc: string;
  }[];
}
export interface EnergyResult {
  formula: string;
  restingEnergyKcal: number;
  activityEnergyKcal: number;
  etaKcal: number;
  goalAdjustmentKcal: number;
  totalEnergyKcal: number;
  equation: string;
  source: string;
  caution: string;
}
export interface AssessmentRecord {
  id: string;
  patientId: string;
  recordedAtUtc: string;
  dailyIntake: string;
  eatingSchedule: string;
  allergies: string;
  intolerances: string;
  sleepHours: number;
  sleepQuality: string;
  exerciseType: string;
  exerciseMinutesPerWeek: number;
  exerciseSchedule: string;
  hasConstipation: boolean;
  bristolStoolType: number | null;
  bowelFrequency: string;
  clinicalNotes: string;
  medicalHistory: string;
  familyHistory: string;
  medications: string;
  supplements: string;
  labResults: string;
  reproductiveStatus: string;
  recall24hJson: string;
}
export interface DiagnosisRecord {
  id: string;
  patientId: string;
  assessmentId: string | null;
  problemCode: string;
  problemStatement: string;
  etiology: string;
  signsAndSymptoms: string;
  status: number | string;
  professionalName: string;
  createdAtUtc: string;
  approvedAtUtc: string | null;
  approvedByName: string;
}
export interface EnergyRecord {
  id: string;
  patientId: string;
  formula: number;
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: string;
  activityFactor: number;
  etaPercent: number;
  goalAdjustmentKcal: number;
  restingEnergyKcal: number;
  totalEnergyKcal: number;
  createdAtUtc: string;
  calculatedByName: string;
}
export type AnthropometrySummary = Partial<Record<MeasureKey, number | null>> & {
  id: string;
  patientId: string;
  weightKg: number;
  heightCm: number;
  waistCm: number | null;
  hipCm: number | null;
  bodyFatPercent: number | null;
  measuredAtUtc: string;
  notes: string;
  edemaGrade: string;
  ascitesGrade: string;
};
export interface MenuPlanSummary {
  id: string;
  patientId: string;
  name: string;
  startsOn: string;
  endsOn: string;
  energyTargetKcal: number;
  professionalNotes: string;
  status: number;
  approvedAtUtc: string | null;
  approvedByName: string;
  items: {
    id: string;
    foodItemId: string | null;
    dayOfWeek: number;
    mealName: string;
    foodNameSnapshot: string;
    portions: number;
    grams: number;
    energyKcal: number;
    householdMeasure: string;
  }[];
}
export interface ClinicSettings {
  practiceName: string;
  address: string;
  defaultFormula: number;
  defaultEtaPercent: number;
}
export interface MessagingIntegrationStatus {
  email: { configured: boolean; mode: string };
  whatsApp: { configured: boolean; mode: string };
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  dashboard(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.base}/dashboard`).pipe(catchError(this.handle));
  }
  patients(q = '', page = 1): Observable<PagedPatients> {
    const params = new HttpParams().set('q', q).set('page', page).set('pageSize', 10);
    return this.http
      .get<PagedPatients>(`${this.base}/patients`, { params })
      .pipe(catchError(this.handle));
  }
  createPatient(body: unknown): Observable<Patient> {
    return this.http.post<Patient>(`${this.base}/patients`, body).pipe(catchError(this.handle));
  }
  patient(id: string): Observable<PatientDetails> {
    return this.http
      .get<PatientDetails>(`${this.base}/patients/${id}`)
      .pipe(catchError(this.handle));
  }
  updatePatient(id: string, body: unknown): Observable<PatientDetails> {
    return this.http
      .put<PatientDetails>(`${this.base}/patients/${id}`, body)
      .pipe(catchError(this.handle));
  }
  updatePatientConsents(
    id: string,
    body: { emailConsent: boolean; whatsAppConsent: boolean },
  ): Observable<PatientDetails> {
    return this.http
      .put<PatientDetails>(`${this.base}/patients/${id}/consents`, body)
      .pipe(catchError(this.handle));
  }
  archivePatient(id: string): Observable<void> {
    return this.http
      .post<void>(`${this.base}/patients/${id}/archive`, {})
      .pipe(catchError(this.handle));
  }
  assessments(patientId: string): Observable<AssessmentRecord[]> {
    return this.http
      .get<AssessmentRecord[]>(`${this.base}/patients/${patientId}/assessments`)
      .pipe(catchError(this.handle));
  }
  saveAssessment(patientId: string, body: unknown): Observable<AssessmentRecord> {
    return this.http
      .post<AssessmentRecord>(`${this.base}/patients/${patientId}/assessments`, body)
      .pipe(catchError(this.handle));
  }
  updateAssessment(patientId: string, id: string, body: unknown): Observable<AssessmentRecord> {
    return this.http
      .put<AssessmentRecord>(`${this.base}/patients/${patientId}/assessments/${id}`, body)
      .pipe(catchError(this.handle));
  }
  archiveAssessment(patientId: string, id: string): Observable<void> {
    return this.http
      .post<void>(`${this.base}/patients/${patientId}/assessments/${id}/archive`, {})
      .pipe(catchError(this.handle));
  }
  latestAnthropometry(patientId: string): Observable<AnthropometrySummary | null> {
    return this.http
      .get<AnthropometrySummary | null>(`${this.base}/patients/${patientId}/anthropometry/latest`)
      .pipe(catchError(this.handle));
  }
  anthropometry(patientId: string): Observable<AnthropometrySummary[]> {
    return this.http
      .get<AnthropometrySummary[]>(`${this.base}/patients/${patientId}/anthropometry`)
      .pipe(catchError(this.handle));
  }
  saveAnthropometry(patientId: string, body: unknown): Observable<AnthropometrySummary> {
    return this.http
      .post<AnthropometrySummary>(`${this.base}/patients/${patientId}/anthropometry`, body)
      .pipe(catchError(this.handle));
  }
  updateAnthropometry(patientId: string, id: string, body: unknown): Observable<AnthropometrySummary> {
    return this.http
      .put<AnthropometrySummary>(`${this.base}/patients/${patientId}/anthropometry/${id}`, body)
      .pipe(catchError(this.handle));
  }
  archiveAnthropometry(patientId: string, id: string): Observable<void> {
    return this.http
      .post<void>(`${this.base}/patients/${patientId}/anthropometry/${id}/archive`, {})
      .pipe(catchError(this.handle));
  }
  saveDiagnosis(patientId: string, body: unknown): Observable<unknown> {
    return this.http
      .post(`${this.base}/patients/${patientId}/diagnoses`, body)
      .pipe(catchError(this.handle));
  }
  diagnoses(patientId: string): Observable<DiagnosisRecord[]> {
    return this.http
      .get<DiagnosisRecord[]>(`${this.base}/patients/${patientId}/diagnoses`)
      .pipe(catchError(this.handle));
  }
  archiveDiagnosis(patientId: string, id: string): Observable<void> {
    return this.http
      .post<void>(`${this.base}/patients/${patientId}/diagnoses/${id}/archive`, {})
      .pipe(catchError(this.handle));
  }
  approveDiagnosis(patientId: string, id: string): Observable<DiagnosisRecord> {
    return this.http
      .post<DiagnosisRecord>(`${this.base}/patients/${patientId}/diagnoses/${id}/approve`, {})
      .pipe(catchError(this.handle));
  }
  settings(): Observable<ClinicSettings> {
    return this.http.get<ClinicSettings>(`${this.base}/settings`).pipe(catchError(this.handle));
  }
  saveSettings(body: ClinicSettings): Observable<ClinicSettings> {
    return this.http.put<ClinicSettings>(`${this.base}/settings`, body).pipe(catchError(this.handle));
  }
  updateDiagnosis(patientId: string, id: string, body: unknown): Observable<DiagnosisRecord> {
    return this.http
      .put<DiagnosisRecord>(`${this.base}/patients/${patientId}/diagnoses/${id}`, body)
      .pipe(catchError(this.handle));
  }
  calculateEnergy(body: unknown): Observable<EnergyResult> {
    return this.http
      .post<EnergyResult>(`${this.base}/energy/calculate`, body)
      .pipe(catchError(this.handle));
  }
  energyCalculations(patientId: string): Observable<EnergyRecord[]> {
    return this.http
      .get<EnergyRecord[]>(`${this.base}/energy`, { params: { patientId } })
      .pipe(catchError(this.handle));
  }
  updateEnergyCalculation(id: string, body: unknown): Observable<EnergyResult> {
    return this.http
      .put<EnergyResult>(`${this.base}/energy/${id}`, body)
      .pipe(catchError(this.handle));
  }
  archiveEnergyCalculation(id: string): Observable<void> {
    return this.http
      .post<void>(`${this.base}/energy/${id}/archive`, {})
      .pipe(catchError(this.handle));
  }
  foods(
    q = '',
    page = 1,
    source: number | null = null,
  ): Observable<{ items: Food[]; total: number; totalPages: number; notice: string }> {
    let params = new HttpParams().set('q', q).set('page', page);
    if (source !== null) params = params.set('source', source);
    return this.http
      .get<{ items: Food[]; total: number; totalPages: number; notice: string }>(
        `${this.base}/foods`,
        { params },
      )
      .pipe(catchError(this.handle));
  }
  foodOptions(): Observable<Food[]> {
    return this.http.get<Food[]>(`${this.base}/foods/options`).pipe(catchError(this.handle));
  }
  createFood(body: SavePersonalizedFood): Observable<Food> {
    return this.http.post<Food>(`${this.base}/foods`, body).pipe(catchError(this.handle));
  }
  updateFood(id: string, body: SavePersonalizedFood): Observable<Food> {
    return this.http.put<Food>(`${this.base}/foods/${id}`, body).pipe(catchError(this.handle));
  }
  archiveFood(id: string): Observable<void> {
    return this.http
      .post<void>(`${this.base}/foods/${id}/archive`, {})
      .pipe(catchError(this.handle));
  }
  importFoods(
    file: File,
    source: number,
    sourceEdition: string,
    sourceReference: string,
  ): Observable<unknown> {
    const body = new FormData();
    body.append('file', file);
    body.append('source', String(source));
    body.append('sourceEdition', sourceEdition);
    body.append('sourceReference', sourceReference);
    return this.http.post(`${this.base}/foods/import`, body).pipe(catchError(this.handle));
  }
  foodImportHistory(): Observable<FoodCatalogImport[]> {
    return this.http
      .get<FoodCatalogImport[]>(`${this.base}/foods/imports`)
      .pipe(catchError(this.handle));
  }
  downloadFoodImportTemplate(): Observable<Blob> {
    return this.http
      .get(`${this.base}/foods/import-template`, { responseType: 'blob' })
      .pipe(catchError(this.handle));
  }
  followUps(patientId: string): Observable<unknown[]> {
    return this.http
      .get<unknown[]>(`${this.base}/patients/${patientId}/follow-ups`)
      .pipe(catchError(this.handle));
  }
  saveFollowUp(body: unknown, patientId: string): Observable<unknown> {
    return this.http
      .post(`${this.base}/patients/${patientId}/follow-ups`, body)
      .pipe(catchError(this.handle));
  }
  updateFollowUp(body: unknown, patientId: string, id: string): Observable<unknown> {
    return this.http
      .put(`${this.base}/patients/${patientId}/follow-ups/${id}`, body)
      .pipe(catchError(this.handle));
  }
  archiveFollowUp(patientId: string, id: string): Observable<void> {
    return this.http
      .post<void>(`${this.base}/patients/${patientId}/follow-ups/${id}/archive`, {})
      .pipe(catchError(this.handle));
  }
  menuPlans(patientId?: string): Observable<MenuPlanSummary[]> {
    const params = patientId ? { patientId } : undefined;
    return this.http
      .get<MenuPlanSummary[]>(`${this.base}/menu-plans`, { params })
      .pipe(catchError(this.handle));
  }
  createMenuPlan(body: unknown): Observable<unknown> {
    return this.http.post(`${this.base}/menu-plans`, body).pipe(catchError(this.handle));
  }
  updateMenuPlan(id: string, body: unknown): Observable<unknown> {
    return this.http.put(`${this.base}/menu-plans/${id}`, body).pipe(catchError(this.handle));
  }
  approveMenuPlan(id: string): Observable<unknown> {
    return this.http.post(`${this.base}/menu-plans/${id}/approve`, {}).pipe(catchError(this.handle));
  }
  archiveMenuPlan(id: string): Observable<void> {
    return this.http
      .post<void>(`${this.base}/menu-plans/${id}/archive`, {})
      .pipe(catchError(this.handle));
  }
  report(patientId: string): Observable<unknown> {
    return this.http
      .get(`${this.base}/reports/clinical-summary`, { params: { patientId } })
      .pipe(catchError(this.handle));
  }
  reportPdf(patientId: string): Observable<Blob> {
    return this.http
      .get(`${this.base}/reports/clinical-summary.pdf`, {
        params: { patientId },
        responseType: 'blob',
      })
      .pipe(catchError(this.handle));
  }
  auditEvents(page = 1): Observable<{ items: AuditEvent[]; total: number }> {
    return this.http
      .get<{ items: AuditEvent[]; total: number }>(`${this.base}/audit`, {
        params: { page, pageSize: 25 },
      })
      .pipe(catchError(this.handle));
  }
  previewMessage(body: unknown): Observable<unknown> {
    return this.http
      .post(`${this.base}/communications/preview`, body)
      .pipe(catchError(this.handle));
  }
  messagingIntegrationStatus(): Observable<MessagingIntegrationStatus> {
    return this.http
      .get<MessagingIntegrationStatus>(`${this.base}/communications/integration-status`)
      .pipe(catchError(this.handle));
  }
  sendEmailDocument(dispatchId: string, body: { body: string }): Observable<unknown> {
    return this.http
      .post(`${this.base}/communications/${dispatchId}/send-email-document`, body)
      .pipe(catchError(this.handle));
  }
  sendWhatsAppDocument(dispatchId: string): Observable<unknown> {
    return this.http
      .post(`${this.base}/communications/${dispatchId}/send-whatsapp-document`, {})
      .pipe(catchError(this.handle));
  }
  communications(patientId: string): Observable<unknown[]> {
    return this.http
      .get<unknown[]>(`${this.base}/communications`, { params: { patientId } })
      .pipe(catchError(this.handle));
  }
  archiveCommunication(id: string): Observable<void> {
    return this.http
      .post<void>(`${this.base}/communications/${id}/archive`, {})
      .pipe(catchError(this.handle));
  }

  private handle(error: HttpErrorResponse) {
    return throwError(() => new Error(apiErrorMessage(error)));
  }
}
