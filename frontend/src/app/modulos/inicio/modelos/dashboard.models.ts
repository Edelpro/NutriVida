export interface DashboardAppointment {
  id: string;
  patientId: string;
  patientName: string;
  startsAtUtc: string;
  reason: string;
  status: string;
}

export interface DashboardPatientFocus {
  id: string;
  fullName: string;
  initials: string;
  ageYears: number;
  documentNumber: string;
  goal: string;
  weightKg: number | null;
  weightChangeKg: number | null;
  bmi: number | null;
  bodyFatPercent: number | null;
  adherencePercent: number | null;
  measuredAtUtc: string | null;
}

export interface DashboardRecentPatient {
  id: string;
  fullName: string;
  ageYears: number;
  goal: string;
  status: string;
  lastConsultationUtc: string | null;
  nextConsultationUtc: string | null;
  updatedAtUtc: string;
}

export interface ObjectiveDistributionItem {
  label: string;
  count: number;
  percent: number;
}

export interface DashboardData {
  activePatients: number;
  pausedPatients: number;
  archivedPatients: number;
  totalPatients: number;
  newPatientsThisMonth: number;
  consultationsToday: number;
  pendingFollowUps: number;
  plansToReview: number;
  messagesToReview: number;
  appointments: DashboardAppointment[];
  currentPatient: DashboardPatientFocus | null;
  recentPatients: DashboardRecentPatient[];
  objectiveDistribution: ObjectiveDistributionItem[];
  generatedAtUtc: string;
}

export const EMPTY_DASHBOARD: DashboardData = {
  activePatients: 0,
  pausedPatients: 0,
  archivedPatients: 0,
  totalPatients: 0,
  newPatientsThisMonth: 0,
  consultationsToday: 0,
  pendingFollowUps: 0,
  plansToReview: 0,
  messagesToReview: 0,
  appointments: [],
  currentPatient: null,
  recentPatients: [],
  objectiveDistribution: [],
  generatedAtUtc: '',
};
