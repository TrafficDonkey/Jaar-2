// AppDbContext.cs
// Centrale EF Core databasecontext met alle tabellen en relaties.

using Microsoft.EntityFrameworkCore;
using VeilingApi.Models;

namespace VeilingApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options) { }

    // ────────────────────────────── DbSets ──────────────────────────────

    public DbSet<Gebruiker> Gebruikers => Set<Gebruiker>();
    public DbSet<Aanmelding> Aanmeldingen => Set<Aanmelding>();
    public DbSet<Veiling> Veilingen => Set<Veiling>();

    // 🔹 Canonieke DbSet
    public DbSet<VeilingProduct> VeilingProducten => Set<VeilingProduct>();

    // 🔹 Alias voor bestaande services (NIETS breekt)
    public DbSet<VeilingProduct> VeilingProducts => VeilingProducten;

    public DbSet<Bieding> Biedingen => Set<Bieding>();
    public DbSet<Toewijzing> Toewijzingen => Set<Toewijzing>();

    // ────────────────────────────── Modelconfig ──────────────────────────────

    protected override void OnModelCreating(ModelBuilder mb)
    {
<<<<<<< HEAD
        // Geldbedragen
        mb.Entity<Aanmelding>().Property(p => p.MinimumPrijs).HasColumnType("decimal(10,2)");
        mb.Entity<Bieding>().Property(p => p.Bedrag).HasColumnType("decimal(10,2)");
        mb.Entity<Toewijzing>().Property(p => p.EindPrijs).HasColumnType("decimal(10,2)");
        mb.Entity<Aanmelding>().Property(p => p.Categorie).HasMaxLength(100);
        mb.Entity<VeilingProduct>().Property(p => p.Categorie).HasMaxLength(100);
=======
        base.OnModelCreating(mb);
>>>>>>> origin/fullproject-abel

        // Decimal configuratie
        mb.Entity<Aanmelding>()
            .Property(p => p.MinimumPrijs)
            .HasColumnType("decimal(10,2)");

        mb.Entity<Bieding>()
            .Property(p => p.Bedrag)
            .HasColumnType("decimal(10,2)");

        mb.Entity<Toewijzing>()
            .Property(p => p.EindPrijs)
            .HasColumnType("decimal(10,2)");

        // ────────────────────────────── Relaties ──────────────────────────────

        // Aanmelding → Gebruiker (aanvoerder)
        mb.Entity<Aanmelding>()
            .HasOne(a => a.Gebruiker)
            .WithMany(g => g.AanmeldingenAlsAanvoerder)
            .HasForeignKey(a => a.GebruikerId)
            .OnDelete(DeleteBehavior.Restrict);

        // Veiling → Gebruiker (gestart door)
        mb.Entity<Veiling>()
            .HasOne(v => v.GestartDoor)
            .WithMany(g => g.GestarteVeilingen)
            .HasForeignKey(v => v.GestartDoorId)
            .OnDelete(DeleteBehavior.Restrict);

        // VeilingProduct → Veiling (N : 1)
        mb.Entity<VeilingProduct>()
<<<<<<< HEAD
          .HasOne(vp => vp.Veiling)
          .WithMany(v => v.VeilingProducten)
          .HasForeignKey(vp => vp.VeilingId)
          .OnDelete(DeleteBehavior.Cascade);
=======
            .HasOne(vp => vp.Veiling)
            .WithMany(v => v.VeilingProducten)
            .HasForeignKey(vp => vp.VeilingId)
            .OnDelete(DeleteBehavior.Cascade);
>>>>>>> origin/fullproject-abel

        // VeilingProduct → Aanmelding (1 : 1)
        mb.Entity<VeilingProduct>()
            .HasOne(vp => vp.Aanmelding)
            .WithOne(a => a.VeilingProduct)
            .HasForeignKey<VeilingProduct>(vp => vp.AanmeldingId)
            .OnDelete(DeleteBehavior.Restrict);

        // Unieke volgorde per veiling
        mb.Entity<VeilingProduct>()
            .HasIndex(vp => new { vp.VeilingId, vp.VolgordeVeiling })
            .IsUnique();

<<<<<<< HEAD
        // Index voor historische prijsqueries
        mb.Entity<VeilingProduct>()
          .HasIndex(vp => vp.Categorie);

        // Bieding ↔ VeilingProduct
=======
        // Bieding → VeilingProduct
>>>>>>> origin/fullproject-abel
        mb.Entity<Bieding>()
            .HasOne(b => b.VeilingProduct)
            .WithMany(vp => vp.Biedingen)
            .HasForeignKey(b => b.VeilingProductId)
            .OnDelete(DeleteBehavior.Cascade);

        // Bieding → Gebruiker
        mb.Entity<Bieding>()
            .HasOne(b => b.Gebruiker)
            .WithMany(g => g.Biedingen)
            .HasForeignKey(b => b.GebruikerId)
            .OnDelete(DeleteBehavior.Restrict);

        // Toewijzing → VeilingProduct (1 : 1)
        mb.Entity<Toewijzing>()
            .HasOne(t => t.VeilingProduct)
            .WithOne(vp => vp.Toewijzing)
            .HasForeignKey<Toewijzing>(t => t.VeilingProductId)
            .OnDelete(DeleteBehavior.Cascade);

<<<<<<< HEAD
        // Index voor sorteren op datum bij historische prijzen
        mb.Entity<Toewijzing>()
          .HasIndex(t => t.Datum);

        // Toewijzing ↔ Gebruiker (koper)
=======
        // Toewijzing → Gebruiker (koper)
>>>>>>> origin/fullproject-abel
        mb.Entity<Toewijzing>()
            .HasOne(t => t.Koper)
            .WithMany(g => g.Aankopen)
            .HasForeignKey(t => t.KoperId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
