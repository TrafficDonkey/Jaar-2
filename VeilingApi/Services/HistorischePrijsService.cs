// HistorischePrijsService.cs
// Haalt historische prijsinformatie op met eigen SQL queries (geen Entity Framework voor dit scherm),
// zodat we gericht kunnen optimaliseren (bijv. met indexen op Categorie en Datum).

using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using VeilingApi.Data;
using VeilingApi.Models;

namespace VeilingApi.Services;

public class HistorischePrijsService : IHistorischePrijsService
{
    private readonly string _connectionString;

    public HistorischePrijsService(AppDbContext db)
    {
        _connectionString = db.Database.GetDbConnection().ConnectionString;
        if (string.IsNullOrWhiteSpace(_connectionString))
        {
            throw new InvalidOperationException("Database connection string ontbreekt.");
        }
    }

    public async Task<HistorischePrijzenResponseDto?> GetHistorischePrijzenAsync(
        int veilingProductId,
        string? productNaam = null)
    {
        await using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();

        var meta = await GetProductMetaAsync(conn, veilingProductId);
        if (meta is null)
        {
            return null;
        }

        var (categorie, metaProductNaam, aanvoerderId, aanvoerderNaam) = meta.Value;
        var paramProductNaam = productNaam?.Trim();
        var effectiveProductNaam =
            string.IsNullOrWhiteSpace(paramProductNaam) ||
            string.Equals(paramProductNaam, "-", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(paramProductNaam, categorie, StringComparison.OrdinalIgnoreCase)
                ? metaProductNaam
                : paramProductNaam;

        if (string.IsNullOrWhiteSpace(effectiveProductNaam))
        {
            effectiveProductNaam = metaProductNaam;
        }

        // Filter op productnaam (en optioneel aanvoerder) zodat "laatste 10" echt over hetzelfde product gaat.
        var laatste10Aanvoerder = await GetLaatstePrijzenAsync(conn, effectiveProductNaam, aanvoerderId);
        var gemiddeldeAanvoerder = await GetGemiddeldeAsync(conn, effectiveProductNaam, aanvoerderId);

        var laatste10Alle = await GetLaatstePrijzenAsync(conn, effectiveProductNaam, null);
        var gemiddeldeAlle = await GetGemiddeldeAsync(conn, effectiveProductNaam, null);

        return new HistorischePrijzenResponseDto
        {
            Categorie = categorie,
            ProductNaam = effectiveProductNaam,
            AanvoerderNaam = aanvoerderNaam,
            Laatste10Aanvoerder = laatste10Aanvoerder,
            GemiddeldeAanvoerder = gemiddeldeAanvoerder,
            Laatste10Alle = laatste10Alle,
            GemiddeldeAlle = gemiddeldeAlle
        };
    }

    // Productnaam afleiden uit Aanmeldingen.ProductBeschrijving:
    // - Eerst alles na de eerste '|' wegknippen (maten/extra info)
    // - Daarna alles na de eerste '-' wegknippen (details)
    // - Dan trimmen
    // Dit is robuuster dan exact ' - ' / ' | ' matchen.
    // Let op: sommige oudere data heeft per ongeluk "Categorie - Productnaam" in ProductBeschrijving staan.
    // We gebruiken daarom ook Aanmeldingen.Categorie om te bepalen of het eerste deel een categorie is.
    private const string ProductNaamExpr = @"
 LTRIM(RTRIM(
     CASE
         WHEN base.right2 <> ''
              AND LOWER(base.left2) = LOWER(LTRIM(RTRIM(a.Categorie)))
             THEN
                 LTRIM(RTRIM(
                     CASE
                         WHEN CHARINDEX('-', base.right2) > 0 THEN LEFT(base.right2, CHARINDEX('-', base.right2) - 1)
                         ELSE base.right2
                     END
                 ))
         ELSE base.left2
     END
 ))";

    private const string ProductNaamTitleExpr = @"
 LTRIM(RTRIM(
     CASE
         WHEN CHARINDEX('|', a.ProductBeschrijving) > 0 THEN LEFT(a.ProductBeschrijving, CHARINDEX('|', a.ProductBeschrijving) - 1)
         ELSE a.ProductBeschrijving
     END
 ))";

    private const string ProductNaamBaseApplyExpr = @"
 OUTER APPLY (
     SELECT
         title2 = " + ProductNaamTitleExpr + @",
         left2 = LTRIM(RTRIM(
             CASE
                 WHEN CHARINDEX('-', " + ProductNaamTitleExpr + @") > 0 THEN LEFT(" + ProductNaamTitleExpr + @", CHARINDEX('-', " + ProductNaamTitleExpr + @") - 1)
                 ELSE " + ProductNaamTitleExpr + @"
             END
         )),
         right2 = LTRIM(RTRIM(
             CASE
                 WHEN CHARINDEX('-', " + ProductNaamTitleExpr + @") > 0 THEN SUBSTRING(" + ProductNaamTitleExpr + @", CHARINDEX('-', " + ProductNaamTitleExpr + @") + 1, 4000)
                 ELSE ''
             END
         ))
 ) base";

    private static async Task<(string categorie, string productNaam, int aanvoerderId, string aanvoerderNaam)?> GetProductMetaAsync(
        SqlConnection conn,
        int veilingProductId)
    {
        // Haal categorie + productnaam + aanvoerder op voor het gekozen veilingproduct (nodig voor filters en labels).
        const string sql = @"
SELECT TOP 1
    vp.Categorie,
    " + ProductNaamExpr + @" AS ProductNaam,
    a.GebruikerId,
    g.Naam
 FROM VeilingProduct vp
 INNER JOIN Aanmeldingen a ON a.AanmeldingId = vp.AanmeldingId
 INNER JOIN Gebruikers g ON g.GebruikerId = a.GebruikerId
 " + ProductNaamBaseApplyExpr + @"
 WHERE vp.VeilingProductId = @VeilingProductId;";

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@VeilingProductId", veilingProductId);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return null;
        }

        var categorie = reader.GetString(0);
        var productNaam = reader.GetString(1);
        var aanvoerderId = reader.GetInt32(2);
        var aanvoerderNaam = reader.GetString(3);

        return (categorie, productNaam, aanvoerderId, aanvoerderNaam);
    }

    private static async Task<List<HistorischePrijsItemDto>> GetLaatstePrijzenAsync(
        SqlConnection conn,
        string productNaam,
        int? aanvoerderId)
    {
        // Laatste 10 toewijzingen voor deze productnaam; optioneel gefilterd op aanvoerder.
        var sql = @"
SELECT TOP 10
    g.Naam,
    t.Datum,
    t.EindPrijs
FROM Toewijzingen t
 INNER JOIN VeilingProduct vp ON vp.VeilingProductId = t.VeilingProductId
 INNER JOIN Aanmeldingen a ON a.AanmeldingId = vp.AanmeldingId
 INNER JOIN Gebruikers g ON g.GebruikerId = a.GebruikerId
 " + ProductNaamBaseApplyExpr + @"
 WHERE " + ProductNaamExpr + @" = @ProductNaam";

        if (aanvoerderId.HasValue)
        {
            // Filter alleen op de huidige aanvoerder wanneer een ID is meegegeven.
            sql += " AND a.GebruikerId = @AanvoerderId";
        }

        // Nieuwste toewijzingen eerst.
        sql += " ORDER BY t.Datum DESC;";

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@ProductNaam", productNaam);
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
        string productNaam,
        int? aanvoerderId)
    {
        // Gemiddelde eindprijs over alle toewijzingen; optioneel gefilterd op aanvoerder.
        var sql = @"
SELECT AVG(CAST(t.EindPrijs AS decimal(10,2)))
 FROM Toewijzingen t
 INNER JOIN VeilingProduct vp ON vp.VeilingProductId = t.VeilingProductId
 INNER JOIN Aanmeldingen a ON a.AanmeldingId = vp.AanmeldingId
 " + ProductNaamBaseApplyExpr + @"
 WHERE " + ProductNaamExpr + @" = @ProductNaam";

        if (aanvoerderId.HasValue)
        {
            // Filter alleen op de huidige aanvoerder wanneer een ID is meegegeven.
            sql += " AND a.GebruikerId = @AanvoerderId";
        }

        sql += ";";

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@ProductNaam", productNaam);
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
