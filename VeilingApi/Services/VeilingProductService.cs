// VeilingProductService.cs
// Implementatie van IVeilingProductService.

using Microsoft.EntityFrameworkCore;
using VeilingApi.Data;
using VeilingApi.Models;

namespace VeilingApi.Services;

public class VeilingProductService : IVeilingProductService
{
    private readonly AppDbContext _db;
    public VeilingProductService(AppDbContext db) => _db = db;

    private static int CalculateRemaining(VeilingProduct vp)
    {
        var total = vp.Aanmelding?.Hoeveelheid ?? 0;
        var sold = vp.Toewijzingen?.Sum(t => t.Aantal > 0 ? t.Aantal : 1) ?? 0;
        return Math.Max(0, total - sold);
    }

    private static VeilingProductDto MapToDto(VeilingProduct vp)
    {
        var a = vp.Aanmelding;
        var remaining = CalculateRemaining(vp);

        return new VeilingProductDto
        {
            VeilingProductId    = vp.VeilingProductId,
            AanmeldingId        = vp.AanmeldingId,
            ProductBeschrijving = a?.ProductBeschrijving ?? string.Empty,
            Aantal              = a?.Hoeveelheid ?? 0,
            ResterendAantal     = remaining,
            StartPrijs          = a?.MinimumPrijs ?? 0m,
            HuidigePrijs        = a?.MinimumPrijs ?? 0m,
            Kloklocatie         = a?.GewensteKlokLocatie ?? string.Empty,
            GewensteVeilDatum   = a?.GewensteVeilDatum
        };
    }

    // Alle kavels
    public async Task<List<VeilingProductDto>> GetAllAsync()
    {
        var entities = await _db.VeilingProducten
            .Include(vp => vp.Aanmelding)
            .Include(vp => vp.Toewijzingen)
            .ToListAsync();

        return entities.Select(MapToDto).ToList();
    }

    // Kavels voor één veiling
    public async Task<List<VeilingProductDto>> GetByVeilingAsync(int veilingId)
    {
        var entities = await _db.VeilingProducten
            .Include(vp => vp.Aanmelding)
            .Include(vp => vp.Toewijzingen)
            .Where(vp => vp.VeilingId == veilingId)
            .OrderBy(vp => vp.VolgordeVeiling)
            .ToListAsync();

        return entities.Select(MapToDto).ToList();
    }

    public async Task<VeilingProductDto?> GetByIdAsync(int id)
    {
        var entity = await _db.VeilingProducten
            .Include(vp => vp.Aanmelding)
            .Include(vp => vp.Toewijzingen)
            .FirstOrDefaultAsync(vp => vp.VeilingProductId == id);

        return entity is null ? null : MapToDto(entity);
    }

    public async Task<VeilingProductDto> CreateAsync(CreateVeilingProductDto dto)
    {
        // basischecks
        var veilingBestaat = await _db.Veilingen.AnyAsync(v => v.VeilingId == dto.VeilingId);
        if (!veilingBestaat)
            throw new InvalidOperationException("Veiling bestaat niet.");

        var aanmeldingBestaat = await _db.Aanmeldingen.AnyAsync(a => a.AanmeldingId == dto.AanmeldingId);
        if (!aanmeldingBestaat)
            throw new InvalidOperationException("Aanmelding bestaat niet.");

        var entity = new VeilingProduct
        {
            VeilingId       = dto.VeilingId,
            AanmeldingId    = dto.AanmeldingId,
            VolgordeVeiling = dto.VolgordeVeiling
        };

        _db.VeilingProducten.Add(entity);
        await _db.SaveChangesAsync();

        await _db.Entry(entity).Reference(vp => vp.Aanmelding).LoadAsync();

        return MapToDto(entity);
    }

    public async Task<bool> UpdateAsync(UpdateVeilingProductDto dto)
    {
        var entity = await _db.VeilingProducten.FindAsync(dto.VeilingProductId);
        if (entity is null) return false;

        entity.VeilingId       = dto.VeilingId;
        entity.AanmeldingId    = dto.AanmeldingId;
        entity.VolgordeVeiling = dto.VolgordeVeiling;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var entity = await _db.VeilingProducten.FindAsync(id);
        if (entity is null) return false;

        _db.VeilingProducten.Remove(entity);
        await _db.SaveChangesAsync();
        return true;
    }
}
