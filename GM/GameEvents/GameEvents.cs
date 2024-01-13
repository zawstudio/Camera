using AltV.Net;
using AltV.Net.Elements.Entities;
using Microsoft.Extensions.DependencyInjection;

namespace GM.Events;

public class GameEvents : IGameEvents
{
    private ServiceProvider _serviceProvider;

    public GameEvents(ServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public void Register()
    {
        Alt.OnClient<IPlayer, string, Task>("noclip:camera:save", (player, data) => ClientEvents.OnClientNoclipSaveCamera(player, data, _serviceProvider));
        Alt.OnClient<IPlayer, Task>("noclip:cameras:get", (player) => ClientEvents.OnClientNoclipGetCameras(player, _serviceProvider));
        Alt.OnClient<IPlayer, string, Task>("noclip:pos:set", (player, data) => ClientEvents.OnClientNoclipPositionSet(player, data, _serviceProvider));
        Alt.OnClient<IPlayer, Task>("noclip:start", (player) => ClientEvents.OnClientNoclipStart(player, _serviceProvider));
        Alt.OnClient<IPlayer, Task>("noclip:stop", (player) => ClientEvents.OnClientNoclipStop(player, _serviceProvider));
    }
}