using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NutriVida.Domain.Consultations;
using NutriVida.Api.Security;
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
        var start = date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var end = start.AddDays(1);
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
                              status = consultation.Status.ToString()
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
