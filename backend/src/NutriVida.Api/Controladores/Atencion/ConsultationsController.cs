using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NutriVida.Domain.Consultations;
using NutriVida.Api.Security;
using NutriVida.Api.Services.Time;
using NutriVida.Infrastructure.Persistence;

namespace NutriVida.Api.Controllers.Consultations;

[ApiController]
[Route("api/consultations")]
public sealed class ConsultationsController(NutriVidaDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] DateOnly date, CancellationToken cancellationToken)
    {
        if (!User.TryGetClinicId(out var clinicId)) return Forbid();
        var start = ClinicClock.StartOfDayUtc(date);
        var end = ClinicClock.StartOfDayUtc(date.AddDays(1));
        var accessiblePatientIds = db.AccessiblePatients(User).Select(x => x.Id);
        var rows = await (from consultation in db.Consultations.AsNoTracking()
                          join patient in db.Patients.AsNoTracking() on consultation.PatientId equals patient.Id
                          where accessiblePatientIds.Contains(patient.Id) && !consultation.IsArchived
                              && consultation.StartsAtUtc >= start && consultation.StartsAtUtc < end
                          orderby consultation.StartsAtUtc
                          select new
                          {
                              consultation.Id,
                              consultation.PatientId,
                              patientName = patient.FirstName + " " + patient.LastName,
                              consultation.StartsAtUtc,
                              consultation.DurationMinutes,
                              consultation.Reason,
                              consultation.Notes,
                              status = consultation.Status.ToString()
                          })
            .ToListAsync(cancellationToken);
        return Ok(rows);
    }

    [HttpGet("by-patient/{patientId:guid}")]
    public async Task<IActionResult> ListByPatient(Guid patientId, CancellationToken cancellationToken)
    {
        if (!await db.CanAccessPatientAsync(User, patientId, cancellationToken)) return NotFound();
        var rows = await db.Consultations.AsNoTracking()
            .Where(x => x.PatientId == patientId && !x.IsArchived)
            .OrderByDescending(x => x.StartsAtUtc)
            .Select(x => new
            {
                x.Id,
                x.PatientId,
                x.StartsAtUtc,
                x.DurationMinutes,
                x.Reason,
                x.Notes,
                status = x.Status.ToString()
            })
            .ToListAsync(cancellationToken);
        return Ok(rows);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateConsultationRequest request, CancellationToken cancellationToken)
    {
        if (!User.TryGetClinicId(out var clinicId)) return Forbid();
        if (request.PatientId == Guid.Empty) return ValidationProblem("Selecciona un paciente válido.");
        if (request.StartsAtUtc == default) return ValidationProblem("Selecciona una fecha y una hora válidas.");
        if (string.IsNullOrWhiteSpace(request.Reason)) return ValidationProblem("Escribe el motivo de la atención.");
        var patient = await db.AccessiblePatients(User).AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == request.PatientId, cancellationToken);
        if (patient is null)
            return NotFound(new { title = "Paciente no encontrado", detail = "Actualiza la lista de pacientes e inténtalo nuevamente." });
        if (!IsPlausibleDate(request.StartsAtUtc))
            return ValidationProblem("La fecha de la atención debe estar entre hace un año y dentro de dos años.");
        if (await HasScheduleConflict(request.PatientId, request.StartsAtUtc, request.DurationMinutes, null, cancellationToken))
            return ScheduleConflict();

        var consultation = new Consultation
        {
            PatientId = request.PatientId,
            StartsAtUtc = request.StartsAtUtc,
            DurationMinutes = request.DurationMinutes,
            Reason = request.Reason.Trim(),
            ProfessionalName = User.Identity?.Name ?? "Profesional NutriVida"
        };
        db.Consultations.Add(consultation);
        await db.SaveChangesAsync(cancellationToken);
        return Created($"/api/consultations/{consultation.Id}", new
        {
            consultation.Id,
            consultation.PatientId,
            patientName = patient.FirstName + " " + patient.LastName,
            consultation.StartsAtUtc,
            consultation.DurationMinutes,
            consultation.Reason,
            status = consultation.Status.ToString()
        });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateConsultationRequest request, CancellationToken cancellationToken)
    {
        if (!User.TryGetClinicId(out var clinicId)) return Forbid();
        if (request.StartsAtUtc == default || string.IsNullOrWhiteSpace(request.Reason))
            return ValidationProblem("Completa fecha, hora y motivo de la atención.");
        var accessiblePatientIds = db.AccessiblePatients(User).Select(x => x.Id);
        var consultation = await db.Consultations.SingleOrDefaultAsync(
            x => x.Id == id && !x.IsArchived
                && accessiblePatientIds.Contains(x.PatientId),
            cancellationToken);
        if (consultation is null) return NotFound();
        var requestedStart = AsUtc(request.StartsAtUtc);
        var scheduleChanged = requestedStart != consultation.StartsAtUtc
            || request.DurationMinutes != consultation.DurationMinutes
            || consultation.Status == ConsultationStatus.Cancelled;
        if (requestedStart != consultation.StartsAtUtc && !IsPlausibleDate(requestedStart))
            return ValidationProblem("La fecha de la atención debe estar entre hace un año y dentro de dos años.");
        if (scheduleChanged && request.Status != ConsultationStatus.Cancelled
            && await HasScheduleConflict(consultation.PatientId, requestedStart, request.DurationMinutes, consultation.Id, cancellationToken))
            return ScheduleConflict();
        consultation.StartsAtUtc = request.StartsAtUtc;
        consultation.DurationMinutes = request.DurationMinutes;
        consultation.Reason = request.Reason.Trim();
        consultation.Status = request.Status;
        consultation.Notes = request.Notes.Trim();
        await db.SaveChangesAsync(cancellationToken);
        return Ok(new
        {
            consultation.Id,
            consultation.PatientId,
            consultation.StartsAtUtc,
            consultation.DurationMinutes,
            consultation.Reason,
            status = consultation.Status.ToString(),
            consultation.Notes
        });
    }

    [HttpPost("{id:guid}/archive")]
    [Authorize(Roles = "ClinicAdmin")]
    public async Task<IActionResult> Archive(Guid id, CancellationToken cancellationToken)
    {
        if (!User.TryGetClinicId(out var clinicId)) return Forbid();
        var accessiblePatientIds = db.AccessiblePatients(User, includeArchived: true).Select(x => x.Id);
        var consultation = await db.Consultations.SingleOrDefaultAsync(
            x => x.Id == id && !x.IsArchived
                && accessiblePatientIds.Contains(x.PatientId),
            cancellationToken);
        if (consultation is null) return NotFound();
        consultation.IsArchived = true;
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private static DateTime AsUtc(DateTime value) => value.Kind == DateTimeKind.Local
        ? value.ToUniversalTime()
        : DateTime.SpecifyKind(value, DateTimeKind.Utc);

    private static bool IsPlausibleDate(DateTime startsAt)
    {
        var start = AsUtc(startsAt);
        return start >= DateTime.UtcNow.AddYears(-1) && start <= DateTime.UtcNow.AddYears(2);
    }

    /// <summary>Un profesional no puede atender a dos pacientes a la vez, ni un paciente tener dos citas.</summary>
    private async Task<bool> HasScheduleConflict(Guid patientId, DateTime startsAt, int durationMinutes,
        Guid? ignoredConsultationId, CancellationToken cancellationToken)
    {
        var start = AsUtc(startsAt);
        var end = start.AddMinutes(durationMinutes);
        var nutritionistId = await db.Patients.AsNoTracking()
            .Where(x => x.Id == patientId)
            .Select(x => x.AssignedNutritionistUserId)
            .SingleOrDefaultAsync(cancellationToken);
        return await (from consultation in db.Consultations.AsNoTracking()
                      join patient in db.Patients.AsNoTracking() on consultation.PatientId equals patient.Id
                      where !consultation.IsArchived && !patient.IsArchived
                          && consultation.Status != ConsultationStatus.Cancelled
                          && consultation.Id != ignoredConsultationId
                          && (patient.Id == patientId
                              || (nutritionistId != null && patient.AssignedNutritionistUserId == nutritionistId))
                          && consultation.StartsAtUtc < end
                          && consultation.StartsAtUtc.AddMinutes(consultation.DurationMinutes) > start
                      select consultation.Id)
            .AnyAsync(cancellationToken);
    }

    private ConflictObjectResult ScheduleConflict() => Conflict(new
    {
        title = "Horario ocupado",
        detail = "Ya existe otra atención en ese horario para este profesional o paciente. Elige otra hora."
    });
}

public sealed record CreateConsultationRequest(
    Guid PatientId,
    DateTime StartsAtUtc,
    [Range(15, 240)] int DurationMinutes,
    [Required, MinLength(3), MaxLength(500)] string Reason);
public sealed record UpdateConsultationRequest(
    DateTime StartsAtUtc,
    [Range(15, 240)] int DurationMinutes,
    [Required, MinLength(3), MaxLength(500)] string Reason,
    [EnumDataType(typeof(ConsultationStatus))] ConsultationStatus Status,
    [MaxLength(2000)] string Notes);
