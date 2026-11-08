using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NutriVida.Infrastructure.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class AddClientDeliveryFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ApprovedByName",
                schema: "nutri",
                table: "NutritionDiagnoses",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FamilyHistory",
                schema: "nutri",
                table: "NutritionAssessments",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "LabResults",
                schema: "nutri",
                table: "NutritionAssessments",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "MedicalHistory",
                schema: "nutri",
                table: "NutritionAssessments",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Medications",
                schema: "nutri",
                table: "NutritionAssessments",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ReproductiveStatus",
                schema: "nutri",
                table: "NutritionAssessments",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Supplements",
                schema: "nutri",
                table: "NutritionAssessments",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "ApprovedAtUtc",
                schema: "nutri",
                table: "MenuPlans",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ApprovedByName",
                schema: "nutri",
                table: "MenuPlans",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CalculatedByName",
                schema: "nutri",
                table: "EnergyCalculations",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "FailedLoginAttempts",
                schema: "nutri",
                table: "ApplicationUsers",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "LockedUntilUtc",
                schema: "nutri",
                table: "ApplicationUsers",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ClinicSettings",
                schema: "nutri",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClinicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PracticeName = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    Address = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    DefaultFormula = table.Column<int>(type: "int", nullable: false),
                    DefaultEtaPercent = table.Column<decimal>(type: "decimal(4,3)", precision: 4, scale: 3, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(0)", precision: 0, nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(0)", precision: 0, nullable: false),
                    IsArchived = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClinicSettings", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ClinicSettings_ClinicId",
                schema: "nutri",
                table: "ClinicSettings",
                column: "ClinicId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ClinicSettings",
                schema: "nutri");

            migrationBuilder.DropColumn(
                name: "ApprovedByName",
                schema: "nutri",
                table: "NutritionDiagnoses");

            migrationBuilder.DropColumn(
                name: "FamilyHistory",
                schema: "nutri",
                table: "NutritionAssessments");

            migrationBuilder.DropColumn(
                name: "LabResults",
                schema: "nutri",
                table: "NutritionAssessments");

            migrationBuilder.DropColumn(
                name: "MedicalHistory",
                schema: "nutri",
                table: "NutritionAssessments");

            migrationBuilder.DropColumn(
                name: "Medications",
                schema: "nutri",
                table: "NutritionAssessments");

            migrationBuilder.DropColumn(
                name: "ReproductiveStatus",
                schema: "nutri",
                table: "NutritionAssessments");

            migrationBuilder.DropColumn(
                name: "Supplements",
                schema: "nutri",
                table: "NutritionAssessments");

            migrationBuilder.DropColumn(
                name: "ApprovedAtUtc",
                schema: "nutri",
                table: "MenuPlans");

            migrationBuilder.DropColumn(
                name: "ApprovedByName",
                schema: "nutri",
                table: "MenuPlans");

            migrationBuilder.DropColumn(
                name: "CalculatedByName",
                schema: "nutri",
                table: "EnergyCalculations");

            migrationBuilder.DropColumn(
                name: "FailedLoginAttempts",
                schema: "nutri",
                table: "ApplicationUsers");

            migrationBuilder.DropColumn(
                name: "LockedUntilUtc",
                schema: "nutri",
                table: "ApplicationUsers");
        }
    }
}
