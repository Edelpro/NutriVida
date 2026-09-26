using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NutriVida.Domain.Assessments;
using NutriVida.Api.Security;
using NutriVida.Infrastructure.Persistence;

namespace NutriVida.Api.Controllers.Assessments;

[ApiController]
[Route("api/patients/{patientId:guid}/diagnoses")]
public sealed class DiagnosesController(NutriVidaDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(Guid patientId, CancellationToken cancellationToken)
    {
        if (!await OwnsPatient(patientId, cancellationToken)) return NotFound();
        return Ok(await db.NutritionDiagnoses.AsNoTracking()
            .Where(x => x.PatientId == patientId && !x.IsArchived)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken));
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid patientId, DiagnosisRequest request,
        CancellationToken cancellationToken)
    {
        if (!await OwnsPatient(patientId, cancellationToken))
            return NotFound();
        if (request.AssessmentId.HasValue)
        {
            var ownsAssessment = await db.NutritionAssessments.AsNoTracking().AnyAsync(
                x => x.Id == request.AssessmentId.Value
                    && x.PatientId == patientId
                    && !x.IsArchived,
                cancellationToken);
            if (!ownsAssessment)
                return ValidationProblem("La evaluación seleccionada no pertenece al paciente activo o ya no está disponible.");
        }
        var diagnosis = new NutritionDiagnosis
        {
            PatientId = patientId,
            AssessmentId = request.AssessmentId,
            ProblemCode = request.ProblemCode.Trim(),
            ProblemStatement = request.ProblemStatement.Trim(),
            Etiology = request.Etiology.Trim(),
            SignsAndSymptoms = request.SignsAndSymptoms.Trim(),
            Status = DiagnosisStatus.Draft,
            ProfessionalName = User.Identity?.Name ?? "Profesional"
        };
        db.NutritionDiagnoses.Add(diagnosis);
        await db.SaveChangesAsync(cancellationToken);
        return Created($"/api/patients/{patientId}/diagnoses/{diagnosis.Id}", diagnosis);
    }

    [HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid patientId, Guid id, CancellationToken cancellationToken)
    {
        if (!await OwnsPatient(patientId, cancellationToken)) return NotFound();
        var diagnosis = await db.NutritionDiagnoses.SingleOrDefaultAsync(
            x => x.Id == id && x.PatientId == patientId && !x.IsArchived, cancellationToken);
        if (diagnosis is null) return NotFound();
        diagnosis.Status = DiagnosisStatus.Approved;
        diagnosis.ApprovedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return Ok(diagnosis);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid patientId, Guid id, DiagnosisRequest request,
        CancellationToken cancellationToken)
    {
        if (!await OwnsPatient(patientId, cancellationToken)) return NotFound();
        var diagnosis = await db.NutritionDiagnoses.SingleOrDefaultAsync(
            x => x.Id == id && x.PatientId == patientId && !x.IsArchived, cancellationToken);
        if (diagnosis is null) return NotFound();
        diagnosis.AssessmentId = request.AssessmentId;
        diagnosis.ProblemCode = request.ProblemCode.Trim();
        diagnosis.ProblemStatement = request.ProblemStatement.Trim();
        diagnosis.Etiology = request.Etiology.Trim();
        diagnosis.SignsAndSymptoms = request.SignsAndSymptoms.Trim();
        diagnosis.Status = DiagnosisStatus.Draft;
        diagnosis.ApprovedAtUtc = null;
        await db.SaveChangesAsync(cancellationToken);
        return Ok(diagnosis);
    }

    [HttpPost("{id:guid}/archive")]
    [Authorize(Roles = "ClinicAdmin")]
    public async Task<IActionResult> Archive(Guid patientId, Guid id, CancellationToken cancellationToken)
    {
        if (!await OwnsPatient(patientId, cancellationToken)) return NotFound();
        var diagnosis = await db.NutritionDiagnoses.SingleOrDefaultAsync(
            x => x.Id == id && x.PatientId == patientId && !x.IsArchived, cancellationToken);
        if (diagnosis is null) return NotFound();
        diagnosis.IsArchived = true;
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private Task<bool> OwnsPatient(Guid patientId, CancellationToken cancellationToken) =>
        db.CanAccessPatientAsync(User, patientId, cancellationToken);
}

public sealed record DiagnosisRequest(Guid? AssessmentId,
    [Required, MaxLength(80)] string ProblemCode,
    [Required, MaxLength(1000)] string ProblemStatement,
    [Required, MaxLength(2000)] string Etiology,
    [Required, MaxLength(2000)] string SignsAndSymptoms);
