using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using VeilingApi.Data;
using VeilingApi.Models;
using VeilingApi.Services;
using Xunit;

namespace VeilingApi.Tests;

public class AanmeldingServiceTests  //dotnet test --filter ClassName=AanmeldingServiceTests

{

    // Helper om een nieuwe InMemory AppDbContext te maken
    private AppDbContext CreateInMemoryDb(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;

        return new AppDbContext(options);
    }

    [Fact]
    public async Task UpdateAsync_ReturnsFalse_WhenAanmeldingDoesNotExist()
    {
        // Test: Update geeft false terug als de aanmelding niet bestaat.
        // Arrange
        using var db = CreateInMemoryDb("Update_NoEntity");
        var service = new AanmeldingService(db);

        var dto = new UpdateAanmeldingDto
        {
            AanmeldingId = 999,            // bestaat niet
            FotoUrl = "test.jpg",
            ProductBeschrijving = "Test",
            Hoeveelheid = 10,
            MinimumPrijs = 5,
            GewensteKlokLocatie = "Aalsmeer",
            GewensteVeilDatum = DateTime.Today,
            GebruikerId = 1
        };

        // Act
        var result = await service.UpdateAsync(dto);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task UpdateAsync_ReturnsTrue_AndUpdatesFields_WhenAanmeldingExists()
    {
        // Test: Update werkt en alle velden worden aangepast bij bestaande aanmelding.
        // Arrange
        using var db = CreateInMemoryDb("Update_Exists");

        // Eerst een aanmelding in de "database" zetten
        var existing = new Aanmelding
        {
            FotoUrl = "old.jpg",
            ProductBeschrijving = "Oud",
            Hoeveelheid = 1,
            MinimumPrijs = 2,
            GewensteKlokLocatie = "Naaldwijk",
            GewensteVeilDatum = DateTime.Today.AddDays(1),
            GebruikerId = 1
        };

        db.Aanmeldingen.Add(existing);
        await db.SaveChangesAsync();

        var service = new AanmeldingService(db);

        var dto = new UpdateAanmeldingDto
        {
            AanmeldingId = existing.AanmeldingId,
            FotoUrl = "new.jpg",
            ProductBeschrijving = "Nieuw product",
            Hoeveelheid = 5,
            MinimumPrijs = 10,
            GewensteKlokLocatie = "Aalsmeer",
            GewensteVeilDatum = DateTime.Today.AddDays(2),
            GebruikerId = 2
        };

        // Act
        var result = await service.UpdateAsync(dto);

        // Assert
        Assert.True(result);

        var updated = await db.Aanmeldingen.FindAsync(existing.AanmeldingId);
        Assert.NotNull(updated);
        Assert.Equal("new.jpg", updated!.FotoUrl);
        Assert.Equal("Nieuw product", updated.ProductBeschrijving);
        Assert.Equal(5, updated.Hoeveelheid);
        Assert.Equal(10, updated.MinimumPrijs);
        Assert.Equal("Aalsmeer", updated.GewensteKlokLocatie);
        Assert.Equal(DateTime.Today.AddDays(2), updated.GewensteVeilDatum);
        Assert.Equal(2, updated.GebruikerId);
    }

    [Fact]
    public async Task CreateAsync_Throws_WhenGebruikerMissing()
    {
        // Test: Create faalt als de gekoppelde gebruiker niet bestaat.
        using var db = CreateInMemoryDb("Create_NoUser");
        var service = new AanmeldingService(db);

        var dto = new CreateAanmeldingDto
        {
            FotoUrl = "test.jpg",
            ProductBeschrijving = "Test",
            Hoeveelheid = 10,
            MinimumPrijs = 5,
            GewensteKlokLocatie = "Aalsmeer",
            GewensteVeilDatum = DateTime.Today,
            GebruikerId = 999,
            Categorie = "Snijbloemen"
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateAsync(dto));
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsNull_WhenNotFound()
    {
        // Test: GetById geeft null terug als de aanmelding niet bestaat.
        using var db = CreateInMemoryDb("GetById_None");
        var service = new AanmeldingService(db);

        var result = await service.GetByIdAsync(123);

        Assert.Null(result);
    }

    [Fact]
    public async Task DeleteAsync_ReturnsFalse_WhenNotFound()
    {
        // Test: Delete geeft false terug als de aanmelding niet bestaat.
        using var db = CreateInMemoryDb("Delete_None");
        var service = new AanmeldingService(db);

        var ok = await service.DeleteAsync(123);

        Assert.False(ok);
    }
}
