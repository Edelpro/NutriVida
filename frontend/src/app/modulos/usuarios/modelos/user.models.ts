import { UserRole } from '../../../nucleo/autenticacion/auth.models';

export interface UserListItem {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAtUtc: string | null;
}

export interface UserFormValue {
  fullName: string;
  email: string;
  role: UserRole;
  temporaryPassword: string;
  isActive: boolean;
  mustChangePassword: boolean;
}

export interface PagedUsers {
  items: UserListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CreateUserRequest {
  fullName: string;
  email: string;
  role: UserRole;
  temporaryPassword: string;
  mustChangePassword: boolean;
}

export interface UpdateUserRequest {
  fullName: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  temporaryPassword: string | null;
}

export interface AccessRequestItem {
  id: string;
  fullName: string;
  email: string;
  requestedRole: 'Nutritionist';
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAtUtc: string;
}
