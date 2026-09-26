using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NutriVida.Infrastructure.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class UnifyQuickTemplatesByModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_QuickTemplates_ClinicId_Name",
                schema: "nutri",
                table: "QuickTemplates");

            migrationBuilder.AddColumn<int>(
                name: "Scope",
                schema: "nutri",
                table: "QuickTemplates",
                type: "int",
                nullable: false,
                defaultValue: 2);

            migrationBuilder.AddColumn<string>(
                name: "ValuesJson",
                schema: "nutri",
                table: "QuickTemplates",
                type: "nvarchar(max)",
                maxLength: 12000,
                nullable: false,
                defaultValue: "{}");

            migrationBuilder.Sql(
                """
                UPDATE [nutri].[QuickTemplates]
                SET [Scope] = 2,
                    [ValuesJson] = (
                        SELECT [PlanName] AS [planName],
                               [ProfessionalNotes] AS [professionalNotes]
                        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
                    );
                """);

            migrationBuilder.CreateIndex(
                name: "IX_QuickTemplates_ClinicId_Scope_Name",
                schema: "nutri",
                table: "QuickTemplates",
                columns: new[] { "ClinicId", "Scope", "Name" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_QuickTemplates_ClinicId_Scope_Name",
                schema: "nutri",
                table: "QuickTemplates");

            migrationBuilder.DropColumn(
                name: "Scope",
                schema: "nutri",
                table: "QuickTemplates");

            migrationBuilder.DropColumn(
                name: "ValuesJson",
                schema: "nutri",
                table: "QuickTemplates");

            migrationBuilder.CreateIndex(
                name: "IX_QuickTemplates_ClinicId_Name",
                schema: "nutri",
                table: "QuickTemplates",
                columns: new[] { "ClinicId", "Name" });
        }
    }
}
