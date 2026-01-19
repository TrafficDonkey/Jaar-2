using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Linq;
using System.Text;
using VeilingApi.Data;
using VeilingApi.Models;
using VeilingApi.ModelBinding;
using VeilingApi.Services;

var builder = WebApplication.CreateBuilder(args);

// Azure App Service: bind naar de PORT die door het platform wordt gezet.
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// Voorkom issues met Windows Event Log providers in sommige omgevingen.
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

builder.Services.AddControllers(options =>
{
    options.ModelBinderProviders.Insert(0, new FlexibleDecimalModelBinderProvider());
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

static string? GetAzureAppServiceConnStr(string name)
{
    // Azure App Service (Connection strings) expose env vars like:
    // - SQLAZURECONNSTR_<name>
    // - SQLCONNSTR_<name>
    // - MYSQLCONNSTR_<name>
    // - CUSTOMCONNSTR_<name>
    return Environment.GetEnvironmentVariable($"SQLAZURECONNSTR_{name}")
        ?? Environment.GetEnvironmentVariable($"SQLCONNSTR_{name}")
        ?? Environment.GetEnvironmentVariable($"MYSQLCONNSTR_{name}")
        ?? Environment.GetEnvironmentVariable($"CUSTOMCONNSTR_{name}");
}

static (string? ConnectionString, string Source) ResolveConnectionString(WebApplicationBuilder builder)
{
    string? cs;

    cs = builder.Configuration.GetConnectionString("DefaultConnection");
    if (!string.IsNullOrWhiteSpace(cs)) return (cs, "appsettings:ConnectionStrings:DefaultConnection");

    cs = builder.Configuration.GetConnectionString("Default");
    if (!string.IsNullOrWhiteSpace(cs)) return (cs, "appsettings:ConnectionStrings:Default");

    cs = builder.Configuration["ConnectionStrings:DefaultConnection"];
    if (!string.IsNullOrWhiteSpace(cs)) return (cs, "config:ConnectionStrings:DefaultConnection");

    cs = builder.Configuration["ConnectionStrings:Default"];
    if (!string.IsNullOrWhiteSpace(cs)) return (cs, "config:ConnectionStrings:Default");

    cs = builder.Configuration["DefaultConnection"];
    if (!string.IsNullOrWhiteSpace(cs)) return (cs, "config:DefaultConnection");

    cs = builder.Configuration["Default"];
    if (!string.IsNullOrWhiteSpace(cs)) return (cs, "config:Default");

    cs = GetAzureAppServiceConnStr("DefaultConnection");
    if (!string.IsNullOrWhiteSpace(cs)) return (cs, "appservice:SQL*CONNSTR_DefaultConnection");

    cs = GetAzureAppServiceConnStr("Default");
    if (!string.IsNullOrWhiteSpace(cs)) return (cs, "appservice:SQL*CONNSTR_Default");

    return (null, "none");
}

var (connectionString, connectionStringSource) = ResolveConnectionString(builder);

if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "Geen connection string gevonden. Verwacht ConnectionStrings:DefaultConnection of ConnectionStrings:Default."
    );
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));

builder.Services.AddScoped<IGebruikerService, GebruikerService>();
builder.Services.AddScoped<IAanmeldingService, AanmeldingService>();
builder.Services.AddScoped<IVeilingService, VeilingService>();
builder.Services.AddScoped<IVeilingProductService, VeilingProductService>();
builder.Services.AddScoped<IBiedingService, BiedingService>();
builder.Services.AddScoped<IToewijzingService, ToewijzingService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IHistorischePrijsService, HistorischePrijsService>();

builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var errors = context.ModelState
            .Where(e => e.Value?.Errors.Count > 0)
            .Select(e => new
            {
                Field = e.Key,
                Errors = e.Value?.Errors.Select(er => er.ErrorMessage) ?? Enumerable.Empty<string>()
            });

        return new BadRequestObjectResult(new
        {
            Message = "Sommige velden zijn niet correct ingevuld.",
            Fouten = errors
        });
    };
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("web", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
        {
            if (string.IsNullOrWhiteSpace(origin)) return false;

            if (origin.StartsWith("http://localhost:", StringComparison.OrdinalIgnoreCase)) return true;
            if (origin.StartsWith("http://127.0.0.1:", StringComparison.OrdinalIgnoreCase)) return true;

            // Production frontend (Vercel)
            if (string.Equals(origin, "https://floraflow1223.vercel.app", StringComparison.OrdinalIgnoreCase))
                return true;
            if (string.Equals(origin, "https://jaar-2-red.vercel.app", StringComparison.OrdinalIgnoreCase))
                return true;

            // Allow Vercel preview deployments
            if (origin.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase)) return true;

            return false;
        })
        .AllowAnyHeader()
        .AllowAnyMethod();
    });
});

var jwt = builder.Configuration.GetSection("Jwt");
var jwtKey = jwt.GetValue<string>("Key")
    ?? throw new InvalidOperationException("Jwt:Key ontbreekt.");
var jwtIssuer = jwt.GetValue<string>("Issuer")
    ?? throw new InvalidOperationException("Jwt:Issuer ontbreekt.");
var jwtAudience = jwt.GetValue<string>("Audience")
    ?? throw new InvalidOperationException("Jwt:Audience ontbreekt.");

var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = signingKey,
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            ClockSkew = TimeSpan.Zero
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                if (string.IsNullOrEmpty(ctx.Token) &&
                    ctx.Request.Cookies.TryGetValue("access_token", out var t))
                {
                    ctx.Token = t;
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

static bool IsSqlException(Exception ex)
{
    for (var e = ex; e != null; e = e.InnerException)
    {
        if (e is SqlException) return true;
    }

    return false;
}

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

var enableSqlDiagnostics =
    string.Equals(Environment.GetEnvironmentVariable("ENABLE_SQL_DIAGNOSTICS"), "true", StringComparison.OrdinalIgnoreCase)
    || string.Equals(builder.Configuration["ENABLE_SQL_DIAGNOSTICS"], "true", StringComparison.OrdinalIgnoreCase);

static SqlException? FindSqlException(Exception ex)
{
    for (var e = ex; e != null; e = e.InnerException)
    {
        if (e is SqlException sql) return sql;
    }
    return null;
}

static async Task EnsureGebruikerColumnsAsync(string connectionString, ILogger logger)
{
    await using var con = new SqlConnection(connectionString);
    await con.OpenAsync();

    static async Task<HashSet<string>> GetColumnsAsync(SqlConnection con, string tableName)
    {
        var cols = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        await using var cmd = con.CreateCommand();
        cmd.CommandText = @"
SELECT c.[name]
FROM sys.columns c
JOIN sys.objects o ON c.object_id = o.object_id
WHERE o.[type] = 'U' AND o.[name] = @t";
        cmd.Parameters.AddWithValue("@t", tableName);
        await using var rdr = await cmd.ExecuteReaderAsync();
        while (await rdr.ReadAsync())
        {
            cols.Add(rdr.GetString(0));
        }
        return cols;
    }

    static async Task<string?> FindTableAsync(SqlConnection con, params string[] candidates)
    {
        if (candidates is null || candidates.Length == 0) return null;

        await using var cmd = con.CreateCommand();
        var names = new List<string>();
        for (var i = 0; i < candidates.Length; i++)
        {
            var p = $"@t{i}";
            names.Add(p);
            cmd.Parameters.AddWithValue(p, candidates[i]);
        }

        cmd.CommandText =
            $"SELECT TOP (1) [name] FROM sys.objects WHERE [type] = 'U' AND [name] IN ({string.Join(", ", names)})";
        var result = await cmd.ExecuteScalarAsync();
        return result?.ToString();
    }

    var table = await FindTableAsync(con, "Gebruikers", "Gebruiker");
    if (string.IsNullOrWhiteSpace(table))
    {
        logger.LogWarning("Geen gebruikers-tabel gevonden; schema-fix wordt overgeslagen.");
        return;
    }

    var existing = await GetColumnsAsync(con, table);

    var required = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        ["TelefoonLand"] = "nvarchar(2) NULL",
        ["TelefoonNummer"] = "nvarchar(25) NULL",
        ["AdresStraat"] = "nvarchar(120) NULL",
        ["Huisnummer"] = "nvarchar(20) NULL",
        ["Postcode"] = "nvarchar(16) NULL",
        ["TwoFactorEnabled"] = "bit NOT NULL DEFAULT(0)",
        ["TwoFactorSecret"] = "nvarchar(64) NULL"
    };

    foreach (var (col, definition) in required)
    {
        if (existing.Contains(col)) continue;
        await using var cmd = con.CreateCommand();
        cmd.CommandText = $"ALTER TABLE [dbo].[{table}] ADD [{col}] {definition};";
        await cmd.ExecuteNonQueryAsync();
        logger.LogInformation("DB schema: added column {Table}.{Column}", table, col);
    }
}

static async Task EnsureCoreSchemaAsync(string connectionString, ILogger logger)
{
    await using var con = new SqlConnection(connectionString);
    await con.OpenAsync();

    static async Task<bool> TableExistsAsync(SqlConnection con, string tableName)
    {
        await using var cmd = con.CreateCommand();
        cmd.CommandText = "SELECT 1 FROM sys.objects WHERE [type] = 'U' AND [name] = @t";
        cmd.Parameters.AddWithValue("@t", tableName);
        var result = await cmd.ExecuteScalarAsync();
        return result is not null;
    }

    static async Task<HashSet<string>> GetColumnsAsync(SqlConnection con, string tableName)
    {
        var cols = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        await using var cmd = con.CreateCommand();
        cmd.CommandText = @"
SELECT c.[name]
FROM sys.columns c
JOIN sys.objects o ON c.object_id = o.object_id
WHERE o.[type] = 'U' AND o.[name] = @t";
        cmd.Parameters.AddWithValue("@t", tableName);
        await using var rdr = await cmd.ExecuteReaderAsync();
        while (await rdr.ReadAsync())
        {
            cols.Add(rdr.GetString(0));
        }
        return cols;
    }

    static async Task EnsureTableAsync(
        SqlConnection con,
        ILogger logger,
        string preferredName,
        string createTableSql,
        Dictionary<string, string> requiredColumns
    )
    {
        var exists = await TableExistsAsync(con, preferredName);
        if (!exists)
        {
            await using var create = con.CreateCommand();
            create.CommandText = createTableSql;
            await create.ExecuteNonQueryAsync();
            logger.LogInformation("DB schema: created table {Table}", preferredName);
        }

        var existing = await GetColumnsAsync(con, preferredName);
        foreach (var (col, definition) in requiredColumns)
        {
            if (existing.Contains(col)) continue;
            await using var cmd = con.CreateCommand();
            cmd.CommandText = $"ALTER TABLE [dbo].[{preferredName}] ADD [{col}] {definition};";
            await cmd.ExecuteNonQueryAsync();
            logger.LogInformation("DB schema: added column {Table}.{Column}", preferredName, col);
        }
    }

    await EnsureTableAsync(
        con,
        logger,
        preferredName: "Gebruikers",
        createTableSql: @"
IF OBJECT_ID(N'[dbo].[Gebruikers]', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[Gebruikers](
    [GebruikerId] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [Naam] nvarchar(100) NOT NULL DEFAULT(''),
    [Email] nvarchar(256) NOT NULL DEFAULT(''),
    [WachtwoordHash] nvarchar(255) NOT NULL DEFAULT(''),
    [Rol] nvarchar(40) NOT NULL DEFAULT('Klant'),
    [TelefoonLand] nvarchar(2) NULL,
    [TelefoonNummer] nvarchar(25) NULL,
    [AdresStraat] nvarchar(120) NULL,
    [Huisnummer] nvarchar(20) NULL,
    [Postcode] nvarchar(16) NULL,
    [TwoFactorEnabled] bit NOT NULL DEFAULT(0),
    [TwoFactorSecret] nvarchar(64) NULL
  );
END",
        requiredColumns: new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["Naam"] = "nvarchar(100) NOT NULL DEFAULT('')",
            ["Email"] = "nvarchar(256) NOT NULL DEFAULT('')",
            ["WachtwoordHash"] = "nvarchar(255) NOT NULL DEFAULT('')",
            ["Rol"] = "nvarchar(40) NOT NULL DEFAULT('Klant')",
            ["TelefoonLand"] = "nvarchar(2) NULL",
            ["TelefoonNummer"] = "nvarchar(25) NULL",
            ["AdresStraat"] = "nvarchar(120) NULL",
            ["Huisnummer"] = "nvarchar(20) NULL",
            ["Postcode"] = "nvarchar(16) NULL",
            ["TwoFactorEnabled"] = "bit NOT NULL DEFAULT(0)",
            ["TwoFactorSecret"] = "nvarchar(64) NULL"
        }
    );

    await EnsureTableAsync(
        con,
        logger,
        preferredName: "Aanmeldingen",
        createTableSql: @"
IF OBJECT_ID(N'[dbo].[Aanmeldingen]', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[Aanmeldingen](
    [AanmeldingId] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [FotoData] varbinary(max) NULL,
    [FotoContentType] nvarchar(100) NULL,
    [FotoFileName] nvarchar(255) NULL,
    [ProductBeschrijving] nvarchar(max) NOT NULL DEFAULT(''),
    [Hoeveelheid] int NOT NULL DEFAULT(0),
    [MinimumPrijs] decimal(10,2) NOT NULL DEFAULT(0),
    [GewensteKlokLocatie] nvarchar(max) NOT NULL DEFAULT(''),
    [GewensteVeilDatum] datetime2 NOT NULL DEFAULT(sysutcdatetime()),
    [Categorie] nvarchar(100) NOT NULL DEFAULT(''),
    [GebruikerId] int NOT NULL DEFAULT(0)
  );
END",
        requiredColumns: new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["FotoData"] = "varbinary(max) NULL",
            ["FotoContentType"] = "nvarchar(100) NULL",
            ["FotoFileName"] = "nvarchar(255) NULL",
            ["ProductBeschrijving"] = "nvarchar(max) NOT NULL DEFAULT('')",
            ["Hoeveelheid"] = "int NOT NULL DEFAULT(0)",
            ["MinimumPrijs"] = "decimal(10,2) NOT NULL DEFAULT(0)",
            ["GewensteKlokLocatie"] = "nvarchar(max) NOT NULL DEFAULT('')",
            ["GewensteVeilDatum"] = "datetime2 NOT NULL DEFAULT(sysutcdatetime())",
            ["Categorie"] = "nvarchar(100) NOT NULL DEFAULT('')",
            ["GebruikerId"] = "int NOT NULL DEFAULT(0)"
        }
    );

    await EnsureTableAsync(
        con,
        logger,
        preferredName: "Veilingen",
        createTableSql: @"
IF OBJECT_ID(N'[dbo].[Veilingen]', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[Veilingen](
    [VeilingId] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [Naam] nvarchar(100) NOT NULL DEFAULT(''),
    [Status] nvarchar(40) NOT NULL DEFAULT('Concept'),
    [StartTijd] datetime2 NOT NULL DEFAULT(sysutcdatetime()),
    [EindTijd] datetime2 NULL,
    [GestartDoorId] int NOT NULL DEFAULT(0)
  );
END",
        requiredColumns: new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["Naam"] = "nvarchar(100) NOT NULL DEFAULT('')",
            ["Status"] = "nvarchar(40) NOT NULL DEFAULT('Concept')",
            ["StartTijd"] = "datetime2 NOT NULL DEFAULT(sysutcdatetime())",
            ["EindTijd"] = "datetime2 NULL",
            ["GestartDoorId"] = "int NOT NULL DEFAULT(0)"
        }
    );

    await EnsureTableAsync(
        con,
        logger,
        preferredName: "VeilingProducten",
        createTableSql: @"
IF OBJECT_ID(N'[dbo].[VeilingProducten]', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[VeilingProducten](
    [VeilingProductId] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [VeilingId] int NOT NULL DEFAULT(0),
    [AanmeldingId] int NOT NULL DEFAULT(0),
    [VolgordeVeiling] int NOT NULL DEFAULT(0),
    [Categorie] nvarchar(100) NOT NULL DEFAULT('')
  );
END",
        requiredColumns: new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["VeilingId"] = "int NOT NULL DEFAULT(0)",
            ["AanmeldingId"] = "int NOT NULL DEFAULT(0)",
            ["VolgordeVeiling"] = "int NOT NULL DEFAULT(0)",
            ["Categorie"] = "nvarchar(100) NOT NULL DEFAULT('')"
        }
    );

    await EnsureTableAsync(
        con,
        logger,
        preferredName: "Biedingen",
        createTableSql: @"
IF OBJECT_ID(N'[dbo].[Biedingen]', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[Biedingen](
    [BiedingId] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [Bedrag] decimal(10,2) NOT NULL DEFAULT(0),
    [Tijdstip] datetime2 NOT NULL DEFAULT(sysutcdatetime()),
    [VeilingProductId] int NOT NULL DEFAULT(0),
    [GebruikerId] int NOT NULL DEFAULT(0)
  );
END",
        requiredColumns: new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["Bedrag"] = "decimal(10,2) NOT NULL DEFAULT(0)",
            ["Tijdstip"] = "datetime2 NOT NULL DEFAULT(sysutcdatetime())",
            ["VeilingProductId"] = "int NOT NULL DEFAULT(0)",
            ["GebruikerId"] = "int NOT NULL DEFAULT(0)"
        }
    );

    await EnsureTableAsync(
        con,
        logger,
        preferredName: "Toewijzingen",
        createTableSql: @"
IF OBJECT_ID(N'[dbo].[Toewijzingen]', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[Toewijzingen](
    [ToewijzingId] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [Aantal] int NOT NULL DEFAULT(0),
    [EindPrijs] decimal(10,2) NOT NULL DEFAULT(0),
    [Datum] datetime2 NOT NULL DEFAULT(sysutcdatetime()),
    [VeilingProductId] int NOT NULL DEFAULT(0),
    [KoperId] int NOT NULL DEFAULT(0)
  );
END",
        requiredColumns: new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["Aantal"] = "int NOT NULL DEFAULT(0)",
            ["EindPrijs"] = "decimal(10,2) NOT NULL DEFAULT(0)",
            ["Datum"] = "datetime2 NOT NULL DEFAULT(sysutcdatetime())",
            ["VeilingProductId"] = "int NOT NULL DEFAULT(0)",
            ["KoperId"] = "int NOT NULL DEFAULT(0)"
        }
    );
}

string? dbDiagSource = connectionStringSource;
string? dbDiagDataSource = null;
string? dbDiagCatalog = null;
string? dbDiagUserId = null;

// Log (zonder secrets) welke connection string bron is gekozen.
try
{
    var csb = new SqlConnectionStringBuilder(connectionString);
    dbDiagDataSource = csb.DataSource;
    dbDiagCatalog = csb.InitialCatalog;
    dbDiagUserId = csb.UserID;

    app.Logger.LogInformation(
        "DB config: source={Source} dataSource={DataSource} initialCatalog={Catalog} userId={UserId}",
        connectionStringSource,
        csb.DataSource,
        csb.InitialCatalog,
        csb.UserID
    );
    Console.WriteLine(
        $"DB config: source={connectionStringSource} dataSource={csb.DataSource} initialCatalog={csb.InitialCatalog} userId={csb.UserID}"
    );
}
catch (Exception ex)
{
    app.Logger.LogWarning(ex, "DB config kon niet worden geparsed (source={Source}).", connectionStringSource);
    Console.WriteLine($"DB config parse failed: source={connectionStringSource} err={ex.Message}");
}

using (var scope = app.Services.CreateScope())
{
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var dbAvailable = true;
        try
        {
            // Probeer te verbinden met de doel-database (Azure SQL/SQL Server).
            // Gebruik een korte timeout zodat de API snel een duidelijke 503 kan teruggeven.
            var csb = new SqlConnectionStringBuilder(connectionString)
            {
                ConnectTimeout = 5
            };
            using var con = new SqlConnection(csb.ConnectionString);
            con.Open();
        }
        catch (Exception ex)
        {
            dbAvailable = false;
            try
            {
                app.Logger.LogWarning(ex, "Database niet beschikbaar; migraties/seed worden overgeslagen.");
            }
            catch { }

            Console.WriteLine($"DB connect failed: {ex.GetType().Name}: {ex.Message}");
        }

        if (dbAvailable)
        {
            // Als er geen EF migrations in de repo zitten (of nog niet zijn aangemaakt),
            // maak de tabellen aan via EnsureCreated zodat de app op Azure blijft werken.
            if (db.Database.GetMigrations().Any())
            {
                db.Database.Migrate();
            }
            else
            {
                db.Database.EnsureCreated();
            }

            // Als de DB ooit is aangemaakt zonder de nieuwste kolommen (bijv. eerder EnsureCreated),
            // voeg ontbrekende tabellen/kolommen toe zodat pagina's niet stuk gaan.
            EnsureCoreSchemaAsync(connectionString, app.Logger).GetAwaiter().GetResult();

            // Extra kolommen op de gebruikers-tabel voor profiel + 2FA.
            EnsureGebruikerColumnsAsync(connectionString, app.Logger).GetAwaiter().GetResult();

            var admin = db.Gebruikers.FirstOrDefault(g => g.Email == "admin@floraflow.nl");
            if (admin == null)
            {
                admin = new Gebruiker
                {
                    Naam = "Beheerder",
                    Email = "admin@floraflow.nl",
                    Rol = "Admin",
                    WachtwoordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!")
                };

                db.Gebruikers.Add(admin);
                db.SaveChanges();
            }
            else
            {
                var changed = false;

                if (!string.Equals(admin.Rol, "Admin", StringComparison.OrdinalIgnoreCase))
                {
                    admin.Rol = "Admin";
                    changed = true;
                }

                // Zorg dat het standaard admin-wachtwoord werkt (demo/opleiding).
                if (string.IsNullOrWhiteSpace(admin.WachtwoordHash) ||
                    !BCrypt.Net.BCrypt.Verify("Admin123!", admin.WachtwoordHash))
                {
                    admin.WachtwoordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!");
                    changed = true;
                }

                if (changed) db.SaveChanges();
            }
        }
    }
    catch (Exception ex)
    {
        try
        {
            app.Logger.LogError(ex, "Database initialisatie mislukt; controleer SQL Server/LocalDB.");
        }
        catch { }

        Console.WriteLine($"DB init failed: {ex.GetType().Name}: {ex.Message}");
    }
}

// Alleen redirect naar HTTPS in development; Azure regelt HTTPS al.
if (!app.Environment.IsProduction())
{
    app.UseHttpsRedirection();
}

app.UseRouting();
app.UseCors("web");
app.UseAuthentication();
app.UseAuthorization();

app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception ex)
    {
        // Log de echte fout in Log Stream (zonder connection string).
        try
        {
            if (IsSqlException(ex))
            {
                app.Logger.LogError(ex, "SQL error bij request {Method} {Path}", context.Request.Method, context.Request.Path);
            }
            else
            {
                app.Logger.LogError(ex, "Unhandled error bij request {Method} {Path}", context.Request.Method, context.Request.Path);
            }
        }
        catch { }

        if (IsSqlException(ex))
        {
            Console.WriteLine($"SQL error bij request {context.Request.Method} {context.Request.Path}: {ex.GetType().Name}: {ex.Message}");
        }
        else
        {
            Console.WriteLine($"Unhandled error bij request {context.Request.Method} {context.Request.Path}: {ex.GetType().Name}: {ex.Message}");
        }

        context.Response.StatusCode = IsSqlException(ex) ? 503 : 500;
        var msg = IsSqlException(ex)
            ? "Database is niet beschikbaar. Controleer Azure SQL/SQL Server (firewall + connection string) en probeer opnieuw."
            : "Er is iets misgegaan. Probeer het later opnieuw.";
        if (IsSqlException(ex) && enableSqlDiagnostics)
        {
            var sql = FindSqlException(ex);
            await context.Response.WriteAsJsonAsync(new
            {
                Message = msg,
                Debug = new
                {
                    Db = new
                    {
                        Source = dbDiagSource,
                        DataSource = dbDiagDataSource,
                        InitialCatalog = dbDiagCatalog,
                        UserId = dbDiagUserId
                    },
                    Sql = sql == null
                        ? null
                        : new
                        {
                            sql.Number,
                            sql.State,
                            sql.Class,
                            sql.Message
                        }
                }
            });
        }
        else
        {
            await context.Response.WriteAsJsonAsync(new
            {
                Message = msg
            });
        }
    }
});

app.MapControllers();

app.Run();

