// AanmeldingService.cs
// Service voor CRUD-operaties op Aanmelding en mapping naar DTO's via EF Core.
// Verantwoordelijk voor ophalen, aanmaken, bijwerken en verwijderen van aanmeldingen.
// Sinds de rol-gebaseerde aanpak gebruikt Aanmelding nu GebruikerId (geen aparte Aanvoerder-tabel).

using Microsoft.EntityFrameworkCore;
using VeilingApi.Data;
using VeilingApi.Models;

namespace VeilingApi.Services;

public class AanmeldingService : IAanmeldingService
{
    private readonly AppDbContext _db;

    // Constructor: injecteert de databasecontext
    public AanmeldingService(AppDbContext db) => _db = db;

    // Kleine helper om duplicatie te voorkomen
    private static AanmeldingDto MapToDto(Aanmelding a) => new AanmeldingDto
    {
        AanmeldingId         = a.AanmeldingId,
        FotoUrl              = a.FotoUrl,
        ProductBeschrijving  = a.ProductBeschrijving,
        Hoeveelheid          = a.Hoeveelheid,
        MinimumPrijs         = a.MinimumPrijs,
        GewensteKlokLocatie  = a.GewensteKlokLocatie,
        GewensteVeilDatum    = a.GewensteVeilDatum,
        GebruikerId          = a.GebruikerId,
        GebruikerNaam        = a.Gebruiker?.Naam ?? string.Empty
    };

    // ────────────────────────────── READ: alle aanmeldingen ──────────────────────────────
    // Haal alle aanmeldingen op, inclusief gekoppelde gebruiker (eigenaar).
    public async Task<List<AanmeldingDto>> GetAllAsync()
    {
        var entities = await _db.Aanmeldingen
            .Include(a => a.Gebruiker)
            .OrderByDescending(a => a.GewensteVeilDatum)
            .ToListAsync();

        return entities.Select(MapToDto).ToList();
    }

    // ────────────────────────────── READ: detail ──────────────────────────────
    // Haal één aanmelding op via ID.
    public async Task<AanmeldingDto?> GetByIdAsync(int id)
    {
        var entity = await _db.Aanmeldingen
            .Include(a => a.Gebruiker)
            .FirstOrDefaultAsync(a => a.AanmeldingId == id);

        return entity is null ? null : MapToDto(entity);
    }

    // ────────────────────────────── READ: op basis van gebruiker ──────────────────────────────
    // Haal alle aanmeldingen op die horen bij een specifieke gebruiker (eigenaar).
    // Dit wordt o.a. gebruikt voor "mijn aanmeldingen" in de Aanvoerder/leverancier-omgeving.
    public async Task<List<AanmeldingDto>> GetByGebruikerAsync(int gebruikerId)
    {
        var entities = await _db.Aanmeldingen
            .Include(a => a.Gebruiker)
            .Where(a => a.GebruikerId == gebruikerId)
            .OrderByDescending(a => a.GewensteVeilDatum)
            .ToListAsync();

        return entities.Select(MapToDto).ToList();
    }

    // ────────────────────────────── CREATE ──────────────────────────────
    // Maak een nieuwe aanmelding aan en retourneer de DTO.
    public async Task<AanmeldingDto> CreateAsync(CreateAanmeldingDto dto)
    {
        // Controleer of de gekoppelde gebruiker bestaat
        var userExists = await _db.Gebruikers
            .AnyAsync(g => g.GebruikerId == dto.GebruikerId);

        if (!userExists)
            throw new InvalidOperationException("Gebruiker bij deze aanmelding bestaat niet.");

        var entity = new Aanmelding
        {
            FotoUrl             = dto.FotoUrl ?? string.Empty,
            ProductBeschrijving = dto.ProductBeschrijving,
            Hoeveelheid         = dto.Hoeveelheid,
            MinimumPrijs        = dto.MinimumPrijs,
            GewensteKlokLocatie = dto.GewensteKlokLocatie,
            GewensteVeilDatum   = dto.GewensteVeilDatum,
            GebruikerId         = dto.GebruikerId
        };

        _db.Aanmeldingen.Add(entity);
        await _db.SaveChangesAsync();

        // Opnieuw ophalen inclusief navigatie-eigenschappen
        var created = await _db.Aanmeldingen
            .Include(a => a.Gebruiker)
            .FirstAsync(a => a.AanmeldingId == entity.AanmeldingId);

        return MapToDto(created);
    }

    // ────────────────────────────── UPDATE ──────────────────────────────
    // Werk een bestaande aanmelding bij; retourneer false als deze niet bestaat.
    public async Task<bool> UpdateAsync(UpdateAanmeldingDto dto)
    {
        var entity = await _db.Aanmeldingen.FindAsync(dto.AanmeldingId);
        if (entity is null)
            return false;

        entity.FotoUrl             = dto.FotoUrl ?? string.Empty;
        entity.ProductBeschrijving = dto.ProductBeschrijving;
        entity.Hoeveelheid         = dto.Hoeveelheid;
        entity.MinimumPrijs        = dto.MinimumPrijs;
        entity.GewensteKlokLocatie = dto.GewensteKlokLocatie;
        entity.GewensteVeilDatum   = dto.GewensteVeilDatum;
        entity.GebruikerId         = dto.GebruikerId;

        await _db.SaveChangesAsync();
        return true;
    }

    // ────────────────────────────── DELETE ──────────────────────────────
    // Verwijder een aanmelding; retourneer false als niet gevonden.
    public async Task<bool> DeleteAsync(int id)
    {
        var entity = await _db.Aanmeldingen.FindAsync(id);
        if (entity is null)
            return false;

        _db.Aanmeldingen.Remove(entity);
        await _db.SaveChangesAsync();
        return true;
    }

    // "Aanvoerder" = gebruiker die het product aanbiedt.
// Voor achterwaartse compatibiliteit laten we deze methode gewoon
// doorverwijzen naar GetByGebruikerAsync.
    public Task<List<AanmeldingDto>> GetForAanvoerderAsync(int gebruikerId)
    {
        return GetByGebruikerAsync(gebruikerId);
    }

}
