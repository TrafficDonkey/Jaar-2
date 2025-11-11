using Microsoft.EntityFrameworkCore;
using VeilingApi.Data;
using VeilingApi.Models;

namespace VeilingApi.Services;

public class VeilingProductService : IVeilingProductService
{
    private readonly AppDbContext _db;
    public VeilingProductService(AppDbContext db) => _db = db;

    public async Task<List<VeilingProductDto>> GetAllAsync()
    {
        return await _db.VeilingProducts
            .Include(vp => vp.Veiling)
            .Include(vp => vp.Aanmelding)
            .Select(vp => new VeilingProductDto
            {
                VeilingProductId = vp.VeilingProductId,
                VeilingId = vp.VeilingId,
                VeilingStart = vp.Veiling!.StartTijd,
                AanmeldingId = vp.AanmeldingId,
                ProductBeschrijving = vp.Aanmelding!.ProductBeschrijving,
                VolgordeVeiling = vp.VolgordeVeiling
            })
            .ToListAsync();
    }

    public async Task<VeilingProductDto?> GetByIdAsync(int id)
    {
        return await _db.VeilingProducts
            .Include(vp => vp.Veiling)
            .Include(vp => vp.Aanmelding)
            .Where(vp => vp.VeilingProductId == id)
            .Select(vp => new VeilingProductDto
            {
                VeilingProductId = vp.VeilingProductId,
                VeilingId = vp.VeilingId,
                VeilingStart = vp.Veiling!.StartTijd,
                AanmeldingId = vp.AanmeldingId,
                ProductBeschrijving = vp.Aanmelding!.ProductBeschrijving,
                VolgordeVeiling = vp.VolgordeVeiling
            })
            .FirstOrDefaultAsync();
    }

    public async Task<VeilingProductDto> CreateAsync(CreateVeilingProductDto dto)
    {
        // je kunt hier nog checken of veiling en aanmelding bestaan
        var vp = new VeilingProduct
        {
            VeilingId = dto.VeilingId,
            AanmeldingId = dto.AanmeldingId,
            VolgordeVeiling = dto.VolgordeVeiling
        };

        _db.VeilingProducts.Add(vp);
        await _db.SaveChangesAsync();

        var created = await _db.VeilingProducts
            .Include(x => x.Veiling)
            .Include(x => x.Aanmelding)
            .FirstAsync(x => x.VeilingProductId == vp.VeilingProductId);

        return new VeilingProductDto
        {
            VeilingProductId = created.VeilingProductId,
            VeilingId = created.VeilingId,
            VeilingStart = created.Veiling!.StartTijd,
            AanmeldingId = created.AanmeldingId,
            ProductBeschrijving = created.Aanmelding!.ProductBeschrijving,
            VolgordeVeiling = created.VolgordeVeiling
        };
    }

    public async Task<bool> UpdateAsync(UpdateVeilingProductDto dto)
    {
        var vp = await _db.VeilingProducts.FindAsync(dto.VeilingProductId);
        if (vp == null) return false;

        vp.VeilingId = dto.VeilingId;
        vp.AanmeldingId = dto.AanmeldingId;
        vp.VolgordeVeiling = dto.VolgordeVeiling;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var vp = await _db.VeilingProducts.FindAsync(id);
        if (vp == null) return false;

        _db.VeilingProducts.Remove(vp);
        await _db.SaveChangesAsync();
        return true;
    }
}
