using System.Security.Claims;
using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using NutriVida.Domain.Patients;
using NutriVida.Infrastructure.Persistence;

namespace NutriVida.Api.Security;

public static class PatientAccessExtensions
{
    public static Expression<Func<Patient, bool>> PatientAccessFilter(
        this ClaimsPrincipal user,
        bool includeArchived = false)
    {
        if (!user.TryGetClinicId(out var clinicId))
            return _ => false;

        if (user.IsInRole("ClinicAdmin"))
            return patient => patient.ClinicId == clinicId
                && (includeArchived || !patient.IsArchived);

        if (!user.IsInRole("Nutritionist") || !user.TryGetUserId(out var userId))
            return _ => false;

        return patient => patient.ClinicId == clinicId
            && patient.AssignedNutritionistUserId == userId
            && (includeArchived || !patient.IsArchived);
    }

    public static IQueryable<Patient> AccessiblePatients(
        this NutriVidaDbContext db,
        ClaimsPrincipal user,
        bool includeArchived = false) =>
        db.Patients.Where(user.PatientAccessFilter(includeArchived));

    public static Task<bool> CanAccessPatientAsync(
        this NutriVidaDbContext db,
        ClaimsPrincipal user,
        Guid patientId,
        CancellationToken cancellationToken,
        bool includeArchived = false) =>
        db.AccessiblePatients(user, includeArchived)
            .AnyAsync(x => x.Id == patientId, cancellationToken);
}
