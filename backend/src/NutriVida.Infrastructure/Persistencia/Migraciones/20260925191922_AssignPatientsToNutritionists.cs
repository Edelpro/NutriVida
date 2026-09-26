using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NutriVida.Infrastructure.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class AssignPatientsToNutritionists : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "AssignedNutritionistUserId",
                schema: "nutri",
                table: "Patients",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE patient
                SET AssignedNutritionistUserId = responsible.Id
                FROM [nutri].[Patients] AS patient
                CROSS APPLY
                (
                    SELECT TOP (1) [user].[Id]
                    FROM [nutri].[ApplicationUsers] AS [user]
                    WHERE [user].[ClinicId] = patient.[ClinicId]
                      AND [user].[Role] = N'Nutritionist'
                      AND [user].[IsActive] = 1
                      AND [user].[IsArchived] = 0
                    ORDER BY [user].[CreatedAtUtc], [user].[Id]
                ) AS responsible
                WHERE patient.[AssignedNutritionistUserId] IS NULL;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Patients_AssignedNutritionistUserId",
                schema: "nutri",
                table: "Patients",
                column: "AssignedNutritionistUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Patients_ClinicId_AssignedNutritionistUserId_Status",
                schema: "nutri",
                table: "Patients",
                columns: new[] { "ClinicId", "AssignedNutritionistUserId", "Status" });

            migrationBuilder.AddForeignKey(
                name: "FK_Patients_ApplicationUsers_AssignedNutritionistUserId",
                schema: "nutri",
                table: "Patients",
                column: "AssignedNutritionistUserId",
                principalSchema: "nutri",
                principalTable: "ApplicationUsers",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Patients_ApplicationUsers_AssignedNutritionistUserId",
                schema: "nutri",
                table: "Patients");

            migrationBuilder.DropIndex(
                name: "IX_Patients_AssignedNutritionistUserId",
                schema: "nutri",
                table: "Patients");

            migrationBuilder.DropIndex(
                name: "IX_Patients_ClinicId_AssignedNutritionistUserId_Status",
                schema: "nutri",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "AssignedNutritionistUserId",
                schema: "nutri",
                table: "Patients");
        }
    }
}
