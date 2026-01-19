using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using VeilingApi.Data;

namespace VeilingApi.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    private readonly AppDbContext _db;
    public HealthController(AppDbContext db) => _db = db;

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> Get()
    {
        static async Task<(bool Exists, string? Type)> ObjectExistsAsync(AppDbContext db, string name)
        {
            await using var con = db.Database.GetDbConnection();
            if (con.State != System.Data.ConnectionState.Open)
                await con.OpenAsync();

            await using var cmd = con.CreateCommand();
            cmd.CommandText = @"
SELECT TOP (1) o.[type]
FROM sys.objects o
WHERE o.[name] = @name AND o.[type] IN ('U','V');";
            var p = cmd.CreateParameter();
            p.ParameterName = "@name";
            p.Value = name;
            cmd.Parameters.Add(p);

            var result = await cmd.ExecuteScalarAsync();
            if (result is null) return (false, null);
            var type = result.ToString();
            return (true, type == "U" ? "TABLE" : type == "V" ? "VIEW" : type);
        }

        static async Task<HashSet<string>> GetColumnsAsync(AppDbContext db, string objectName)
        {
            await using var con = db.Database.GetDbConnection();
            if (con.State != System.Data.ConnectionState.Open)
                await con.OpenAsync();

            await using var cmd = con.CreateCommand();
            cmd.CommandText = @"
SELECT c.[name]
FROM sys.columns c
JOIN sys.objects o ON c.object_id = o.object_id
WHERE o.[name] = @name AND o.[type] IN ('U','V');";
            var p = cmd.CreateParameter();
            p.ParameterName = "@name";
            p.Value = objectName;
            cmd.Parameters.Add(p);

            var cols = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            await using var rdr = await cmd.ExecuteReaderAsync();
            while (await rdr.ReadAsync())
            {
                cols.Add(rdr.GetString(0));
            }
            return cols;
        }

        try
        {
            var dbOk = await _db.Database.CanConnectAsync();

            string? dataSource = null;
            string? catalog = null;
            try
            {
                var csb = new SqlConnectionStringBuilder(_db.Database.GetDbConnection().ConnectionString);
                dataSource = csb.DataSource;
                catalog = csb.InitialCatalog;
            }
            catch
            {
                // ignore connection-string parse errors
            }

            var (aanmeldingenExists, aanmeldingenType) = await ObjectExistsAsync(_db, "Aanmeldingen");
            var (aanmeldingExists, aanmeldingType) = await ObjectExistsAsync(_db, "Aanmelding");

            var targetName = aanmeldingenExists ? "Aanmeldingen" : aanmeldingExists ? "Aanmelding" : null;
            var missingColumns = new List<string>();
            if (targetName != null)
            {
                var cols = await GetColumnsAsync(_db, targetName);
                var required = new[]
                {
                    "ProductBeschrijving",
                    "Hoeveelheid",
                    "MinimumPrijs",
                    "GewensteKlokLocatie",
                    "GewensteVeilDatum",
                    "Categorie",
                    "GebruikerId"
                };
                missingColumns.AddRange(required.Where(c => !cols.Contains(c)));
            }

            var schemaOk = (aanmeldingenExists || aanmeldingExists) && missingColumns.Count == 0;

            return Ok(new
            {
                ok = true,
                db = new { ok = dbOk, dataSource, catalog },
                schema = new
                {
                    ok = schemaOk,
                    aanmeldingen = aanmeldingenExists ? new { exists = true, type = aanmeldingenType } : new { exists = false, type = (string?)null },
                    aanmelding = aanmeldingExists ? new { exists = true, type = aanmeldingType } : new { exists = false, type = (string?)null },
                    missingColumns = missingColumns.Count == 0 ? null : missingColumns
                }
            });
        }
        catch (Exception ex)
        {
            return Ok(new { ok = true, db = new { ok = false, error = ex.GetType().Name } });
        }
    }
}
