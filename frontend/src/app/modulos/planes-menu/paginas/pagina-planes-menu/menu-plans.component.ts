import { DatePipe, DecimalPipe, LowerCasePipe } from '@angular/common';
import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService, Food, MenuPlanSummary } from '../../../../nucleo/api.service';
import { AuthService } from '../../../../nucleo/autenticacion/auth.service';
import { PatientContextService } from '../../../../nucleo/contexto-paciente/patient-context.service';
import { IconComponent } from '../../../../compartido/icono/icon.component';
import { PatientContextBarComponent } from '../../../../compartido/contexto-paciente/patient-context-bar.component';
import { ToastService } from '../../../../compartido/notificaciones/toast.service';
import { DishesApiService } from '../../../platos/acceso-datos/dishes-api.service';
import { Dish } from '../../../platos/modelos/dish.models';
import { QuickTemplate } from '../../../plantillas/modelos/quick-template.models';
import { QuickTemplatesComponent } from '../../../plantillas/paginas/tarjetas-plantillas/quick-templates.component';
import { FlujoPlanNutricionalComponent } from '../../../../compartido/flujo-plan-nutricional/flujo-plan-nutricional.component';

interface PlanItem {
  foodItemId: string | null;
  mealName: string;
  foodNameSnapshot: string;
  portions: number;
  grams: number;
  energyKcal: number;
  householdMeasure: string;
  dayOfWeek: number;
}
@Component({
  selector: 'app-menu-plans',
  imports: [
    FormsModule,
    RouterLink,
    DatePipe,
    DecimalPipe,
    LowerCasePipe,
    IconComponent,
    PatientContextBarComponent,
    QuickTemplatesComponent,
    FlujoPlanNutricionalComponent,
  ],
  template: `<div class="page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Intervención nutricional</p>
        <h1>Planes de menú</h1>
        <p class="lede">
          Construye menús por porciones, conserva la fuente alimentaria y compara contra el objetivo
          energético.
        </p>
      </div>
      <span class="badge badge-warning">Datos demo señalados</span>
    </header>
    <app-flujo-plan-nutricional [currentStep]="3" />
    <app-patient-context-bar />
    <details class="template-disclosure">
      <summary>Usar una plantilla rápida <small>Opcional</small></summary>
      <app-quick-templates scope="menuPlan" (templateSelected)="applyTemplate($event)" />
    </details>
    <section class="surface meal-choice" aria-labelledby="mealChoiceTitle">
      <header class="surface-header">
        <div>
          <p class="eyebrow">1 · Ubica la comida</p>
          <h2 id="mealChoiceTitle">Elige primero el día y el tiempo de comida</h2>
        </div>
        <span class="badge">{{ dayLabel() }} · {{ draft.mealName }}</span>
      </header>
      <div class="surface-body form-grid meal-context">
        <div class="field col-6">
          <label for="day">Día del menú</label
          ><select id="day" [(ngModel)]="draft.dayOfWeek">
            <option [ngValue]="1">Lunes</option>
            <option [ngValue]="2">Martes</option>
            <option [ngValue]="3">Miércoles</option>
            <option [ngValue]="4">Jueves</option>
            <option [ngValue]="5">Viernes</option>
            <option [ngValue]="6">Sábado</option>
            <option [ngValue]="7">Domingo</option></select
          ><small>Los elementos se guardarán en este día.</small>
        </div>
        <div class="field col-6">
          <label for="meal">Tiempo de comida</label
          ><select id="meal" [(ngModel)]="draft.mealName">
            <option>Desayuno</option>
            <option>Media mañana</option>
            <option>Almuerzo</option>
            <option>Media tarde</option>
            <option>Cena</option></select
          ><small>También puedes elegir una colación.</small>
        </div>
      </div>
      <div class="meal-visuals" aria-label="Referencias visuales de comidas">
        <button
          type="button"
          [class.is-selected]="draft.mealName === 'Desayuno'"
          (click)="draft.mealName = 'Desayuno'"
        >
          <img src="/assets/meals/desayuno-equilibrado.png" alt="" loading="lazy" />
          <span><strong>Desayuno</strong><small>Atajo visual</small></span>
        </button>
        <button
          type="button"
          [class.is-selected]="draft.mealName === 'Almuerzo'"
          (click)="draft.mealName = 'Almuerzo'"
        >
          <img src="/assets/meals/almuerzo-equilibrado.png" alt="" loading="lazy" />
          <span><strong>Almuerzo</strong><small>Atajo visual</small></span>
        </button>
        <button
          type="button"
          [class.is-selected]="draft.mealName === 'Cena'"
          (click)="draft.mealName = 'Cena'"
        >
          <img src="/assets/meals/cena-equilibrada.png" alt="" loading="lazy" />
          <span><strong>Cena</strong><small>Atajo visual</small></span>
        </button>
      </div>
    </section>
    <div class="builder-layout">
      <section class="surface catalog">
        <header class="surface-header">
          <div>
            <p class="eyebrow">2 · Elige qué vas a añadir</p>
            <h2>{{ dayLabel() }} · {{ draft.mealName }}</h2>
          </div>
          <app-icon name="food" />
        </header>
        <div class="surface-body form-grid">
          @if (incomingDishName()) {
            <div class="notice notice-success col-12 incoming-dish" role="status">
              <app-icon name="dish" />
              <span
                ><strong>{{ incomingDishName() }} está listo.</strong> Pulsa “Añadir este plato”
                para colocarlo en {{ dayLabel() | lowercase }}.</span
              >
            </div>
          }
          <section class="source-option col-12" aria-labelledby="savedDishLabel">
            <header>
              <span class="option-number">A</span>
              <div>
                <strong id="savedDishLabel">Plato guardado</strong
                ><small>Reutiliza una preparación completa.</small>
              </div>
            </header>
            <div class="template-picker">
              <div class="field">
                <label for="savedDish">Selecciona un plato</label>
                <select id="savedDish" [(ngModel)]="selectedDishId">
                  <option value="">Selecciona un plato</option>
                  @for (dish of dishes(); track dish.id) {
                    <option [value]="dish.id">
                      {{ dish.name }} · {{ dish.costPerServingUsd | number: '1.2-2' }} USD/porción
                    </option>
                  }
                </select>
                <small>Sus ingredientes se añadirán juntos al menú.</small>
              </div>
              <button
                class="button button-secondary"
                type="button"
                [disabled]="!selectedDishId"
                (click)="addDish()"
              >
                <app-icon name="dish" />Añadir este plato
              </button>
              <a class="button button-quiet" routerLink="/platos">Ver o crear platos</a>
            </div>
          </section>
          <div class="choice-divider col-12"><span>o</span></div>
          <section class="source-option col-12" aria-labelledby="singleFoodLabel">
            <header>
              <span class="option-number">B</span>
              <div>
                <strong id="singleFoodLabel">Alimento individual</strong
                ><small>Añade un ingrediente sin crear un plato.</small>
              </div>
            </header>
            <div class="single-food-grid">
              <div class="field">
                <label for="food">Selecciona un alimento</label
                ><select id="food" [(ngModel)]="draft.foodId">
                  <option value="">Selecciona un alimento</option>
                  @for (food of foods(); track food.id) {
                    <option [value]="food.id">{{ food.name }} · {{ food.householdMeasure }}</option>
                  }</select
                ><small>Catálogo autorizado o alimentos personalizados creados por el equipo.</small>
              </div>
              <div class="field portions-field">
                <label for="portions">Porciones</label
                ><input
                  id="portions"
                  type="number"
                  min=".25"
                  max="20"
                  step=".25"
                  [(ngModel)]="draft.portions"
                />
                <small>Incrementos de ¼.</small>
              </div>
              <button
                class="button button-primary"
                type="button"
                [disabled]="!draft.foodId"
                (click)="addItem()"
              >
                <app-icon name="plus" />Añadir este alimento
              </button>
              <a
                class="button button-quiet create-food-link"
                routerLink="/alimentos"
                [queryParams]="{ nuevo: 1 }"
              >
                Crear un alimento
              </a>
            </div>
          </section>
        </div>
        <div class="notice notice-warning">
          <app-icon name="info" /><span
            >Los alimentos “EcuadorDemo” son ficticios y sirven solo para validar el programa.
            Importa tablas autorizadas antes del uso clínico.</span
          >
        </div>
      </section>
      <section class="daily-total">
        <p class="eyebrow">Balance del día</p>
        <strong
          >{{ totalKcal() | number: '1.0-0' }} <em>/ {{ targetKcal }} kcal</em></strong
        >
        <div class="progress"><span [style.width.%]="progressPercent()"></span></div>
        <div class="macro">
          <span
            >Proteína<b>{{ proteinTotal() | number: '1.0-0' }} g</b></span
          ><span
            >Carbohidrato<b>{{ carbTotal() | number: '1.0-0' }} g</b></span
          ><span
            >Grasa<b>{{ fatTotal() | number: '1.0-0' }} g</b></span
          >
        </div>
        <p class="remaining">{{ remainingKcal() | number: '1.0-0' }} kcal por distribuir</p>
        <div class="field">
          <label for="target">Meta energética</label
          ><input
            id="target"
            type="number"
            min="500"
            max="6000"
            step="50"
            [(ngModel)]="targetKcal"
          /><small>Basada en cálculo revisado.</small>
        </div>
      </section>
    </div>
    <section class="surface plan">
      <header class="surface-header">
        <div>
          <p class="eyebrow">3 · Revisa y guarda</p>
          <h2>Menú en construcción</h2>
        </div>
        <span class="caption">{{ items().length }} alimentos</span>
      </header>
      @if (!items().length) {
        <div class="empty-state">
          <div>
            <app-icon name="menu" />
            <h2>Empieza el menú</h2>
            <p>Selecciona un alimento y define sus porciones.</p>
          </div>
        </div>
      } @else {
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Comida</th>
                <th>Alimento</th>
                <th>Porción</th>
                <th>Gramos</th>
                <th>Energía</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (item of items(); track $index) {
                <tr>
                  <td>
                    <span class="badge">{{ item.mealName }}</span>
                  </td>
                  <td>
                    <strong>{{ item.foodNameSnapshot }}</strong>
                  </td>
                  <td>{{ item.portions }} × {{ item.householdMeasure }}</td>
                  <td>{{ item.grams | number: '1.0-0' }} g</td>
                  <td class="metric-number">{{ item.energyKcal | number: '1.0-0' }} kcal</td>
                  <td>
                    <button
                      class="remove"
                      type="button"
                      (click)="removeItem($index)"
                      aria-label="Quitar {{ item.foodNameSnapshot }}"
                    >
                      <app-icon name="trash" />
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
      <footer class="save-plan">
        <div class="plan-details">
          <div class="field plan-name">
            <label for="planName">Nombre del plan</label
            ><input id="planName" [(ngModel)]="planName" /><small
              >Visible para el equipo clínico.</small
            >
          </div>
          <div class="field plan-notes">
            <label for="planNotes">Notas profesionales</label>
            <textarea
              class="resize-none"
              id="planNotes"
              rows="3"
              [(ngModel)]="professionalNotes"
            ></textarea>
            <small>Personaliza la plantilla según la evaluación del paciente.</small>
          </div>
        </div>
        <button
          class="button button-primary"
          type="button"
          [disabled]="!items().length || saving()"
          (click)="savePlan()"
        >
          {{ saving() ? 'Guardando…' : 'Guardar plan' }}
        </button>
      </footer>
    </section>
    <section class="surface saved-plans" aria-labelledby="savedPlansTitle">
      <header class="surface-header">
        <div>
          <p class="eyebrow">Historial del paciente</p>
          <h2 id="savedPlansTitle">Planes guardados</h2>
        </div>
        <span class="caption">{{ savedPlans().length }} registrados</span>
      </header>
      @if (loadingPlans()) {
        <div class="status-message"><span class="spinner" aria-hidden="true"></span></div>
      } @else if (!savedPlans().length) {
        <div class="empty-state compact-empty">
          <div>
            <app-icon name="menu" />
            <h2>Todavía no hay planes guardados</h2>
            <p>Crea el primer plan para conservarlo en el expediente activo.</p>
          </div>
        </div>
      } @else {
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Periodo</th>
                <th>Meta</th>
                <th>Alimentos</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (plan of savedPlans(); track plan.id) {
                <tr>
                  <td>
                    <strong>{{ plan.name }}</strong>
                  </td>
                  <td>
                    {{ plan.startsOn | date: 'dd MMM y' : '' : 'es-EC' }} –
                    {{ plan.endsOn | date: 'dd MMM y' : '' : 'es-EC' }}
                  </td>
                  <td class="metric-number">{{ plan.energyTargetKcal | number: '1.0-0' }} kcal</td>
                  <td>{{ plan.items.length }}</td>
                  <td>
                    <span class="badge">{{ plan.status === 0 ? 'Borrador' : 'Vigente' }}</span>
                  </td>
                  <td><div class="toolbar">
                    <button class="button button-secondary button-small" type="button" (click)="editPlan(plan)">Editar</button>
                    @if (auth.hasRole('ClinicAdmin')) {
                      @if (pendingArchivePlanId() === plan.id) {
                        <span class="archive-confirmation">¿Archivar este plan?</span>
                        <button class="button button-secondary button-small" type="button" [disabled]="archivingPlanId() === plan.id" (click)="cancelArchivePlan()">Cancelar</button>
                        <button class="button button-danger button-small" type="button" [disabled]="archivingPlanId() === plan.id" (click)="confirmArchivePlan(plan)">{{ archivingPlanId() === plan.id ? 'Archivando…' : 'Confirmar' }}</button>
                      } @else {
                        <button class="button button-danger button-small" type="button" (click)="requestArchivePlan(plan)">Archivar</button>
                      }
                    }
                  </div></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  </div>`,
  styles: [
    `
      .meal-visuals {
        padding: 0.9rem;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.75rem;
      }
      .meal-visuals button {
        min-height: 5.2rem;
        padding: 0;
        display: grid;
        grid-template-columns: 5.2rem 1fr;
        align-items: center;
        overflow: hidden;
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        color: var(--text);
        background: white;
        text-align: left;
        cursor: pointer;
      }
      .meal-visuals button:hover {
        border-color: var(--primary);
      }
      .meal-visuals button.is-selected {
        border-color: var(--primary);
        background: var(--section-wash);
        box-shadow: inset 0 0 0 1px var(--primary);
      }
      .meal-visuals img {
        width: 5.2rem;
        height: 5.2rem;
        object-fit: cover;
      }
      .meal-visuals span {
        padding: 0.65rem;
      }
      .meal-visuals strong,
      .meal-visuals small {
        display: block;
      }
      .meal-visuals strong {
        font: 700 0.85rem var(--font-display);
      }
      .meal-visuals small {
        margin-top: 0.25rem;
        color: var(--text-muted);
        font-size: 0.65rem;
      }
      .builder-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 19rem;
        gap: 1rem;
        margin-bottom: 1rem;
      }
      .meal-choice {
        margin-bottom: 1rem;
      }
      .meal-context {
        padding-bottom: 0;
      }
      .surface-header > app-icon {
        color: var(--primary);
      }
      .source-option {
        padding: 0.9rem;
        border: 1px solid var(--border-soft);
        border-radius: var(--radius-md);
        background: var(--surface-muted);
      }
      .source-option > header {
        margin-bottom: 0.75rem;
        display: flex;
        align-items: center;
        gap: 0.65rem;
      }
      .source-option > header div,
      .source-option > header small {
        display: block;
      }
      .source-option > header small {
        margin-top: 0.12rem;
        color: var(--text-muted);
        font-size: 0.7rem;
      }
      .option-number {
        width: 1.8rem;
        height: 1.8rem;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        border-radius: 50%;
        color: white;
        background: var(--primary);
        font-size: 0.75rem;
        font-weight: 800;
      }
      .template-picker {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto auto;
        align-items: end;
        gap: 0.65rem;
      }
      .single-food-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 8rem auto;
        align-items: end;
        gap: 0.65rem;
      }
      .create-food-link {
        grid-column: 1 / -1;
        justify-self: start;
      }
      .archive-confirmation {
        color: var(--danger);
        font-size: 0.72rem;
        font-weight: 700;
      }
      .incoming-dish {
        margin: 0;
      }
      .choice-divider {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        color: var(--text-muted);
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
      }
      .choice-divider::before,
      .choice-divider::after {
        content: '';
        height: 1px;
        flex: 1;
        background: var(--border-soft);
      }
      .catalog > .notice {
        margin: 0 1.15rem 1.15rem;
      }
      .daily-total {
        padding: 1.35rem;
        color: white;
        background: var(--primary-dark);
        border-radius: 2.5rem 0.8rem 0.8rem;
      }
      .daily-total .eyebrow,
      .daily-total small {
        color: #dcebc6;
      }
      .daily-total > strong {
        display: block;
        margin: 0.7rem 0;
        font: 700 2rem var(--font-display);
      }
      .daily-total > strong em {
        font: 600 0.75rem var(--font-sans);
      }
      .daily-total .progress {
        height: 0.55rem;
        background: rgba(255, 255, 255, 0.2);
      }
      .daily-total .progress span {
        background: var(--avocado-soft);
      }
      .macro {
        margin: 1.25rem 0;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.4rem;
      }
      .macro span {
        padding: 0.6rem 0.2rem;
        text-align: center;
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 0.45rem;
        color: #dcebc6;
        font-size: 0.62rem;
      }
      .macro b {
        display: block;
        margin-top: 0.25rem;
        color: white;
        font-size: 0.78rem;
      }
      .remaining {
        padding: 0.65rem;
        border-radius: 0.45rem;
        background: rgba(255, 255, 255, 0.08);
        text-align: center;
        font-size: 0.76rem;
      }
      .daily-total .field label {
        color: white;
      }
      .daily-total input {
        background: rgba(255, 255, 255, 0.95);
      }
      .remove {
        width: 2rem;
        height: 2rem;
        display: grid;
        place-items: center;
        border: 0;
        border-radius: 0.35rem;
        background: transparent;
        color: var(--danger);
        cursor: pointer;
      }
      .remove:hover {
        background: var(--danger-soft);
      }
      .save-plan {
        padding: 1rem 1.15rem;
        display: flex;
        align-items: end;
        justify-content: flex-end;
        gap: 1rem;
        border-top: 1px solid var(--border);
      }
      .plan-name {
        width: 100%;
      }
      .plan-details {
        margin-right: auto;
        width: min(36rem, 100%);
        display: grid;
        gap: 0.75rem;
      }
      .saved-plans {
        margin-top: 1rem;
      }
      .compact-empty {
        min-height: 11rem;
      }
      @media (max-width: 950px) {
        .builder-layout {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 650px) {
        .meal-visuals {
          grid-template-columns: 1fr;
        }
        .save-plan {
          align-items: stretch;
          flex-direction: column;
        }
        .plan-name {
          width: 100%;
        }
        .template-picker {
          grid-template-columns: 1fr;
        }
        .single-food-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class MenuPlansComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly pendingArchivePlanId = signal<string | null>(null);
  readonly archivingPlanId = signal<string | null>(null);
  private readonly patientContext = inject(PatientContextService);
  private readonly dishesApi = inject(DishesApiService);
  private readonly route = inject(ActivatedRoute);
  readonly foods = signal<Food[]>([]);
  readonly dishes = signal<Dish[]>([]);
  readonly items = signal<PlanItem[]>([]);
  readonly saving = signal(false);
  readonly savedPlans = signal<MenuPlanSummary[]>([]);
  readonly loadingPlans = signal(false);
  readonly incomingDishName = signal('');
  readonly editingPlanId = signal<string | null>(null);
  private loadedPatientId = '';
  targetKcal = 1950;
  planName = 'Plan semanal · septiembre';
  professionalNotes = 'Plan sujeto a revisión profesional.';
  private planStartsOn = '';
  private planEndsOn = '';
  draft = { foodId: '', mealName: 'Desayuno', portions: 1, dayOfWeek: 1 };
  selectedDishId = '';
  dayLabel(): string {
    return ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][
      this.draft.dayOfWeek - 1
    ];
  }
  constructor() {
    effect(() => {
      const patientId = this.patientContext.selectedId();
      if (!patientId || patientId === this.loadedPatientId) return;
      this.loadSavedPlans(patientId);
    });
  }
  applyTemplate(template: QuickTemplate): void {
    this.planName = template.values['planName'] ?? this.planName;
    this.professionalNotes = template.values['professionalNotes'] ?? this.professionalNotes;
  }
  ngOnInit(): void {
    this.api.foods().subscribe({
      next: (r) => this.foods.set(r.items),
      error: (error: Error) => this.toast.show('error', 'No se cargó el catálogo', error.message),
    });
    this.dishesApi.listAll().subscribe({
      next: (dishes) => {
        this.dishes.set(dishes);
        const requestedDishId = this.route.snapshot.queryParamMap.get('dishId');
        const requestedDish = dishes.find((dish) => dish.id === requestedDishId);
        if (requestedDish) {
          this.selectedDishId = requestedDish.id;
          this.incomingDishName.set(requestedDish.name);
        }
      },
      error: (error: Error) => this.toast.show('error', 'No se cargaron los platos', error.message),
    });
  }
  addDish(): void {
    const dish = this.dishes().find((x) => x.id === this.selectedDishId);
    if (!dish) {
      this.toast.show('error', 'Selecciona un plato guardado');
      return;
    }
    const divisor = Math.max(1, dish.servings);
    this.items.update((rows) => [
      ...rows,
      ...dish.ingredients.map((ingredient) => ({
        foodItemId: ingredient.foodItemId,
        mealName: this.draft.mealName,
        foodNameSnapshot: `${dish.name}: ${ingredient.foodName}`,
        portions: ingredient.portions / divisor,
        grams: ingredient.grams / divisor,
        energyKcal: ingredient.energyKcal / divisor,
        householdMeasure: ingredient.householdMeasure,
        dayOfWeek: this.draft.dayOfWeek,
      })),
    ]);
    this.incomingDishName.set('');
    this.selectedDishId = '';
    this.toast.show('success', 'Plato añadido', `Se agregó una porción de ${dish.name}.`);
  }
  selectedFood(): Food | undefined {
    return this.foods().find((x) => x.id === this.draft.foodId);
  }
  addItem(): void {
    const food = this.selectedFood();
    if (!food) {
      this.toast.show('error', 'Selecciona un alimento');
      return;
    }
    const portions = Number(this.draft.portions);
    this.items.update((rows) => [
      ...rows,
      {
        foodItemId: food.id,
        mealName: this.draft.mealName,
        foodNameSnapshot: food.name,
        portions,
        grams: food.portionGrams * portions,
        energyKcal: food.energyKcal * portions,
        householdMeasure: food.householdMeasure,
        dayOfWeek: this.draft.dayOfWeek,
      },
    ]);
    this.draft.foodId = '';
    this.toast.show('success', 'Alimento añadido', `${portions} porción(es) de ${food.name}`);
  }
  removeItem(index: number): void {
    this.items.update((rows) => rows.filter((_, i) => i !== index));
  }
  totalKcal(): number {
    return this.items().reduce((sum, x) => sum + x.energyKcal, 0);
  }
  proteinTotal(): number {
    return this.items().reduce(
      (sum, item) =>
        sum + (this.foods().find((x) => x.id === item.foodItemId)?.proteinG || 0) * item.portions,
      0,
    );
  }
  carbTotal(): number {
    return this.items().reduce(
      (sum, item) =>
        sum +
        (this.foods().find((x) => x.id === item.foodItemId)?.carbohydrateG || 0) * item.portions,
      0,
    );
  }
  fatTotal(): number {
    return this.items().reduce(
      (sum, item) =>
        sum + (this.foods().find((x) => x.id === item.foodItemId)?.fatG || 0) * item.portions,
      0,
    );
  }
  progressPercent(): number {
    return Math.min(100, (this.totalKcal() / this.targetKcal) * 100);
  }
  remainingKcal(): number {
    return Math.max(0, this.targetKcal - this.totalKcal());
  }
  savePlan(): void {
    const patientId = this.patientContext.selectedId();
    if (!patientId) {
      this.toast.show('error', 'Selecciona un paciente');
      return;
    }
    this.saving.set(true);
    const today = this.planStartsOn || new Date().toISOString().slice(0, 10);
    const end = this.planEndsOn ? new Date(`${this.planEndsOn}T12:00:00`) : new Date();
    if (!this.planEndsOn) end.setDate(end.getDate() + 6);
    const body = {
        patientId,
        name: this.planName,
        startsOn: today,
        endsOn: end.toISOString().slice(0, 10),
        energyTargetKcal: this.targetKcal,
        professionalNotes: this.professionalNotes.trim(),
        items: this.items(),
      };
    const editingId = this.editingPlanId();
    const request = editingId ? this.api.updateMenuPlan(editingId, body) : this.api.createMenuPlan(body);
    request.subscribe({
        next: () => {
          this.saving.set(false);
          this.editingPlanId.set(null);
          this.planStartsOn = '';
          this.planEndsOn = '';
          this.toast.show('success', editingId ? 'Plan actualizado' : 'Plan guardado', 'Ya puede revisarse antes de enviarlo.');
          this.loadSavedPlans(patientId, true);
        },
        error: (e) => {
          this.saving.set(false);
          this.toast.show('error', 'No se guardó el plan', e.message);
        },
      });
  }

  editPlan(plan: MenuPlanSummary): void {
    this.editingPlanId.set(plan.id);
    this.planName = plan.name;
    this.targetKcal = plan.energyTargetKcal;
    this.professionalNotes = plan.professionalNotes;
    this.planStartsOn = plan.startsOn;
    this.planEndsOn = plan.endsOn;
    this.items.set(plan.items.map((item) => ({
      foodItemId: item.foodItemId,
      mealName: item.mealName,
      foodNameSnapshot: item.foodNameSnapshot,
      portions: item.portions,
      grams: item.grams,
      energyKcal: item.energyKcal,
      householdMeasure: item.householdMeasure,
      dayOfWeek: item.dayOfWeek,
    })));
    document.querySelector('#planName')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.toast.show('success', 'Plan cargado', 'Edita el contenido y vuelve a guardar.');
  }

  requestArchivePlan(plan: MenuPlanSummary): void {
    this.pendingArchivePlanId.set(plan.id);
  }

  cancelArchivePlan(): void {
    if (this.archivingPlanId()) return;
    this.pendingArchivePlanId.set(null);
  }

  confirmArchivePlan(plan: MenuPlanSummary): void {
    if (this.archivingPlanId()) return;
    this.archivingPlanId.set(plan.id);
    this.api.archiveMenuPlan(plan.id).subscribe({
      next: () => {
        this.archivingPlanId.set(null);
        this.pendingArchivePlanId.set(null);
        if (this.editingPlanId() === plan.id) this.editingPlanId.set(null);
        const patientId = this.patientContext.selectedId();
        if (patientId) this.loadSavedPlans(patientId, true);
        this.toast.show('success', 'Plan archivado');
      },
      error: (e) => {
        this.archivingPlanId.set(null);
        this.toast.show('error', 'No se archivó el plan', e.message);
      },
    });
  }

  private loadSavedPlans(patientId: string, force = false): void {
    if (!force && patientId === this.loadedPatientId) return;
    this.loadedPatientId = patientId;
    this.loadingPlans.set(true);
    this.api.menuPlans(patientId).subscribe({
      next: (plans) => {
        if (this.patientContext.selectedId() !== patientId) return;
        this.savedPlans.set(plans);
        this.loadingPlans.set(false);
      },
      error: (error: Error) => {
        this.savedPlans.set([]);
        this.loadingPlans.set(false);
        this.toast.show('error', 'No se cargaron los planes guardados', error.message);
      },
    });
  }
}
