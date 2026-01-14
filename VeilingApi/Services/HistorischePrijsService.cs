// HistorischePrijsService.cs
// Haalt historische prijsinformatie op via raw SQL voor performance.

using Microsoft.Data.SqlClient;
using VeilingApi.Models;

namespace VeilingApi.Services;

public class HistorischePrijsService : IHistorischePrijsService
{
    private readonly string _connectionString;

    public HistorischePrijsService(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("Connection string 'Default' ontbreekt.");
    }

    public async Task<HistorischePrijzenResponseDto?> GetHistorischePrijzenAsync(int veilingProductId)
    {
        await using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();

        var meta = await GetProductMetaAsync(conn, veilingProductId);
        if (meta is null)
        {
            return null;
        }

        var (categorie, aanvoerderId, aanvoerderNaam) = meta.Value;

        var laatste10Aanvoerder = await GetLaatstePrijzenAsync(conn, categorie, aanvoerderId);
        var gemiddeldeAanvoerder = await GetGemiddeldeAsync(conn, categorie, aanvoerderId);

        var laatste10Alle = await GetLaatstePrijzenAsync(conn, categorie, null);
        var gemiddeldeAlle = await GetGemiddeldeAsync(conn, categorie, null);

        return new HistorischePrijzenResponseDto
        {
            Categorie = categorie,
            AanvoerderNaam = aanvoerderNaam,
            Laatste10Aanvoerder = laatste10Aanvoerder,
            GemiddeldeAanvoerder = gemiddeldeAanvoerder,
            Laatste10Alle = laatste10Alle,
            GemiddeldeAlle = gemiddeldeAlle
        };
    }

    private static async Task<(string categorie, int aanvoerderId, string aanvoerderNaam)?> GetProductMetaAsync(
        SqlConnection conn,
        int veilingProductId)
    {
        // Haal categorie + aanvoerder op voor het gekozen veilingproduct (nodig voor filters en labels).
        const string sql = @"
SELECT TOP 1
    vp.Categorie,
    a.GebruikerId,
    g.Naam
FROM VeilingProduct vp
INNER JOIN Aanmeldingen a ON a.AanmeldingId = vp.AanmeldingId
INNER JOIN Gebruikers g ON g.GebruikerId = a.GebruikerId
WHERE vp.VeilingProductId = @VeilingProductId;";

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@VeilingProductId", veilingProductId);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return null;
        }

        var categorie = reader.GetString(0);
        var aanvoerderId = reader.GetInt32(1);
        var aanvoerderNaam = reader.GetString(2);

        return (categorie, aanvoerderId, aanvoerderNaam);
    }

    private static async Task<List<HistorischePrijsItemDto>> GetLaatstePrijzenAsync(
        SqlConnection conn,
        string categorie,
        int? aanvoerderId)
    {
        // Laatste 10 toewijzingen voor deze categorie; optioneel gefilterd op aanvoerder.
        var sql = @"
SELECT TOP 10
    g.Naam,
    t.Datum,
    t.EindPrijs
FROM Toewijzingen t
INNER JOIN VeilingProduct vp ON vp.VeilingProductId = t.VeilingProductId
INNER JOIN Aanmeldingen a ON a.AanmeldingId = vp.AanmeldingId
INNER JOIN Gebruikers g ON g.GebruikerId = a.GebruikerId
WHERE vp.Categorie = @Categorie";

        if (aanvoerderId.HasValue)
        {
            // Filter alleen op de huidige aanvoerder wanneer een ID is meegegeven.
            sql += " AND a.GebruikerId = @AanvoerderId";
        }

        // Nieuwste toewijzingen eerst.
        sql += " ORDER BY t.Datum DESC;";

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@Categorie", categorie);
        if (aanvoerderId.HasValue)
        {
            cmd.Parameters.AddWithValue("@AanvoerderId", aanvoerderId.Value);
        }

        var result = new List<HistorischePrijsItemDto>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            result.Add(new HistorischePrijsItemDto
            {
                AanvoerderNaam = reader.GetString(0),
                Datum = reader.GetDateTime(1),
                PrijsPerBloem = reader.GetDecimal(2)
            });
        }

        return result;
    }

    private static async Task<decimal> GetGemiddeldeAsync(
        SqlConnection conn,
        string categorie,
        int? aanvoerderId)
    {
        // Gemiddelde eindprijs over alle toewijzingen; optioneel gefilterd op aanvoerder.
        var sql = @"
SELECT AVG(CAST(t.EindPrijs AS decimal(10,2)))
FROM Toewijzingen t
INNER JOIN VeilingProduct vp ON vp.VeilingProductId = t.VeilingProductId
INNER JOIN Aanmeldingen a ON a.AanmeldingId = vp.AanmeldingId
WHERE vp.Categorie = @Categorie";

        if (aanvoerderId.HasValue)
        {
            // Filter alleen op de huidige aanvoerder wanneer een ID is meegegeven.
            sql += " AND a.GebruikerId = @AanvoerderId";
        }

        sql += ";";

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@Categorie", categorie);
        if (aanvoerderId.HasValue)
        {
            cmd.Parameters.AddWithValue("@AanvoerderId", aanvoerderId.Value);
        }

        var value = await cmd.ExecuteScalarAsync();
        if (value is null || value == DBNull.Value)
        {
            return 0m;
        }

        return Convert.ToDecimal(value);
    }
}
