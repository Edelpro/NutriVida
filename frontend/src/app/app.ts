import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './nucleo/autenticacion/auth.service';
import { IconComponent, IconName } from './compartido/icono/icon.component';
import { ToastViewportComponent } from './compartido/notificaciones/toast.service';

interface NavItem {
  label: string;
  path: string;
  icon: IconName;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, ToastViewportComponent],
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly menuOpen = signal(false);
  protected readonly navigationGroups: NavGroup[] = [
    {
      label: 'Consulta',
      items: [
        { label: 'Inicio', path: '/inicio', icon: 'home' },
        { label: 'Pacientes', path: '/pacientes', icon: 'users' },
        { label: 'Atención', path: '/atencion', icon: 'calendar' },
        { label: 'Evaluaciones', path: '/evaluaciones', icon: 'clipboard' },
        { label: 'Cálculo energético', path: '/calculos', icon: 'energy' },
      ],
    },
    {
      label: 'Plan nutricional',
      items: [
        { label: '1. Catálogo', path: '/alimentos', icon: 'food' },
        { label: '2. Platos', path: '/platos', icon: 'dish' },
        { label: '3. Menú del paciente', path: '/menus', icon: 'menu' },
        { label: '4. Seguimiento', path: '/seguimientos', icon: 'activity' },
      ],
    },
    {
      label: 'Entrega',
      items: [
        { label: 'Reportes', path: '/reportes', icon: 'report' },
        { label: 'Mensajería', path: '/mensajeria', icon: 'send' },
      ],
    },
  ];

  protected roleLabel(): string {
    const role = this.auth.user()?.role;
    if (role === 'ClinicAdmin') return 'Administrador';
    return role === 'Nutritionist' ? 'Nutricionista' : '';
  }
}
