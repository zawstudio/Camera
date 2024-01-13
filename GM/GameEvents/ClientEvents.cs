using Newtonsoft.Json;
using AltV.Net.Elements.Entities;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using AltV.Net.Data;

namespace GM.Events;

public class ClientEvents
{
    public static Task OnClientNoclipStart(IPlayer player, ServiceProvider sp)
    {
        player.Visible = false;
        
        return Task.CompletedTask;
    }
    
    public static Task OnClientNoclipStop(IPlayer player, ServiceProvider sp)
    {
        player.Visible = true;

        return Task.CompletedTask;
    }
    
    public static Task OnClientNoclipGetCameras(IPlayer player, ServiceProvider sp)
    {
        try
        {
            using var scope = sp.CreateScope();
            using var dbContext = scope.ServiceProvider.GetRequiredService<GMDbContext>();

            var exisitingCameras = dbContext.Cameras
                .AsNoTracking()
                .Where(c => c.PlayerId == player.SocialClubId)
                .ToList();

            var result = new List<ClientCameraDto>();

            foreach (var camera in exisitingCameras)
            {
                result.Add(new ClientCameraDto
                {
                    Coords = new Position(camera.PositionX, camera.PositionY, camera.PositionZ),
                    RotationZ = camera.RotationZ,
                    Fov = camera.Fov,
                });
            }

            var dataSerialized = JsonConvert.SerializeObject(result);

            player.Emit("server:noclip:cameras:set", dataSerialized);
            return Task.CompletedTask;
        }
        catch (Exception ex)
        {
            Console.WriteLine(ex.Message);
            return Task.CompletedTask;
        }
    }

    public static Task OnClientNoclipPositionSet(IPlayer player, string data, ServiceProvider sp)
    {
        try
        {
            var parsedData = JsonConvert.DeserializeObject<ClientSetPositionDto>(data);

            if (parsedData is null)
                throw new Exception("Error parsing data from client");

            player.SetPosition(parsedData.Position.X, parsedData.Position.Y, parsedData.Position.Z);

            return Task.CompletedTask;
        }
        catch (Exception ex)
        {
            Console.WriteLine(ex.Message);
            return Task.CompletedTask;
        }
    }

    public static async Task OnClientNoclipSaveCamera(IPlayer player, string data, ServiceProvider sp)
    {
        try
        {
            var parsedData = JsonConvert.DeserializeObject<ClientCameraDto>(data);

            if (parsedData is null)
                throw new Exception("Error parsing data from client");

            using var scope = sp.CreateScope();
            using var dbContext = scope.ServiceProvider.GetRequiredService<GMDbContext>();

            var exisitingCameras = dbContext.Cameras
                .AsNoTracking()
                .Where(c => c.PlayerId == player.SocialClubId)
                .ToList();

            if (exisitingCameras.Count >= 10)
            {
                foreach (var camera in exisitingCameras)
                {
                    dbContext.Remove(camera);
                }
            }

            var newCamera = new Camera
            {
                PlayerId = player.SocialClubId,
                PositionX = parsedData.Coords.X,
                PositionY = parsedData.Coords.Y,
                PositionZ = parsedData.Coords.Z,
                RotationZ = parsedData.RotationZ,
                Fov = parsedData.Fov
            };

            await dbContext.AddAsync(newCamera);
            await dbContext.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine(ex.ToString());
        }
    }
}