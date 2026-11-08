namespace NutriVida.Api.Services.Time;

/// <summary>Calendario de la consulta: los días de agenda se cuentan en hora de Ecuador.</summary>
public static class ClinicClock
{
    private static readonly TimeZoneInfo Zone = ResolveZone();

    public static DateOnly Today(DateTime? utcNow = null) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(utcNow ?? DateTime.UtcNow, Zone));

    public static DateTime StartOfDayUtc(DateOnly day) =>
        TimeZoneInfo.ConvertTimeToUtc(day.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified), Zone);

    private static TimeZoneInfo ResolveZone()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById("America/Guayaquil");
        }
        catch (Exception exception) when (exception is TimeZoneNotFoundException or InvalidTimeZoneException)
        {
            // Ecuador no aplica horario de verano; sirve en servidores sin base de zonas horarias.
            return TimeZoneInfo.CreateCustomTimeZone("America/Guayaquil", TimeSpan.FromHours(-5), "Ecuador", "Ecuador");
        }
    }
}
