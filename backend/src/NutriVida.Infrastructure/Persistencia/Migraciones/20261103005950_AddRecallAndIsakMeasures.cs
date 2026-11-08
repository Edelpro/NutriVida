using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NutriVida.Infrastructure.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class AddRecallAndIsakMeasures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Recall24hJson",
                schema: "nutri",
                table: "NutritionAssessments",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ExchangeGroup",
                schema: "nutri",
                table: "FoodItems",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "AbdominalSkinfoldMm",
                schema: "nutri",
                table: "AnthropometricMeasurements",
                type: "decimal(6,2)",
                precision: 6,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ArmFlexedCm",
                schema: "nutri",
                table: "AnthropometricMeasurements",
                type: "decimal(6,2)",
                precision: 6,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ArmRelaxedCm",
                schema: "nutri",
                table: "AnthropometricMeasurements",
                type: "decimal(6,2)",
                precision: 6,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ArmSpanCm",
                schema: "nutri",
                table: "AnthropometricMeasurements",
                type: "decimal(6,2)",
                precision: 6,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AscitesGrade",
                schema: "nutri",
                table: "AnthropometricMeasurements",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "BicepsSkinfoldMm",
                schema: "nutri",
                table: "AnthropometricMeasurements",
                type: "decimal(6,2)",
                precision: 6,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CalfCm",
                schema: "nutri",
                table: "AnthropometricMeasurements",
                type: "decimal(6,2)",
                precision: 6,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ChestCm",
                schema: "nutri",
                table: "AnthropometricMeasurements",
                type: "decimal(6,2)",
                precision: 6,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EdemaGrade",
                schema: "nutri",
                table: "AnthropometricMeasurements",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "FemurBreadthCm",
                schema: "nutri",
                table: "AnthropometricMeasurements",
                type: "decimal(6,2)",
                precision: 6,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ForearmCm",
                schema: "nutri",
                table: "AnthropometricMeasurements",
                type: "decimal(6,2)",
                precision: 6,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "FrontThighSkinfoldMm",
                schema: "nutri",
                table: "AnthropometricMeasurements",
                type: "decimal(6,2)",
                precision: 6,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "GripStrengthKg",
                schema: "nutri",
                table: "AnthropometricMeasurements",
                type: "decimal(6,2)",
                precision: 6,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "HeadCm",
                schema: "nutri",
                table: "AnthropometricMeasurements",
                type: "decimal(6,2)",
                precision: 6,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "HumerusBreadthCm",
                schema: "nutri",
                table: "AnthropometricMeasurements",
                type: "decimal(6,2)",
                precision: 6,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "IliacCrestSkinfoldMm",
                schema: "nutri",
                table: "AnthropometricMeasurements",
                type: "decimal(6,2)",
                precision: 6,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "KneeHeightCm",
                schema: "nutri",
                table: "AnthropometricMeasurements",
                type: "decimal(6,2)",
                precision: 6,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "MedialCalfSkinfoldMm",
                schema: "nutri",
                table: "AnthropometricMeasurements",
                type: "decimal(6,2)",
                precision: 6,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "MidThighCm",
                schema: "nutri",
                table: "AnthropometricMeasurements",
                type: "decimal(6,2)",
                precision: 6,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "NeckCm",
                schema: "nutri",
                table: "AnthropometricMeasurements",
                type: "decimal(6,2)",
                precision: 6,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "SittingHeightCm",
                schema: "nutri",
                table: "AnthropometricMeasurements",
                type: "decimal(6,2)",
                precision: 6,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "SubscapularSkinfoldMm",
                schema: "nutri",
                table: "AnthropometricMeasurements",
                type: "decimal(6,2)",
                precision: 6,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "SupraspinaleSkinfoldMm",
                schema: "nutri",
                table: "AnthropometricMeasurements",
                type: "decimal(6,2)",
                precision: 6,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TricepsSkinfoldMm",
                schema: "nutri",
                table: "AnthropometricMeasurements",
                type: "decimal(6,2)",
                precision: 6,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "UsualWeightKg",
                schema: "nutri",
                table: "AnthropometricMeasurements",
                type: "decimal(6,2)",
                precision: 6,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "WristBreadthCm",
                schema: "nutri",
                table: "AnthropometricMeasurements",
                type: "decimal(6,2)",
                precision: 6,
                scale: 2,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Recall24hJson",
                schema: "nutri",
                table: "NutritionAssessments");

            migrationBuilder.DropColumn(
                name: "ExchangeGroup",
                schema: "nutri",
                table: "FoodItems");

            migrationBuilder.DropColumn(
                name: "AbdominalSkinfoldMm",
                schema: "nutri",
                table: "AnthropometricMeasurements");

            migrationBuilder.DropColumn(
                name: "ArmFlexedCm",
                schema: "nutri",
                table: "AnthropometricMeasurements");

            migrationBuilder.DropColumn(
                name: "ArmRelaxedCm",
                schema: "nutri",
                table: "AnthropometricMeasurements");

            migrationBuilder.DropColumn(
                name: "ArmSpanCm",
                schema: "nutri",
                table: "AnthropometricMeasurements");

            migrationBuilder.DropColumn(
                name: "AscitesGrade",
                schema: "nutri",
                table: "AnthropometricMeasurements");

            migrationBuilder.DropColumn(
                name: "BicepsSkinfoldMm",
                schema: "nutri",
                table: "AnthropometricMeasurements");

            migrationBuilder.DropColumn(
                name: "CalfCm",
                schema: "nutri",
                table: "AnthropometricMeasurements");

            migrationBuilder.DropColumn(
                name: "ChestCm",
                schema: "nutri",
                table: "AnthropometricMeasurements");

            migrationBuilder.DropColumn(
                name: "EdemaGrade",
                schema: "nutri",
                table: "AnthropometricMeasurements");

            migrationBuilder.DropColumn(
                name: "FemurBreadthCm",
                schema: "nutri",
                table: "AnthropometricMeasurements");

            migrationBuilder.DropColumn(
                name: "ForearmCm",
                schema: "nutri",
                table: "AnthropometricMeasurements");

            migrationBuilder.DropColumn(
                name: "FrontThighSkinfoldMm",
                schema: "nutri",
                table: "AnthropometricMeasurements");

            migrationBuilder.DropColumn(
                name: "GripStrengthKg",
                schema: "nutri",
                table: "AnthropometricMeasurements");

            migrationBuilder.DropColumn(
                name: "HeadCm",
                schema: "nutri",
                table: "AnthropometricMeasurements");

            migrationBuilder.DropColumn(
                name: "HumerusBreadthCm",
                schema: "nutri",
                table: "AnthropometricMeasurements");

            migrationBuilder.DropColumn(
                name: "IliacCrestSkinfoldMm",
                schema: "nutri",
                table: "AnthropometricMeasurements");

            migrationBuilder.DropColumn(
                name: "KneeHeightCm",
                schema: "nutri",
                table: "AnthropometricMeasurements");

            migrationBuilder.DropColumn(
                name: "MedialCalfSkinfoldMm",
                schema: "nutri",
                table: "AnthropometricMeasurements");

            migrationBuilder.DropColumn(
                name: "MidThighCm",
                schema: "nutri",
                table: "AnthropometricMeasurements");

            migrationBuilder.DropColumn(
                name: "NeckCm",
                schema: "nutri",
                table: "AnthropometricMeasurements");

            migrationBuilder.DropColumn(
                name: "SittingHeightCm",
                schema: "nutri",
                table: "AnthropometricMeasurements");

            migrationBuilder.DropColumn(
                name: "SubscapularSkinfoldMm",
                schema: "nutri",
                table: "AnthropometricMeasurements");

            migrationBuilder.DropColumn(
                name: "SupraspinaleSkinfoldMm",
                schema: "nutri",
                table: "AnthropometricMeasurements");

            migrationBuilder.DropColumn(
                name: "TricepsSkinfoldMm",
                schema: "nutri",
                table: "AnthropometricMeasurements");

            migrationBuilder.DropColumn(
                name: "UsualWeightKg",
                schema: "nutri",
                table: "AnthropometricMeasurements");

            migrationBuilder.DropColumn(
                name: "WristBreadthCm",
                schema: "nutri",
                table: "AnthropometricMeasurements");
        }
    }
}
