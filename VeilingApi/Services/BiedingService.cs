// BiedingService.cs
// Service voor CRUD-operaties op Bieding en mapping naar DTO's via EF Core.
// Behandelt het aanmaken, ophalen en verwijderen van biedingen binnen veilingen.

using Microsoft.EntityFrameworkCore;
using VeilingApi.Data;
using VeilingApi.Models;

namespace VeilingApi.Services;

public class BiedingService : IBiedingService
{
    private readonly AppDbContext _db;

    // Constructor: injecteert de databasecontext
    public BiedingService(AppDbContext db) => _db = db;

    // ────────────────────────────── READ: alle biedingen ──────────────────────────────
    // Haal alle biedingen op inclusief gebruiker en veilingproduct
    public async Task<List<BiedingDto>> GetAllAsync()
    {
        return await _db.Biedingen
            .Include(b => b.Gebruiker)
            .Include(b => b.VeilingProduct)
            .Select(b => new BiedingDto
            {
                BiedingId = b.BiedingId,
                GebruikerId = b.GebruikerId,
                GebruikerNaam = b.Gebruiker!.Naam,
                VeilingProductId = b.VeilingProductId,
                Bedrag = b.Bedrag,
                Tijdstip = b.Tijdstip
            })
            .ToListAsync();
    }

    // ────────────────────────────── READ: detail ──────────────────────────────
    // Haal één bieding op via ID inclusief bijbehorende gebruiker
    public async Task<BiedingDto?> GetByIdAsync(int id)
    {
        return await _db.Biedingen
            .Include(b => b.Gebruiker)
            .Where(b => b.BiedingId == id)
            .Select(b => new BiedingDto
            {
                BiedingId = b.BiedingId,
                GebruikerId = b.GebruikerId,
                GebruikerNaam = b.Gebruiker!.Naam,
                VeilingProductId = b.VeilingProductId,
                Bedrag = b.Bedrag,
                Tijdstip = b.Tijdstip
            })
            .FirstOrDefaultAsync();
    }

    // ────────────────────────────── CREATE ──────────────────────────────
    // Maak een nieuwe bieding aan; valideer of gebruiker en product bestaan
    public async Task<BiedingDto> CreateAsync(CreateBiedingDto dto)
    {
        var userExists = await _db.Gebruikers.AnyAsync(g => g.GebruikerId == dto.GebruikerId);
        if (!userExists)
            throw new InvalidOperationException("Gebruiker bestaat niet.");

        var productExists = await _db.VeilingProducts.AnyAsync(vp => vp.VeilingProductId == dto.VeilingProductId);
        if (!productExists)
            throw new InvalidOperationException("Veilingproduct bestaat niet.");

        var b = new Bieding
        {
            GebruikerId = dto.GebruikerId,
            VeilingProductId = dto.VeilingProductId,
            Bedrag = dto.Bedrag,
            Tijdstip = DateTime.UtcNow
        };

        _db.Biedingen.Add(b);
        await _db.SaveChangesAsync();

        // Haal de nieuwe bieding opnieuw op inclusief gebruiker voor de DTO
        var created = await _db.Biedingen.Include(x => x.Gebruiker)
            .FirstAsync(x => x.BiedingId == b.BiedingId);

        return new BiedingDto
        {
            BiedingId = created.BiedingId,
            GebruikerId = created.GebruikerId,
            GebruikerNaam = created.Gebruiker!.Naam,
            VeilingProductId = created.VeilingProductId,
            Bedrag = created.Bedrag,
            Tijdstip = created.Tijdstip
        };
    }

    // ────────────────────────────── DELETE ──────────────────────────────
    // Verwijder een bieding; retourneer false als niet gevonden
    public async Task<bool> DeleteAsync(int id)
    {
        var b = await _db.Biedingen.FindAsync(id);
        if (b == null) return false;

        _db.Biedingen.Remove(b);
        await _db.SaveChangesAsync();
        return true;
    }
}
