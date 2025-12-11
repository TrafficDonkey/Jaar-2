using Xunit;
using Moq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using VeilingApi.Data;
using VeilingApi.Services;
using VeilingApi.Models;
namespace VeilingApi.Tests;

public class EmailExistsTests
{
    [Fact]
    public async Task RegisterAsync_ReturnsFalse_WhenEmailAlreadyExists()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase("Register_EmailExists")
            .Options;

        using var db = new AppDbContext(options);

        // Zet een bestaande gebruiker in de database
        db.Gebruikers.Add(new Gebruiker
        {
            Naam = "Bestaand",
            Email = "twin@test.nl",
            Rol = "Klant",
            WachtwoordHash = "hash"
        });
        await db.SaveChangesAsync();

        // Maak een mock voor IConfiguration
        var configMock = new Mock<IConfiguration>();

        var service = new AuthService(db, configMock.Object);

        var dto = new RegisterDto
        {
            Naam = "Twin",
            Email = "twin@test.nl",   // <-- zelfde email → moet falen
            Wachtwoord = "12345",
            Rol = "Klant"
        };

        // Act
        var result = await service.RegisterAsync(dto);

        // Assert
        Assert.False(result.Success);
        Assert.Null(result.Gebruiker);
        Assert.NotNull(result.ErrorMessage);

        // DB moet nog steeds maar 1 gebruiker hebben
        Assert.Single(db.Gebruikers);
    }

}