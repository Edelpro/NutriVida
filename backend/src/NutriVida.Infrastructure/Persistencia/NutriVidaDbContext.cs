using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using NutriVida.Domain.Assessments;
using NutriVida.Domain.Auditing;
using NutriVida.Domain.Common;
using NutriVida.Domain.Communications;
using NutriVida.Domain.Consultations;
using NutriVida.Domain.Energy;
using NutriVida.Domain.FollowUps;
using NutriVida.Domain.FoodCatalog;
using NutriVida.Domain.Identity;
using NutriVida.Domain.MenuPlanning;
using NutriVida.Domain.Patients;
using NutriVida.Domain.Settings;
using NutriVida.Domain.Templates;

namespace NutriVida.Infrastructure.Persistence;

public sealed class NutriVidaDbContext(DbContextOptions<NutriVidaDbContext> options) : DbContext(options)
{
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<Consultation> Consultations => Set<Consultation>();
    public DbSet<NutritionAssessment> NutritionAssessments => Set<NutritionAssessment>();
    public DbSet<NutritionDiagnosis> NutritionDiagnoses => Set<NutritionDiagnosis>();
    public DbSet<AnthropometricMeasurement> AnthropometricMeasurements => Set<AnthropometricMeasurement>();
    public DbSet<EnergyCalculation> EnergyCalculations => Set<EnergyCalculation>();
    public DbSet<WeeklyFollowUp> WeeklyFollowUps => Set<WeeklyFollowUp>();
    public DbSet<FoodItem> FoodItems => Set<FoodItem>();
    public DbSet<MenuPlan> MenuPlans => Set<MenuPlan>();
    public DbSet<MenuPlanItem> MenuPlanItems => Set<MenuPlanItem>();
    public DbSet<Dish> Dishes => Set<Dish>();
    public DbSet<DishIngredient> DishIngredients => Set<DishIngredient>();
    public DbSet<MessageDispatch> MessageDispatches => Set<MessageDispatch>();
    public DbSet<ApplicationUser> ApplicationUsers => Set<ApplicationUser>();
    public DbSet<AccessRequest> AccessRequests => Set<AccessRequest>();
    public DbSet<QuickTemplate> QuickTemplates => Set<QuickTemplate>();
    public DbSet<AuditEvent> AuditEvents => Set<AuditEvent>();
    public DbSet<FoodCatalogImport> FoodCatalogImports => Set<FoodCatalogImport>();
    public DbSet<ClinicSettings> ClinicSettings => Set<ClinicSettings>();

    /// <summary>
    /// SQL Server no conserva el tipo UTC de un datetime2. Sin esto la API devuelve las fechas
    /// sin "Z" y el navegador las interpreta como hora local.
    /// </summary>
    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder) =>
        configurationBuilder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();

    private sealed class UtcDateTimeConverter() : ValueConverter<DateTime, DateTime>(
        value => value.Kind == DateTimeKind.Local ? value.ToUniversalTime() : value,
        value => DateTime.SpecifyKind(value, DateTimeKind.Utc));

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema("nutri");

        foreach (var entityType in modelBuilder.Model.GetEntityTypes()
                     .Where(x => typeof(BaseEntity).IsAssignableFrom(x.ClrType)))
        {
            modelBuilder.Entity(entityType.ClrType).Property(nameof(BaseEntity.RowVersion)).IsRowVersion();
            modelBuilder.Entity(entityType.ClrType).Property(nameof(BaseEntity.CreatedAtUtc)).HasPrecision(0);
            modelBuilder.Entity(entityType.ClrType).Property(nameof(BaseEntity.UpdatedAtUtc)).HasPrecision(0);
        }

        modelBuilder.Entity<Patient>(entity =>
        {
            entity.HasIndex(x => new { x.ClinicId, x.DocumentNumber }).IsUnique();
            entity.HasIndex(x => new { x.ClinicId, x.AssignedNutritionistUserId, x.Status });
            entity.HasOne<ApplicationUser>()
                .WithMany()
                .HasForeignKey(x => x.AssignedNutritionistUserId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.Property(x => x.DocumentNumber).HasMaxLength(30);
            entity.Property(x => x.FirstName).HasMaxLength(100);
            entity.Property(x => x.LastName).HasMaxLength(100);
            entity.Property(x => x.Email).HasMaxLength(180);
            entity.Property(x => x.Phone).HasMaxLength(30);
            entity.Property(x => x.Goal).HasMaxLength(600);
        });

        modelBuilder.Entity<ClinicSettings>(entity =>
        {
            entity.HasIndex(x => x.ClinicId).IsUnique();
            entity.Property(x => x.PracticeName).HasMaxLength(160);
            entity.Property(x => x.Address).HasMaxLength(300);
            entity.Property(x => x.DefaultEtaPercent).HasPrecision(4, 3);
        });

        modelBuilder.Entity<ApplicationUser>(entity =>
        {
            entity.HasIndex(x => x.Email).IsUnique();
            entity.Property(x => x.FullName).HasMaxLength(160);
            entity.Property(x => x.Email).HasMaxLength(180);
            entity.Property(x => x.PasswordHash).HasMaxLength(180);
            entity.Property(x => x.PasswordSalt).HasMaxLength(100);
            entity.Property(x => x.Role).HasMaxLength(40);
        });

        modelBuilder.Entity<AccessRequest>(entity =>
        {
            entity.HasIndex(x => new { x.ClinicId, x.Status, x.CreatedAtUtc });
            entity.HasIndex(x => new { x.ClinicId, x.Email });
            entity.Property(x => x.FullName).HasMaxLength(160);
            entity.Property(x => x.Email).HasMaxLength(180);
            entity.Property(x => x.RequestedRole).HasMaxLength(40);
        });

        modelBuilder.Entity<NutritionAssessment>(entity =>
        {
            entity.HasIndex(x => new { x.PatientId, x.RecordedAtUtc });
            entity.Property(x => x.SleepHours).HasPrecision(4, 1);
            entity.Property(x => x.DailyIntake).HasMaxLength(4000);
            entity.Property(x => x.ClinicalNotes).HasMaxLength(4000);
        });

        modelBuilder.Entity<NutritionDiagnosis>(entity =>
        {
            entity.HasIndex(x => new { x.PatientId, x.CreatedAtUtc });
            entity.Property(x => x.ProblemCode).HasMaxLength(80);
            entity.Property(x => x.ProblemStatement).HasMaxLength(1000);
            entity.Property(x => x.Etiology).HasMaxLength(2000);
            entity.Property(x => x.SignsAndSymptoms).HasMaxLength(2000);
            entity.Property(x => x.ProfessionalName).HasMaxLength(160);
        });

        modelBuilder.Entity<AnthropometricMeasurement>(entity =>
        {
            entity.Property(x => x.WeightKg).HasPrecision(6, 2);
            entity.Property(x => x.HeightCm).HasPrecision(6, 2);
            entity.Property(x => x.WaistCm).HasPrecision(6, 2);
            entity.Property(x => x.HipCm).HasPrecision(6, 2);
            entity.Property(x => x.BodyFatPercent).HasPrecision(5, 2);
            entity.Property(x => x.SittingHeightCm).HasPrecision(6, 2);
            entity.Property(x => x.ArmSpanCm).HasPrecision(6, 2);
            entity.Property(x => x.TricepsSkinfoldMm).HasPrecision(6, 2);
            entity.Property(x => x.SubscapularSkinfoldMm).HasPrecision(6, 2);
            entity.Property(x => x.BicepsSkinfoldMm).HasPrecision(6, 2);
            entity.Property(x => x.IliacCrestSkinfoldMm).HasPrecision(6, 2);
            entity.Property(x => x.SupraspinaleSkinfoldMm).HasPrecision(6, 2);
            entity.Property(x => x.AbdominalSkinfoldMm).HasPrecision(6, 2);
            entity.Property(x => x.FrontThighSkinfoldMm).HasPrecision(6, 2);
            entity.Property(x => x.MedialCalfSkinfoldMm).HasPrecision(6, 2);
            entity.Property(x => x.ArmRelaxedCm).HasPrecision(6, 2);
            entity.Property(x => x.ArmFlexedCm).HasPrecision(6, 2);
            entity.Property(x => x.ForearmCm).HasPrecision(6, 2);
            entity.Property(x => x.ChestCm).HasPrecision(6, 2);
            entity.Property(x => x.MidThighCm).HasPrecision(6, 2);
            entity.Property(x => x.CalfCm).HasPrecision(6, 2);
            entity.Property(x => x.NeckCm).HasPrecision(6, 2);
            entity.Property(x => x.HeadCm).HasPrecision(6, 2);
            entity.Property(x => x.HumerusBreadthCm).HasPrecision(6, 2);
            entity.Property(x => x.WristBreadthCm).HasPrecision(6, 2);
            entity.Property(x => x.FemurBreadthCm).HasPrecision(6, 2);
            entity.Property(x => x.UsualWeightKg).HasPrecision(6, 2);
            entity.Property(x => x.KneeHeightCm).HasPrecision(6, 2);
            entity.Property(x => x.GripStrengthKg).HasPrecision(6, 2);
            entity.Property(x => x.EdemaGrade).HasMaxLength(40);
            entity.Property(x => x.AscitesGrade).HasMaxLength(40);
        });

        modelBuilder.Entity<EnergyCalculation>(entity =>
        {
            entity.Property(x => x.WeightKg).HasPrecision(6, 2);
            entity.Property(x => x.HeightCm).HasPrecision(6, 2);
            entity.Property(x => x.ActivityFactor).HasPrecision(4, 2);
            entity.Property(x => x.EtaPercent).HasPrecision(4, 3);
            entity.Property(x => x.TotalEnergyKcal).HasPrecision(8, 2);
            entity.Property(x => x.RestingEnergyKcal).HasPrecision(8, 2);
            entity.Property(x => x.GoalAdjustmentKcal).HasPrecision(8, 2);
        });

        modelBuilder.Entity<FoodItem>(entity =>
        {
            entity.HasIndex(x => new { x.Source, x.SourceCode }).IsUnique();
            entity.HasIndex(x => x.Name);
            entity.Property(x => x.Name).HasMaxLength(180);
            entity.Property(x => x.PortionGrams).HasPrecision(8, 2);
            entity.Property(x => x.EnergyKcal).HasPrecision(8, 2);
            entity.Property(x => x.ProteinG).HasPrecision(8, 2);
            entity.Property(x => x.CarbohydrateG).HasPrecision(8, 2);
            entity.Property(x => x.FatG).HasPrecision(8, 2);
            entity.Property(x => x.FiberG).HasPrecision(8, 2);
            entity.Property(x => x.SodiumMg).HasPrecision(10, 2);
        });

        modelBuilder.Entity<FoodCatalogImport>(entity =>
        {
            entity.HasIndex(x => new { x.ClinicId, x.ImportedAtUtc });
            entity.Property(x => x.SourceEdition).HasMaxLength(120);
            entity.Property(x => x.SourceReference).HasMaxLength(500);
            entity.Property(x => x.OriginalFileName).HasMaxLength(255);
            entity.Property(x => x.Sha256).HasMaxLength(64);
            entity.Property(x => x.ImportedByEmail).HasMaxLength(180);
        });

        modelBuilder.Entity<AuditEvent>(entity =>
        {
            entity.HasIndex(x => new { x.ClinicId, x.OccurredAtUtc });
            entity.Property(x => x.ActorEmail).HasMaxLength(180);
            entity.Property(x => x.ActorRole).HasMaxLength(40);
            entity.Property(x => x.Action).HasMaxLength(30);
            entity.Property(x => x.EntityType).HasMaxLength(120);
            entity.Property(x => x.EntityId).HasMaxLength(80);
            entity.Property(x => x.ChangedFields).HasMaxLength(2000);
            entity.Property(x => x.CorrelationId).HasMaxLength(100);
        });

        modelBuilder.Entity<MenuPlan>(entity =>
        {
            entity.Property(x => x.EnergyTargetKcal).HasPrecision(8, 2);
            entity.HasMany(x => x.Items).WithOne().HasForeignKey(x => x.MenuPlanId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MenuPlanItem>(entity =>
        {
            entity.Property(x => x.Portions).HasPrecision(6, 2);
            entity.Property(x => x.Grams).HasPrecision(8, 2);
            entity.Property(x => x.EnergyKcal).HasPrecision(8, 2);
        });

        modelBuilder.Entity<Dish>(entity =>
        {
            entity.HasIndex(x => new { x.ClinicId, x.Name });
            entity.Property(x => x.Name).HasMaxLength(180);
            entity.Property(x => x.MealName).HasMaxLength(60);
            entity.Property(x => x.Instructions).HasMaxLength(4000);
            entity.Property(x => x.CostNotes).HasMaxLength(600);
            entity.Property(x => x.ImageUrl).HasMaxLength(2048);
            entity.Property(x => x.VideoUrl).HasMaxLength(2048);
            entity.HasMany(x => x.Ingredients).WithOne().HasForeignKey(x => x.DishId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<DishIngredient>(entity =>
        {
            entity.Property(x => x.FoodNameSnapshot).HasMaxLength(180);
            entity.Property(x => x.HouseholdMeasureSnapshot).HasMaxLength(120);
            entity.Property(x => x.Portions).HasPrecision(6, 2);
            entity.Property(x => x.Grams).HasPrecision(8, 2);
            entity.Property(x => x.EstimatedCostUsd).HasPrecision(8, 2);
            entity.Property(x => x.EnergyKcal).HasPrecision(8, 2);
            entity.Property(x => x.ProteinG).HasPrecision(8, 2);
            entity.Property(x => x.CarbohydrateG).HasPrecision(8, 2);
            entity.Property(x => x.FatG).HasPrecision(8, 2);
            entity.Property(x => x.FiberG).HasPrecision(8, 2);
            entity.Property(x => x.SodiumMg).HasPrecision(10, 2);
            entity.HasIndex(x => x.FoodItemId);
        });

        modelBuilder.Entity<QuickTemplate>(entity =>
        {
            entity.HasIndex(x => new { x.ClinicId, x.Scope, x.Name });
            entity.Property(x => x.Name).HasMaxLength(180);
            entity.Property(x => x.Category).HasMaxLength(60);
            entity.Property(x => x.Objective).HasMaxLength(180);
            entity.Property(x => x.Summary).HasMaxLength(500);
            entity.Property(x => x.ValuesJson).HasMaxLength(12000);
            entity.Property(x => x.PlanName).HasMaxLength(180);
            entity.Property(x => x.ProfessionalNotes).HasMaxLength(2000);
        });

        modelBuilder.Entity<WeeklyFollowUp>(entity =>
        {
            entity.Property(x => x.WeightKg).HasPrecision(6, 2);
            entity.Property(x => x.AverageSleepHours).HasPrecision(4, 1);
            entity.Property(x => x.ExerciseType).HasMaxLength(300);
            entity.Property(x => x.Symptoms).HasMaxLength(2000);
            entity.Property(x => x.Adjustments).HasMaxLength(2000);
            entity.Property(x => x.ProfessionalNotes).HasMaxLength(2000);
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Added) entry.Entity.CreatedAtUtc = now;
            if (entry.State is EntityState.Added or EntityState.Modified) entry.Entity.UpdatedAtUtc = now;
        }
        return base.SaveChangesAsync(cancellationToken);
    }
}
