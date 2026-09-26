using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NutriVida.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddNutritionDiagnosis : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NutritionDiagnoses",
                schema: "nutri",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssessmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ProblemCode = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    ProblemStatement = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Etiology = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    SignsAndSymptoms = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    ProfessionalName = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    ApprovedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(0)", precision: 0, nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(0)", precision: 0, nullable: false),
                    IsArchived = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NutritionDiagnoses", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NutritionDiagnoses_PatientId_CreatedAtUtc",
                schema: "nutri",
                table: "NutritionDiagnoses",
                columns: new[] { "PatientId", "CreatedAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NutritionDiagnoses",
                schema: "nutri");
        }
    }
}
