using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NutriVida.Domain.Communications;
using NutriVida.Domain.Consultations;
using NutriVida.Domain.MenuPlanning;
using NutriVida.Domain.Patients;
using NutriVida.Infrastructure.Persistence;
using NutriVida.Api.Security;
using NutriVida.Api.Services.Time;

namespace NutriVida.Api.Controllers.Dashboard;

[ApiController]
[Route("api/dashboard")]
public sealed class DashboardController(NutriVidaDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        if (!User.TryGetClinicId(out var clinicId)) return Forbid();
        var today = ClinicClock.Today();
        var todayUtc = ClinicClock.StartOfDayUtc(today);
        var tomorrowUtc = ClinicClock.StartOfDayUtc(today.AddDays(1));
        var agendaEndUtc = ClinicClock.StartOfDayUtc(today.AddDays(3));
        var monthStartUtc = ClinicClock.StartOfDayUtc(new DateOnly(today.Year, today.Month, 1));
        var accessiblePatients = db.AccessiblePatients(User);
        var accessiblePatientsIncludingArchived = db.AccessiblePatients(User, includeArchived: true);

        var activePatients = await accessiblePatients.CountAsync(
            x => x.Status == PatientStatus.Active, cancellationToken);
        var pausedPatients = await accessiblePatients.CountAsync(
            x => x.Status == PatientStatus.Paused, cancellationToken);
        var archivedPatients = await accessiblePatientsIncludingArchived.CountAsync(
            x => x.IsArchived || x.Status == PatientStatus.Archived, cancellationToken);
        var newPatientsThisMonth = await accessiblePatients.CountAsync(
            x => x.CreatedAtUtc >= monthStartUtc, cancellationToken);
        var accessiblePatientIds = accessiblePatients.Select(x => x.Id);
        var consultationsToday = await db.Consultations.CountAsync(x => accessiblePatientIds.Contains(x.PatientId)
            && !x.IsArchived && x.Status != ConsultationStatus.Cancelled
            && x.StartsAtUtc >= todayUtc && x.StartsAtUtc < tomorrowUtc, cancellationToken);
        var pendingFollowUps = await db.WeeklyFollowUps.CountAsync(x => accessiblePatientIds.Contains(x.PatientId)
            && !x.IsArchived && x.NextAppointmentOn.HasValue && x.NextAppointmentOn <= today, cancellationToken);
        var plansToReview = await db.MenuPlans.CountAsync(x => accessiblePatientIds.Contains(x.PatientId) && !x.IsArchived
            && (x.Status == MenuPlanStatus.Draft || x.Status == MenuPlanStatus.ReadyForReview), cancellationToken);
        var messagesToReview = await db.MessageDispatches.CountAsync(x => accessiblePatientIds.Contains(x.PatientId) && !x.IsArchived
            && (x.Status == MessageStatus.Draft || x.Status == MessageStatus.Failed), cancellationToken);

        var appointmentsRaw = await (from c in db.Consultations.AsNoTracking()
                                     join p in db.Patients.AsNoTracking() on c.PatientId equals p.Id
                                     where accessiblePatientIds.Contains(p.Id) && !c.IsArchived
                                         && (c.Status == ConsultationStatus.Scheduled || c.Status == ConsultationStatus.InProgress)
                                         && c.StartsAtUtc >= todayUtc && c.StartsAtUtc < agendaEndUtc
                                     orderby c.StartsAtUtc
                                     select new
                                     {
                                         c.Id,
                                         c.PatientId,
                                         c.StartsAtUtc,
                                         c.DurationMinutes,
                                         c.Reason,
                                         c.Status,
                                         p.FirstName,
                                         p.LastName
                                     })
            .Take(6)
            .ToListAsync(cancellationToken);

        var appointments = appointmentsRaw.Select(x => new
        {
            x.Id,
            x.PatientId,
            patientName = $"{x.FirstName} {x.LastName}",
            x.StartsAtUtc,
            x.DurationMinutes,
            x.Reason,
            status = x.Status.ToString()
        }).ToList();

        var recentRaw = await accessiblePatients.AsNoTracking()
            .OrderByDescending(x => x.UpdatedAtUtc)
            .Take(5)
            .Select(x => new
            {
                x.Id,
                x.FirstName,
                x.LastName,
                x.DateOfBirth,
                x.Goal,
                x.Status,
                x.UpdatedAtUtc
            })
            .ToListAsync(cancellationToken);

        var recentIds = recentRaw.Select(x => x.Id).ToList();
        var recentConsultations = await db.Consultations.AsNoTracking()
            .Where(x => !x.IsArchived && recentIds.Contains(x.PatientId))
            .Select(x => new { x.PatientId, x.StartsAtUtc })
            .ToListAsync(cancellationToken);

        var recentPatients = recentRaw.Select(x => new
        {
            x.Id,
            fullName = $"{x.FirstName} {x.LastName}",
            ageYears = AgeOn(x.DateOfBirth, today),
            x.Goal,
            status = x.Status.ToString(),
            lastConsultationUtc = recentConsultations
                .Where(c => c.PatientId == x.Id && c.StartsAtUtc < DateTime.UtcNow)
                .Select(c => (DateTime?)c.StartsAtUtc)
                .Max(),
            nextConsultationUtc = recentConsultations
                .Where(c => c.PatientId == x.Id && c.StartsAtUtc >= DateTime.UtcNow)
                .Select(c => (DateTime?)c.StartsAtUtc)
                .Min(),
            x.UpdatedAtUtc
        }).ToList();

        var focusPatientId = appointmentsRaw.FirstOrDefault()?.PatientId ?? recentRaw.FirstOrDefault()?.Id;
        object? currentPatient = null;
        if (focusPatientId is Guid patientId)
        {
            var focus = await accessiblePatients.AsNoTracking()
                .Where(x => x.Id == patientId)
                .Select(x => new
                {
                    x.Id,
                    x.FirstName,
                    x.LastName,
                    x.DateOfBirth,
                    x.DocumentNumber,
                    x.Goal
                })
                .SingleOrDefaultAsync(cancellationToken);

            if (focus is not null)
            {
                var measurements = await db.AnthropometricMeasurements.AsNoTracking()
                    .Where(x => x.PatientId == patientId && !x.IsArchived)
                    .OrderByDescending(x => x.MeasuredAtUtc)
                    .Take(2)
                    .Select(x => new { x.WeightKg, x.HeightCm, x.BodyFatPercent, x.MeasuredAtUtc })
                    .ToListAsync(cancellationToken);
                var followUp = await db.WeeklyFollowUps.AsNoTracking()
                    .Where(x => x.PatientId == patientId && !x.IsArchived)
                    .OrderByDescending(x => x.FollowUpDate)
                    .Select(x => new { x.PlanAdherencePercent, x.FollowUpDate })
                    .FirstOrDefaultAsync(cancellationToken);
                var latest = measurements.FirstOrDefault();
                var previous = measurements.Skip(1).FirstOrDefault();
                decimal? bmi = latest is { HeightCm: > 0 }
                    ? Math.Round(latest.WeightKg / (latest.HeightCm / 100m * (latest.HeightCm / 100m)), 1)
                    : null;

                currentPatient = new
                {
                    focus.Id,
                    fullName = $"{focus.FirstName} {focus.LastName}",
                    initials = Initials(focus.FirstName, focus.LastName),
                    ageYears = AgeOn(focus.DateOfBirth, today),
                    focus.DocumentNumber,
                    focus.Goal,
                    weightKg = latest?.WeightKg,
                    weightChangeKg = latest is not null && previous is not null
                        ? Math.Round(latest.WeightKg - previous.WeightKg, 1)
                        : (decimal?)null,
                    bmi,
                    bodyFatPercent = latest?.BodyFatPercent,
                    adherencePercent = followUp?.PlanAdherencePercent,
                    measuredAtUtc = latest?.MeasuredAtUtc
                };
            }
        }

        var goals = await accessiblePatients.AsNoTracking()
            .Where(x => x.Status == PatientStatus.Active)
            .Select(x => x.Goal)
            .ToListAsync(cancellationToken);
        var objectiveDistribution = BuildObjectiveDistribution(goals);

        return Ok(new
        {
            activePatients,
            pausedPatients,
            archivedPatients,
            totalPatients = activePatients + pausedPatients + archivedPatients,
            newPatientsThisMonth,
            consultationsToday,
            pendingFollowUps,
            plansToReview,
            messagesToReview,
            appointments,
            currentPatient,
            recentPatients,
            objectiveDistribution,
            generatedAtUtc = DateTime.UtcNow
        });
    }

    private static int AgeOn(DateOnly birthDate, DateOnly date)
    {
        var age = date.Year - birthDate.Year;
        if (birthDate > date.AddYears(-age)) age--;
        return Math.Max(age, 0);
    }

    private static string Initials(string firstName, string lastName)
    {
        var first = string.IsNullOrWhiteSpace(firstName) ? string.Empty : firstName.Trim()[0].ToString();
        var last = string.IsNullOrWhiteSpace(lastName) ? string.Empty : lastName.Trim()[0].ToString();
        return (first + last).ToUpperInvariant();
    }

    private static IReadOnlyList<object> BuildObjectiveDistribution(IEnumerable<string> goals)
    {
        var buckets = new Dictionary<string, int>
        {
            ["Control de peso"] = 0,
            ["Composición corporal"] = 0,
            ["Salud metabólica"] = 0,
            ["Otros objetivos"] = 0
        };

        foreach (var rawGoal in goals)
        {
            var goal = rawGoal?.ToLowerInvariant() ?? string.Empty;
            if (goal.Contains("peso") || goal.Contains("control")) buckets["Control de peso"]++;
            else if (goal.Contains("composición") || goal.Contains("corporal")) buckets["Composición corporal"]++;
            else if (goal.Contains("metab") || goal.Contains("gluc") || goal.Contains("salud")) buckets["Salud metabólica"]++;
            else buckets["Otros objetivos"]++;
        }

        var total = Math.Max(buckets.Values.Sum(), 1);
        return buckets.Select(x => (object)new
        {
            label = x.Key,
            count = x.Value,
            percent = (int)Math.Round(x.Value * 100m / total)
        }).ToList();
    }
}
