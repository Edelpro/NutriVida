import { Component, Injectable, inject, signal } from '@angular/core';
import { IconComponent } from '../icono/icon.component';

export interface ToastMessage {
  id: number;
  kind: 'success' | 'error' | 'info';
  title: string;
  detail?: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly messages = signal<ToastMessage[]>([]);
  private id = 0;
  show(kind: ToastMessage['kind'], title: string, detail?: string): void {
    const message = { id: ++this.id, kind, title, detail };
    this.messages.update((items) => [...items, message]);
    window.setTimeout(() => this.dismiss(message.id), 5000);
  }
  dismiss(id: number): void {
    this.messages.update((items) => items.filter((x) => x.id !== id));
  }
}

@Component({
  selector: 'app-toast-viewport',
  standalone: true,
  imports: [IconComponent],
  template: ` <div class="toast-viewport" aria-live="polite" aria-atomic="false">
    @for (item of toast.messages(); track item.id) {
      <section
        class="toast"
        [class.error]="item.kind === 'error'"
        [class.info]="item.kind === 'info'"
      >
        <app-icon [name]="item.kind === 'success' ? 'check' : 'info'" />
        <div>
          <strong>{{ item.title }}</strong>
          @if (item.detail) {
            <small>{{ item.detail }}</small>
          }
        </div>
        <button type="button" (click)="toast.dismiss(item.id)" aria-label="Cerrar mensaje">
          <app-icon name="close" />
        </button>
      </section>
    }
  </div>`,
  styles: [
    `
      .toast-viewport {
        position: fixed;
        z-index: 80;
        top: 1rem;
        right: 1rem;
        width: min(23rem, calc(100vw - 2rem));
        display: grid;
        gap: 0.6rem;
      }
      .toast {
        padding: 0.85rem;
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 0.7rem;
        align-items: start;
        background: #fff;
        border: 1px solid #c9ddaa;
        border-left: 4px solid var(--success);
        border-radius: var(--radius-md);
        box-shadow: 0 15px 40px rgba(59, 35, 15, 0.16);
      }
      .toast.error {
        border-color: #e5b8b2;
        border-left-color: var(--danger);
      }
      .toast.info {
        border-color: var(--border);
        border-left-color: var(--warning);
      }
      strong,
      small {
        display: block;
      }
      small {
        margin-top: 0.18rem;
        color: var(--text-muted);
        font-size: 0.75rem;
      }
      button {
        padding: 0.15rem;
        border: 0;
        background: none;
        color: var(--text-muted);
        cursor: pointer;
      }
      button app-icon {
        width: 1rem;
        height: 1rem;
      }
    `,
  ],
})
export class ToastViewportComponent {
  readonly toast = inject(ToastService);
}
