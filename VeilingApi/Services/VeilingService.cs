using Microsoft.EntityFrameworkCore;
using VeilingApi.Data;
using VeilingApi.Models;

namespace VeilingApi.Services;

public class VeilingService : IVeilingService
{
    private readonly AppDbContext _db;
    public VeilingService(AppDbContext db) => _db = db;

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

    public async Task<bool> DeleteAsync(int id)
    {
        var v = await _db.Veilingen.FindAsync(id);
        if (v == null) return false;

        _db.Veilingen.Remove(v);
        await _db.SaveChangesAsync();
        return true;
    }
}
