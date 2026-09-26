export interface DishIngredient {
  id: string;
  foodItemId: string;
  foodName: string;
  householdMeasure: string;
  portions: number;
  grams: number;
  estimatedCostUsd: number;
  energyKcal: number;
  proteinG: number;
  carbohydrateG: number;
  fatG: number;
  fiberG: number;
  sodiumMg: number;
}

export interface Dish {
  id: string;
  name: string;
  mealName: string;
  servings: number;
  preparationMinutes: number;
  costReferenceDate: string;
  instructions: string;
  costNotes: string;
  imageUrl: string;
  videoUrl: string;
  totalCostUsd: number;
  costPerServingUsd: number;
  energyKcalPerServing: number;
  proteinGPerServing: number;
  carbohydrateGPerServing: number;
  fatGPerServing: number;
  fiberGPerServing: number;
  sodiumMgPerServing: number;
  updatedAtUtc: string;
  ingredients: DishIngredient[];
}

export interface DishIngredientRequest {
  foodItemId: string;
  portions: number;
  estimatedCostUsd: number;
}

export interface DishRequest {
  name: string;
  mealName: string;
  servings: number;
  preparationMinutes: number;
  costReferenceDate: string;
  instructions: string;
  costNotes: string;
  imageUrl: string;
  videoUrl: string;
  ingredients: DishIngredientRequest[];
}

export interface PagedDishes {
  items: Dish[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
