using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Linq;
using System.Text;
using VeilingApi.Data;
using VeilingApi.Models;
using VeilingApi.Services;

var builder = WebApplication.CreateBuilder(args);

// Configure port for Azure App Service
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

builder.Services.AddControllers();
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
        policy.WithOrigins(
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
            "https://jaar-2frontendsem3.vercel.app",
            "https://jaar-2frontendsem3-5adthyzyh-khalid3385s-projects.vercel.app",
            "https://floraflow1223.vercel.app"  
        )
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

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    db.Database.Migrate();

    if (!db.Gebruikers.Any(g => g.Email == "admin@floraflow.nl"))
    {
        var admin = new Gebruiker
        {
            Naam = "Beheerder",
            Email = "admin@floraflow.nl",
            Rol = "Admin",
            WachtwoordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!")
        };

        db.Gebruikers.Add(admin);
        db.SaveChanges();
    }
}

// Only redirect to HTTPS in development (Azure handles HTTPS for you)
if (!app.Environment.IsProduction())
{
    app.UseHttpsRedirection();
}

app.UseCors("web");
app.UseAuthentication();
app.UseAuthorization();

app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception)
    {
        context.Response.StatusCode = 500;
        await context.Response.WriteAsJsonAsync(new
        {
            message = "Er is iets misgegaan. Probeer het later opnieuw."
        });
    }
});

app.MapControllers();

app.Run();
