// GebruikerService.cs
// Service voor CRUD-operaties op Gebruiker en mapping naar DTO's via EF Core.
// Behandelt het ophalen, aanmaken, bijwerken en verwijderen van gebruikers.

using Microsoft.EntityFrameworkCore;
using VeilingApi.Data;
using VeilingApi.Models;

namespace VeilingApi.Services;

public class GebruikerService : IGebruikerService
{
    private readonly AppDbContext _db;

    // Constructor: injecteert de databasecontext
    public GebruikerService(AppDbContext db) => _db = db;

    // ────────────────────────────── READ: alle gebruikers ──────────────────────────────
    // Haal alle gebruikers op en projecteer naar een DTO-lijst
    public async Task<List<GebruikerDto>> GetAllAsync()
    {
        return await _db.Gebruikers
            .Select(g => new GebruikerDto
            {
                GebruikerId = g.GebruikerId,
                Naam = g.Naam,
                Email = g.Email,
                Rol = g.Rol,
                TelefoonLand = g.TelefoonLand,
                TelefoonNummer = g.TelefoonNummer,
                AdresStraat = g.AdresStraat,
                Huisnummer = g.Huisnummer,
                Postcode = g.Postcode
            })
            .ToListAsync();
    }

    // ────────────────────────────── READ: detail ──────────────────────────────
    // Haal één gebruiker op via ID en projecteer naar DTO
    public async Task<GebruikerDto?> GetByIdAsync(int id)
    {
        return await _db.Gebruikers
            .Where(g => g.GebruikerId == id)
            .Select(g => new GebruikerDto
            {
                GebruikerId = g.GebruikerId,
                Naam = g.Naam,
                Email = g.Email,
                Rol = g.Rol,
                TelefoonLand = g.TelefoonLand,
                TelefoonNummer = g.TelefoonNummer,
                AdresStraat = g.AdresStraat,
                Huisnummer = g.Huisnummer,
                Postcode = g.Postcode
            })
            .FirstOrDefaultAsync();
    }

    // ────────────────────────────── CREATE ──────────────────────────────
    // Maak een nieuwe gebruiker aan en retourneer de DTO
    public async Task<GebruikerDto> CreateAsync(CreateGebruikerDto dto)
    {
        var g = new Gebruiker
        {
            Naam = dto.Naam.Trim(),
            Email = dto.Email.Trim(),
            Rol = dto.Rol.Trim(),
            WachtwoordHash = dto.WachtwoordHash,
            TelefoonLand = dto.TelefoonLand?.Trim().ToUpperInvariant(),
            TelefoonNummer = dto.TelefoonNummer?.Trim(),
            AdresStraat = dto.AdresStraat?.Trim(),
            Huisnummer = dto.Huisnummer?.Trim(),
            Postcode = dto.Postcode?.Trim()
        };

        _db.Gebruikers.Add(g);
        await _db.SaveChangesAsync();

        return new GebruikerDto
        {
            GebruikerId = g.GebruikerId,
            Naam = g.Naam,
            Email = g.Email,
            Rol = g.Rol,
            TelefoonLand = g.TelefoonLand,
            TelefoonNummer = g.TelefoonNummer,
            AdresStraat = g.AdresStraat,
            Huisnummer = g.Huisnummer,
            Postcode = g.Postcode
        };
    }

    // ────────────────────────────── UPDATE ──────────────────────────────
    // Werk een bestaande gebruiker bij; retourneer false als deze niet bestaat
    public async Task<bool> UpdateAsync(UpdateGebruikerDto dto)
    {
        var g = await _db.Gebruikers.FindAsync(dto.GebruikerId);
        if (g == null) return false;

        g.Naam = dto.Naam;
        g.Email = dto.Email;
        g.Rol = dto.Rol;
        g.TelefoonLand = dto.TelefoonLand?.Trim().ToUpperInvariant();
        g.TelefoonNummer = dto.TelefoonNummer?.Trim();
        g.AdresStraat = dto.AdresStraat?.Trim();
        g.Huisnummer = dto.Huisnummer?.Trim();
        g.Postcode = dto.Postcode?.Trim();

        await _db.SaveChangesAsync();
        return true;
    }

    // ────────────────────────────── DELETE ──────────────────────────────
    // Verwijder een gebruiker; retourneer false als niet gevonden
    public async Task<bool> DeleteAsync(int id)
    {
        var (success, _) = await DeleteOrAnonymizeAsync(id);
        return success;
    }

    public async Task<(bool Success, bool HardDeleted)> DeleteOrAnonymizeAsync(int id)
    {
        var g = await _db.Gebruikers.FindAsync(id);
        if (g == null) return (false, false);

        var hasReferences =
            await _db.Aanmeldingen.AnyAsync(a => a.GebruikerId == id) ||
            await _db.Veilingen.AnyAsync(v => v.GestartDoorId == id) ||
            await _db.Biedingen.AnyAsync(b => b.GebruikerId == id) ||
            await _db.Toewijzingen.AnyAsync(t => t.KoperId == id);

        if (!hasReferences)
        {
            _db.Gebruikers.Remove(g);
            await _db.SaveChangesAsync();
            return (true, true);
        }

        // Door FK-restricties kunnen we accounts met historie niet hard verwijderen.
        // We anonimiseren dan de persoonsgegevens en maken inloggen onmogelijk.
        g.Naam = "Verwijderd account";
        g.Email = $"deleted-{id}@deleted.invalid";
        g.WachtwoordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N"));
        g.Rol = "Klant";
        g.TelefoonLand = null;
        g.TelefoonNummer = null;
        g.AdresStraat = null;
        g.Huisnummer = null;
        g.Postcode = null;

        await _db.SaveChangesAsync();
        return (true, false);
    }
}
