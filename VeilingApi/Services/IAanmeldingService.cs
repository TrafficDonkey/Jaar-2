// IAanmeldingService.cs
// Interface die de servicecontracten definieert voor AanmeldingService.
// Beschrijft alle CRUD-operaties voor aanmeldingen én methodes om
// aanmeldingen per gebruiker/aanvoerder op te halen.

using VeilingApi.Models;

namespace VeilingApi.Services;

public interface IAanmeldingService
{
    // Haal alle aanmeldingen op
    Task<List<AanmeldingDto>> GetAllAsync();

    // Haal één aanmelding op via ID
    Task<AanmeldingDto?> GetByIdAsync(int id);

    // Maak een nieuwe aanmelding aan
    Task<AanmeldingDto> CreateAsync(CreateAanmeldingDto dto);

    // Werk een bestaande aanmelding bij
    Task<bool> UpdateAsync(UpdateAanmeldingDto dto);

    // Verwijder een aanmelding via ID
    Task<bool> DeleteAsync(int id);

    // Aanmeldingen voor een gebruiker met rol Aanvoerder
    Task<List<AanmeldingDto>> GetForAanvoerderAsync(int gebruikerId);

    // Aanmeldingen voor een willekeurige gebruiker (controller verwacht deze naam)
    Task<List<AanmeldingDto>> GetByGebruikerAsync(int gebruikerId);
}
