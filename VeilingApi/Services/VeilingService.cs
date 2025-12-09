using Microsoft.EntityFrameworkCore;
using VeilingApi.Data;
using VeilingApi.Models;

namespace VeilingApi.Services
{
    public class VeilingService : IVeilingService
    {
        private readonly AppDbContext _db;

        public VeilingService(AppDbContext db)
        {
            _db = db;
        }

        // ────────────────────────────── Helpers ──────────────────────────────

        private static VeilingDto MapToDto(Veiling v)
        {
            return new VeilingDto
            {
                VeilingId = v.VeilingId,
                Naam = v.Naam,
                Status = v.Status,
                StartTijd = v.StartTijd,
                EindTijd = v.EindTijd,
                VeilingProducten = v.VeilingProducten?
                    .Select(MapVeilingProductToDto)
                    .ToList() ?? new List<VeilingProductDto>()
            };
        }

        private static VeilingProductDto MapVeilingProductToDto(VeilingProduct vp)
        {
            var a = vp.Aanmelding;

            return new VeilingProductDto
            {
                VeilingProductId = vp.VeilingProductId,
                AanmeldingId = vp.AanmeldingId,
                ProductBeschrijving = a?.ProductBeschrijving ?? string.Empty,
                Aantal = a?.Hoeveelheid ?? 0,
                StartPrijs = a?.MinimumPrijs ?? 0,
                HuidigePrijs = a?.MinimumPrijs ?? 0,
                Kloklocatie = a?.GewensteKlokLocatie ?? string.Empty,
                GewensteVeilDatum = a?.GewensteVeilDatum
            };
        }

        // ────────────────────────────── CRUD ──────────────────────────────

        public async Task<List<VeilingDto>> GetAllAsync()
        {
            var veilingen = await _db.Veilingen
                .Include(v => v.VeilingProducten)
                    .ThenInclude(vp => vp.Aanmelding)
                .OrderByDescending(v => v.StartTijd)
                .ToListAsync();

            return veilingen.Select(MapToDto).ToList();
        }

        public async Task<VeilingDto?> GetByIdAsync(int id)
        {
            var v = await _db.Veilingen
                .Include(v => v.VeilingProducten)
                    .ThenInclude(vp => vp.Aanmelding)
                .FirstOrDefaultAsync(v => v.VeilingId == id);

            return v is null ? null : MapToDto(v);
        }

        public async Task<VeilingDto> CreateAsync(CreateVeilingDto dto)
        {
            var veiling = new Veiling
            {
                Naam = dto.Naam,
                Status = dto.Status,
                StartTijd = dto.StartTijd,
                EindTijd = dto.EindTijd,
                GestartDoorId = dto.GestartDoorId,
                VeilingProducten = new List<VeilingProduct>()
            };

            _db.Veilingen.Add(veiling);
            await _db.SaveChangesAsync();

            var saved = await _db.Veilingen
                .Include(v => v.VeilingProducten)
                    .ThenInclude(vp => vp.Aanmelding)
                .FirstAsync(v => v.VeilingId == veiling.VeilingId);

            return MapToDto(saved);
        }

        public async Task<bool> UpdateAsync(UpdateVeilingDto dto)
        {
            var v = await _db.Veilingen.FindAsync(dto.VeilingId);
            if (v is null) return false;

            v.Naam = dto.Naam;
            v.Status = dto.Status;
            v.StartTijd = dto.StartTijd;
            v.EindTijd = dto.EindTijd;

            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var v = await _db.Veilingen.FindAsync(id);
            if (v is null) return false;

            _db.Veilingen.Remove(v);
            await _db.SaveChangesAsync();
            return true;
        }

        // ────────────────────────────── Actieve Veiling ──────────────────────────────

        public async Task<ActieveVeilingDto?> GetActieveAsync()
        {
            var now = DateTime.UtcNow;

            var veiling = await _db.Veilingen
                .Include(v => v.VeilingProducten)
                    .ThenInclude(vp => vp.Aanmelding)
                .Where(v =>
                    v.Status == "Actief" &&
                    v.StartTijd <= now &&
                    (v.EindTijd == null || v.EindTijd >= now))
                .OrderBy(v => v.StartTijd)
                .FirstOrDefaultAsync();

            if (veiling is null)
                return null;

            var firstProduct = veiling.VeilingProducten
                .OrderBy(vp => vp.VolgordeVeiling)
                .Select(vp =>
                {
                    var a = vp.Aanmelding!;
                    return new ActieveVeilingProductDto
                    {
                        VeilingProductId = vp.VeilingProductId,
                        AanmeldingId = vp.AanmeldingId,
                        ProductBeschrijving = a.ProductBeschrijving,
                        Hoeveelheid = a.Hoeveelheid,
                        MinimumPrijs = a.MinimumPrijs,
                        FotoUrl = a.FotoUrl,
                        Kloklocatie = a.GewensteKlokLocatie
                    };
                })
                .FirstOrDefault();

            return new ActieveVeilingDto
            {
                VeilingId = veiling.VeilingId,
                StartTijd = veiling.StartTijd,
                EindTijd = veiling.EindTijd,
                HuidigProduct = firstProduct
            };
        }

        // ────────────────────────────── Start Veiling ──────────────────────────────

        public async Task<VeilingDto?> StartVeilingAsync(StartVeilingDto dto, int gestartDoorId)
        {
            var aanmelding = await _db.Aanmeldingen
                .FirstOrDefaultAsync(a => a.AanmeldingId == dto.AanmeldingId);

            if (aanmelding is null)
                throw new InvalidOperationException("Aanmelding bestaat niet.");

            var veiling = new Veiling
            {
                Naam = string.IsNullOrWhiteSpace(dto.Naam) ? "Veiling" : dto.Naam!,
                Status = "Actief",
                StartTijd = dto.StartTijd ?? DateTime.UtcNow,
                EindTijd = null,
                GestartDoorId = gestartDoorId,
                VeilingProducten = new List<VeilingProduct>()
            };

            var product = new VeilingProduct
            {
                AanmeldingId = aanmelding.AanmeldingId,
                VolgordeVeiling = 1
            };

            veiling.VeilingProducten.Add(product);

            _db.Veilingen.Add(veiling);
            await _db.SaveChangesAsync();

            var saved = await _db.Veilingen
                .Include(v => v.VeilingProducten)
                    .ThenInclude(vp => vp.Aanmelding)
                .FirstAsync(v => v.VeilingId == veiling.VeilingId);

            return MapToDto(saved);
        }
    }
}
