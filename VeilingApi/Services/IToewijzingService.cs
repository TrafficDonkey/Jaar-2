using VeilingApi.Models;

namespace VeilingApi.Services;

public interface IToewijzingService
{
    Task<List<ToewijzingDto>> GetAllAsync();
    Task<ToewijzingDto?> GetByIdAsync(int id);
    Task<ToewijzingDto> CreateAsync(CreateToewijzingDto dto);
    Task<bool> DeleteAsync(int id);
}
