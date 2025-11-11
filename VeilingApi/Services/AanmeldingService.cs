using Microsoft.EntityFrameworkCore;
using VeilingApi.Data;
using VeilingApi.Models;

namespace VeilingApi.Services;

public class AanmeldingService : IAanmeldingService
{
    private readonly AppDbContext _db;
    public AanmeldingService(AppDbContext db) => _db = db;

    public async Task<List<AanmeldingDto>> GetAllAsync()
    {
        return await _db.Aanmeldingen
            .Include(a => a.Aanvoerder)
            .Select(a => new AanmeldingDto
            {
                AanmeldingId = a.AanmeldingId,
                FotoUrl = a.FotoUrl,
                ProductBeschrijving = a.ProductBeschrijving,
                Hoeveelheid = a.Hoeveelheid,
                MinimumPrijs = a.MinimumPrijs,
                GewensteKlokLocatie = a.GewensteKlokLocatie,
                GewensteVeilDatum = a.GewensteVeilDatum,
                AanvoerderId = a.AanvoerderId,
                AanvoerderNaam = a.Aanvoerder != null ? a.Aanvoerder.Naam : string.Empty,
            })
            .ToListAsync();
    }

    public async Task<AanmeldingDto?> GetByIdAsync(int id)
    {
        return await _db.Aanmeldingen
            .Include(a => a.Aanvoerder)
            .Where(a => a.AanmeldingId == id)
            .Select(a => new AanmeldingDto
            {
                AanmeldingId = a.AanmeldingId,
                FotoUrl = a.FotoUrl,
                ProductBeschrijving = a.ProductBeschrijving,
                Hoeveelheid = a.Hoeveelheid,
                MinimumPrijs = a.MinimumPrijs,
                GewensteKlokLocatie = a.GewensteKlokLocatie,
                GewensteVeilDatum = a.GewensteVeilDatum,
                AanvoerderId = a.AanvoerderId,
                AanvoerderNaam = a.Aanvoerder!.Naam
            })
            .FirstOrDefaultAsync();
    }

    public async Task<AanmeldingDto> CreateAsync(CreateAanmeldingDto dto)
    {
        var aanvoerderExists = await _db.Aanvoerders.AnyAsync(a => a.AanvoerderId == dto.AanvoerderId);
        if (!aanvoerderExists)
            throw new InvalidOperationException("Aanvoerder bestaat niet.");

        var a = new Aanmelding
        {
            FotoUrl = dto.FotoUrl ?? string.Empty,
            ProductBeschrijving = dto.ProductBeschrijving,
            Hoeveelheid = dto.Hoeveelheid,
            MinimumPrijs = dto.MinimumPrijs,
            GewensteKlokLocatie = dto.GewensteKlokLocatie,
            GewensteVeilDatum = dto.GewensteVeilDatum,
            AanvoerderId = dto.AanvoerderId,
        };

        _db.Aanmeldingen.Add(a);
        await _db.SaveChangesAsync();

        // opnieuw ophalen with include
        var created = await _db.Aanmeldingen.Include(x => x.Aanvoerder)
            .FirstAsync(x => x.AanmeldingId == a.AanmeldingId);

        return new AanmeldingDto
        {
            AanmeldingId = created.AanmeldingId,
            FotoUrl = created.FotoUrl,
            ProductBeschrijving = created.ProductBeschrijving,
            Hoeveelheid = created.Hoeveelheid,
            MinimumPrijs = created.MinimumPrijs,
            GewensteKlokLocatie = created.GewensteKlokLocatie,
            GewensteVeilDatum = created.GewensteVeilDatum,
            AanvoerderId = created.AanvoerderId,
            AanvoerderNaam = created.Aanvoerder!.Naam
        };
    }

    public async Task<bool> UpdateAsync(UpdateAanmeldingDto dto)
    {
        var a = await _db.Aanmeldingen.FindAsync(dto.AanmeldingId);
        if (a == null) return false;

        a.FotoUrl = dto.FotoUrl ?? string.Empty;
        a.ProductBeschrijving = dto.ProductBeschrijving;
        a.Hoeveelheid = dto.Hoeveelheid;
        a.MinimumPrijs = dto.MinimumPrijs;
        a.GewensteKlokLocatie = dto.GewensteKlokLocatie;
        a.GewensteVeilDatum = dto.GewensteVeilDatum;
        a.AanvoerderId = dto.AanvoerderId;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var a = await _db.Aanmeldingen.FindAsync(id);
        if (a == null) return false;

        _db.Aanmeldingen.Remove(a);
        await _db.SaveChangesAsync();
        return true;
    }
}
