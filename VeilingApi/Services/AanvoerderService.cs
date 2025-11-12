// AanvoerderService.cs
// Service voor CRUD-operaties op Aanvoerder en mapping naar DTO's via EF Core.
// Verantwoordelijk voor ophalen, aanmaken, bijwerken en verwijderen van aanvoerders.

using Microsoft.EntityFrameworkCore;
using VeilingApi.Data;
using VeilingApi.Models;

namespace VeilingApi.Services;

public class AanvoerderService : IAanvoerderService
{
    private readonly AppDbContext _db;

    // Constructor: injecteert de databasecontext
    public AanvoerderService(AppDbContext db) => _db = db;

    // ────────────────────────────── READ: alle aanvoerders ──────────────────────────────
    // Haal alle aanvoerders op en bereken het aantal aanmeldingen per aanvoerder
    public async Task<List<AanvoerderDto>> GetAllAsync()
    {
        return await _db.Aanvoerders
            .Select(a => new AanvoerderDto
            {
                AanvoerderId = a.AanvoerderId,
                Naam = a.Naam,
                AantalAanmeldingen = a.Aanmeldingen != null ? a.Aanmeldingen.Count : 0
            })
            .ToListAsync();
    }

    // ────────────────────────────── READ: detail ──────────────────────────────
    // Haal één aanvoerder op via ID
    public async Task<AanvoerderDto?> GetByIdAsync(int id)
    {
        return await _db.Aanvoerders
            .Where(a => a.AanvoerderId == id)
            .Select(a => new AanvoerderDto
            {
                AanvoerderId = a.AanvoerderId,
                Naam = a.Naam,
                AantalAanmeldingen = a.Aanmeldingen != null ? a.Aanmeldingen.Count : 0
            })
            .FirstOrDefaultAsync();
    }

    // ────────────────────────────── CREATE ──────────────────────────────
    // Maak een nieuwe aanvoerder aan en retourneer de DTO
    public async Task<AanvoerderDto> CreateAsync(CreateAanvoerderDto dto)
    {
        var a = new Aanvoerder { Naam = dto.Naam };
        _db.Aanvoerders.Add(a);
        await _db.SaveChangesAsync();

        return new AanvoerderDto
        {
            AanvoerderId = a.AanvoerderId,
            Naam = a.Naam,
            AantalAanmeldingen = 0
        };
    }

    // ────────────────────────────── UPDATE ──────────────────────────────
    // Werk een bestaande aanvoerder bij; retourneer false als deze niet bestaat
    public async Task<bool> UpdateAsync(UpdateAanvoerderDto dto)
    {
        var a = await _db.Aanvoerders.FindAsync(dto.AanvoerderId);
        if (a == null) return false;

        a.Naam = dto.Naam;
        await _db.SaveChangesAsync();
        return true;
    }

    // ────────────────────────────── DELETE ──────────────────────────────
    // Verwijder een aanvoerder; retourneer false als niet gevonden
    public async Task<bool> DeleteAsync(int id)
    {
        var a = await _db.Aanvoerders.FindAsync(id);
        if (a == null) return false;

        _db.Aanvoerders.Remove(a);
        await _db.SaveChangesAsync();
        return true;
    }
}
