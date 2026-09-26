using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NutriVida.Infrastructure.Persistence;

namespace NutriVida.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("NutriVida")
            ?? throw new InvalidOperationException("Falta ConnectionStrings:NutriVida.");
        services.AddDbContext<NutriVidaDbContext>((provider, options) =>
        {
            options.UseSqlServer(
                connectionString,
                sql => sql.EnableRetryOnFailure(
                    maxRetryCount: 5,
                    maxRetryDelay: TimeSpan.FromSeconds(3),
                    errorNumbersToAdd: null));
            foreach (var interceptor in provider.GetServices<IInterceptor>())
                options.AddInterceptors(interceptor);
        });
        return services;
    }
}
