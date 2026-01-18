using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using VeilingApi.Data;
using VeilingApi.Models;
using VeilingApi.Services;
using Xunit;

namespace VeilingApi.Tests;

public class VeilingProductServiceTests
{
    private static AppDbContext CreateInMemoryDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"VeilingProduct_{Guid.NewGuid()}")
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task CreateAsync_Throws_WhenVeilingDoesNotExist()
    {
        // Test: Create faalt als de veiling niet bestaat.
        using var db = CreateInMemoryDb();
        var service = new VeilingProductService(db);

        var dto = new CreateVeilingProductDto
        {
            VeilingId = 999,
            AanmeldingId = 1,
            VolgordeVeiling = 1
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateAsync(dto));
    }

    [Fact]
    public async Task CreateAsync_Throws_WhenAanmeldingDoesNotExist()
    {
        // Test: Create faalt als de aanmelding niet bestaat.
        using var db = CreateInMemoryDb();
        db.Veilingen.Add(new Veiling { Naam = "Test", Status = "Actief", StartTijd = DateTime.UtcNow, GestartDoorId = 1 });
        await db.SaveChangesAsync();

        var service = new VeilingProductService(db);

        var dto = new CreateVeilingProductDto
        {
            VeilingId = db.Veilingen.First().VeilingId,
            AanmeldingId = 999,
            VolgordeVeiling = 1
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateAsync(dto));
    }

    [Fact]
    public async Task CreateAsync_ReturnsDto_WhenValid()
    {
        // Test: Create levert DTO terug met juiste velden bij geldige input.
        using var db = CreateInMemoryDb();
        var veiling = new Veiling
        {
            Naam = "Test",
            Status = "Actief",
            StartTijd = DateTime.UtcNow,
            GestartDoorId = 1
        };
        var aanmelding = new Aanmelding
        {
            FotoData = new byte[] { 1 },
            FotoContentType = "image/jpeg",
            FotoFileName = "foto.jpg",
            ProductBeschrijving = "Rozen",
            Hoeveelheid = 10,
            MinimumPrijs = 5,
            GewensteKlokLocatie = "Naaldwijk",
            GewensteVeilDatum = DateTime.UtcNow.Date,
            GebruikerId = 1,
            Categorie = "Snijbloemen"
        };
        db.Veilingen.Add(veiling);
        db.Aanmeldingen.Add(aanmelding);
        await db.SaveChangesAsync();

        var service = new VeilingProductService(db);
        var dto = new CreateVeilingProductDto
        {
            VeilingId = veiling.VeilingId,
            AanmeldingId = aanmelding.AanmeldingId,
            VolgordeVeiling = 1
        };

        var result = await service.CreateAsync(dto);

        Assert.Equal(aanmelding.ProductBeschrijving, result.ProductBeschrijving);
        Assert.Equal(aanmelding.Hoeveelheid, result.Aantal);
        Assert.Equal(aanmelding.MinimumPrijs, result.StartPrijs);
        Assert.Equal(aanmelding.GewensteKlokLocatie, result.Kloklocatie);
    }

    [Fact]
    public async Task UpdateAsync_ReturnsFalse_WhenNotFound()
    {
        // Test: Update geeft false terug als het veilingproduct niet bestaat.
        using var db = CreateInMemoryDb();
        var service = new VeilingProductService(db);

        var dto = new UpdateVeilingProductDto
        {
            VeilingProductId = 999,
            VeilingId = 1,
            AanmeldingId = 1,
            VolgordeVeiling = 1
        };

        var ok = await service.UpdateAsync(dto);

        Assert.False(ok);
    }
}
