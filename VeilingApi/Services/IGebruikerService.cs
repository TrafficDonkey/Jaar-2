using VeilingApi.Models;

namespace VeilingApi.Services;

public interface IGebruikerService
{
    Task<List<GebruikerDto>> GetAllAsync();
    Task<GebruikerDto?> GetByIdAsync(int id);
    Task<GebruikerDto> CreateAsync(CreateGebruikerDto dto);
    Task<bool> UpdateAsync(UpdateGebruikerDto dto);
    Task<bool> DeleteAsync(int id);
}
