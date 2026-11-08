import { AfterViewInit, Component, ElementRef, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

type PlanFlowStep = 1 | 2 | 3 | 4;

interface FlowStep {
  number: PlanFlowStep;
  label: string;
  description: string;
  path: string;
}

interface FlowAction {
  label: string;
  path: string;
}

@Component({
  selector: 'app-flujo-plan-nutricional',
  imports: [RouterLink],
  template: `
    <section class="plan-flow" aria-labelledby="planFlowTitle">
      <header class="plan-flow-header">
        <div>
          <p class="eyebrow">Ruta de trabajo</p>
          <strong id="planFlowTitle">Del catálogo al seguimiento</strong>
        </div>
        <span class="flow-progress">Estás en el paso {{ currentStep() }} de 4</span>
      </header>

      <nav class="flow-steps" aria-label="Etapas para construir y seguir un plan nutricional">
        @for (step of steps; track step.number) {
          <a
            [routerLink]="step.path"
            [class.is-current]="step.number === currentStep()"
            [class.is-before]="step.number < currentStep()"
            [attr.aria-current]="step.number === currentStep() ? 'step' : null"
            [attr.aria-label]="step.label + '. ' + step.description"
          >
            <span class="step-number" aria-hidden="true">{{ step.number }}</span>
            <span class="step-copy">
              <strong>{{ step.label }}</strong>
              <small>{{ step.description }}</small>
            </span>
            @if (step.number === currentStep()) {
              <span class="step-state">Estás aquí</span>
            } @else if (step.number < currentStep()) {
              <span class="step-state muted-state">Anterior</span>
            } @else {
              <span class="step-state muted-state">Después</span>
            }
          </a>
        }
      </nav>

      <footer class="flow-next">
        <div>
          <small>QUÉ HACES EN ESTE PASO</small>
          <strong>{{ currentHint().title }}</strong>
          <p>{{ currentHint().text }}</p>
        </div>
        <nav class="flow-actions" aria-label="Navegación entre etapas del plan nutricional">
          @if (previousAction(); as previous) {
            <a class="button button-secondary" [routerLink]="previous.path">
              <span aria-hidden="true">←</span> {{ previous.label }}
            </a>
          }
          <a class="button button-primary" [routerLink]="nextAction().path">
            {{ nextAction().label }} <span aria-hidden="true">→</span>
          </a>
        </nav>
      </footer>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        margin-bottom: 1rem;
      }
      .plan-flow {
        overflow: hidden;
        border: 1px solid var(--border-section);
        border-radius: var(--radius-lg);
        background: var(--surface);
      }
      .plan-flow-header {
        min-height: 2.65rem;
        padding: 0.65rem 0.9rem;
        display: flex;
        align-items: start;
        justify-content: space-between;
        gap: 1rem;
        background: var(--surface-muted);
      }
      .plan-flow-header p {
        margin: 0 0 0.12rem;
      }
      .plan-flow-header strong {
        font: 700 0.98rem/1.2 var(--font-display);
      }
      .flow-progress {
        flex: 0 0 auto;
        padding: 0.35rem 0.55rem;
        border: 1px solid var(--border-section);
        border-radius: var(--radius-sm);
        color: var(--primary-dark);
        background: var(--surface);
        font-size: 0.72rem;
        font-weight: 800;
      }
      .flow-steps {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        border-block: 1px solid var(--border-soft);
      }
      .flow-steps a {
        min-width: 0;
        min-height: 4.65rem;
        padding: 0.7rem 0.8rem;
        display: flex;
        align-items: center;
        gap: 0.55rem;
        border-right: 1px solid var(--border-soft);
        color: var(--text);
        text-decoration: none;
        position: relative;
      }
      .flow-steps a:last-child {
        border-right: 0;
      }
      .flow-steps a:hover {
        background: var(--surface-muted);
      }
      .flow-steps a.is-current {
        background: var(--avocado-soft);
        box-shadow: inset 0 -3px 0 var(--primary);
      }
      .flow-steps a.is-before .step-number {
        color: var(--primary-dark);
        background: var(--surface-muted);
        border-color: var(--border-section);
      }
      .step-number {
        width: 1.65rem;
        height: 1.65rem;
        display: grid;
        place-items: center;
        border-radius: 50%;
        color: white;
        background: var(--primary);
        border: 1px solid var(--primary);
        font-size: 0.75rem;
        font-weight: 800;
      }
      .step-copy {
        min-width: 0;
        display: grid;
        gap: 0.12rem;
      }
      .flow-steps strong {
        font-size: 0.8rem;
      }
      .flow-steps small {
        color: var(--text-muted);
        font-size: 0.72rem;
        line-height: 1.25;
      }
      .step-state {
        margin-left: auto;
        color: var(--primary-dark);
        font-size: 0.72rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .step-state.muted-state {
        color: var(--text-muted);
      }
      .flow-next {
        padding: 0.75rem 0.9rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }
      .flow-next p {
        margin: 0.15rem 0 0;
        color: var(--text-muted);
        font-size: 0.75rem;
      }
      .flow-next small {
        display: block;
        margin-bottom: 0.2rem;
        color: var(--text-muted);
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.08em;
      }
      .flow-next p strong {
        color: var(--text);
      }
      .flow-actions {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.55rem;
      }
      @media (max-width: 900px) {
        .flow-steps {
          overflow-x: auto;
          grid-template-columns: repeat(4, minmax(10rem, 1fr));
        }
      }
      @media (max-width: 600px) {
        .plan-flow-header,
        .flow-next {
          align-items: stretch;
          flex-direction: column;
        }
        .flow-actions {
          width: 100%;
          display: grid;
          grid-template-columns: 1fr;
        }
        .flow-actions .button {
          width: 100%;
        }
      }
    `,
  ],
})
export class FlujoPlanNutricionalComponent implements AfterViewInit {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly currentStep = input.required<PlanFlowStep>();

  ngAfterViewInit(): void {
    // En móvil la ruta se desplaza de lado: el paso actual debe quedar a la vista.
    const list = this.host.nativeElement.querySelector<HTMLElement>('.flow-steps');
    const current = list?.querySelector<HTMLElement>('.is-current');
    if (list && current) list.scrollLeft = current.offsetLeft - list.offsetLeft;
  }

  readonly steps: FlowStep[] = [
    {
      number: 1,
      label: 'Catálogo',
      description: 'Buscar alimentos',
      path: '/alimentos',
    },
    {
      number: 2,
      label: 'Platos',
      description: 'Guardar preparaciones',
      path: '/platos',
    },
    {
      number: 3,
      label: 'Menú del paciente',
      description: 'Organizar comidas',
      path: '/menus',
    },
    {
      number: 4,
      label: 'Seguimiento',
      description: 'Registrar evolución',
      path: '/seguimientos',
    },
  ];

  currentStepData(): FlowStep {
    return this.steps[this.currentStep() - 1];
  }

  currentHint(): { title: string; text: string } {
    const hints = {
      1: {
        title: 'Busca y verifica los ingredientes.',
        text: 'Usa una fuente autorizada o crea un alimento personalizado con porción, nutrientes y referencia. Los platos se combinan en el paso siguiente.',
      },
      2: {
        title: 'Crea o elige un plato reutilizable.',
        text: 'Cada plato queda visible en esta biblioteca y aparece completo dentro del Menú del paciente.',
      },
      3: {
        title: 'Arma el menú del paciente activo.',
        text: 'Elige día y comida; luego añade un plato guardado o un alimento individual y guarda el plan.',
      },
      4: {
        title: 'Compara lo ocurrido con el plan.',
        text: 'Registra datos reales de cada control; el historial queda asociado al paciente activo.',
      },
    } as const;
    return hints[this.currentStep()];
  }

  previousAction(): FlowAction | null {
    const actions: Partial<Record<PlanFlowStep, FlowAction>> = {
      2: { label: 'Anterior: Catálogo', path: '/alimentos' },
      3: { label: 'Anterior: Platos', path: '/platos' },
      4: { label: 'Anterior: Menú del paciente', path: '/menus' },
    };
    return actions[this.currentStep()] ?? null;
  }

  nextAction(): FlowAction {
    const actions: Record<PlanFlowStep, FlowAction> = {
      1: { label: 'Siguiente: Platos', path: '/platos' },
      2: { label: 'Siguiente: Menú del paciente', path: '/menus' },
      3: { label: 'Siguiente: Seguimiento', path: '/seguimientos' },
      4: { label: 'Finalizar: Ver reportes', path: '/reportes' },
    } as const;
    return actions[this.currentStep()];
  }
}
