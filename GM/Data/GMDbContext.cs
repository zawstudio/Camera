using Microsoft.EntityFrameworkCore;

public class GMDbContext : DbContext
{
    public GMDbContext(DbContextOptions<GMDbContext> options) : base(options) { }

    public DbSet<Camera> Cameras { get; set; }
}