import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService, Food, FoodCatalogImport, SavePersonalizedFood } from '../../../../nucleo/api.service';
import { IconComponent } from '../../../../compartido/icono/icon.component';
import { ToastService } from '../../../../compartido/notificaciones/toast.service';
import { FlujoPlanNutricionalComponent } from '../../../../compartido/flujo-plan-nutricional/flujo-plan-nutricional.component';
import { AuthService } from '../../../../nucleo/autenticacion/auth.service';

@Component({
  selector: 'app-foods',
  imports: [FormsModule, DecimalPipe, IconComponent, FlujoPlanNutricionalComponent],
  template: `<div class="page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Base alimentaria</p>
        <h1>Catálogo de alimentos</h1>
        <p class="lede">
          Consulta porciones y composición con fuente, edición y condición de uso visibles.
        </p>
      </div>
      <div class="header-actions">
        <button class="button button-primary" type="button" (click)="openCreateFood()">
          <app-icon name="plus" /> Crear alimento personalizado
        </button>
      @if (canImport()) {
        <button
          class="button button-secondary"
          type="button"
          (click)="openImport()"
        >
          <app-icon name="download" /> Importar catálogo CSV
        </button>
      } @else {
        <span class="badge">Puedes crear alimentos personalizados</span>
      }
      </div>
    </header>
    <app-flujo-plan-nutricional [currentStep]="1" />
    <div class="notice notice-success workflow-note">
      <app-icon name="food" /><span
        ><strong>Aquí está la base de ingredientes.</strong> Busca el catálogo autorizado o crea un
        alimento personalizado con su porción, nutrientes y referencia. Después ve a Platos para
        combinar los ingredientes.</span
      >
    </div>
    <div class="notice notice-warning">
      <app-icon name="info" /><span
        ><strong>Entorno demostrativo.</strong> Los valores de ejemplo no sustituyen las tablas
        oficiales de Ecuador ni una licencia SMAE. El importador exige fuente y edición.</span
      >
    </div>
    @if (foodFormOpen()) {
      <section class="surface food-form-panel" aria-labelledby="foodFormTitle">
        <header class="surface-header">
          <div>
            <p class="eyebrow">Alimento personalizado</p>
            <h2 id="foodFormTitle">{{ editingFood() ? 'Editar alimento' : 'Crear alimento' }}</h2>
            <p>Registra los valores de la porción que realmente usarás en platos y menús.</p>
          </div>
          <button class="button button-quiet" type="button" [disabled]="savingFood()" (click)="closeFoodForm()">
            <app-icon name="close" /> Cerrar
          </button>
        </header>
        <form #foodForm="ngForm" novalidate class="surface-body form-grid" (ngSubmit)="saveFood(foodForm)">
          @if (foodFormError()) {
            <div class="notice notice-danger col-12" role="alert"><app-icon name="info" />{{ foodFormError() }}</div>
          }
          <div class="field col-6">
            <label class="required" for="foodName">Nombre del alimento</label>
            <input id="foodName" name="foodName" [(ngModel)]="foodModel.name" #foodName="ngModel" required minlength="2" maxlength="180" [attr.aria-invalid]="foodName.invalid && (foodName.touched || foodSubmitted())" />
            <small [class.field-error]="foodName.invalid && (foodName.touched || foodSubmitted())">{{ foodName.invalid && (foodName.touched || foodSubmitted()) ? 'Escribe al menos 2 caracteres.' : 'Ej. lenteja cocida o yogur natural.' }}</small>
          </div>
          <div class="field col-6">
            <label class="required" for="foodGroup">Grupo alimentario</label>
            <select id="foodGroup" name="foodGroup" [(ngModel)]="foodModel.group" #foodGroup="ngModel" required [attr.aria-invalid]="foodGroup.invalid && (foodGroup.touched || foodSubmitted())">
              <option value="">Selecciona un grupo</option>
              <option value="Cereales y tubérculos">Cereales y tubérculos</option>
              <option value="Leguminosas">Leguminosas</option>
              <option value="Verduras">Verduras</option>
              <option value="Frutas">Frutas</option>
              <option value="Lácteos">Lácteos</option>
              <option value="Proteínas animales">Proteínas animales</option>
              <option value="Grasas">Grasas</option>
              <option value="Bebidas">Bebidas</option>
              <option value="Otros">Otros</option>
            </select>
            <small [class.field-error]="foodGroup.invalid && (foodGroup.touched || foodSubmitted())">{{ foodGroup.invalid && (foodGroup.touched || foodSubmitted()) ? 'Selecciona el grupo.' : 'Facilita la búsqueda y el método de porciones.' }}</small>
          </div>
          <div class="field col-4">
            <label class="required" for="householdMeasure">Medida casera</label>
            <input id="householdMeasure" name="householdMeasure" [(ngModel)]="foodModel.householdMeasure" #householdMeasure="ngModel" required minlength="2" maxlength="120" placeholder="Ej. 1/2 taza" [attr.aria-invalid]="householdMeasure.invalid && (householdMeasure.touched || foodSubmitted())" />
            <small [class.field-error]="householdMeasure.invalid && (householdMeasure.touched || foodSubmitted())">{{ householdMeasure.invalid && (householdMeasure.touched || foodSubmitted()) ? 'Indica una medida casera.' : 'Cantidad comprensible para el paciente.' }}</small>
          </div>
          <div class="field col-4">
            <label class="required" for="portionGrams">Peso de esa porción (g)</label>
            <input id="portionGrams" name="portionGrams" type="number" [(ngModel)]="foodModel.portionGrams" #portionGrams="ngModel" required min="0.01" max="5000" step="0.01" [attr.aria-invalid]="portionGrams.invalid && (portionGrams.touched || foodSubmitted())" />
            <small [class.field-error]="portionGrams.invalid && (portionGrams.touched || foodSubmitted())">{{ portionGrams.invalid && (portionGrams.touched || foodSubmitted()) ? 'Usa un peso mayor que 0.' : 'Los nutrientes de abajo corresponden a este peso.' }}</small>
          </div>
          <div class="field col-4">
            <label class="required" for="energyKcal">Energía (kcal)</label>
            <input id="energyKcal" name="energyKcal" type="number" [(ngModel)]="foodModel.energyKcal" required min="0" max="10000" step="0.01" />
            <small>Por la porción registrada.</small>
          </div>
          <div class="field col-4"><label class="required" for="proteinG">Proteína (g)</label><input id="proteinG" name="proteinG" type="number" [(ngModel)]="foodModel.proteinG" required min="0" max="1000" step="0.01" /><small>Por porción.</small></div>
          <div class="field col-4"><label class="required" for="carbohydrateG">Carbohidrato (g)</label><input id="carbohydrateG" name="carbohydrateG" type="number" [(ngModel)]="foodModel.carbohydrateG" required min="0" max="1000" step="0.01" /><small>Por porción.</small></div>
          <div class="field col-4"><label class="required" for="fatG">Grasa (g)</label><input id="fatG" name="fatG" type="number" [(ngModel)]="foodModel.fatG" required min="0" max="1000" step="0.01" /><small>Por porción.</small></div>
          <div class="field col-4"><label class="required" for="fiberG">Fibra (g)</label><input id="fiberG" name="fiberG" type="number" [(ngModel)]="foodModel.fiberG" required min="0" max="1000" step="0.01" /><small>Por porción.</small></div>
          <div class="field col-4"><label class="required" for="sodiumMg">Sodio (mg)</label><input id="sodiumMg" name="sodiumMg" type="number" [(ngModel)]="foodModel.sodiumMg" required min="0" max="100000" step="0.01" /><small>Miligramos por porción.</small></div>
          <div class="field col-8">
            <label class="required" for="sourceReference">Fuente o referencia</label>
            <input id="sourceReference" name="sourceReference" [(ngModel)]="foodModel.sourceReference" #sourceReference="ngModel" required minlength="3" maxlength="500" placeholder="Ej. etiqueta del producto, receta estandarizada o URL" [attr.aria-invalid]="sourceReference.invalid && (sourceReference.touched || foodSubmitted())" />
            <small [class.field-error]="sourceReference.invalid && (sourceReference.touched || foodSubmitted())">{{ sourceReference.invalid && (sourceReference.touched || foodSubmitted()) ? 'Explica de dónde salen los valores.' : 'Indica el origen real: etiqueta, tabla autorizada, receta estandarizada o URL.' }}</small>
          </div>
          <footer class="col-12 food-form-actions">
            <button class="button button-secondary" type="button" [disabled]="savingFood()" (click)="closeFoodForm()">Cancelar</button>
            <button class="button button-primary" type="submit" [disabled]="savingFood()">{{ savingFood() ? 'Guardando…' : editingFood() ? 'Guardar cambios' : 'Crear alimento' }}</button>
          </footer>
        </form>
      </section>
    }
    @if (importOpen()) {
      <section class="surface import-panel">
        <header class="surface-header">
          <div>
            <p class="eyebrow">Administración del catálogo</p>
            <h2>Importar edición autorizada</h2>
          </div>
          <button class="button button-quiet" type="button" (click)="importOpen.set(false)">
            <app-icon name="close" /> Cerrar
          </button>
        </header>
        <div class="surface-body form-grid">
          <div class="col-12 import-tools">
            <button class="button button-secondary" type="button" (click)="downloadTemplate()"><app-icon name="download" /> Descargar plantilla CSV</button>
            <span class="caption">La importación es transaccional: si una fila falla, no se publica ninguna.</span>
          </div>
          <div class="field col-4">
            <label for="importSource">Fuente</label>
            <select id="importSource" [(ngModel)]="importSource">
              <option [ngValue]="1">Tabla Ecuador autorizada</option>
              <option [ngValue]="2">SMAE con licencia</option>
            </select>
            <small>La demostración no puede importarse.</small>
          </div>
          <div class="field col-4">
            <label for="importEdition">Edición</label>
            <input id="importEdition" [(ngModel)]="importEdition" placeholder="Ej. USFQ 2021" />
            <small>Se conserva en cada alimento.</small>
          </div>
          <div class="field col-4">
            <label for="importReference">Referencia</label>
            <input
              id="importReference"
              [(ngModel)]="importReference"
              placeholder="ISBN, URL o licencia"
            />
            <small>Origen verificable.</small>
          </div>
          <div class="field col-8">
            <label for="catalogFile">Archivo CSV</label>
            <input
              id="catalogFile"
              type="file"
              accept=".csv,text/csv"
              (change)="selectFile($event)"
            />
            <small>Máximo 5 MB y 10.000 filas por operación.</small>
          </div>
          <div class="col-4 import-action">
            <button
              class="button button-primary"
              type="button"
              [disabled]="!selectedFile() || importing()"
              (click)="importCatalog()"
            >
              {{ importing() ? 'Validando…' : 'Validar e importar' }}
            </button>
          </div>
        </div>
        <div class="import-history">
          <h3>Historial y huella del archivo</h3>
          @if (!importHistory().length) {
            <p class="caption">Todavía no existen importaciones autorizadas.</p>
          } @else {
            @for (entry of importHistory(); track entry.id) {
              <article><div><strong>{{ entry.sourceEdition }}</strong><small>{{ entry.originalFileName }} · {{ entry.importedByEmail }}</small></div><span>{{ entry.importedRows }} filas</span><code [title]="entry.sha256">SHA-256 {{ entry.sha256.slice(0, 12) }}…</code></article>
            }
          }
        </div>
      </section>
    }
    <section class="surface catalog">
      <div class="food-toolbar">
        <div class="search">
          <label class="field-label" for="foodSearch">Buscar alimento o grupo</label>
          <span class="search-control"
            ><app-icon name="search" /><input
              #foodSearch
              id="foodSearch"
              name="foodSearch"
              class="search-input"
              [(ngModel)]="query"
              (keydown.enter)="searchOnEnter($event)"
              autocomplete="off"
              placeholder="Ej. lenteja, cereal…"
            />
            @if (query) {
              <button
                class="icon-button search-clear"
                type="button"
                aria-label="Limpiar búsqueda"
                (click)="clearSearch(foodSearch)"
              >
                <app-icon name="close" />
              </button>
            }
          </span>
        </div>
        <button class="button button-secondary" type="button" (click)="load()">Buscar</button
        ><span class="badge">{{ foods().length }} resultados</span>
      </div>
      @if (loading()) {
        <div class="status-message"><span class="spinner"></span></div>
      } @else if (!foods().length) {
        <div class="empty-state">
          <div>
            <app-icon name="food" />
            <h2>Sin alimentos</h2>
            <p>
              {{
                canImport()
                  ? 'Prueba otro término o importa un catálogo autorizado.'
                  : 'Prueba otro término. El Administrador puede importar el catálogo autorizado.'
              }}
            </p>
          </div>
        </div>
      } @else {
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Alimento</th>
                <th>Grupo</th>
                <th>Porción</th>
                <th>Energía</th>
                <th>Proteína</th>
                <th>Carbohidrato</th>
                <th>Grasa</th>
                <th>Fibra</th>
                <th>Fuente</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (food of foods(); track food.id) {
                <tr>
                  <td>
                    <strong>{{ food.name }}</strong>
                  </td>
                  <td>
                    <span class="badge">{{ food.group }}</span>
                  </td>
                  <td>{{ food.householdMeasure }} · {{ food.portionGrams | number: '1.0-1' }} g</td>
                  <td class="metric-number">{{ food.energyKcal | number: '1.0-1' }} kcal</td>
                  <td>{{ food.proteinG | number: '1.0-1' }} g</td>
                  <td>{{ food.carbohydrateG | number: '1.0-1' }} g</td>
                  <td>{{ food.fatG | number: '1.0-1' }} g</td>
                  <td>{{ food.fiberG | number: '1.0-1' }} g</td>
                  <td>
                    <span class="source"
                      >{{ sourceLabel(food.source)
                      }}<small>{{ food.sourceEdition }}</small></span
                    >
                  </td>
                  <td>
                    @if (food.source === 3) {
                      <button class="button button-quiet button-small" type="button" (click)="openEditFood(food)"><app-icon name="edit" /> Editar</button>
                    } @else {
                      <span class="caption">Edición protegida</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
      <div class="pagination">
        <span>Valores por porción registrada</span><span>Edición y referencia obligatorias</span>
      </div>
    </section>
    <section class="import-guide">
      <div>
        <p class="eyebrow">Importación profesional</p>
        <h2>Ecuador y SMAE sin perder trazabilidad</h2>
      </div>
      <ol>
        <li>
          <span>1</span>
          <p>
            <strong>Obtén la fuente autorizada</strong
            ><small>Archivo oficial o licencia vigente.</small>
          </p>
        </li>
        <li>
          <span>2</span>
          <p>
            <strong>Mapea porción y nutrientes</strong
            ><small>Usa la plantilla CSV documentada.</small>
          </p>
        </li>
        <li>
          <span>3</span>
          <p>
            <strong>Valida y publica una edición</strong
            ><small>Nada reemplaza datos ya usados en planes.</small>
          </p>
        </li>
      </ol>
    </section>
  </div>`,
  styles: [
    `
      .notice {
        margin-bottom: 1rem;
      }
      .workflow-note {
        border-color: var(--border-section);
      }
      .header-actions { display:flex; align-items:center; gap:.65rem; flex-wrap:wrap; justify-content:flex-end; }
      .food-form-panel { margin:1rem 0; border-color:var(--border-section); overflow:hidden; }
      .food-form-panel .surface-header { align-items:flex-start; }
      .food-form-panel .surface-header p:not(.eyebrow) { margin:.3rem 0 0; color:var(--text-muted); font-size:.78rem; }
      .food-form-actions { padding-top:.4rem; display:flex; justify-content:flex-end; gap:.65rem; border-top:1px solid var(--border-soft); }
      .catalog {
        margin-bottom: 1rem;
      }
      .import-panel {
        margin: 1rem 0;
      }
      .import-action {
        display: flex;
        align-items: center;
      }
      .import-action .button {
        width: 100%;
      }
      .import-tools { display:flex; align-items:center; gap:.75rem; flex-wrap:wrap; }
      .import-history { padding:0 1.1rem 1.1rem; border-top:1px solid var(--border); }
      .import-history h3 { font:700 1rem var(--font-display); }
      .import-history article { padding:.65rem 0; display:grid; grid-template-columns:1fr auto auto; gap:1rem; align-items:center; border-bottom:1px solid var(--border); font-size:.75rem; }
      .import-history article small { display:block; margin-top:.2rem; color:var(--text-muted); }
      .import-history code { color:var(--primary-dark); font-size:.68rem; }
      .food-toolbar {
        padding: 1rem 1.1rem;
        display: flex;
        align-items: end;
        gap: 0.75rem;
        border-bottom: 1px solid var(--border);
      }
      .food-toolbar > .badge {
        margin-left: auto;
      }
      .search {
        width: min(30rem, 100%);
        display: grid;
        gap: 0.35rem;
      }
      .search > span:last-child {
        position: relative;
      }
      .search-control {
        display: block;
      }
      .search app-icon {
        position: absolute;
        left: 0.75rem;
        top: 0.8rem;
        color: var(--text-muted);
      }
      .search-input {
        padding-left: 2.4rem;
        padding-right: 2.8rem;
      }
      .search-clear {
        position: absolute;
        top: 0.12rem;
        right: 0.15rem;
        width: 2.45rem;
        height: 2.45rem;
      }
      .source,
      .source small {
        display: block;
      }
      .source {
        font-weight: 700;
      }
      .source small {
        margin-top: 0.2rem;
        color: var(--danger);
        font-size: 0.66rem;
      }
      .import-guide {
        padding: 1.3rem;
        display: grid;
        grid-template-columns: 0.8fr 1.7fr;
        gap: 1rem;
        border: 1px solid #d7e5b5;
        border-radius: 2.5rem 0.8rem 0.8rem;
        background: var(--surface-muted);
      }
      .import-guide ol {
        margin: 0;
        padding: 0;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.75rem;
        list-style: none;
      }
      .import-guide li {
        display: flex;
        gap: 0.55rem;
      }
      .import-guide li > span {
        width: 1.8rem;
        height: 1.8rem;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: var(--primary);
        color: white;
        font-weight: 800;
        font-size: 0.7rem;
      }
      .import-guide p,
      .import-guide small {
        display: block;
      }
      .import-guide p {
        margin: 0;
        font-size: 0.8rem;
      }
      .import-guide small {
        margin-top: 0.25rem;
        color: var(--text-muted);
        font-size: 0.68rem;
      }
      @media (max-width: 900px) {
        .import-guide {
          grid-template-columns: 1fr;
        }
        .food-toolbar {
          align-items: stretch;
          flex-wrap: wrap;
        }
        .food-toolbar .search {
          width: 100%;
        }
        .food-toolbar > .badge {
          margin-left: 0;
        }
      }
      @media (max-width: 650px) {
        .import-guide ol {
          grid-template-columns: 1fr;
        }
        .import-history article { grid-template-columns:1fr; gap:.3rem; }
        .header-actions, .food-form-actions { align-items:stretch; flex-direction:column; }
        .header-actions .button, .food-form-actions .button { width:100%; }
      }
    `,
  ],
})
export class FoodsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  readonly foods = signal<Food[]>([]);
  readonly loading = signal(false);
  readonly importOpen = signal(false);
  readonly importing = signal(false);
  readonly selectedFile = signal<File | null>(null);
  readonly importHistory = signal<FoodCatalogImport[]>([]);
  readonly foodFormOpen = signal(false);
  readonly editingFood = signal<Food | null>(null);
  readonly savingFood = signal(false);
  readonly foodSubmitted = signal(false);
  readonly foodFormError = signal('');
  importSource = 1;
  importEdition = '';
  importReference = '';
  query = '';
  foodModel: SavePersonalizedFood = this.emptyFoodModel();
  ngOnInit(): void {
    this.load();
    if (this.route.snapshot.queryParamMap.get('nuevo') === '1') {
      this.openCreateFood();
    }
  }
  load(): void {
    this.loading.set(true);
    this.api.foods(this.query).subscribe({
      next: (r) => {
        this.foods.set(r.items);
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.foods.set([]);
        this.loading.set(false);
        this.toast.show('error', 'No se cargó el catálogo real', error.message);
      },
    });
  }
  canImport(): boolean {
    return this.auth.hasRole('ClinicAdmin');
  }
  openCreateFood(): void {
    this.editingFood.set(null);
    this.foodModel = this.emptyFoodModel();
    this.foodSubmitted.set(false);
    this.foodFormError.set('');
    this.foodFormOpen.set(true);
  }
  openEditFood(food: Food): void {
    if (food.source !== 3) return;
    this.editingFood.set(food);
    this.foodModel = {
      name: food.name,
      group: food.group,
      portionGrams: food.portionGrams,
      householdMeasure: food.householdMeasure,
      energyKcal: food.energyKcal,
      proteinG: food.proteinG,
      carbohydrateG: food.carbohydrateG,
      fatG: food.fatG,
      fiberG: food.fiberG,
      sodiumMg: food.sodiumMg,
      sourceReference: food.sourceReference,
    };
    this.foodSubmitted.set(false);
    this.foodFormError.set('');
    this.foodFormOpen.set(true);
  }
  closeFoodForm(): void {
    if (this.savingFood()) return;
    this.foodFormOpen.set(false);
    this.editingFood.set(null);
  }
  saveFood(form: NgForm): void {
    this.foodSubmitted.set(true);
    this.foodFormError.set('');
    if (form.invalid) {
      form.control.markAllAsTouched();
      this.foodFormError.set('Revisa los campos marcados antes de guardar.');
      return;
    }
    if (this.savingFood()) return;
    this.savingFood.set(true);
    const current = this.editingFood();
    const request = current
      ? this.api.updateFood(current.id, this.foodModel)
      : this.api.createFood(this.foodModel);
    request.subscribe({
      next: () => {
        this.savingFood.set(false);
        this.foodFormOpen.set(false);
        this.editingFood.set(null);
        this.toast.show(
          'success',
          current ? 'Alimento actualizado' : 'Alimento creado',
          'Ya está disponible para usarlo en Platos y en el Plan de menú.',
        );
        this.load();
      },
      error: (error: Error) => {
        this.savingFood.set(false);
        this.foodFormError.set(error.message);
      },
    });
  }
  sourceLabel(source: number): string {
    return source === 0
      ? 'EcuadorDemo'
      : source === 1
        ? 'Ecuador autorizada'
        : source === 2
          ? 'SMAE autorizada'
          : 'Personalizado';
  }
  openImport(): void {
    const open = !this.importOpen();
    this.importOpen.set(open);
    if (open) this.loadImportHistory();
  }
  loadImportHistory(): void {
    this.api.foodImportHistory().subscribe({
      next: (items) => this.importHistory.set(items),
      error: (error: Error) => this.toast.show('error', 'No se cargó el historial', error.message),
    });
  }
  downloadTemplate(): void {
    this.api.downloadFoodImportTemplate().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'plantilla-catalogo-nutrivida.csv';
        anchor.click();
        URL.revokeObjectURL(url);
      },
      error: (error: Error) => this.toast.show('error', 'No se descargó la plantilla', error.message),
    });
  }
  searchOnEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.isComposing) return;
    keyboardEvent.preventDefault();
    this.load();
  }
  clearSearch(input: HTMLInputElement): void {
    this.query = '';
    this.load();
    input.focus();
  }
  selectFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.item(0) ?? null);
  }
  importCatalog(): void {
    const file = this.selectedFile();
    if (!file || !this.importEdition.trim() || !this.importReference.trim()) {
      this.toast.show('error', 'Completa archivo, edición y referencia');
      return;
    }
    this.importing.set(true);
    this.api
      .importFoods(file, this.importSource, this.importEdition.trim(), this.importReference.trim())
      .subscribe({
        next: () => {
          this.importing.set(false);
          this.importOpen.set(false);
          this.toast.show(
            'success',
            'Catálogo importado',
            'La fuente y edición quedaron registradas.',
          );
          this.loadImportHistory();
          this.load();
        },
        error: (e) => {
          this.importing.set(false);
          this.toast.show('error', 'Importación rechazada', e.message);
        },
      });
  }
  private emptyFoodModel(): SavePersonalizedFood {
    return {
      name: '',
      group: '',
      portionGrams: 100,
      householdMeasure: '',
      energyKcal: 0,
      proteinG: 0,
      carbohydrateG: 0,
      fatG: 0,
      fiberG: 0,
      sodiumMg: 0,
      sourceReference: '',
    };
  }
}
