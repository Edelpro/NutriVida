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

export interface PatientDetails extends Omit<Patient, 'status'> {
  status: number | string;
  sexAtBirth: number;
  occupation: string;
  emailConsent: boolean;
  whatsAppConsent: boolean;
  rowVersion: string;
}

export interface NutritionistOption {
  id: string;
  fullName: string;
  email: string;
}

export interface PagedPatients {
  items: Patient[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CreatePatientRequest {
  documentNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sexAtBirth: number;
  email: string;
  phone: string;
  occupation: string;
  goal: string;
  emailConsent: boolean;
  whatsAppConsent: boolean;
  assignedNutritionistUserId: string | null;
}

export interface UpdatePatientRequest {
  documentNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sexAtBirth: number;
  email: string;
  phone: string;
  occupation: string;
  goal: string;
  status: number;
  rowVersion: string;
  emailConsent: boolean;
  whatsAppConsent: boolean;
  assignedNutritionistUserId: string | null;
}
