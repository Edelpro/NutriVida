import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './nucleo/autenticacion/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Acceso | NutriVida',
    loadComponent: () =>
      import('./modulos/autenticacion/paginas/pagina-acceso/login.component').then(
        (m) => m.LoginComponent,
      ),
  },
  {
    path: '',
    canActivateChild: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      {
        path: 'inicio',
        title: 'Inicio | NutriVida',
        loadComponent: () =>
          import('./modulos/inicio/paginas/pagina-inicio/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'pacientes',
        title: 'Pacientes | NutriVida',
        loadComponent: () =>
          import('./modulos/pacientes/paginas/pagina-pacientes/patients.component').then(
            (m) => m.PatientsComponent,
          ),
      },
      {
        path: 'pacientes/:id',
        title: 'Ficha del paciente | NutriVida',
        loadComponent: () =>
          import('./modulos/pacientes/paginas/pagina-ficha/patient-file.component').then(
            (m) => m.PatientFileComponent,
          ),
      },
      {
        path: 'atencion',
        title: 'Atención | NutriVida',
        loadComponent: () =>
          import('./modulos/atencion/paginas/pagina-atencion/consultations.component').then(
            (m) => m.ConsultationsComponent,
          ),
      },
      {
        path: 'evaluaciones',
        title: 'Evaluación | NutriVida',
        loadComponent: () =>
          import('./modulos/evaluaciones/paginas/pagina-evaluacion/assessment.component').then(
            (m) => m.AssessmentComponent,
          ),
      },
      {
        path: 'diagnosticos',
        title: 'Diagnóstico PES | NutriVida',
        loadComponent: () =>
          import('./modulos/diagnosticos/paginas/pagina-diagnosticos/diagnoses.component').then(
            (m) => m.DiagnosesComponent,
          ),
      },
      {
        path: 'antropometria',
        title: 'Antropometría | NutriVida',
        loadComponent: () =>
          import('./modulos/antropometria/paginas/pagina-antropometria/anthropometry.component').then(
            (m) => m.AnthropometryComponent,
          ),
      },
      {
        path: 'calculos',
        title: 'Cálculo energético | NutriVida',
        loadComponent: () =>
          import('./modulos/calculo-energetico/paginas/pagina-calculo/energy.component').then(
            (m) => m.EnergyComponent,
          ),
      },
      {
        path: 'seguimientos',
        title: 'Seguimiento y evolución | NutriVida',
        loadComponent: () =>
          import('./modulos/seguimientos/paginas/pagina-seguimientos/follow-ups.component').then(
            (m) => m.FollowUpsComponent,
          ),
      },
      {
        path: 'menus',
        title: 'Planes de menú | NutriVida',
        loadComponent: () =>
          import('./modulos/planes-menu/paginas/pagina-planes-menu/menu-plans.component').then(
            (m) => m.MenuPlansComponent,
          ),
      },
      {
        path: 'alimentos',
        title: 'Alimentos | NutriVida',
        loadComponent: () =>
          import('./modulos/alimentos/paginas/pagina-alimentos/foods.component').then(
            (m) => m.FoodsComponent,
          ),
      },
      {
        path: 'platos',
        title: 'Platos y preparaciones | NutriVida',
        loadComponent: () =>
          import('./modulos/platos/paginas/pagina-platos/dishes.component').then(
            (m) => m.DishesComponent,
          ),
      },
      {
        path: 'reportes',
        title: 'Reportes | NutriVida',
        loadComponent: () =>
          import('./modulos/reportes/paginas/pagina-reportes/reports.component').then(
            (m) => m.ReportsComponent,
          ),
      },
      {
        path: 'mensajeria',
        title: 'Mensajería | NutriVida',
        loadComponent: () =>
          import('./modulos/mensajeria/paginas/pagina-mensajeria/communications.component').then(
            (m) => m.CommunicationsComponent,
          ),
      },
      {
        path: 'usuarios',
        title: 'Usuarios y roles | NutriVida',
        canActivate: [roleGuard(['ClinicAdmin'])],
        loadComponent: () =>
          import('./modulos/usuarios/paginas/pagina-usuarios/users.component').then(
            (m) => m.UsersComponent,
          ),
      },
      {
        path: 'auditoria',
        title: 'Auditoría | NutriVida',
        canActivate: [roleGuard(['ClinicAdmin'])],
        loadComponent: () =>
          import('./modulos/auditoria/paginas/pagina-auditoria/audit.component').then(
            (m) => m.AuditComponent,
          ),
      },
      {
        path: 'configuracion',
        title: 'Configuración | NutriVida',
        canActivate: [roleGuard(['ClinicAdmin'])],
        loadComponent: () =>
          import('./modulos/configuracion/paginas/pagina-configuracion/settings.component').then(
            (m) => m.SettingsComponent,
          ),
      },
      {
        path: 'cambiar-clave',
        title: 'Cambiar contraseña | NutriVida',
        loadComponent: () =>
          import('./modulos/autenticacion/paginas/pagina-cambio-clave/change-password.component').then(
            (m) => m.ChangePasswordComponent,
          ),
      },
      {
        path: 'no-encontrada',
        title: 'Página no encontrada | NutriVida',
        loadComponent: () =>
          import('./modulos/autenticacion/paginas/pagina-no-encontrada/not-found.component').then(
            (m) => m.NotFoundComponent,
          ),
      },
      {
        path: 'sin-acceso',
        title: 'Acceso restringido | NutriVida',
        loadComponent: () =>
          import('./modulos/autenticacion/paginas/pagina-sin-acceso/forbidden.component').then(
            (m) => m.ForbiddenComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'no-encontrada' },
];
