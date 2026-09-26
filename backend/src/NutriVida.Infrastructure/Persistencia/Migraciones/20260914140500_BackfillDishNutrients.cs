using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NutriVida.Infrastructure.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class BackfillDishNutrients : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE ingredient
                SET ingredient.FiberG = ROUND(food.FiberG * ingredient.Portions, 2),
                    ingredient.SodiumMg = ROUND(food.SodiumMg * ingredient.Portions, 2)
                FROM [nutri].[DishIngredients] AS ingredient
                INNER JOIN [nutri].[FoodItems] AS food ON food.Id = ingredient.FoodItemId;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Los valores nutricionales recalculados no se revierten para evitar pérdida de datos.
        }
    }
}
