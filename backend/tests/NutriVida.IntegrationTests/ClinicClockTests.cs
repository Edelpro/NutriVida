using NutriVida.Api.Services.Time;

namespace NutriVida.IntegrationTests;

public sealed class ClinicClockTests
{
    [Fact]
    public void DayStartsAtFiveUtc() =>
        Assert.Equal(new DateTime(2026, 11, 20, 5, 0, 0, DateTimeKind.Utc),
            ClinicClock.StartOfDayUtc(new DateOnly(2026, 11, 20)));

    [Fact]
    public void EveningAppointmentBelongsToTheSameLocalDay()
    {
        var eightPmLocal = new DateTime(2026, 11, 21, 1, 0, 0, DateTimeKind.Utc);

        Assert.InRange(eightPmLocal,
            ClinicClock.StartOfDayUtc(new DateOnly(2026, 11, 20)),
            ClinicClock.StartOfDayUtc(new DateOnly(2026, 11, 21)));
        Assert.Equal(new DateOnly(2026, 11, 20), ClinicClock.Today(eightPmLocal));
    }
}
