using Microsoft.EntityFrameworkCore;
using VeilingApi.Data;
using VeilingApi.Models;

namespace VeilingApi.Services;

public class GebruikerService : IGebruikerService
{
    private readonly AppDbContext _db;
    public GebruikerService(AppDbContext db) => _db = db;

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

    public async Task<bool> DeleteAsync(int id)
    {
        var g = await _db.Gebruikers.FindAsync(id);
        if (g == null) return false;

        _db.Gebruikers.Remove(g);
        await _db.SaveChangesAsync();
        return true;
    }
}
