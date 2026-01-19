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

