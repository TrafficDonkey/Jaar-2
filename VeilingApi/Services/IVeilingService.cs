// IVeilingService.cs
// Interface voor alle logica rondom veilingen.
// Bevat CRUD-operaties en extra methodes voor o.a. de koperspagina.

using VeilingApi.Models;

namespace VeilingApi.Services;

public interface IVeilingService
{
    // Alle veilingen
    Task<List<VeilingDto>> GetAllAsync();

    // Eén veiling op ID
    Task<VeilingDto?> GetByIdAsync(int id);

    // Nieuwe veiling aanmaken
    Task<VeilingDto> CreateAsync(CreateVeilingDto dto);

    // Bestaande veiling bijwerken
    Task<bool> UpdateAsync(UpdateVeilingDto dto);

    // Verwijderen op ID
    Task<bool> DeleteAsync(int id);

    // ────────────────────────────── Nieuw voor kopers ──────────────────────────────
    // Haal de huidige actieve veiling op, inclusief het product dat nu op de klok staat.
    Task<ActieveVeilingDto?> GetActieveAsync();

    // Optioneel: vanuit een aanmelding direct een veiling starten
    Task<VeilingDto?> StartVeilingAsync(StartVeilingDto dto);
}
