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
                Rol = g.Rol
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
                Rol = g.Rol
            })
            .FirstOrDefaultAsync();
    }

    // ────────────────────────────── CREATE ──────────────────────────────
    // Maak een nieuwe gebruiker aan en retourneer de DTO
    public async Task<GebruikerDto> CreateAsync(CreateGebruikerDto dto)
    {
        var g = new Gebruiker
        {
            Naam = dto.Naam,
            Email = dto.Email,
            Rol = dto.Rol,
            WachtwoordHash = dto.WachtwoordHash
        };

        _db.Gebruikers.Add(g);
        await _db.SaveChangesAsync();

        return new GebruikerDto
        {
            GebruikerId = g.GebruikerId,
            Naam = g.Naam,
            Email = g.Email,
            Rol = g.Rol
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

        await _db.SaveChangesAsync();
        return true;
    }

    // ────────────────────────────── DELETE ──────────────────────────────
    // Verwijder een gebruiker; retourneer false als niet gevonden
    public async Task<bool> DeleteAsync(int id)
    {
        var g = await _db.Gebruikers.FindAsync(id);
        if (g == null) return false;

        _db.Gebruikers.Remove(g);
        await _db.SaveChangesAsync();
        return true;
    }
}
