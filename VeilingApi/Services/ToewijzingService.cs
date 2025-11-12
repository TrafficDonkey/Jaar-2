// ToewijzingService.cs
// Service voor CRUD-operaties op Toewijzing en mapping naar DTO's via EF Core.
// Behandelt het ophalen, aanmaken en verwijderen van toewijzingen (eindverkopen) binnen veilingen.

using Microsoft.EntityFrameworkCore;
using VeilingApi.Data;
using VeilingApi.Models;

namespace VeilingApi.Services;

public class ToewijzingService : IToewijzingService
{
    private readonly AppDbContext _db;

    // Constructor: injecteert de databasecontext
    public ToewijzingService(AppDbContext db) => _db = db;

    // ────────────────────────────── READ: alle toewijzingen ──────────────────────────────
    // Haal alle toewijzingen op inclusief koper- en productinformatie
    public async Task<List<ToewijzingDto>> GetAllAsync()
    {
        return await _db.Toewijzingen
            .Include(t => t.Koper)
            .Include(t => t.VeilingProduct)
            .Select(t => new ToewijzingDto
            {
                ToewijzingId = t.ToewijzingId,
                KoperId = t.KoperId,
                KoperNaam = t.Koper!.Naam,
                VeilingProductId = t.VeilingProductId,
                EindPrijs = t.EindPrijs,
                Datum = t.Datum
            })
            .ToListAsync();
    }

    // ────────────────────────────── READ: detail ──────────────────────────────
    // Haal één toewijzing op via ID inclusief koperinformatie
    public async Task<ToewijzingDto?> GetByIdAsync(int id)
    {
        return await _db.Toewijzingen
            .Include(t => t.Koper)
            .Where(t => t.ToewijzingId == id)
            .Select(t => new ToewijzingDto
            {
                ToewijzingId = t.ToewijzingId,
                KoperId = t.KoperId,
                KoperNaam = t.Koper!.Naam,
                VeilingProductId = t.VeilingProductId,
                EindPrijs = t.EindPrijs,
                Datum = t.Datum
            })
            .FirstOrDefaultAsync();
    }

    // ────────────────────────────── CREATE ──────────────────────────────
    // Maak een nieuwe toewijzing aan; valideer koper en product
    public async Task<ToewijzingDto> CreateAsync(CreateToewijzingDto dto)
    {
        var buyerExists = await _db.Gebruikers.AnyAsync(g => g.GebruikerId == dto.KoperId);
        if (!buyerExists)
            throw new InvalidOperationException("Koper bestaat niet.");

        var productExists = await _db.VeilingProducts.AnyAsync(vp => vp.VeilingProductId == dto.VeilingProductId);
        if (!productExists)
            throw new InvalidOperationException("Veilingproduct bestaat niet.");

        var t = new Toewijzing
        {
            KoperId = dto.KoperId,
            VeilingProductId = dto.VeilingProductId,
            EindPrijs = dto.EindPrijs,
            Datum = dto.Datum
        };

        _db.Toewijzingen.Add(t);
        await _db.SaveChangesAsync();

        // Haal de aangemaakte toewijzing opnieuw op inclusief koper
        var created = await _db.Toewijzingen.Include(x => x.Koper)
            .FirstAsync(x => x.ToewijzingId == t.ToewijzingId);

        return new ToewijzingDto
        {
            ToewijzingId = created.ToewijzingId,
            KoperId = created.KoperId,
            KoperNaam = created.Koper!.Naam,
            VeilingProductId = created.VeilingProductId,
            EindPrijs = created.EindPrijs,
            Datum = created.Datum
        };
    }

    // ────────────────────────────── DELETE ──────────────────────────────
    // Verwijder een toewijzing via ID; retourneer false als niet gevonden
    public async Task<bool> DeleteAsync(int id)
    {
        var t = await _db.Toewijzingen.FindAsync(id);
        if (t == null) return false;

        _db.Toewijzingen.Remove(t);
        await _db.SaveChangesAsync();
        return true;
    }
}
