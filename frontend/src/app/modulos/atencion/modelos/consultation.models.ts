export interface ConsultationListItem {
  id: string;
  patientId: string;
  patientName: string;
  startsAtUtc: string;
  durationMinutes: number;
  reason: string;
  status: string;
}

export interface CreateConsultationRequest {
  patientId: string;
  startsAtUtc: string;
  durationMinutes: number;
  reason: string;
}

export interface UpdateConsultationRequest {
  startsAtUtc: string;
  durationMinutes: number;
  reason: string;
  status: number;
  notes: string;
}
