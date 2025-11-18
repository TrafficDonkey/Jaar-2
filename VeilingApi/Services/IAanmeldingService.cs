// IAanmeldingService.cs
// Interface met alle operaties rond Aanmeldingen.

using VeilingApi.Models;

namespace VeilingApi.Services;

public interface IAanmeldingService
{
    // Alle aanmeldingen (beheer / rapportage)
    Task<List<AanmeldingDto>> GetAllAsync();

    // Detailweergave
    Task<AanmeldingDto?> GetByIdAsync(int id);

    // Aanmeldingen per gebruiker (aanvoerder)
    Task<List<AanmeldingDto>> GetByGebruikerAsync(int gebruikerId);

    // Nieuwe aanmelding
    Task<AanmeldingDto> CreateAsync(CreateAanmeldingDto dto);

    // Wijzig bestaande aanmelding
    Task<bool> UpdateAsync(UpdateAanmeldingDto dto);

    // Verwijder aanmelding
    Task<bool> DeleteAsync(int id);
}
