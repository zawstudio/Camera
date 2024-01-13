using AltV.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using GM.Events;

namespace GM;

internal class GM : Resource
{
    public override void OnStart()
    {
        var services = new ServiceCollection();

        services.AddDbContext<GMDbContext>(opt =>
            opt.UseInMemoryDatabase("GM"));

        services.AddScoped<ClientEvents>();

        var sp = services.BuildServiceProvider();

        using var dbContext = sp.GetRequiredService<GMDbContext>();
        dbContext.Database.EnsureCreated();

        var gameEvents = new GameEvents(sp);
        gameEvents.Register();
    }

    public override void OnStop()
    {
        Console.WriteLine("GM resource has stopped.");
    }
}