using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using VeilingApi.Data;
using VeilingApi.Models;
using VeilingApi.Services;
using Xunit;

namespace VeilingApi.Tests;

public class ZelfRegistratieRolTests
{
    [Fact]
    public async Task RegisterAsync_AlwaysSetsRoleToKlant()
    {
        // Arrange: InMemory EF Core => onafhankelijk van productiedatabase.
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"Register_ForceKlant_{Guid.NewGuid()}")
            .Options;

        await using var db = new AppDbContext(options);

        var config = new ConfigurationBuilder().Build();
        var service = new AuthService(db, config);

        // Act: probeer via "misbruik" de rol op Admin te zetten.
        var result = await service.RegisterAsync(new RegisterDto
        {
            Naam = "Twin",
            Email = "twin@test.nl",
            Wachtwoord = "Test12345",
            TelefoonLand = "NL",
            TelefoonNummer = "0612345678",
            Rol = "Admin"
        });

        // Assert: backend forceert rol naar "Klant".
        Assert.True(result.Success);
        Assert.NotNull(result.Gebruiker);
        Assert.Equal("Klant", result.Gebruiker!.Rol);

        var stored = await db.Gebruikers.FirstAsync();
        Assert.Equal("Klant", stored.Rol);
    }
}

