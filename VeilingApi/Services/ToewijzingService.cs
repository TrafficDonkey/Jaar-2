// ToewijzingService.cs
// Service voor CRUD-operaties op Toewijzing en mapping naar DTO's via EF Core.
// Daarnaast bevat deze service methodes om:
// - alleen de toewijzingen terug te geven van kavels waarvan de onderliggende
//   Aanmelding aan een bepaalde gebruiker toebehoort (aanvoerder).
// - toewijzingen op te halen waarbij een gebruiker koper is.

using Microsoft.EntityFrameworkCore;
using VeilingApi.Data;
using VeilingApi.Models;

namespace VeilingApi.Services;

public class ToewijzingService : IToewijzingService
{
    private readonly AppDbContext _db;
    public ToewijzingService(AppDbContext db) => _db = db;

    private static ToewijzingDto MapToDto(Toewijzing t) => new()
    {
        ToewijzingId    = t.ToewijzingId,
        KoperId         = t.KoperId,
        KoperNaam       = t.Koper != null ? t.Koper.Naam : string.Empty,
        VeilingProductId= t.VeilingProductId,
        Aantal          = t.Aantal,
        EindPrijs       = t.EindPrijs,
        Datum           = t.Datum
    };

    // ────────────────────────────── READ: alle toewijzingen ──────────────────────────────

    public async Task<List<ToewijzingDto>> GetAllAsync()
    {
        return await _db.Toewijzingen
            .Include(t => t.Koper)
            .Include(t => t.VeilingProduct)
            .OrderByDescending(t => t.Datum)
            .Select(t => MapToDto(t))
            .ToListAsync();
    }

    // ────────────────────────────── READ: detail ──────────────────────────────

    public async Task<ToewijzingDto?> GetByIdAsync(int id)
    {
        return await _db.Toewijzingen
            .Include(t => t.Koper)
            .Include(t => t.VeilingProduct)
            .Where(t => t.ToewijzingId == id)
            .Select(t => MapToDto(t))
            .FirstOrDefaultAsync();
    }

    // ────────────────────────────── READ: toewijzingen voor aanvoerder ────────
    // gebruikerId = GebruikerId van de eigenaar van de Aanmelding.

    public async Task<List<ToewijzingDto>> GetForAanvoerderAsync(int gebruikerId)
    {
        // We gaan ervan uit dat een Toewijzing altijd een VeilingProduct + Aanmelding heeft.
        // Met de ! vertellen we de compiler dat we dat zeker weten (anders CS8602 warning).
        return await _db.Toewijzingen
            .Include(t => t.Koper)
            .Include(t => t.VeilingProduct)
                .ThenInclude(vp => vp!.Aanmelding)
            .Where(t => t.VeilingProduct != null
                && t.VeilingProduct.Aanmelding != null
                && t.VeilingProduct.Aanmelding.GebruikerId == gebruikerId)
            .OrderByDescending(t => t.Datum)
            .Select(t => MapToDto(t))
            .ToListAsync();
    }

    // ────────────────────────────── READ: toewijzingen waar gebruiker koper is ───────────

    public async Task<List<ToewijzingDto>> GetByGebruikerAsync(int gebruikerId)
    {
        return await _db.Toewijzingen
            .Include(t => t.Koper)
            .Include(t => t.VeilingProduct)
            .Where(t => t.KoperId == gebruikerId)
            .OrderByDescending(t => t.Datum)
            .Select(t => MapToDto(t))
            .ToListAsync();
    }

    // ────────────────────────────── CREATE ──────────────────────────────

    public async Task<ToewijzingDto> CreateAsync(CreateToewijzingDto dto)
    {
        var buyerExists = await _db.Gebruikers.AnyAsync(g => g.GebruikerId == dto.KoperId);
        if (!buyerExists) throw new InvalidOperationException("Koper bestaat niet.");

        var product = await _db.VeilingProducten
            .Include(vp => vp.Aanmelding)
            .Include(vp => vp.Toewijzingen)
            .FirstOrDefaultAsync(vp => vp.VeilingProductId == dto.VeilingProductId);
        if (product is null) throw new InvalidOperationException("Veilingproduct bestaat niet.");

        var totalQty = product.Aanmelding?.Hoeveelheid ?? 0;
        var soldQty = product.Toewijzingen?.Sum(t => t.Aantal > 0 ? t.Aantal : 1) ?? 0;
        var remainingQty = Math.Max(0, totalQty - soldQty);

        if (remainingQty <= 0)
            throw new InvalidOperationException("Dit product is uitverkocht.");

        if (dto.Aantal > remainingQty)
            throw new InvalidOperationException(
                $"Er zijn nog maar {remainingQty} stuks beschikbaar voor dit product."
            );

        var t = new Toewijzing
        {
            KoperId         = dto.KoperId,
            VeilingProductId= dto.VeilingProductId,
            Aantal          = dto.Aantal,
            EindPrijs       = dto.EindPrijs,
            Datum           = dto.Datum
        };

        _db.Toewijzingen.Add(t);
        await _db.SaveChangesAsync();

        var created = await _db.Toewijzingen
            .Include(x => x.Koper)
            .FirstAsync(x => x.ToewijzingId == t.ToewijzingId);

        return MapToDto(created);
    }

    // ────────────────────────────── DELETE ──────────────────────────────

    public async Task<bool> DeleteAsync(int id)
    {
        var t = await _db.Toewijzingen.FindAsync(id);
        if (t == null) return false;

        _db.Toewijzingen.Remove(t);
        await _db.SaveChangesAsync();
        return true;
    }
}
