using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NutriVida.Infrastructure.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class AddDishMediaAndNutrients : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "FiberG",
                schema: "nutri",
                table: "DishIngredients",
                type: "decimal(8,2)",
                precision: 8,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "SodiumMg",
                schema: "nutri",
                table: "DishIngredients",
                type: "decimal(10,2)",
                precision: 10,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                schema: "nutri",
                table: "Dishes",
                type: "nvarchar(2048)",
                maxLength: 2048,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "VideoUrl",
                schema: "nutri",
                table: "Dishes",
                type: "nvarchar(2048)",
                maxLength: 2048,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FiberG",
                schema: "nutri",
                table: "DishIngredients");

            migrationBuilder.DropColumn(
                name: "SodiumMg",
                schema: "nutri",
                table: "DishIngredients");

            migrationBuilder.DropColumn(
                name: "ImageUrl",
                schema: "nutri",
                table: "Dishes");

            migrationBuilder.DropColumn(
                name: "VideoUrl",
                schema: "nutri",
                table: "Dishes");
        }
    }
}
