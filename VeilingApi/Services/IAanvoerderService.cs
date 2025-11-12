// IAanvoerderService.cs
// Interface die de servicecontracten definieert voor AanvoerderService.
// Beschrijft alle CRUD-operaties voor aanvoerders (leveranciers van producten).

using VeilingApi.Models;

namespace VeilingApi.Services;

public interface IAanvoerderService
{
    // Haal alle aanvoerders op
    Task<List<AanvoerderDto>> GetAllAsync();

    // Haal één aanvoerder op via ID
    Task<AanvoerderDto?> GetByIdAsync(int id);

    // Maak een nieuwe aanvoerder aan
    Task<AanvoerderDto> CreateAsync(CreateAanvoerderDto dto);

    // Werk een bestaande aanvoerder bij
    Task<bool> UpdateAsync(UpdateAanvoerderDto dto);

    // Verwijder een aanvoerder via ID
    Task<bool> DeleteAsync(int id);
}
