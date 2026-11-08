import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../compartido/icono/icon.component';
import { ToastService } from '../../../../compartido/notificaciones/toast.service';
import { ApiService, Food } from '../../../../nucleo/api.service';
import { FOOD_OPTION_LIMIT, filterFoods, scaleFood, withSelectedFood } from '../../../../nucleo/food-options';
import { Recall24hRow, recallTotals } from '../../modelos/recall-24h';

const MEALS = ['Desayuno', 'Media mañana', 'Almuerzo', 'Media tarde', 'Cena', 'Antes de dormir', 'Bebidas'];

@Component({
  selector: 'app-recall-24h',
  imports: [FormsModule, DecimalPipe, IconComponent],
  template: `
    <section class="recall" aria-labelledby="recallTitle">
      <header>
        <div>
          <h3 id="recallTitle">Recordatorio de 24 horas</h3>
          <p>Elige cada alimento y su porción: calorías, proteína, carbohidrato y grasa se calculan solos.</p>
        </div>
      </header>

      <div class="add-row">
        <div class="field">
          <label for="recallMeal">Tiempo de comida</label>
          <select id="recallMeal" name="recallMeal" [(ngModel)]="meal">
            @for (option of meals; track option) {
              <option>{{ option }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label for="recallFilter">Buscar alimento</label>
          <input
            id="recallFilter"
            name="recallFilter"
            autocomplete="off"
            placeholder="Ej. arroz, leche…"
            [ngModel]="filter()"
            (ngModelChange)="filter.set($event)"
          />
        </div>
        <div class="field food">
          <label for="recallFood">Alimento</label>
          <select
            id="recallFood"
            name="recallFood"
            [ngModel]="foodId()"
            (ngModelChange)="selectFood($event)"
          >
            <option value="">Selecciona ({{ foods().length }} en catálogo)</option>
            @for (food of options(); track food.id) {
              <option [value]="food.id">{{ food.name }} · {{ food.householdMeasure }}</option>
            }
          </select>
        </div>
        <div class="field small">
          <label for="recallPortions">Porciones</label>
          <input
            id="recallPortions"
            name="recallPortions"
            type="number"
            min="0.01"
            step="0.25"
            [ngModel]="portions()"
            (ngModelChange)="setPortions($event)"
          />
        </div>
        <div class="field small">
          <label for="recallGrams">Gramos</label>
          <input
            id="recallGrams"
            name="recallGrams"
            type="number"
            min="0.1"
            step="1"
            [ngModel]="grams()"
            (ngModelChange)="setGrams($event)"
          />
        </div>
        <button class="button button-primary" type="button" [disabled]="!selectedFood()" (click)="addFood()">
          <app-icon name="plus" /> Añadir
        </button>
      </div>
      @if (preview(); as item) {
        <p class="preview" role="status">
          {{ item.energyKcal | number: '1.0-1' }} kcal · proteína {{ item.proteinG | number: '1.0-1' }} g ·
          carbohidrato {{ item.carbohydrateG | number: '1.0-1' }} g · grasa {{ item.fatG | number: '1.0-1' }} g
        </p>
      }

      <details class="manual">
        <summary>El alimento no está en el catálogo</summary>
        <div class="manual-row">
          <div class="field food">
            <label for="manualName">Alimento</label>
            <input id="manualName" name="manualName" maxlength="180" [(ngModel)]="manual.foodName" />
          </div>
          <div class="field small"><label for="manualGrams">Gramos</label><input id="manualGrams" name="manualGrams" type="number" min="0" [(ngModel)]="manual.grams" /></div>
          <div class="field small"><label for="manualKcal">Kcal</label><input id="manualKcal" name="manualKcal" type="number" min="0" [(ngModel)]="manual.energyKcal" /></div>
          <div class="field small"><label for="manualProtein">Proteína g</label><input id="manualProtein" name="manualProtein" type="number" min="0" [(ngModel)]="manual.proteinG" /></div>
          <div class="field small"><label for="manualCarb">H. carbono g</label><input id="manualCarb" name="manualCarb" type="number" min="0" [(ngModel)]="manual.carbohydrateG" /></div>
          <div class="field small"><label for="manualFat">Grasa g</label><input id="manualFat" name="manualFat" type="number" min="0" [(ngModel)]="manual.fatG" /></div>
          <button class="button button-secondary" type="button" (click)="addManual()">Añadir</button>
        </div>
      </details>

      @if (rows().length) {
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Tiempo</th>
                <th>Alimento</th>
                <th>Porciones</th>
                <th>Gramos</th>
                <th>Kcal</th>
                <th>Proteína</th>
                <th>H. carbono</th>
                <th>Grasa</th>
                <th><span class="sr-only">Quitar</span></th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track $index) {
                <tr>
                  <td><span class="badge">{{ row.mealName }}</span></td>
                  <td><strong>{{ row.foodName }}</strong><small>{{ row.householdMeasure }}</small></td>
                  <td>
                    <input
                      class="inline"
                      type="number"
                      min="0.01"
                      step="0.25"
                      [name]="'recallRow' + $index"
                      [attr.aria-label]="'Porciones de ' + row.foodName"
                      [ngModel]="row.portions"
                      (ngModelChange)="changePortions($index, $event)"
                    />
                  </td>
                  <td>{{ row.grams | number: '1.0-1' }} g</td>
                  <td class="metric-number">{{ row.energyKcal | number: '1.0-1' }}</td>
                  <td>{{ row.proteinG | number: '1.0-1' }} g</td>
                  <td>{{ row.carbohydrateG | number: '1.0-1' }} g</td>
                  <td>{{ row.fatG | number: '1.0-1' }} g</td>
                  <td>
                    <button class="icon-button" type="button" [attr.aria-label]="'Quitar ' + row.foodName" (click)="remove($index)">
                      <app-icon name="trash" />
                    </button>
                  </td>
                </tr>
              }
            </tbody>
            <tfoot>
              <tr>
                <th colspan="4">Total del día</th>
                <th class="metric-number">{{ totals().energyKcal | number: '1.0-0' }} kcal</th>
                <th>{{ totals().proteinG | number: '1.0-1' }} g<small>{{ totals().proteinPercent }} %</small></th>
                <th>{{ totals().carbohydrateG | number: '1.0-1' }} g<small>{{ totals().carbohydratePercent }} %</small></th>
                <th>{{ totals().fatG | number: '1.0-1' }} g<small>{{ totals().fatPercent }} %</small></th>
                <th></th>
              </tr>
            </tfoot>
          </table>
        </div>
      }
    </section>
  `,
  styles: [
    `
      .recall {
        padding: 1rem;
        display: grid;
        gap: 0.8rem;
        background: var(--surface-muted);
        border: 1px solid var(--border-section);
        border-radius: 0.8rem;
      }
      h3 {
        margin: 0;
        font-size: 1rem;
      }
      header p {
        margin: 0.15rem 0 0;
        color: var(--text-muted);
        font-size: 0.85rem;
      }
      .add-row,
      .manual-row {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        gap: 0.6rem;
      }
      .add-row .field,
      .manual-row .field {
        flex: 1 1 9rem;
      }
      .add-row .food,
      .manual-row .food {
        flex: 2 1 14rem;
      }
      .add-row .small,
      .manual-row .small {
        flex: 0 1 6.2rem;
      }
      .preview {
        margin: 0;
        font-size: 0.85rem;
        font-weight: 650;
        color: var(--primary-dark);
      }
      .manual summary {
        cursor: pointer;
        font-size: 0.85rem;
        font-weight: 650;
        color: var(--primary-dark);
      }
      .manual-row {
        margin-top: 0.6rem;
      }
      .inline {
        width: 4.6rem;
        min-height: 2rem;
        padding: 0.2rem 0.4rem;
      }
      td small,
      th small {
        display: block;
        color: var(--text-muted);
        font-weight: 500;
      }
      tfoot th {
        text-align: left;
      }
    `,
  ],
})
export class Recall24hComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  readonly rows = model.required<Recall24hRow[]>();
  readonly meals = MEALS;
  readonly optionLimit = FOOD_OPTION_LIMIT;
  readonly foods = signal<Food[]>([]);
  readonly filter = signal('');
  readonly foodId = signal('');
  readonly portions = signal<number | null>(1);
  readonly grams = signal<number | null>(null);
  readonly totals = computed(() => recallTotals(this.rows()));
  readonly options = computed(() =>
    withSelectedFood(filterFoods(this.foods(), this.filter()), this.foods(), this.foodId()),
  );
  readonly selectedFood = computed(() => this.foods().find((food) => food.id === this.foodId()) ?? null);
  readonly preview = computed(() => {
    const food = this.selectedFood();
    const portions = Number(this.portions());
    return food && portions > 0 ? scaleFood(food, portions) : null;
  });
  meal = 'Desayuno';
  manual = this.emptyManual();

  constructor() {
    this.api.foodOptions().subscribe({
      next: (foods) => this.foods.set(foods),
      error: (error: Error) => this.toast.show('error', 'No se cargó el catálogo', error.message),
    });
  }

  selectFood(id: string): void {
    this.foodId.set(id);
    this.setPortions(this.portions());
  }

  setPortions(value: number | null): void {
    this.portions.set(value);
    const food = this.selectedFood();
    this.grams.set(food && value ? round(Number(food.portionGrams) * Number(value)) : null);
  }

  setGrams(value: number | null): void {
    this.grams.set(value);
    const food = this.selectedFood();
    if (food && value && Number(food.portionGrams) > 0) {
      this.portions.set(Math.round((Number(value) / Number(food.portionGrams)) * 100) / 100);
    }
  }

  addFood(): void {
    const food = this.selectedFood();
    const portions = Number(this.portions());
    if (!food || !(portions > 0)) {
      this.toast.show('error', 'Revisa la porción', 'Selecciona un alimento y una porción mayor a cero.');
      return;
    }
    this.rows.update((rows) => [...rows, this.toRow(food, this.meal, portions)]);
    this.foodId.set('');
    this.filter.set('');
    this.portions.set(1);
    this.grams.set(null);
  }

  addManual(): void {
    if (!this.manual.foodName.trim()) {
      this.toast.show('error', 'Escribe el alimento', 'Indica el nombre y sus valores.');
      return;
    }
    this.rows.update((rows) => [
      ...rows,
      {
        foodItemId: null,
        mealName: this.meal,
        foodName: this.manual.foodName.trim(),
        portions: 1,
        householdMeasure: '',
        grams: Number(this.manual.grams) || 0,
        energyKcal: Number(this.manual.energyKcal) || 0,
        proteinG: Number(this.manual.proteinG) || 0,
        carbohydrateG: Number(this.manual.carbohydrateG) || 0,
        fatG: Number(this.manual.fatG) || 0,
      },
    ]);
    this.manual = this.emptyManual();
  }

  changePortions(index: number, value: number | null): void {
    const portions = Number(value);
    if (!(portions > 0)) return;
    this.rows.update((rows) =>
      rows.map((row, position) => {
        if (position !== index) return row;
        const food = this.foods().find((item) => item.id === row.foodItemId);
        if (food) return this.toRow(food, row.mealName, portions);
        // Sin catálogo se escala desde lo ya registrado.
        const ratio = portions / (Number(row.portions) || 1);
        return {
          ...row,
          portions,
          grams: round(row.grams * ratio),
          energyKcal: round(row.energyKcal * ratio),
          proteinG: round(row.proteinG * ratio),
          carbohydrateG: round(row.carbohydrateG * ratio),
          fatG: round(row.fatG * ratio),
        };
      }),
    );
  }

  remove(index: number): void {
    this.rows.update((rows) => rows.filter((_, position) => position !== index));
  }

  private toRow(food: Food, mealName: string, portions: number): Recall24hRow {
    const scaled = scaleFood(food, portions);
    return {
      foodItemId: food.id,
      mealName,
      foodName: food.name,
      portions,
      householdMeasure: food.householdMeasure,
      grams: scaled.grams,
      energyKcal: scaled.energyKcal,
      proteinG: scaled.proteinG,
      carbohydrateG: scaled.carbohydrateG,
      fatG: scaled.fatG,
    };
  }

  private emptyManual() {
    return { foodName: '', grams: null as number | null, energyKcal: null as number | null, proteinG: null as number | null, carbohydrateG: null as number | null, fatG: null as number | null };
  }
}

const round = (value: number): number => Math.round(value * 10) / 10;
