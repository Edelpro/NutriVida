using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using NutriVida.Domain.Assessments;
using NutriVida.Domain.Consultations;
using NutriVida.Domain.FollowUps;
using NutriVida.Domain.FoodCatalog;
using NutriVida.Domain.Identity;
using NutriVida.Domain.Patients;
using NutriVida.Domain.Templates;
using NutriVida.Infrastructure.Security;

namespace NutriVida.Infrastructure.Persistence;

public static class DatabaseSeeder
{
    public static readonly Guid DemoClinicId = Guid.Parse("67259895-e69d-4478-b1e0-0b30df36ae40");
    public static readonly Guid DemoPatientId = Guid.Parse("5687f592-0b31-4431-99a1-7d299c185d4d");

    /// <summary>
    /// Primera puesta en marcha sin datos de demostración: crea la cuenta administradora, que deberá
    /// cambiar su contraseña al entrar, y las plantillas base. No hace nada si ya existen cuentas.
    /// </summary>
    public static async Task BootstrapAdministratorAsync(
        NutriVidaDbContext db,
        string fullName,
        string email,
        string temporaryPassword,
        CancellationToken cancellationToken = default)
    {
        if (await db.ApplicationUsers.AnyAsync(cancellationToken)) return;
        var administrator = CreateUser(fullName, email.Trim().ToLowerInvariant(), "ClinicAdmin", temporaryPassword);
        administrator.MustChangePassword = true;
        db.ApplicationUsers.Add(administrator);
        await db.SaveChangesAsync(cancellationToken);
        await EnsureQuickTemplatesAsync(db, cancellationToken);
    }

    public static async Task InitialiseAsync(
        NutriVidaDbContext db,
        bool resetDemoCredentials = false,
        CancellationToken cancellationToken = default)
    {
        await db.ApplicationUsers
            .Where(x => x.Role == "Assistant" && !x.IsArchived)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.IsActive, false)
                .SetProperty(x => x.IsArchived, true)
                .SetProperty(x => x.UpdatedAtUtc, DateTime.UtcNow), cancellationToken);

        if (resetDemoCredentials)
        {
            await EnsureDemoAccountsAsync(db, cancellationToken);
        }
        else if (!await db.ApplicationUsers.AnyAsync(cancellationToken))
        {
            const string temporaryPassword = "NutriVida2026#";
            db.ApplicationUsers.AddRange(
                CreateUser("Administración NutriVida", "admin@nutrivida.local", "ClinicAdmin", temporaryPassword),
                CreateUser("Dra. Valeria Ortiz", "nutricionista@nutrivida.local", "Nutritionist", temporaryPassword));
            await db.SaveChangesAsync(cancellationToken);
        }

        await EnsureQuickTemplatesAsync(db, cancellationToken);

        if (await db.Patients.AnyAsync(cancellationToken)) return;
        var demoNutritionistId = await db.ApplicationUsers.AsNoTracking()
            .Where(x => x.ClinicId == DemoClinicId
                && x.Role == "Nutritionist"
                && x.IsActive
                && !x.IsArchived)
            .OrderBy(x => x.FullName)
            .Select(x => (Guid?)x.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var maria = new Patient
        {
            Id = DemoPatientId,
            ClinicId = DemoClinicId,
            AssignedNutritionistUserId = demoNutritionistId,
            DocumentNumber = "DEMO-001",
            FirstName = "María Fernanda",
            LastName = "López",
            DateOfBirth = new DateOnly(1991, 8, 14),
            SexAtBirth = BiologicalSex.Female,
            Email = "maria.demo@example.com",
            Phone = "+593 99 000 0001",
            Occupation = "Arquitecta",
            Goal = "Mejorar composición corporal y regularidad intestinal",
            EmailConsentAtUtc = DateTime.UtcNow.AddMonths(-1),
            WhatsAppConsentAtUtc = DateTime.UtcNow.AddMonths(-1)
        };
        var carlos = new Patient
        {
            ClinicId = DemoClinicId,
            AssignedNutritionistUserId = demoNutritionistId,
            DocumentNumber = "DEMO-002",
            FirstName = "Carlos Andrés",
            LastName = "Mena",
            DateOfBirth = new DateOnly(1984, 2, 3),
            SexAtBirth = BiologicalSex.Male,
            Email = "carlos.demo@example.com",
            Phone = "+593 99 000 0002",
            Occupation = "Docente",
            Goal = "Control metabólico y organización de horarios"
        };
        var ana = new Patient
        {
            ClinicId = DemoClinicId,
            AssignedNutritionistUserId = demoNutritionistId,
            DocumentNumber = "DEMO-003",
            FirstName = "Ana Lucía",
            LastName = "Viteri",
            DateOfBirth = new DateOnly(1997, 11, 20),
            SexAtBirth = BiologicalSex.Female,
            Email = "ana.demo@example.com",
            Phone = "+593 99 000 0003",
            Occupation = "Diseñadora",
            Goal = "Plan vegetariano equilibrado"
        };
        db.Patients.AddRange(maria, carlos, ana);

        db.Consultations.AddRange(
            new Consultation { PatientId = maria.Id, StartsAtUtc = DateTime.UtcNow.Date.AddHours(14), Reason = "Control mensual", ProfessionalName = "Dra. Valeria Ortiz" },
            new Consultation { PatientId = carlos.Id, StartsAtUtc = DateTime.UtcNow.Date.AddHours(16), Reason = "Primera consulta", ProfessionalName = "Dra. Valeria Ortiz" },
            new Consultation { PatientId = ana.Id, StartsAtUtc = DateTime.UtcNow.Date.AddDays(1).AddHours(15), Reason = "Revisión de menú", ProfessionalName = "Dra. Valeria Ortiz" });

        db.AnthropometricMeasurements.AddRange(
            new AnthropometricMeasurement { PatientId = maria.Id, MeasuredAtUtc = DateTime.UtcNow.AddDays(-30), WeightKg = 68.4m, HeightCm = 164m, WaistCm = 82m },
            new AnthropometricMeasurement { PatientId = maria.Id, MeasuredAtUtc = DateTime.UtcNow.AddDays(-2), WeightKg = 66.9m, HeightCm = 164m, WaistCm = 79.5m });

        db.WeeklyFollowUps.Add(new WeeklyFollowUp
        {
            PatientId = maria.Id,
            FollowUpDate = DateOnly.FromDateTime(DateTime.Today.AddDays(-7)),
            PeriodStartsOn = DateOnly.FromDateTime(DateTime.Today.AddDays(-21)),
            PeriodEndsOn = DateOnly.FromDateTime(DateTime.Today.AddDays(-7)),
            NextAppointmentOn = DateOnly.FromDateTime(DateTime.Today.AddDays(7)),
            FollowUpIntervalDays = 14,
            ObjectiveStatus = FollowUpObjectiveStatus.InProgress,
            WeightKg = 66.9m,
            ExerciseMinutes = 155,
            ExerciseType = "Caminata y fuerza",
            AverageSleepHours = 7.2m,
            PlanAdherencePercent = 82,
            BristolStoolType = 4,
            Symptoms = "Sin molestias digestivas"
        });

        db.FoodItems.AddRange(
            DemoFood("EC-DEMO-001", "Aguacate", "Grasas", 50, "¼ unidad mediana", 80, 1, 4, 7.4m, 3.4m, 3),
            DemoFood("EC-DEMO-002", "Arroz integral cocido", "Cereales", 100, "½ taza", 123, 2.7m, 25.6m, 1m, 1.6m, 4),
            DemoFood("EC-DEMO-003", "Lenteja cocida", "Leguminosas", 100, "½ taza", 116, 9m, 20m, 0.4m, 7.9m, 2),
            DemoFood("EC-DEMO-004", "Pechuga de pollo cocida", "Proteínas", 90, "1 filete pequeño", 149, 28m, 0, 3.2m, 0, 67),
            DemoFood("EC-DEMO-005", "Plátano maduro", "Frutas", 100, "½ unidad", 122, 1.3m, 32m, 0.4m, 2.3m, 4),
            DemoFood("EC-DEMO-006", "Brócoli cocido", "Verduras", 100, "1 taza", 35, 2.4m, 7.2m, 0.4m, 3.3m, 41));

        await db.SaveChangesAsync(cancellationToken);
    }

    private static FoodItem DemoFood(string code, string name, string group, decimal grams, string measure,
        decimal kcal, decimal protein, decimal carbs, decimal fat, decimal fiber, decimal sodium) => new()
        {
            SourceCode = code,
            Source = FoodCatalogSource.EcuadorDemo,
            Name = name,
            Group = group,
            PortionGrams = grams,
            HouseholdMeasure = measure,
            EnergyKcal = kcal,
            ProteinG = protein,
            CarbohydrateG = carbs,
            FatG = fat,
            FiberG = fiber,
            SodiumMg = sodium,
            SourceEdition = "Datos demostrativos — no usar clínicamente",
            SourceReference = "Muestra ficticia para validar la interfaz; reemplazar mediante importación autorizada."
        };

    private static ApplicationUser CreateUser(string fullName, string email, string role, string password)
    {
        var credentials = PasswordHasher.Hash(password);
        return new ApplicationUser
        {
            ClinicId = DemoClinicId,
            FullName = fullName,
            Email = email,
            PasswordHash = credentials.Hash,
            PasswordSalt = credentials.Salt,
            Role = role,
            MustChangePassword = true
        };
    }

    private static async Task EnsureDemoAccountsAsync(
        NutriVidaDbContext db,
        CancellationToken cancellationToken)
    {
        const string demoPassword = "NutriVida2026#";
        var definitions = new[]
        {
            new { FullName = "Administración NutriVida", Email = "admin@nutrivida.local", Role = "ClinicAdmin" },
            new { FullName = "Dra. Valeria Ortiz", Email = "nutricionista@nutrivida.local", Role = "Nutritionist" }
        };

        foreach (var definition in definitions)
        {
            var user = await db.ApplicationUsers.SingleOrDefaultAsync(
                x => x.Email == definition.Email, cancellationToken);
            if (user is null)
            {
                user = CreateUser(definition.FullName, definition.Email, definition.Role, demoPassword);
                db.ApplicationUsers.Add(user);
            }
            var credentials = PasswordHasher.Hash(demoPassword);
            user.ClinicId = DemoClinicId;
            user.FullName = definition.FullName;
            user.Role = definition.Role;
            user.PasswordHash = credentials.Hash;
            user.PasswordSalt = credentials.Salt;
            user.IsActive = true;
            user.IsArchived = false;
            user.MustChangePassword = false;
        }
        await db.SaveChangesAsync(cancellationToken);
    }

    private static async Task EnsureQuickTemplatesAsync(
        NutriVidaDbContext db,
        CancellationToken cancellationToken)
    {
        var existingScopes = await db.QuickTemplates
            .Where(x => x.ClinicId == DemoClinicId && !x.IsArchived)
            .Select(x => x.Scope)
            .Distinct()
            .ToListAsync(cancellationToken);
        var templates = new List<QuickTemplate>();

        if (!existingScopes.Contains(QuickTemplateScope.Assessment))
        {
            templates.AddRange(
                DemoTemplate(QuickTemplateScope.Assessment, "Primera consulta", "Entrevista", "Historia integral",
                    "Ordena la ingesta, los horarios y los antecedentes principales sin completar mediciones.",
                    new()
                    {
                        ["dailyIntake"] = "Desayuno:\nMedia mañana:\nAlmuerzo:\nMedia tarde:\nCena:\nAgua y bebidas:\nSuplementos:",
                        ["eatingSchedule"] = "Desayuno: __:__\nMedia mañana: __:__\nAlmuerzo: __:__\nMedia tarde: __:__\nCena: __:__",
                        ["allergies"] = "Confirmadas:\nReacción:\nFuente de confirmación:",
                        ["intolerances"] = "Alimento o preparación:\nSíntoma referido:\nFrecuencia y contexto:",
                        ["clinicalNotes"] = "Antecedentes relevantes:\nMedicamentos y suplementos:\nSeñales de alarma:\nPreferencias y presupuesto:\nAcuerdos de la consulta:"
                    }),
                DemoTemplate(QuickTemplateScope.Assessment, "Control de peso", "Objetivo", "Entrevista de control de peso",
                    "Guía la entrevista sobre historia del peso, apetito, barreras y recursos.",
                    new()
                    {
                        ["dailyIntake"] = "Desayuno:\nMedia mañana:\nAlmuerzo:\nMedia tarde:\nCena:\nPicoteos:\nAgua y bebidas:",
                        ["eatingSchedule"] = "Días laborables:\nFin de semana:\nComidas fuera de casa:\nAyunos o periodos largos sin comer:",
                        ["clinicalNotes"] = "Historia del peso:\nIntentos previos:\nHambre y saciedad:\nBarreras del entorno:\nRecursos y presupuesto:\nObjetivo acordado y plazo de revisión:"
                    }),
                DemoTemplate(QuickTemplateScope.Assessment, "Salud digestiva", "Condición clínica", "Entrevista digestiva",
                    "Estructura síntomas, relación con alimentos y criterios de seguimiento.",
                    new()
                    {
                        ["intolerances"] = "Alimento o preparación sospechada:\nCantidad aproximada:\nSíntoma y tiempo de aparición:\nFrecuencia:",
                        ["clinicalNotes"] = "Inicio y duración de síntomas:\nRelación con alimentos:\nHidratación:\nMedicamentos o suplementos:\nSeñales de alarma y derivación:\nSeguimiento acordado:"
                    }));
        }

        if (!existingScopes.Contains(QuickTemplateScope.FollowUp))
        {
            templates.AddRange(
                DemoTemplate(QuickTemplateScope.FollowUp, "Control habitual", "Seguimiento", "Revisión periódica",
                    "Ordena cambios, logros, barreras y el próximo acuerdo.",
                    new() { ["professionalNotes"] = "Cambios desde el último control:\nLogros observados:\nBarreras referidas:\nAjuste acordado:\nFecha o criterio de revisión:" }),
                DemoTemplate(QuickTemplateScope.FollowUp, "Adherencia y barreras", "Seguimiento", "Analizar adherencia",
                    "Explora tiempo, acceso, costo y comidas con mayor dificultad.",
                    new() { ["professionalNotes"] = "Factores que facilitaron el plan:\nBarreras de tiempo, acceso o costo:\nComidas con mayor dificultad:\nSolución acordada:\nApoyo requerido:" }),
                DemoTemplate(QuickTemplateScope.FollowUp, "Síntomas digestivos", "Condición clínica", "Evolución digestiva",
                    "Registra evolución, relación con comidas y posibles señales de alarma.",
                    new() { ["professionalNotes"] = "Síntomas y frecuencia:\nRelación con comidas:\nHidratación y tránsito:\nCambios recientes:\nSeñales de alarma o derivación:\nAcuerdo de seguimiento:" }));
        }

        if (!existingScopes.Contains(QuickTemplateScope.MenuPlan))
        {
            templates.AddRange(
                DemoTemplate(QuickTemplateScope.MenuPlan, "Control de peso — base personalizable", "Objetivo", "Control de peso",
                    "Punto de partida para organizar comidas, porciones y seguimiento sin fijar una prescripción automática.",
                    new()
                    {
                        ["planName"] = "Plan personalizado de control de peso",
                        ["professionalNotes"] = "Personalizar con evaluación, requerimiento energético validado, preferencias, alergias, presupuesto y objetivo acordado. Revisar porciones antes de aprobar."
                    }),
                DemoTemplate(QuickTemplateScope.MenuPlan, "Salud digestiva — revisión inicial", "Condición clínica", "Bienestar digestivo",
                    "Guía de revisión para adaptar el menú según síntomas, tolerancia, tránsito intestinal e hidratación.",
                    new()
                    {
                        ["planName"] = "Plan personalizado de bienestar digestivo",
                        ["professionalNotes"] = "Revisar síntomas, diagnóstico médico cuando exista, alergias, intolerancias, Bristol, hidratación y tolerancia individual. No aplicar restricciones sin valoración profesional."
                    }),
                DemoTemplate(QuickTemplateScope.MenuPlan, "Alimentación económica — mercado local", "Presupuesto", "Reducir costo del menú",
                    "Base para priorizar alimentos disponibles, preparaciones rendidoras y sustituciones equivalentes.",
                    new()
                    {
                        ["planName"] = "Plan económico personalizado",
                        ["professionalNotes"] = "Confirmar presupuesto, acceso a alimentos, precios locales y tiempo para cocinar. Usar platos guardados con fecha de costo vigente y validar equivalencias nutricionales."
                    }));
        }

        if (!existingScopes.Contains(QuickTemplateScope.Communication))
        {
            templates.AddRange(
                DemoTemplate(QuickTemplateScope.Communication, "Plan listo", "Entrega", "Compartir plan",
                    "Avisa que el plan está disponible y ofrece resolver dudas.",
                    new()
                    {
                        ["subject"] = "Tu plan nutricional está listo",
                        ["message"] = "Hola, tu plan nutricional ya está disponible. Revísalo desde el enlace seguro y escríbenos si necesitas aclarar alguna indicación."
                    }),
                DemoTemplate(QuickTemplateScope.Communication, "Recordatorio de seguimiento", "Seguimiento", "Recordar control",
                    "Recuerda el próximo control sin incluir datos clínicos sensibles.",
                    new()
                    {
                        ["subject"] = "Recordatorio de seguimiento nutricional",
                        ["message"] = "Hola, te recordamos que es momento de registrar tu seguimiento nutricional. Responde por este canal si necesitas coordinar una nueva fecha."
                    }),
                DemoTemplate(QuickTemplateScope.Communication, "Actualización de cita", "Atención", "Confirmar cita",
                    "Solicita confirmar o reprogramar una atención.",
                    new()
                    {
                        ["subject"] = "Actualización de tu cita nutricional",
                        ["message"] = "Hola, necesitamos confirmar la fecha de tu próxima atención nutricional. Por favor responde a este mensaje para coordinar el horario."
                    }));
        }

        if (templates.Count > 0)
        {
            db.QuickTemplates.AddRange(templates);
            await db.SaveChangesAsync(cancellationToken);
        }
        await CompleteExampleTemplatesAsync(db, cancellationToken);
    }

    private static readonly Dictionary<string, Dictionary<string, string>> ExampleTemplateFields = new()
    {
        ["Primera consulta"] = new()
        {
            ["medicalHistory"] = "Enfermedades actuales:\nCirugías:\nHospitalizaciones:",
            ["familyHistory"] = "Diabetes:\nHipertensión:\nDislipidemia:\nCáncer:",
            ["medications"] = "Medicamento y dosis:",
            ["supplements"] = "Suplemento y frecuencia:",
            ["labResults"] = "Glucosa:\nPerfil lipídico:\nHemoglobina:\nFecha:",
            ["sleepQuality"] = "Buena",
            ["exerciseType"] = "Tipo de actividad e intensidad:",
            ["exerciseSchedule"] = "Días y horario:",
            ["bowelFrequency"] = "Veces por día o semana:"
        },
        ["Control de peso"] = new()
        {
            ["medicalHistory"] = "Historia del peso y condiciones relacionadas:",
            ["medications"] = "Medicamentos que afectan el peso o el apetito:",
            ["labResults"] = "Glucosa:\nPerfil lipídico:\nFecha:",
            ["exerciseType"] = "Tipo de actividad e intensidad:",
            ["problemCode"] = "NI-1.3",
            ["problemStatement"] = "Ingesta excesiva de energía",
            ["etiology"] = "Relacionado con:",
            ["signsAndSymptoms"] = "Evidenciado por:"
        },
        ["Salud digestiva"] = new()
        {
            ["medicalHistory"] = "Diagnósticos digestivos:",
            ["medications"] = "Medicamentos digestivos:",
            ["bowelFrequency"] = "Veces por día o semana:",
            ["problemCode"] = "NC-1.4",
            ["problemStatement"] = "Función gastrointestinal alterada",
            ["etiology"] = "Relacionado con:",
            ["signsAndSymptoms"] = "Evidenciado por:"
        },
        ["Control habitual"] = new()
        {
            ["symptoms"] = "Hambre:\nDigestión:\nEnergía:\nBarreras:",
            ["adjustments"] = "Porciones:\nHorarios:\nActividad:"
        },
        ["Adherencia y barreras"] = new()
        {
            ["symptoms"] = "Dificultades referidas:",
            ["adjustments"] = "Cambios acordados:"
        },
        ["Síntomas digestivos"] = new()
        {
            ["symptoms"] = "Síntoma, frecuencia y relación con comidas:",
            ["adjustments"] = "Alimentos a revisar:\nHidratación:"
        }
    };

    private static async Task CompleteExampleTemplatesAsync(NutriVidaDbContext db, CancellationToken cancellationToken)
    {
        var names = ExampleTemplateFields.Keys.ToArray();
        var rows = await db.QuickTemplates
            .Where(x => x.ClinicId == DemoClinicId && !x.IsArchived && names.Contains(x.Name))
            .ToListAsync(cancellationToken);
        var changed = false;
        foreach (var row in rows)
        {
            var values = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(
                string.IsNullOrWhiteSpace(row.ValuesJson) ? "{}" : row.ValuesJson) ?? [];
            foreach (var field in ExampleTemplateFields[row.Name])
            {
                if (!values.ContainsKey(field.Key))
                {
                    values[field.Key] = field.Value;
                    changed = true;
                }
            }
            row.ValuesJson = System.Text.Json.JsonSerializer.Serialize(values);
        }
        if (changed) await db.SaveChangesAsync(cancellationToken);
    }

    private static QuickTemplate DemoTemplate(
        QuickTemplateScope scope,
        string name,
        string category,
        string objective,
        string summary,
        Dictionary<string, string> values) => new()
        {
            ClinicId = DemoClinicId,
            Scope = scope,
            Name = name,
            Category = category,
            Objective = objective,
            Summary = summary,
            ValuesJson = JsonSerializer.Serialize(values),
            PlanName = values.GetValueOrDefault("planName", string.Empty),
            ProfessionalNotes = values.GetValueOrDefault("professionalNotes", string.Empty)
        };
}
