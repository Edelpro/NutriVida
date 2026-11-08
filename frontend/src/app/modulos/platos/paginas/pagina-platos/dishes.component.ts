import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NgForm } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { IconComponent } from '../../../../compartido/icono/icon.component';
import { FlujoPlanNutricionalComponent } from '../../../../compartido/flujo-plan-nutricional/flujo-plan-nutricional.component';
import { ToastService } from '../../../../compartido/notificaciones/toast.service';
import { ApiService, Food } from '../../../../nucleo/api.service';
import { toLocalIsoDate } from '../../../../nucleo/fechas';
import { FOOD_OPTION_LIMIT, filterFoods, withSelectedFood } from '../../../../nucleo/food-options';
import { AuthService } from '../../../../nucleo/autenticacion/auth.service';
import { DishesApiService } from '../../acceso-datos/dishes-api.service';
import { Dish, DishIngredientRequest, DishRequest } from '../../modelos/dish.models';

@Component({
  selector: 'app-dishes',
  imports: [
    FormsModule,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    IconComponent,
    FlujoPlanNutricionalComponent,
    RouterLink,
  ],
  templateUrl: './dishes.component.html',
  styleUrl: './dishes.component.scss',
})
export class DishesComponent {
  @ViewChild('dishDialog') private dishDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild('archiveDialog') private archiveDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild('recipeDialog') private recipeDialog?: ElementRef<HTMLDialogElement>;
  private readonly api = inject(DishesApiService);
  private readonly foodApi = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sanitizer = inject(DomSanitizer);

  readonly dishes = signal<Dish[]>([]);
  readonly foods = signal<Food[]>([]);
  readonly foodFilter = signal('');
  readonly visibleFoods = computed(() => filterFoods(this.foods(), this.foodFilter()));
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly formError = signal('');
  readonly editing = signal<Dish | null>(null);
  readonly archiving = signal<Dish | null>(null);
  readonly selectedDish = signal<Dish | null>(null);
  readonly uploadingImage = signal(false);
  readonly submitted = signal(false);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly totalPages = signal(1);
  readonly videoEmbedUrl = computed<SafeResourceUrl | null>(() => {
    const source = this.selectedDish()?.videoUrl;
    const embed = source ? this.youtubeEmbed(source) : null;
    return embed ? this.sanitizer.bypassSecurityTrustResourceUrl(embed) : null;
  });

  readonly foodOptionLimit = FOOD_OPTION_LIMIT;
  query = '';
  mealFilter = '';
  maxCost = '';
  model: DishRequest = this.emptyModel();

  constructor() {
    this.load();
    this.foodApi
      .foodOptions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (foods) => this.foods.set(foods),
        error: (error: Error) => this.toast.show('error', 'No se cargó el catálogo', error.message),
      });
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api
      .list(this.query.trim(), this.mealFilter, this.maxCost, this.page())
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          this.dishes.set(result.items);
          this.total.set(result.total);
          this.totalPages.set(result.totalPages);
        },
        error: (error: Error) => this.error.set(error.message),
      });
  }

  applyFilters(): void {
    this.page.set(1);
    this.load();
  }
  clearFilters(search: HTMLInputElement): void {
    this.query = '';
    this.mealFilter = '';
    this.maxCost = '';
    this.page.set(1);
    this.load();
    search.focus();
  }
  changePage(next: number): void {
    if (next < 1 || next > this.totalPages() || next === this.page()) return;
    this.page.set(next);
    this.load();
  }

  openCreate(): void {
    this.editing.set(null);
    this.model = this.emptyModel();
    this.resetFormState();
    queueMicrotask(() => this.dishDialog?.nativeElement.showModal());
  }

  openEdit(dish: Dish): void {
    this.editing.set(dish);
    this.model = {
      name: dish.name,
      mealName: dish.mealName,
      servings: dish.servings,
      preparationMinutes: dish.preparationMinutes,
      costReferenceDate: dish.costReferenceDate,
      instructions: dish.instructions,
      costNotes: dish.costNotes,
      imageUrl: dish.imageUrl,
      videoUrl: dish.videoUrl,
      ingredients: dish.ingredients.map((x) => ({
        foodItemId: x.foodItemId,
        portions: x.portions,
        estimatedCostUsd: x.estimatedCostUsd,
      })),
    };
    this.resetFormState();
    queueMicrotask(() => this.dishDialog?.nativeElement.showModal());
  }

  addIngredient(): void {
    this.model.ingredients.push({ foodItemId: '', portions: 1, estimatedCostUsd: 0 });
  }

  uploadImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const accepted = ['image/jpeg', 'image/png', 'image/webp'];
    if (!accepted.includes(file.type) || file.size > 5 * 1024 * 1024) {
      this.formError.set('Selecciona una foto JPG, PNG o WebP de hasta 5 MB.');
      input.value = '';
      return;
    }
    this.uploadingImage.set(true);
    this.formError.set('');
    this.api
      .uploadImage(file)
      .pipe(
        finalize(() => {
          this.uploadingImage.set(false);
          input.value = '';
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ url }) => {
          this.model.imageUrl = url;
          this.toast.show('success', 'Foto cargada', 'La vista previa quedó lista para guardar.');
        },
        error: (error: Error) => this.formError.set(error.message),
      });
  }

  removeImage(): void {
    this.model.imageUrl = '';
  }

  openRecipe(dish: Dish): void {
    this.selectedDish.set(dish);
    queueMicrotask(() => this.recipeDialog?.nativeElement.showModal());
  }

  closeRecipe(): void {
    this.recipeDialog?.nativeElement.close();
    this.selectedDish.set(null);
  }

  topContributor(dish: Dish, nutrient: 'proteinG' | 'carbohydrateG' | 'fatG'): string {
    return (
      [...dish.ingredients].sort((a, b) => Number(b[nutrient]) - Number(a[nutrient]))[0]
        ?.foodName || 'Sin información'
    );
  }

  isDirectVideo(url: string): boolean {
    return /\.(mp4|webm)(\?.*)?$/i.test(url);
  }
  removeIngredient(index: number): void {
    if (this.model.ingredients.length === 1) return;
    this.model.ingredients.splice(index, 1);
  }

  save(form: NgForm): void {
    this.submitted.set(true);
    this.formError.set('');
    const ids = this.model.ingredients.map((x) => x.foodItemId).filter(Boolean);
    if (form.invalid || ids.length !== this.model.ingredients.length) {
      form.control.markAllAsTouched();
      this.formError.set('Completa los campos marcados y selecciona cada alimento.');
      queueMicrotask(() =>
        this.dishDialog?.nativeElement
          .querySelector<HTMLElement>('[aria-invalid="true"], :invalid')
          ?.focus(),
      );
      return;
    }
    if (new Set(ids).size !== ids.length) {
      this.formError.set('No repitas un alimento; ajusta las porciones en una sola fila.');
      return;
    }
    if (this.saving()) return;
    this.saving.set(true);
    const current = this.editing();
    const request = current ? this.api.update(current.id, this.model) : this.api.create(this.model);
    request
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (savedDish) => {
          this.dishDialog?.nativeElement.close();
          if (!current) {
            this.query = savedDish.name;
            this.mealFilter = '';
            this.maxCost = '';
            this.page.set(1);
          }
          this.toast.show(
            'success',
            current ? 'Plato actualizado' : 'Plato creado',
            current
              ? `${savedDish.name} quedó actualizado en la biblioteca.`
              : `${savedDish.name} se muestra ahora y también está disponible en Plan de menú.`,
          );
          this.load();
        },
        error: (error: Error) => this.formError.set(error.message),
      });
  }

  requestArchive(dish: Dish): void {
    if (!this.canArchive()) return;
    this.archiving.set(dish);
    queueMicrotask(() => this.archiveDialog?.nativeElement.showModal());
  }
  confirmArchive(): void {
    const dish = this.archiving();
    if (!dish || this.saving()) return;
    this.saving.set(true);
    this.api
      .archive(dish.id)
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.archiveDialog?.nativeElement.close();
          this.archiving.set(null);
          this.toast.show(
            'success',
            'Plato archivado',
            'Se ocultó de la biblioteca y sus datos se conservaron.',
          );
          this.load();
        },
        error: (error: Error) => this.toast.show('error', 'No se archivó el plato', error.message),
      });
  }

  canArchive(): boolean {
    return this.auth.hasRole('ClinicAdmin');
  }
  closeEditor(): void {
    if (!this.saving()) this.dishDialog?.nativeElement.close();
  }
  closeArchive(): void {
    if (!this.saving()) this.archiveDialog?.nativeElement.close();
  }
  resetFormState(): void {
    this.submitted.set(false);
    this.formError.set('');
  }
  foodOptions(selectedId: string): Food[] {
    return withSelectedFood(this.visibleFoods(), this.foods(), selectedId);
  }
  food(row: DishIngredientRequest): Food | undefined {
    return this.foods().find((x) => x.id === row.foodItemId);
  }
  totalCost(): number {
    return this.model.ingredients.reduce((sum, x) => sum + Number(x.estimatedCostUsd || 0), 0);
  }
  costPerServing(): number {
    return this.totalCost() / Math.max(1, Number(this.model.servings || 1));
  }
  energyPerServing(): number {
    const total = this.model.ingredients.reduce(
      (sum, row) => sum + (this.food(row)?.energyKcal || 0) * Number(row.portions || 0),
      0,
    );
    return total / Math.max(1, Number(this.model.servings || 1));
  }
  rangeStart(): number {
    return this.total() ? (this.page() - 1) * 10 + 1 : 0;
  }
  rangeEnd(): number {
    return Math.min(this.page() * 10, this.total());
  }
  private emptyModel(): DishRequest {
    return {
      name: '',
      mealName: 'Almuerzo',
      servings: 4,
      preparationMinutes: 30,
      costReferenceDate: toLocalIsoDate(),
      instructions: '',
      costNotes: '',
      imageUrl: '',
      videoUrl: '',
      ingredients: [{ foodItemId: '', portions: 1, estimatedCostUsd: 0 }],
    };
  }

  private youtubeEmbed(value: string): string | null {
    try {
      const url = new URL(value);
      if (url.hostname === 'youtu.be') {
        const id = url.pathname.slice(1).split('/')[0];
        return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
      }
      if (url.hostname.endsWith('youtube.com')) {
        const id = url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop();
        return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
      }
    } catch {
      return null;
    }
    return null;
  }
}
