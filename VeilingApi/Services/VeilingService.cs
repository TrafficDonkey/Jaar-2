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

        // ────────────────────────────── HELPERS ──────────────────────────────

        private static VeilingDto MapToDto(Veiling v)
        {
            return new VeilingDto
            {
                VeilingId   = v.VeilingId,
                Naam        = v.Naam,
                Status      = v.Status,
                StartTijd   = v.StartTijd,
                EindTijd    = v.EindTijd,
                VeilingProducten = v.VeilingProducten?
                    .Select(vp => MapVeilingProductToDto(vp))
                    .ToList() ?? new List<VeilingProductDto>()
            };
        }

        private static VeilingProductDto MapVeilingProductToDto(VeilingProduct vp)
        {
            // Aanmelding kan nooit null zijn als je database klopt,
            // maar voor de zekerheid toch null-checks.
            var a = vp.Aanmelding;

            return new VeilingProductDto
            {
                VeilingProductId    = vp.VeilingProductId,
                AanmeldingId        = vp.AanmeldingId,

                ProductBeschrijving = a?.ProductBeschrijving ?? string.Empty,
                Aantal              = a?.Hoeveelheid ?? 0,

                // We gebruiken MinimumPrijs als start- en huidige prijs
                StartPrijs          = a?.MinimumPrijs ?? 0,
                HuidigePrijs        = a?.MinimumPrijs ?? 0,

                Kloklocatie         = a?.GewensteKlokLocatie ?? string.Empty,
                GewensteVeilDatum   = a?.GewensteVeilDatum
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
                Naam        = dto.Naam,
                Status      = dto.Status,
                StartTijd   = dto.StartTijd,
                EindTijd    = dto.EindTijd,
                GestartDoorId = dto.GestartDoorId,
                VeilingProducten = new List<VeilingProduct>()
            };

            // Als je vanuit het scherm al aanmeldingen kiest,
            // kun je hier een lijst met VeilingProducten aanmaken.
            // Voor nu doen we hier niets speciaals; koppelen gebeurt
            // in de VeilingProductService / via een apart endpoint.

            _db.Veilingen.Add(veiling);
            await _db.SaveChangesAsync();

            // Nog een keer ophalen inclusief producten voor mapping
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

            v.Naam        = dto.Naam;
            v.Status      = dto.Status;
            v.StartTijd   = dto.StartTijd;
            v.EindTijd    = dto.EindTijd;
            // GestartDoorId laten we zoals hij is; die komt uit de veilingmeester.

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

        // ────────────────────────────── ACTIEVE VEILING VOOR KOPER ──────────────────────

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
                        VeilingProductId    = vp.VeilingProductId,
                        AanmeldingId        = vp.AanmeldingId,
                        ProductBeschrijving = a.ProductBeschrijving,
                        Hoeveelheid         = a.Hoeveelheid,
                        MinimumPrijs        = a.MinimumPrijs,
                        FotoUrl             = a.FotoUrl,
                        Kloklocatie         = a.GewensteKlokLocatie
                    };
                })
                .FirstOrDefault();

            return new ActieveVeilingDto
            {
                VeilingId     = veiling.VeilingId,
                StartTijd     = veiling.StartTijd,
                EindTijd      = veiling.EindTijd,
                HuidigProduct = firstProduct
            };
        }

        // ────────────────────────────── START VEILING ──────────────────────────────
        // Simpele helper om vanuit één Aanmelding direct een nieuwe veiling te starten.
        // (Wordt gebruikt als je ergens een "Start veiling" knop hebt.)

        public async Task<VeilingDto?> StartVeilingAsync(StartVeilingDto dto)
        {
            var aanmelding = await _db.Aanmeldingen
                .FirstOrDefaultAsync(a => a.AanmeldingId == dto.AanmeldingId);

            if (aanmelding is null)
                throw new InvalidOperationException("Aanmelding bestaat niet.");

            var veiling = new Veiling
            {
                Naam          = string.IsNullOrWhiteSpace(dto.Naam)
                                    ? "Veiling"
                                    : dto.Naam!,
                Status        = "Actief",
                StartTijd     = dto.StartTijd ?? DateTime.UtcNow,
                EindTijd      = null,
                VeilingProducten = new List<VeilingProduct>()
            };

            var vp = new VeilingProduct
            {
                AanmeldingId    = aanmelding.AanmeldingId,
                VolgordeVeiling = 1
            };

            veiling.VeilingProducten.Add(vp);

            _db.Veilingen.Add(veiling);
            await _db.SaveChangesAsync();

            // opnieuw laden met includes zodat mapping klopt
            var saved = await _db.Veilingen
                .Include(v => v.VeilingProducten)
                    .ThenInclude(vp => vp.Aanmelding)
                .FirstAsync(v => v.VeilingId == veiling.VeilingId);

            return MapToDto(saved);
        }
    }
}
