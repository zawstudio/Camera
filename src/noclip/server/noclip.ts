import * as alt from "alt-server";

alt.onClient("noclip:start", (player) => {
    player.visible = false;
});

alt.onClient("noclip:stop", (player) => {
    player.visible = true;
});

alt.onClient("noclip:pos:set", (player, x, y, z) => {
    player.pos = new alt.Vector3(x, y, z);
});