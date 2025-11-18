// AanmeldingService.cs
// Service voor CRUD-operaties op Aanmelding en mapping naar DTO's via EF Core.

using Microsoft.EntityFrameworkCore;
using VeilingApi.Data;
using VeilingApi.Models;

namespace VeilingApi.Services;

public class AanmeldingService : IAanmeldingService
{
    private readonly AppDbContext _db;
    public AanmeldingService(AppDbContext db) => _db = db;

    // ────────────────────────────── READ: alle aanmeldingen ──────────────────────────────
    public async Task<List<AanmeldingDto>> GetAllAsync()
    {
        return await _db.Aanmeldingen
            .Include(a => a.Gebruiker)
            .Select(a => new AanmeldingDto
            {
                AanmeldingId = a.AanmeldingId,
                FotoUrl = a.FotoUrl,
                ProductBeschrijving = a.ProductBeschrijving,
                Hoeveelheid = a.Hoeveelheid,
                MinimumPrijs = a.MinimumPrijs,
                GewensteKlokLocatie = a.GewensteKlokLocatie,
                GewensteVeilDatum = a.GewensteVeilDatum,
                GebruikerId = a.GebruikerId,
                GebruikerNaam = a.Gebruiker != null ? a.Gebruiker.Naam : string.Empty
            })
            .ToListAsync();
    }

    // ────────────────────────────── READ: detail ──────────────────────────────
    public async Task<AanmeldingDto?> GetByIdAsync(int id)
    {
        return await _db.Aanmeldingen
            .Include(a => a.Gebruiker)
            .Where(a => a.AanmeldingId == id)
            .Select(a => new AanmeldingDto
            {
                AanmeldingId = a.AanmeldingId,
                FotoUrl = a.FotoUrl,
                ProductBeschrijving = a.ProductBeschrijving,
                Hoeveelheid = a.Hoeveelheid,
                MinimumPrijs = a.MinimumPrijs,
                GewensteKlokLocatie = a.GewensteKlokLocatie,
                GewensteVeilDatum = a.GewensteVeilDatum,
                GebruikerId = a.GebruikerId,
                GebruikerNaam = a.Gebruiker != null ? a.Gebruiker.Naam : string.Empty
            })
            .FirstOrDefaultAsync();
    }

    // ────────────────────────────── READ: per gebruiker (aanvoerder) ─────────────────────
    public async Task<List<AanmeldingDto>> GetByGebruikerAsync(int gebruikerId)
    {
        return await _db.Aanmeldingen
            .Include(a => a.Gebruiker)
            .Where(a => a.GebruikerId == gebruikerId)
            .Select(a => new AanmeldingDto
            {
                AanmeldingId = a.AanmeldingId,
                FotoUrl = a.FotoUrl,
                ProductBeschrijving = a.ProductBeschrijving,
                Hoeveelheid = a.Hoeveelheid,
                MinimumPrijs = a.MinimumPrijs,
                GewensteKlokLocatie = a.GewensteKlokLocatie,
                GewensteVeilDatum = a.GewensteVeilDatum,
                GebruikerId = a.GebruikerId,
                GebruikerNaam = a.Gebruiker != null ? a.Gebruiker.Naam : string.Empty
            })
            .ToListAsync();
    }

    // ────────────────────────────── CREATE ──────────────────────────────
    public async Task<AanmeldingDto> CreateAsync(CreateAanmeldingDto dto)
    {
        var gebruikerExists = await _db.Gebruikers.AnyAsync(g => g.GebruikerId == dto.GebruikerId);
        if (!gebruikerExists)
            throw new InvalidOperationException("Gebruiker bestaat niet.");

        var a = new Aanmelding
        {
            FotoUrl = dto.FotoUrl ?? string.Empty,
            ProductBeschrijving = dto.ProductBeschrijving,
            Hoeveelheid = dto.Hoeveelheid,
            MinimumPrijs = dto.MinimumPrijs,
            GewensteKlokLocatie = dto.GewensteKlokLocatie,
            GewensteVeilDatum = dto.GewensteVeilDatum,
            GebruikerId = dto.GebruikerId,
        };

        _db.Aanmeldingen.Add(a);
        await _db.SaveChangesAsync();

        var created = await _db.Aanmeldingen
            .Include(x => x.Gebruiker)
            .FirstAsync(x => x.AanmeldingId == a.AanmeldingId);

        return new AanmeldingDto
        {
            AanmeldingId = created.AanmeldingId,
            FotoUrl = created.FotoUrl,
            ProductBeschrijving = created.ProductBeschrijving,
            Hoeveelheid = created.Hoeveelheid,
            MinimumPrijs = created.MinimumPrijs,
            GewensteKlokLocatie = created.GewensteKlokLocatie,
            GewensteVeilDatum = created.GewensteVeilDatum,
            GebruikerId = created.GebruikerId,
            GebruikerNaam = created.Gebruiker?.Naam ?? string.Empty
        };
    }

    // ────────────────────────────── UPDATE ──────────────────────────────
    public async Task<bool> UpdateAsync(UpdateAanmeldingDto dto)
    {
        var a = await _db.Aanmeldingen.FindAsync(dto.AanmeldingId);
        if (a == null) return false;

        a.FotoUrl = dto.FotoUrl ?? string.Empty;
        a.ProductBeschrijving = dto.ProductBeschrijving;
        a.Hoeveelheid = dto.Hoeveelheid;
        a.MinimumPrijs = dto.MinimumPrijs;
        a.GewensteKlokLocatie = dto.GewensteKlokLocatie;
        a.GewensteVeilDatum = dto.GewensteVeilDatum;
        a.GebruikerId = dto.GebruikerId;

        await _db.SaveChangesAsync();
        return true;
    }

    // ────────────────────────────── DELETE ──────────────────────────────
    public async Task<bool> DeleteAsync(int id)
    {
        var a = await _db.Aanmeldingen.FindAsync(id);
        if (a == null) return false;

        _db.Aanmeldingen.Remove(a);
        await _db.SaveChangesAsync();
        return true;
    }
}
