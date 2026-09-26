using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NutriVida.Domain.Patients;
using NutriVida.Api.Security;
using NutriVida.Infrastructure.Persistence;

namespace NutriVida.Api.Controllers.Patients;

[ApiController]
[Route("api/patients")]
public sealed class PatientsController(NutriVidaDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? q, [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10, CancellationToken cancellationToken = default)
    {
        if (!User.TryGetClinicId(out var clinicId)) return Forbid();
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 5, 50);
        var query = db.AccessiblePatients(User).AsNoTracking();
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            query = query.Where(x => x.FirstName.Contains(term) || x.LastName.Contains(term)
                || x.DocumentNumber.Contains(term) || x.Email.Contains(term));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query.OrderBy(x => x.LastName).ThenBy(x => x.FirstName)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(x => new PatientListItem(x.Id, x.DocumentNumber, x.FirstName, x.LastName,
                x.DateOfBirth, x.Email, x.Phone, x.Goal, x.Status.ToString(),
                x.AssignedNutritionistUserId,
                db.ApplicationUsers.Where(user => user.Id == x.AssignedNutritionistUserId)
                    .Select(user => user.FullName).FirstOrDefault()))
            .ToListAsync(cancellationToken);
        return Ok(new { items, page, pageSize, total, totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize)) });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken)
    {
        if (!User.TryGetClinicId(out var clinicId)) return Forbid();
        try
        {
            var result = await db.AccessiblePatients(User).AsNoTracking()
                .Where(x => x.Id == id)
                .Select(x => new
                {
                    Patient = x,
                    AssignedNutritionistName = db.ApplicationUsers
                        .Where(user => user.Id == x.AssignedNutritionistUserId)
                        .Select(user => user.FullName)
                        .FirstOrDefault()
                })
                .SingleOrDefaultAsync(cancellationToken);
            return result is null ? NotFound() : Ok(ToDetails(result.Patient, result.AssignedNutritionistName));
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // El navegador abandonó esta lectura al refrescar el paciente activo.
            // La captura local evita que Visual Studio la muestre como excepción de usuario.
            return StatusCode(499);
        }
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreatePatientRequest request, CancellationToken cancellationToken)
    {
        if (!User.TryGetClinicId(out var clinicId)) return Forbid();
        var documentNumber = request.DocumentNumber.Trim();
        var contactErrors = ValidatePatientFields(request.FirstName, request.LastName, request.Phone,
            request.Email, request.EmailConsent, request.WhatsAppConsent);
        if (contactErrors.Count > 0) return InvalidFields(contactErrors);
        if (request.DateOfBirth < new DateOnly(1900, 1, 1))
            return InvalidFields(new Dictionary<string, string[]>
            {
                [nameof(request.DateOfBirth)] = ["La fecha de nacimiento debe ser posterior a 1900."]
            });
        if (request.DateOfBirth > DateOnly.FromDateTime(DateTime.Today))
            return BadRequest(new
            {
                title = "Fecha no válida",
                detail = "La fecha de nacimiento no puede estar en el futuro."
            });
        if (await db.Patients.AnyAsync(
                x => x.ClinicId == clinicId && x.DocumentNumber == documentNumber,
                cancellationToken))
            return Conflict(new
            {
                title = "Identificación ya registrada",
                detail = "Ya existe un paciente con esta cédula, pasaporte o código."
            });

        if (!User.TryGetUserId(out var currentUserId)) return Forbid();
        var assignment = await ResolveAssignment(
            request.AssignedNutritionistUserId,
            clinicId,
            currentUserId,
            cancellationToken);
        if (assignment.Error is not null) return InvalidFields(assignment.Error);

        var patient = new Patient
        {
            ClinicId = clinicId,
            AssignedNutritionistUserId = assignment.UserId,
            DocumentNumber = documentNumber,
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            DateOfBirth = request.DateOfBirth,
            SexAtBirth = request.SexAtBirth,
            Email = request.Email.Trim(),
            Phone = request.Phone.Trim(),
            Occupation = request.Occupation.Trim(),
            Goal = request.Goal.Trim(),
            EmailConsentAtUtc = request.EmailConsent ? DateTime.UtcNow : null,
            WhatsAppConsentAtUtc = request.WhatsAppConsent ? DateTime.UtcNow : null
        };
        db.Patients.Add(patient);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            return Conflict(new
            {
                title = "No se pudo registrar",
                detail = "La identificación ya está en uso. Actualiza la lista y vuelve a intentarlo."
            });
        }
        return CreatedAtAction(nameof(Get), new { id = patient.Id },
            ToDetails(patient, assignment.FullName));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdatePatientRequest request, CancellationToken cancellationToken)
    {
        if (!User.TryGetClinicId(out var clinicId)) return Forbid();
        var fieldErrors = ValidatePatientFields(request.FirstName, request.LastName, request.Phone,
            request.Email, false, false);
        if (fieldErrors.Count > 0) return InvalidFields(fieldErrors);
        var patient = await db.AccessiblePatients(User)
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (patient is null) return NotFound();
        if (!string.IsNullOrWhiteSpace(request.RowVersion))
        {
            try { db.Entry(patient).Property(x => x.RowVersion).OriginalValue = Convert.FromBase64String(request.RowVersion); }
            catch (FormatException)
            {
                return InvalidFields(new Dictionary<string, string[]>
                {
                    [nameof(request.RowVersion)] = ["La versión del registro no es válida. Actualiza el expediente."]
                });
            }
        }

        patient.FirstName = request.FirstName.Trim();
        patient.LastName = request.LastName.Trim();
        patient.Email = request.Email.Trim();
        patient.Phone = request.Phone.Trim();
        patient.Occupation = request.Occupation.Trim();
        patient.Goal = request.Goal.Trim();
        patient.Status = request.Status;
        string? assignedNutritionistName;
        if (User.IsInRole("ClinicAdmin"))
        {
            if (!User.TryGetUserId(out var currentUserId)) return Forbid();
            var assignment = await ResolveAssignment(
                request.AssignedNutritionistUserId,
                clinicId,
                currentUserId,
                cancellationToken);
            if (assignment.Error is not null) return InvalidFields(assignment.Error);
            patient.AssignedNutritionistUserId = assignment.UserId;
            assignedNutritionistName = assignment.FullName;
        }
        else
        {
            assignedNutritionistName = await db.ApplicationUsers.AsNoTracking()
                .Where(x => x.Id == patient.AssignedNutritionistUserId)
                .Select(x => x.FullName)
                .SingleOrDefaultAsync(cancellationToken);
        }
        try { await db.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateConcurrencyException)
        {
            return Conflict(new { title = "El registro cambió", detail = "Actualiza los datos antes de volver a guardar." });
        }
        return Ok(ToDetails(patient, assignedNutritionistName));
    }

    [HttpPost("{id:guid}/archive")]
    [Authorize(Roles = "ClinicAdmin")]
    public async Task<IActionResult> Archive(Guid id, CancellationToken cancellationToken)
    {
        if (!User.TryGetClinicId(out var clinicId)) return Forbid();
        var patient = await db.AccessiblePatients(User, includeArchived: true)
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (patient is null) return NotFound();
        patient.IsArchived = true;
        patient.Status = PatientStatus.Archived;
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private async Task<AssignmentResult> ResolveAssignment(
        Guid? requestedUserId,
        Guid clinicId,
        Guid currentUserId,
        CancellationToken cancellationToken)
    {
        var assignedUserId = User.IsInRole("ClinicAdmin") ? requestedUserId : currentUserId;
        if (!assignedUserId.HasValue || assignedUserId == Guid.Empty)
            return AssignmentResult.Invalid("Selecciona el nutricionista responsable del paciente.");

        var nutritionist = await db.ApplicationUsers.AsNoTracking()
            .Where(x => x.Id == assignedUserId.Value
                && x.ClinicId == clinicId
                && x.Role == "Nutritionist"
                && x.IsActive
                && !x.IsArchived)
            .Select(x => new { x.Id, x.FullName })
            .SingleOrDefaultAsync(cancellationToken);

        return nutritionist is null
            ? AssignmentResult.Invalid("El nutricionista seleccionado no está activo o no pertenece a esta clínica.")
            : new AssignmentResult(nutritionist.Id, nutritionist.FullName, null);
    }

    private static PatientDetails ToDetails(Patient x, string? assignedNutritionistName) => new(x.Id, x.DocumentNumber, x.FirstName, x.LastName,
        x.DateOfBirth, x.SexAtBirth, x.Email, x.Phone, x.Occupation, x.Goal, x.Status,
        x.EmailConsentAtUtc.HasValue, x.WhatsAppConsentAtUtc.HasValue, Convert.ToBase64String(x.RowVersion),
        x.AssignedNutritionistUserId, assignedNutritionistName);

    private sealed record AssignmentResult(
        Guid? UserId,
        string? FullName,
        Dictionary<string, string[]>? Error)
    {
        public static AssignmentResult Invalid(string message) => new(null, null,
            new Dictionary<string, string[]>
            {
                [nameof(CreatePatientRequest.AssignedNutritionistUserId)] = [message]
            });
    }

    private static Dictionary<string, string[]> ValidatePatientFields(string firstName, string lastName,
        string phone, string email, bool emailConsent, bool whatsAppConsent)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(firstName)) errors[nameof(firstName)] = ["Escribe los nombres del paciente."];
        if (string.IsNullOrWhiteSpace(lastName)) errors[nameof(lastName)] = ["Escribe los apellidos del paciente."];
        var digits = string.Concat((phone ?? string.Empty).Where(char.IsDigit));
        if (digits.Length is < 7 or > 15)
            errors[nameof(phone)] = ["Escribe un teléfono válido de 7 a 15 dígitos, incluido el código de país."];
        if (emailConsent && string.IsNullOrWhiteSpace(email))
            errors[nameof(email)] = ["Registra un correo antes de habilitar su consentimiento."];
        if (whatsAppConsent && digits.Length is < 7 or > 15)
            errors[nameof(phone)] = ["Registra un número válido antes de habilitar WhatsApp."];
        return errors;
    }

    private BadRequestObjectResult InvalidFields(Dictionary<string, string[]> errors) => BadRequest(
        new ValidationProblemDetails(errors)
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "Revisa los datos del paciente",
            Detail = "Corrige los campos indicados antes de guardar."
        });
}

public sealed record PatientListItem(Guid Id, string DocumentNumber, string FirstName, string LastName,
    DateOnly DateOfBirth, string Email, string Phone, string Goal, string Status,
    Guid? AssignedNutritionistUserId, string? AssignedNutritionistName);
public sealed record PatientDetails(Guid Id, string DocumentNumber, string FirstName, string LastName,
    DateOnly DateOfBirth, BiologicalSex SexAtBirth, string Email, string Phone, string Occupation,
    string Goal, PatientStatus Status, bool EmailConsent, bool WhatsAppConsent, string RowVersion,
    Guid? AssignedNutritionistUserId, string? AssignedNutritionistName);
public sealed record CreatePatientRequest(
    [Required, MinLength(3), MaxLength(30)] string DocumentNumber,
    [Required, MinLength(2), MaxLength(100)] string FirstName,
    [Required, MinLength(2), MaxLength(100)] string LastName,
    DateOnly DateOfBirth,
    [EnumDataType(typeof(BiologicalSex))] BiologicalSex SexAtBirth,
    [EmailAddress, MaxLength(180)] string Email,
    [Required, MinLength(7), MaxLength(30)] string Phone,
    [MaxLength(120)] string Occupation,
    [MaxLength(600)] string Goal,
    bool EmailConsent,
    bool WhatsAppConsent,
    Guid? AssignedNutritionistUserId);
public sealed record UpdatePatientRequest(
    [Required, MinLength(2), MaxLength(100)] string FirstName,
    [Required, MinLength(2), MaxLength(100)] string LastName,
    [EmailAddress, MaxLength(180)] string Email,
    [Required, MinLength(7), MaxLength(30)] string Phone,
    [MaxLength(120)] string Occupation,
    [MaxLength(600)] string Goal,
    [EnumDataType(typeof(PatientStatus))] PatientStatus Status,
    [MaxLength(200)] string RowVersion,
    Guid? AssignedNutritionistUserId);
