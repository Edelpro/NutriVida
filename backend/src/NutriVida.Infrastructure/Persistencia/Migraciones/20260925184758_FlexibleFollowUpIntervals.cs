using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NutriVida.Infrastructure.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class FlexibleFollowUpIntervals : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "WeekStartsOn",
                schema: "nutri",
                table: "WeeklyFollowUps",
                newName: "FollowUpDate");

            migrationBuilder.AlterColumn<string>(
                name: "Symptoms",
                schema: "nutri",
                table: "WeeklyFollowUps",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "ProfessionalNotes",
                schema: "nutri",
                table: "WeeklyFollowUps",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<int>(
                name: "PlanAdherencePercent",
                schema: "nutri",
                table: "WeeklyFollowUps",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<string>(
                name: "ExerciseType",
                schema: "nutri",
                table: "WeeklyFollowUps",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<int>(
                name: "ExerciseMinutes",
                schema: "nutri",
                table: "WeeklyFollowUps",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<decimal>(
                name: "AverageSleepHours",
                schema: "nutri",
                table: "WeeklyFollowUps",
                type: "decimal(4,1)",
                precision: 4,
                scale: 1,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(4,1)",
                oldPrecision: 4,
                oldScale: 1);

            migrationBuilder.AddColumn<string>(
                name: "Adjustments",
                schema: "nutri",
                table: "WeeklyFollowUps",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "FollowUpIntervalDays",
                schema: "nutri",
                table: "WeeklyFollowUps",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "NextAppointmentOn",
                schema: "nutri",
                table: "WeeklyFollowUps",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ObjectiveStatus",
                schema: "nutri",
                table: "WeeklyFollowUps",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateOnly>(
                name: "PeriodEndsOn",
                schema: "nutri",
                table: "WeeklyFollowUps",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "PeriodStartsOn",
                schema: "nutri",
                table: "WeeklyFollowUps",
                type: "date",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Adjustments",
                schema: "nutri",
                table: "WeeklyFollowUps");

            migrationBuilder.DropColumn(
                name: "FollowUpIntervalDays",
                schema: "nutri",
                table: "WeeklyFollowUps");

            migrationBuilder.DropColumn(
                name: "NextAppointmentOn",
                schema: "nutri",
                table: "WeeklyFollowUps");

            migrationBuilder.DropColumn(
                name: "ObjectiveStatus",
                schema: "nutri",
                table: "WeeklyFollowUps");

            migrationBuilder.DropColumn(
                name: "PeriodEndsOn",
                schema: "nutri",
                table: "WeeklyFollowUps");

            migrationBuilder.DropColumn(
                name: "PeriodStartsOn",
                schema: "nutri",
                table: "WeeklyFollowUps");

            migrationBuilder.RenameColumn(
                name: "FollowUpDate",
                schema: "nutri",
                table: "WeeklyFollowUps",
                newName: "WeekStartsOn");

            migrationBuilder.AlterColumn<string>(
                name: "Symptoms",
                schema: "nutri",
                table: "WeeklyFollowUps",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(2000)",
                oldMaxLength: 2000);

            migrationBuilder.AlterColumn<string>(
                name: "ProfessionalNotes",
                schema: "nutri",
                table: "WeeklyFollowUps",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(2000)",
                oldMaxLength: 2000);

            migrationBuilder.AlterColumn<int>(
                name: "PlanAdherencePercent",
                schema: "nutri",
                table: "WeeklyFollowUps",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ExerciseType",
                schema: "nutri",
                table: "WeeklyFollowUps",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(300)",
                oldMaxLength: 300);

            migrationBuilder.AlterColumn<int>(
                name: "ExerciseMinutes",
                schema: "nutri",
                table: "WeeklyFollowUps",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "AverageSleepHours",
                schema: "nutri",
                table: "WeeklyFollowUps",
                type: "decimal(4,1)",
                precision: 4,
                scale: 1,
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "decimal(4,1)",
                oldPrecision: 4,
                oldScale: 1,
                oldNullable: true);
        }
    }
}
