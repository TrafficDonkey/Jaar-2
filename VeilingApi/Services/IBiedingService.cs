// IBiedingService.cs
// Interface die de servicecontracten definieert voor BiedingService.
// Beschrijft de CRUD-operaties voor biedingen binnen veilingen.

using VeilingApi.Models;

namespace VeilingApi.Services;

public interface IBiedingService
{
    // Haal alle biedingen op (inclusief gerelateerde gegevens zoals gebruiker en product)
    Task<List<BiedingDto>> GetAllAsync();

    // Haal één bieding op via ID
    Task<BiedingDto?> GetByIdAsync(int id);

    // Maak een nieuwe bieding aan
    Task<BiedingDto> CreateAsync(CreateBiedingDto dto);

    // Verwijder een bieding via ID
    Task<bool> DeleteAsync(int id);
}
