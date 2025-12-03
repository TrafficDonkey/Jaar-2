// IToewijzingService.cs
// Interface voor ToewijzingService. Bevat algemene CRUD én methodes
// om toewijzingen op te halen voor:
// 1) producten van een aanvoerder (eigenaar van de aanmelding)
// 2) toewijzingen waarbij de gebruiker zelf koper is.

using VeilingApi.Models;

namespace VeilingApi.Services;

public interface IToewijzingService
{
    Task<List<ToewijzingDto>> GetAllAsync();
    Task<ToewijzingDto?> GetByIdAsync(int id);
    Task<ToewijzingDto> CreateAsync(CreateToewijzingDto dto);
    Task<bool> DeleteAsync(int id);

    // Toewijzingen voor kavels waarvan de Aanmelding toebehoort aan deze gebruiker
    Task<List<ToewijzingDto>> GetForAanvoerderAsync(int gebruikerId);

    // Toewijzingen waarbij deze gebruiker koper is
    Task<List<ToewijzingDto>> GetByGebruikerAsync(int gebruikerId);
}
