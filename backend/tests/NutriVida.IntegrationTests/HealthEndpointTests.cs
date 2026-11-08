using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using System.Net.Http.Json;

namespace NutriVida.IntegrationTests;

public sealed class HealthEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    public HealthEndpointTests(WebApplicationFactory<Program> factory) =>
        _client = factory.WithWebHostBuilder(builder =>
            builder.UseSetting("SkipDatabaseInitialization", "true")).CreateClient();

    [Fact]
    public async Task Health_ReturnsServiceStatus()
    {
        using var response = await _client.GetAsync("/health");
        var body = await response.Content.ReadAsStringAsync();
        response.EnsureSuccessStatusCode();
        Assert.Contains("NutriVida.Api", body);
        Assert.Contains("healthy", body);
    }

    [Fact]
    public async Task Users_RejectsAnonymousClient()
    {
        using var response = await _client.GetAsync("/api/users");

        Assert.Equal(System.Net.HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_RejectsAnonymousClient()
    {
        using var response = await _client.PostAsJsonAsync("/api/auth/change-password", new
        {
            currentPassword = "temporary-password",
            newPassword = "different-secure-password"
        });

        Assert.Equal(System.Net.HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Dishes_RejectsAnonymousClient()
    {
        using var response = await _client.GetAsync("/api/dishes");

        Assert.Equal(System.Net.HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task QuickTemplates_RejectsAnonymousClient()
    {
        using var response = await _client.GetAsync("/api/quick-templates");

        Assert.Equal(System.Net.HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task AccessRequest_InvalidAnonymousSubmission_ReturnsValidationProblem()
    {
        using var response = await _client.PostAsJsonAsync("/api/access-requests", new
        {
            fullName = "A",
            email = "correo-invalido"
        });

        Assert.Equal(System.Net.HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AccessRequest_List_RejectsAnonymousClient()
    {
        using var response = await _client.GetAsync("/api/access-requests");

        Assert.Equal(System.Net.HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData("/api/audit")]
    [InlineData("/api/consultations/by-patient/67259895-e69d-4478-b1e0-0b30df36ae40")]
    [InlineData("/api/reports/clinical-summary.pdf?patientId=67259895-e69d-4478-b1e0-0b30df36ae40")]
    [InlineData("/api/foods/imports")]
    [InlineData("/api/foods/import-template")]
    public async Task SensitiveEndpoints_RejectAnonymousClient(string path)
    {
        using var response = await _client.GetAsync(path);
        Assert.Equal(System.Net.HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
