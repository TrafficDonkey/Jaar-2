/// <summary>
/// Startpunt en configuratie van de VeilingApi-backend.
/// Deze klasse stelt de ASP.NET Core-applicatie in, registreert services,
/// configureert Entity Framework Core, stelt JWT-authenticatie en CORS in,
/// en definieert de middleware-pipeline.
/// </summary>

using Microsoft.EntityFrameworkCore;
using VeilingApi.Data;
using VeilingApi.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

/// <summary>
/// Registratie van alle benodigde services: controllers, Swagger,
/// database-context, bedrijfslogica-services, CORS en JWT-authenticatie.
/// </summary>

// Controllers en Swagger-documentatie
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Databaseconfiguratie met SQL Server via connection string uit appsettings.json
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

// Registratie van de servicelaag voor dependency injection
builder.Services.AddScoped<IGebruikerService, GebruikerService>();
builder.Services.AddScoped<IAanvoerderService, AanvoerderService>();
builder.Services.AddScoped<IAanmeldingService, AanmeldingService>();
builder.Services.AddScoped<IVeilingService, VeilingService>();
builder.Services.AddScoped<IVeilingProductService, VeilingProductService>();
builder.Services.AddScoped<IBiedingService, BiedingService>();
builder.Services.AddScoped<IToewijzingService, ToewijzingService>();
builder.Services.AddScoped<IAuthService, AuthService>();

// CORS-beleid om verbindingen vanaf de frontend toe te staan
builder.Services.AddCors(opt =>
{
    opt.AddPolicy("web", p => p
        .WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials());
});

/// <summary>
/// Configuratie van JWT-authenticatie met instellingen uit appsettings.json
/// (key, issuer en audience).
/// </summary>
var jwt = builder.Configuration.GetSection("Jwt");
var signingKey = new SymmetricSecurityKey(
    Encoding.UTF8.GetBytes(jwt["Key"] ?? throw new InvalidOperationException("Jwt:Key ontbreekt"))
);

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts =>
    {
        opts.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt["Issuer"],
            ValidAudience = jwt["Audience"],
            IssuerSigningKey = signingKey,
            ClockSkew = TimeSpan.Zero // Geen tijdsafwijking bij token-verval
        };

        // Haal token op uit HttpOnly cookie ("access_token") als er geen header-token is
        opts.Events = new JwtBearerEvents
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

// Activeer autorisatie
builder.Services.AddAuthorization();

var app = builder.Build();

/// <summary>
/// Configuratie van de middleware-pipeline: bepaalt de volgorde waarin
/// verzoeken worden afgehandeld (Swagger, HTTPS, CORS, authenticatie, routing).
/// </summary>
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Controleer of de database bestaat en voer migraties automatisch uit
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    Console.WriteLine("DB-verbinding: " + db.Database.GetDbConnection().ConnectionString);
    db.Database.Migrate(); // Past eventuele openstaande migraties toe
}

// Forceer HTTPS-omleiding voor veiligheid
app.UseHttpsRedirection();

// Pas CORS toe vóór authenticatie en routing
app.UseCors("web");

// Authenticatie en autorisatie in juiste volgorde toepassen
app.UseAuthentication();
app.UseAuthorization();

// Koppel alle controller-routes
app.MapControllers();

/// <summary>
/// Redirect de root-URL ("/") automatisch naar Swagger voor eenvoudige API-toegang.
/// </summary>
app.MapGet("/", () => Results.Redirect("/swagger"));

// Start de applicatie
app.Run();
