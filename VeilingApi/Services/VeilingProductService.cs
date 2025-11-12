// VeilingProductService.cs
// Service voor CRUD-operaties op VeilingProduct (kavels binnen veilingen).
// Behandelt koppelingen tussen veilingen en aanmeldingen, inclusief DTO-mapping.

using Microsoft.EntityFrameworkCore;
using VeilingApi.Data;
using VeilingApi.Models;

namespace VeilingApi.Services;

public class VeilingProductService : IVeilingProductService
{
    private readonly AppDbContext _db;

    // Constructor: injecteert de databasecontext
    public VeilingProductService(AppDbContext db) => _db = db;

    // ────────────────────────────── READ: alle veilingproducten ──────────────────────────────
    // Haal alle veilingproducten op, inclusief gekoppelde veiling- en aanmeldingsinformatie
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

    // ────────────────────────────── READ: detail ──────────────────────────────
    // Haal één veilingproduct op via ID, inclusief bijbehorende veiling en aanmelding
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

    // ────────────────────────────── CREATE ──────────────────────────────
    // Maak een nieuw veilingproduct aan en koppel het aan een veiling en aanmelding
    public async Task<VeilingProductDto> CreateAsync(CreateVeilingProductDto dto)
    {
        // (optioneel) controleer of veiling en aanmelding bestaan
        var vp = new VeilingProduct
        {
            VeilingId = dto.VeilingId,
            AanmeldingId = dto.AanmeldingId,
            VolgordeVeiling = dto.VolgordeVeiling
        };

        _db.VeilingProducts.Add(vp);
        await _db.SaveChangesAsync();

        // Haal de aangemaakte entiteit opnieuw op met de gekoppelde gegevens
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

    // ────────────────────────────── UPDATE ──────────────────────────────
    // Werk de koppeling of volgorde van een veilingproduct bij
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

    // ────────────────────────────── DELETE ──────────────────────────────
    // Verwijder een veilingproduct via ID; retourneert false als het niet bestaat
    public async Task<bool> DeleteAsync(int id)
    {
        var vp = await _db.VeilingProducts.FindAsync(id);
        if (vp == null) return false;

        _db.VeilingProducts.Remove(vp);
        await _db.SaveChangesAsync();
        return true;
    }
}
