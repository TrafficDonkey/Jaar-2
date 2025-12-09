using VeilingApi.Models;

namespace VeilingApi.Services
{
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

        // Huidige actieve veiling voor de kopersklok
        Task<ActieveVeilingDto?> GetActieveAsync();

        // Start een veiling vanuit één Aanmelding
        Task<VeilingDto?> StartVeilingAsync(StartVeilingDto dto, int gestartDoorId);
    }
}
