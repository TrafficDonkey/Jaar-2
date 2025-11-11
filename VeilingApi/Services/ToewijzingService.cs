using Microsoft.EntityFrameworkCore;
using VeilingApi.Data;
using VeilingApi.Models;

namespace VeilingApi.Services;

public class ToewijzingService : IToewijzingService
{
    private readonly AppDbContext _db;
    public ToewijzingService(AppDbContext db) => _db = db;

    public async Task<List<ToewijzingDto>> GetAllAsync()
    {
        return await _db.Toewijzingen
            .Include(t => t.Koper)
            .Include(t => t.VeilingProduct)
            .Select(t => new ToewijzingDto
            {
                ToewijzingId = t.ToewijzingId,
                KoperId = t.KoperId,
                KoperNaam = t.Koper!.Naam,
                VeilingProductId = t.VeilingProductId,
                EindPrijs = t.EindPrijs,
                Datum = t.Datum
            })
            .ToListAsync();
    }

    public async Task<ToewijzingDto?> GetByIdAsync(int id)
    {
        return await _db.Toewijzingen
            .Include(t => t.Koper)
            .Where(t => t.ToewijzingId == id)
            .Select(t => new ToewijzingDto
            {
                ToewijzingId = t.ToewijzingId,
                KoperId = t.KoperId,
                KoperNaam = t.Koper!.Naam,
                VeilingProductId = t.VeilingProductId,
                EindPrijs = t.EindPrijs,
                Datum = t.Datum
            })
            .FirstOrDefaultAsync();
    }

    public async Task<ToewijzingDto> CreateAsync(CreateToewijzingDto dto)
    {
        var buyerExists = await _db.Gebruikers.AnyAsync(g => g.GebruikerId == dto.KoperId);
        if (!buyerExists) throw new InvalidOperationException("Koper bestaat niet.");

        var productExists = await _db.VeilingProducts.AnyAsync(vp => vp.VeilingProductId == dto.VeilingProductId);
        if (!productExists) throw new InvalidOperationException("Veilingproduct bestaat niet.");

        var t = new Toewijzing
        {
            KoperId = dto.KoperId,
            VeilingProductId = dto.VeilingProductId,
            EindPrijs = dto.EindPrijs,
            Datum = dto.Datum
        };

        _db.Toewijzingen.Add(t);
        await _db.SaveChangesAsync();

        var created = await _db.Toewijzingen.Include(x => x.Koper)
            .FirstAsync(x => x.ToewijzingId == t.ToewijzingId);

        return new ToewijzingDto
        {
            ToewijzingId = created.ToewijzingId,
            KoperId = created.KoperId,
            KoperNaam = created.Koper!.Naam,
            VeilingProductId = created.VeilingProductId,
            EindPrijs = created.EindPrijs,
            Datum = created.Datum
        };
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var t = await _db.Toewijzingen.FindAsync(id);
        if (t == null) return false;

        _db.Toewijzingen.Remove(t);
        await _db.SaveChangesAsync();
        return true;
    }
}
