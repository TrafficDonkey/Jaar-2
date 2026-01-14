// AppDbContext.cs
// Centrale EF Core databasecontext met alle tabellen en relaties.

using Microsoft.EntityFrameworkCore;
using VeilingApi.Models;

namespace VeilingApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options) { }

    public DbSet<Gebruiker> Gebruikers => Set<Gebruiker>();
    public DbSet<Aanmelding> Aanmeldingen => Set<Aanmelding>();
    public DbSet<Veiling> Veilingen => Set<Veiling>();
    public DbSet<VeilingProduct> VeilingProducten => Set<VeilingProduct>();
    public DbSet<VeilingProduct> VeilingProducts => VeilingProducten;
    public DbSet<Bieding> Biedingen => Set<Bieding>();
    public DbSet<Toewijzing> Toewijzingen => Set<Toewijzing>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        base.OnModelCreating(mb);

        mb.Entity<Aanmelding>()
            .Property(p => p.MinimumPrijs)
            .HasColumnType("decimal(10,2)");

        mb.Entity<Bieding>()
            .Property(p => p.Bedrag)
            .HasColumnType("decimal(10,2)");

        mb.Entity<Toewijzing>()
            .Property(p => p.EindPrijs)
            .HasColumnType("decimal(10,2)");

        mb.Entity<Aanmelding>().Property(p => p.Categorie).HasMaxLength(100);
        mb.Entity<VeilingProduct>().Property(p => p.Categorie).HasMaxLength(100);

        mb.Entity<Aanmelding>()
            .HasOne(a => a.Gebruiker)
            .WithMany(g => g.AanmeldingenAlsAanvoerder)
            .HasForeignKey(a => a.GebruikerId)
            .OnDelete(DeleteBehavior.Restrict);

        mb.Entity<Veiling>()
            .HasOne(v => v.GestartDoor)
            .WithMany(g => g.GestarteVeilingen)
            .HasForeignKey(v => v.GestartDoorId)
            .OnDelete(DeleteBehavior.Restrict);

        mb.Entity<VeilingProduct>()
            .HasOne(vp => vp.Veiling)
            .WithMany(v => v.VeilingProducten)
            .HasForeignKey(vp => vp.VeilingId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<VeilingProduct>()
            .HasOne(vp => vp.Aanmelding)
            .WithOne(a => a.VeilingProduct)
            .HasForeignKey<VeilingProduct>(vp => vp.AanmeldingId)
            .OnDelete(DeleteBehavior.Restrict);

        mb.Entity<VeilingProduct>()
            .HasIndex(vp => new { vp.VeilingId, vp.VolgordeVeiling })
            .IsUnique();

        mb.Entity<VeilingProduct>()
            .HasIndex(vp => vp.Categorie);

        mb.Entity<Bieding>()
            .HasOne(b => b.VeilingProduct)
            .WithMany(vp => vp.Biedingen)
            .HasForeignKey(b => b.VeilingProductId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Bieding>()
            .HasOne(b => b.Gebruiker)
            .WithMany(g => g.Biedingen)
            .HasForeignKey(b => b.GebruikerId)
            .OnDelete(DeleteBehavior.Restrict);

        mb.Entity<Toewijzing>()
            .HasOne(t => t.VeilingProduct)
            .WithOne(vp => vp.Toewijzing)
            .HasForeignKey<Toewijzing>(t => t.VeilingProductId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Toewijzing>()
            .HasIndex(t => t.Datum);

        mb.Entity<Toewijzing>()
            .HasOne(t => t.Koper)
            .WithMany(g => g.Aankopen)
            .HasForeignKey(t => t.KoperId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
