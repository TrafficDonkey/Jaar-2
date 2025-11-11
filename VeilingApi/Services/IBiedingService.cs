using VeilingApi.Models;

namespace VeilingApi.Services;

public interface IBiedingService
{
    Task<List<BiedingDto>> GetAllAsync();
    Task<BiedingDto?> GetByIdAsync(int id);
    Task<BiedingDto> CreateAsync(CreateBiedingDto dto);
    Task<bool> DeleteAsync(int id);
}
