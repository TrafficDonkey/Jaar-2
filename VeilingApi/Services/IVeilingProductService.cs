// IVeilingProductService.cs
// Interface voor de service rond veilingproducten (kavels).

using VeilingApi.Models;

namespace VeilingApi.Services;

public interface IVeilingProductService
{
    // Haal alle veilingproducten op
    Task<List<VeilingProductDto>> GetAllAsync();

    // Haal alle kavels voor één veiling op
    Task<List<VeilingProductDto>> GetByVeilingAsync(int veilingId);

    // Haal één veilingproduct op via ID
    Task<VeilingProductDto?> GetByIdAsync(int id);

    // Maak een nieuw veilingproduct aan
    Task<VeilingProductDto> CreateAsync(CreateVeilingProductDto dto);

    // Werk een bestaand veilingproduct bij
    Task<bool> UpdateAsync(UpdateVeilingProductDto dto);

    // Verwijder een veilingproduct via ID
    Task<bool> DeleteAsync(int id);
}
