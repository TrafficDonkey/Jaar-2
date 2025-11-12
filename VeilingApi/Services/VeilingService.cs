// VeilingService.cs
// Service voor CRUD-operaties op Veiling-entiteiten.
// Behandelt het ophalen, aanmaken, bijwerken en verwijderen van veilingen via EF Core.

using Microsoft.EntityFrameworkCore;
using VeilingApi.Data;
using VeilingApi.Models;

namespace VeilingApi.Services;

public class VeilingService : IVeilingService
{
    private readonly AppDbContext _db;

    // Constructor: injecteert de databasecontext
    public VeilingService(AppDbContext db) => _db = db;

    // ────────────────────────────── READ: alle veilingen ──────────────────────────────
    // Haal alle veilingen op, inclusief gekoppelde kavels
    public async Task<List<VeilingDto>> GetAllAsync()
    {
        return await _db.Veilingen
            .Include(v => v.Kavels)
            .Select(v => new VeilingDto
            {
                VeilingId = v.VeilingId,
                StartTijd = v.StartTijd,
                EindTijd = v.EindTijd,
                Status = v.Status,
                AantalKavels = v.Kavels != null ? v.Kavels.Count : 0
            })
            .ToListAsync();
    }

    // ────────────────────────────── READ: detail ──────────────────────────────
    // Haal één specifieke veiling op via ID inclusief gekoppelde kavels
    public async Task<VeilingDto?> GetByIdAsync(int id)
    {
        return await _db.Veilingen
            .Include(v => v.Kavels)
            .Where(v => v.VeilingId == id)
            .Select(v => new VeilingDto
            {
                VeilingId = v.VeilingId,
                StartTijd = v.StartTijd,
                EindTijd = v.EindTijd,
                Status = v.Status,
                AantalKavels = v.Kavels != null ? v.Kavels.Count : 0
            })
            .FirstOrDefaultAsync();
    }

    // ────────────────────────────── CREATE ──────────────────────────────
    // Maak een nieuwe veiling aan met start- en eindtijd, status en gebruiker die start
    public async Task<VeilingDto> CreateAsync(CreateVeilingDto dto)
    {
        var v = new Veiling
        {
            StartTijd = dto.StartTijd,
            EindTijd = dto.EindTijd,
            Status = dto.Status,
            GestartDoorId = dto.GestartDoorId
        };

        _db.Veilingen.Add(v);
        await _db.SaveChangesAsync();

        return new VeilingDto
        {
            VeilingId = v.VeilingId,
            StartTijd = v.StartTijd,
            EindTijd = v.EindTijd,
            Status = v.Status,
            AantalKavels = 0
        };
    }

    // ────────────────────────────── UPDATE ──────────────────────────────
    // Werk de gegevens van een bestaande veiling bij
    public async Task<bool> UpdateAsync(UpdateVeilingDto dto)
    {
        var v = await _db.Veilingen.FindAsync(dto.VeilingId);
        if (v == null) return false;

        v.StartTijd = dto.StartTijd;
        v.EindTijd = dto.EindTijd;
        v.Status = dto.Status;
        v.GestartDoorId = dto.GestartDoorId;

        await _db.SaveChangesAsync();
        return true;
    }

    // ────────────────────────────── DELETE ──────────────────────────────
    // Verwijder een veiling via ID; retourneer false als deze niet bestaat
    public async Task<bool> DeleteAsync(int id)
    {
        var v = await _db.Veilingen.FindAsync(id);
        if (v == null) return false;

        _db.Veilingen.Remove(v);
        await _db.SaveChangesAsync();
        return true;
    }
}
