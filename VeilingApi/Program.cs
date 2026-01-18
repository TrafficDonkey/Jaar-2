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

var connectionString =
    builder.Configuration.GetConnectionString("DefaultConnection")
    ?? builder.Configuration.GetConnectionString("Default")
    // Alternatieve keys (bijv. als iemand het als app setting zet)
    ?? builder.Configuration["ConnectionStrings:DefaultConnection"]
    ?? builder.Configuration["ConnectionStrings:Default"]
    ?? builder.Configuration["DefaultConnection"]
    ?? builder.Configuration["Default"]
    // Azure App Service "Connection strings" slot
    ?? GetAzureAppServiceConnStr("DefaultConnection")
    ?? GetAzureAppServiceConnStr("Default");

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

using (var scope = app.Services.CreateScope())
{
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var dbAvailable = true;
        try
        {
            // Check bereikbaarheid via master zodat migraties de database kunnen aanmaken.
            var csb = new SqlConnectionStringBuilder(connectionString)
            {
                ConnectTimeout = 2
            };
            csb.InitialCatalog = "master";
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
        }

        if (dbAvailable)
        {
            db.Database.Migrate();

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
        context.Response.StatusCode = IsSqlException(ex) ? 503 : 500;
        var msg = IsSqlException(ex)
            ? "Database is niet beschikbaar. Controleer SQL Server/LocalDB en probeer opnieuw."
            : "Er is iets misgegaan. Probeer het later opnieuw.";
        await context.Response.WriteAsJsonAsync(new
        {
            Message = msg
        });
    }
});

app.MapControllers();

app.Run();

