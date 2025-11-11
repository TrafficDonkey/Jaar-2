using Microsoft.EntityFrameworkCore;
using VeilingApi.Data;
using VeilingApi.Services;                 // your services
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// ───────────────────────────────── Services ─────────────────────────────────

// Controllers + Swagger
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// DB: SQL Server
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

// Service-laag
builder.Services.AddScoped<IGebruikerService, GebruikerService>();
builder.Services.AddScoped<IAanvoerderService, AanvoerderService>();
builder.Services.AddScoped<IAanmeldingService, AanmeldingService>();
builder.Services.AddScoped<IVeilingService, VeilingService>();
builder.Services.AddScoped<IVeilingProductService, VeilingProductService>();
builder.Services.AddScoped<IBiedingService, BiedingService>();
builder.Services.AddScoped<IToewijzingService, ToewijzingService>();
builder.Services.AddScoped<IAuthService, AuthService>();


// CORS (set your frontend origins here)
builder.Services.AddCors(opt =>
{
    opt.AddPolicy("web", p => p
        .WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials());
});

// JWT auth
var jwt = builder.Configuration.GetSection("Jwt");
var signingKey = new SymmetricSecurityKey(
    Encoding.UTF8.GetBytes(jwt["Key"] ?? throw new InvalidOperationException("Jwt:Key missing"))
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
            ClockSkew = TimeSpan.Zero
        };

        // Allow HttpOnly cookie token (named "access_token")
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

builder.Services.AddAuthorization();

var app = builder.Build();

// ───────────────────────────────── Pipeline ─────────────────────────────────

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Ensure DB & migrations exist
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    Console.WriteLine("DB ConnString = " + db.Database.GetDbConnection().ConnectionString);
    db.Database.Migrate();
}

app.UseHttpsRedirection();

app.UseCors("web");            // CORS before auth

app.UseAuthentication();       // auth before routing/authorization
app.UseAuthorization();

app.MapControllers();

// Redirect root to Swagger
app.MapGet("/", () => Results.Redirect("/swagger"));

app.Run();
