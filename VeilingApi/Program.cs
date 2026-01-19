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

// Voorkom crashes door Windows Event Log (geen rechten in sommige omgevingen).
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

builder.Services.AddControllers(options =>
{
    options.ModelBinderProviders.Insert(0, new FlexibleDecimalModelBinderProvider());
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var connectionString =
    builder.Configuration.GetConnectionString("DefaultConnection")
    ?? builder.Configuration.GetConnectionString("Default")
    ?? builder.Configuration["DefaultConnection"]
    ?? builder.Configuration["Default"];

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
        var devOrigins = new[]
        {
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174"
        };

        var configuredOrigins = builder.Configuration
            .GetSection("Cors:AllowedOrigins")
            .Get<string[]>();

        var configuredOriginsRaw =
            builder.Configuration["Cors:AllowedOrigins"]
            ?? builder.Configuration["CORS_ORIGINS"];

        if ((configuredOrigins == null || configuredOrigins.Length == 0) &&
            !string.IsNullOrWhiteSpace(configuredOriginsRaw))
        {
            configuredOrigins = configuredOriginsRaw
                .Split(new[] { ';', ',' }, StringSplitOptions.RemoveEmptyEntries)
                .Select(o => o.Trim())
                .Where(o => !string.IsNullOrWhiteSpace(o))
                .ToArray();
        }

        var allowedOrigins = (configuredOrigins != null && configuredOrigins.Length > 0)
            ? configuredOrigins
            : devOrigins;

        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
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

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

using (var scope = app.Services.CreateScope())
{
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var dbAvailable = true;
        try
        {
            // Let op: verbinden met de doel-database kan falen als deze nog niet bestaat.
            // Check daarom server/instance-bereikbaarheid via 'master', zodat migraties de DB kunnen aanmaken.
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
                app.Logger.LogWarning(
                    ex,
                    "Database niet beschikbaar; migraties/seed worden overgeslagen."
                );
            }
            catch
            {
                // Sommige omgevingen hebben geen rechten om naar Windows Event Log te schrijven.
            }
        }

        if (dbAvailable && app.Environment.IsDevelopment())
        {
            db.Database.Migrate();
        }

        var seedAdminEnabled =
            app.Environment.IsDevelopment()
            || app.Configuration.GetValue<bool>("Seed:AdminEnabled");

        if (dbAvailable && seedAdminEnabled)
        {
            var adminEmail = app.Configuration["Seed:AdminEmail"] ?? "admin@floraflow.nl";
            var adminName = app.Configuration["Seed:AdminName"] ?? "Beheerder";
            var adminPassword = app.Configuration["Seed:AdminPassword"];

            if (string.IsNullOrWhiteSpace(adminPassword))
            {
                if (app.Environment.IsDevelopment())
                {
                    adminPassword = "Admin123!";
                }
                else
                {
                    app.Logger.LogWarning(
                        "Seed:AdminEnabled is true maar Seed:AdminPassword ontbreekt; admin-seed wordt overgeslagen."
                    );
                    seedAdminEnabled = false;
                }
            }

            if (seedAdminEnabled && !db.Gebruikers.Any(g => g.Email == adminEmail))
            {
                var admin = new Gebruiker
                {
                    Naam = adminName,
                    Email = adminEmail,
                    Rol = "Admin",
                    WachtwoordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword)
                };

                db.Gebruikers.Add(admin);
                db.SaveChanges();
            }
        }
    }
    catch (Exception ex)
    {
        // Laat de API wél opstarten zodat de frontend geen "Failed to fetch" krijgt.
        try
        {
            app.Logger.LogError(ex, "Database initialisatie mislukt; controleer SQL Server/LocalDB.");
        }
        catch
        {
            // Sommige omgevingen hebben geen rechten om naar Windows Event Log te schrijven.
        }
    }
}

app.UseHttpsRedirection();
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
