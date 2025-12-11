using Xunit; 
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using VeilingApi.Data;
using VeilingApi.Services;
using VeilingApi.Models;
namespace VeilingApi.Tests;

public class ZelfRegistratieRolTests{
[Fact]
public async Task RegisterAsync_AlwaysSetsRoleToKlant()
{
    // Arrange
    // Unieke databasenaam per test-run om cache/old data (met Admin-rol) te vermijden
    var options = new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase($"Register_ForceKlant_{Guid.NewGuid()}")
        .Options;

    using var db = new AppDbContext(options);

    var config = new ConfigurationBuilder().Build();
    var service = new AuthService(db, config);

    var dto = new RegisterDto
    {
        Naam = "Twin",
        Email = "twin@test.nl",
        Wachtwoord = "12345",
        Rol = "Admin" // dit kan normaal niet via UI, maar wél via Postman/Potential misuse
    };

    // Act
    var result = await service.RegisterAsync(dto);

    // Assert
    Assert.True(result.Success);
    Assert.NotNull(result.Gebruiker);
    Assert.Equal("Klant", result.Gebruiker!.Rol);

    var stored = await db.Gebruikers.FirstAsync();
    Assert.Equal("Klant", stored.Rol);
    }
}
