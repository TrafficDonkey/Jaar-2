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

        /// <summary>
        /// Hoofdmapper: Veiling entity -> VeilingDto (incl. producten).
        /// </summary>
        private static VeilingDto MapToDto(Veiling v)
        {
            return new VeilingDto
            {
                VeilingId = v.VeilingId,
                Naam      = v.Naam,
                Status    = v.Status,
                StartTijd = v.StartTijd,
                EindTijd  = v.EindTijd,
                VeilingProducten = v.VeilingProducten?
                    .Select(MapVeilingProductToDto)
                    .ToList() ?? new List<VeilingProductDto>()
            };
        }

        /// <summary>
        /// VeilingProduct entity -> VeilingProductDto.
        /// Haalt gegevens in principe uit de gekoppelde Aanmelding,
        /// maar zet Categorie expliciet vanuit VeilingProduct/Aanmelding.
        /// </summary>
        private static int CalculateRemaining(VeilingProduct vp)
        {
            var total = vp.Aanmelding?.Hoeveelheid ?? 0;
            var sold = vp.Toewijzingen?.Sum(t => t.Aantal > 0 ? t.Aantal : 1) ?? 0;
            return Math.Max(0, total - sold);
        }

        private static VeilingProductDto MapVeilingProductToDto(VeilingProduct vp)
        {
            var a = vp.Aanmelding;
            var remaining = CalculateRemaining(vp);

            return new VeilingProductDto
            {
                VeilingProductId     = vp.VeilingProductId,
                AanmeldingId         = vp.AanmeldingId,
                ProductBeschrijving  = a?.ProductBeschrijving ?? string.Empty,
                FotoUrl              = a?.FotoUrl,
                Aantal               = a?.Hoeveelheid ?? 0,
                ResterendAantal      = remaining,
                StartPrijs           = a?.MinimumPrijs ?? 0,
                HuidigePrijs         = a?.MinimumPrijs ?? 0,
                Kloklocatie          = a?.GewensteKlokLocatie ?? string.Empty,
                GewensteVeilDatum    = a?.GewensteVeilDatum,
                Categorie            = string.IsNullOrWhiteSpace(vp.Categorie)? (a?.Categorie ?? "Overig"): vp.Categorie
            };
        }

        /// <summary>
        /// Extra helper voor archief e.d.; hergebruikt de hoofdmapper.
        /// </summary>
        private static VeilingDto MapToVeilingDto(Veiling v)
        {
            if (v == null) throw new ArgumentNullException(nameof(v));
            return MapToDto(v);
        }

        // ────────────────────────────── CRUD ──────────────────────────────

        public async Task<List<VeilingDto>> GetAllAsync()
        {
            var veilingen = await _db.Veilingen
                .Include(v => v.VeilingProducten)
                    .ThenInclude(vp => vp.Aanmelding)
                .Include(v => v.VeilingProducten)
                    .ThenInclude(vp => vp.Toewijzingen)
                .OrderByDescending(v => v.StartTijd)
                .ToListAsync();

            return veilingen.Select(MapToDto).ToList();
        }

        public async Task<VeilingDto?> GetByIdAsync(int id)
        {
            var v = await _db.Veilingen
                .Include(v => v.VeilingProducten)
                    .ThenInclude(vp => vp.Aanmelding)
                .Include(v => v.VeilingProducten)
                    .ThenInclude(vp => vp.Toewijzingen)
                .FirstOrDefaultAsync(v => v.VeilingId == id);

            return v is null ? null : MapToDto(v);
        }

        public async Task<VeilingDto> CreateAsync(CreateVeilingDto dto)
        {
            var veiling = new Veiling
            {
                Naam            = dto.Naam,
                Status          = dto.Status,
                StartTijd       = dto.StartTijd,
                EindTijd        = dto.EindTijd,
                GestartDoorId   = dto.GestartDoorId,
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

            v.Naam      = dto.Naam;
            v.Status    = dto.Status;
            v.StartTijd = dto.StartTijd;
            v.EindTijd  = dto.EindTijd;

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
                .Include(v => v.VeilingProducten)
                    .ThenInclude(vp => vp.Toewijzingen)
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
                        VeilingProductId     = vp.VeilingProductId,
                        AanmeldingId         = vp.AanmeldingId,
                        ProductBeschrijving  = a.ProductBeschrijving,
                        Hoeveelheid          = a.Hoeveelheid,
                        ResterendAantal      = CalculateRemaining(vp),
                        MinimumPrijs         = a.MinimumPrijs,
                        FotoUrl              = a.FotoUrl,
                        Kloklocatie          = a.GewensteKlokLocatie,
                        Categorie            = a.Categorie
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

        // ────────────────────────────── Start Veiling ──────────────────────────────

        public async Task<VeilingDto?> StartVeilingAsync(StartVeilingDto dto, int gestartDoorId)
        {
            var aanmelding = await _db.Aanmeldingen
                .FirstOrDefaultAsync(a => a.AanmeldingId == dto.AanmeldingId);

            if (aanmelding is null)
                throw new InvalidOperationException("Aanmelding bestaat niet.");

            var veiling = new Veiling
            {
                Naam            = string.IsNullOrWhiteSpace(dto.Naam) ? "Veiling" : dto.Naam!,
                Status          = "Actief",
                StartTijd       = dto.StartTijd ?? DateTime.UtcNow,
                EindTijd        = null,
                GestartDoorId   = gestartDoorId,
                VeilingProducten = new List<VeilingProduct>()
            };

            // Eén product aan deze veiling koppelen op basis van de aanmelding.
            var product = new VeilingProduct
            {
                AanmeldingId   = aanmelding.AanmeldingId,
                VolgordeVeiling = 1,
                // BELANGRIJK: nooit NULL naar DB sturen
                Categorie      = string.IsNullOrWhiteSpace(aanmelding.Categorie)
                                   ? "Overig"
                                   : aanmelding.Categorie
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

        // ────────────────────────────── Archief & Stoppen ──────────────────────────────

        public async Task<IEnumerable<VeilingDto>> GetArchiefAsync()
        {
            var now = DateTime.UtcNow;

            var query = _db.Veilingen
                .Include(v => v.VeilingProducten)
                    .ThenInclude(vp => vp.Aanmelding)
                .Include(v => v.VeilingProducten)
                    .ThenInclude(vp => vp.Toewijzingen)
                .Where(v =>
                    v.Status == "Afgerond" ||
                    (v.EindTijd != null && v.EindTijd <= now));

            var list = await query.ToListAsync();
            return list.Select(MapToVeilingDto).ToList();
        }

        public async Task<bool> StopVeilingAsync(int id)
        {
            var veiling = await _db.Veilingen.FindAsync(id);
            if (veiling == null) return false;

            veiling.Status  = "Afgerond";
            veiling.EindTijd = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return true;
        }
    }
}
