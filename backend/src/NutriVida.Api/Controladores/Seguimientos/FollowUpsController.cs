using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NutriVida.Domain.FollowUps;
using NutriVida.Api.Security;
using NutriVida.Infrastructure.Persistence;

namespace NutriVida.Api.Controladores.Seguimientos;

[ApiController]
[Route("api/patients/{patientId:guid}/follow-ups")]
public sealed class FollowUpsController(NutriVidaDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(Guid patientId, CancellationToken cancellationToken)
    {
        if (!await OwnsPatient(patientId, cancellationToken)) return NotFound();
        return Ok(await db.WeeklyFollowUps.AsNoTracking()
            .Where(x => x.PatientId == patientId && !x.IsArchived)
            .OrderByDescending(x => x.FollowUpDate)
            .ToListAsync(cancellationToken));
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        Guid patientId,
        FollowUpRequest request,
        CancellationToken cancellationToken)
    {
        if (!await OwnsPatient(patientId, cancellationToken))
            return NotFound();
        var validation = Validate(request);
        if (validation is not null) return ValidationProblem(validation);

        var followUp = new WeeklyFollowUp { PatientId = patientId };
        Apply(request, followUp);

        db.WeeklyFollowUps.Add(followUp);
        await db.SaveChangesAsync(cancellationToken);
        return Created($"/api/patients/{patientId}/follow-ups/{followUp.Id}", followUp);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid patientId, Guid id, FollowUpRequest request,
        CancellationToken cancellationToken)
    {
        if (!await OwnsPatient(patientId, cancellationToken)) return NotFound();
        var validation = Validate(request);
        if (validation is not null) return ValidationProblem(validation);
        var followUp = await db.WeeklyFollowUps.SingleOrDefaultAsync(
            x => x.Id == id && x.PatientId == patientId && !x.IsArchived, cancellationToken);
        if (followUp is null) return NotFound();
        Apply(request, followUp);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(followUp);
    }

    [HttpPost("{id:guid}/archive")]
    [Authorize(Roles = "ClinicAdmin")]
    public async Task<IActionResult> Archive(Guid patientId, Guid id, CancellationToken cancellationToken)
    {
        if (!await OwnsPatient(patientId, cancellationToken)) return NotFound();
        var followUp = await db.WeeklyFollowUps.SingleOrDefaultAsync(
            x => x.Id == id && x.PatientId == patientId && !x.IsArchived, cancellationToken);
        if (followUp is null) return NotFound();
        followUp.IsArchived = true;
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private Task<bool> OwnsPatient(Guid patientId, CancellationToken cancellationToken) =>
        db.CanAccessPatientAsync(User, patientId, cancellationToken);

    private static string? Validate(FollowUpRequest request)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        if (request.FollowUpDate == default || request.FollowUpDate > today)
            return "La fecha del seguimiento debe ser válida y no puede estar en el futuro.";
        if (request.PeriodStartsOn.HasValue != request.PeriodEndsOn.HasValue)
            return "Completa las dos fechas del período evaluado o deja ambas vacías.";
        if (request.PeriodStartsOn > request.PeriodEndsOn)
            return "La fecha inicial del período no puede ser posterior a la fecha final.";
        if (request.PeriodEndsOn > request.FollowUpDate)
            return "El período evaluado no puede terminar después de la fecha del seguimiento.";
        if (request.NextAppointmentOn < request.FollowUpDate)
            return "El próximo control no puede ser anterior a la fecha del seguimiento.";
        if (request.FollowUpIntervalDays is < 1 or > 365)
            return "La frecuencia del próximo control debe estar entre 1 y 365 días.";
        if (request.BristolStoolType is < 1 or > 7)
            return "El tipo de Bristol debe estar entre 1 y 7.";
        if (!Enum.IsDefined(request.ObjectiveStatus))
            return "Selecciona un estado válido para el objetivo.";
        return null;
    }

    private static void Apply(FollowUpRequest request, WeeklyFollowUp followUp)
    {
        followUp.FollowUpDate = request.FollowUpDate;
        followUp.PeriodStartsOn = request.PeriodStartsOn;
        followUp.PeriodEndsOn = request.PeriodEndsOn;
        followUp.NextAppointmentOn = request.NextAppointmentOn;
        followUp.FollowUpIntervalDays = request.FollowUpIntervalDays;
        followUp.ObjectiveStatus = request.ObjectiveStatus;
        followUp.WeightKg = request.WeightKg;
        followUp.ExerciseMinutes = request.ExerciseMinutes;
        followUp.ExerciseType = request.ExerciseType?.Trim() ?? string.Empty;
        followUp.AverageSleepHours = request.AverageSleepHours;
        followUp.PlanAdherencePercent = request.PlanAdherencePercent;
        followUp.BristolStoolType = request.BristolStoolType;
        followUp.Symptoms = request.Symptoms?.Trim() ?? string.Empty;
        followUp.Adjustments = request.Adjustments?.Trim() ?? string.Empty;
        followUp.ProfessionalNotes = request.ProfessionalNotes?.Trim() ?? string.Empty;
    }
}

public sealed record FollowUpRequest(
    DateOnly FollowUpDate,
    DateOnly? PeriodStartsOn,
    DateOnly? PeriodEndsOn,
    DateOnly? NextAppointmentOn,
    [Range(1, 365)] int? FollowUpIntervalDays,
    FollowUpObjectiveStatus ObjectiveStatus,
    [Range(20, 350)] decimal? WeightKg,
    [Range(0, 3000)] int? ExerciseMinutes,
    [MaxLength(300)] string ExerciseType,
    [Range(0, 24)] decimal? AverageSleepHours,
    [Range(0, 100)] int? PlanAdherencePercent,
    [Range(1, 7)] int? BristolStoolType,
    [MaxLength(2000)] string Symptoms,
    [MaxLength(2000)] string Adjustments,
    [MaxLength(2000)] string ProfessionalNotes);
