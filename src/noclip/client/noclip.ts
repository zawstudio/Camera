import * as alt from "alt-client";
import * as natives from "natives";

let isNoclipEnabled = false;
let noclipInstance: Noclip = null;

const timeBetweenPlayerUpdates = 250;
let nextUpdate = Date.now() + 50;

alt.on('keydown', (key: alt.KeyCode) => handleKeyDown(key));

function handleKeyDown(key: alt.KeyCode) {
    switch(key) {
        case ActionKeys.ToggleNoclip as unknown as alt.KeyCode:
            toggleNoclip();
            break;
        case ActionKeys.SaveCamera as unknown as alt.KeyCode:
            noclipInstance.saveCamera();
            break;
        case ActionKeys.StartCamera as unknown as alt.KeyCode:
            noclipInstance.startCamera();
            break;
    }
}

function toggleNoclip() {
    if (isNoclipEnabled) {
        noclipInstance.stop();
        noclipInstance = null;
        isNoclipEnabled = false;
        return;
    }

    noclipInstance = new Noclip();
    noclipInstance.start();
    isNoclipEnabled = true;
}

interface ICameraElement {
    coords: alt.Vector3,
    rotation: alt.Vector3,
    fov: number
}

class Noclip {
    private sensitivity = 0.15;
    private sensMultiplier = 5;
    private cameraMovementTime = 3500;

    private camera: number = null;
    private noclipTick: number = null;

    private cameraList: Array<ICameraElement> = new Array<ICameraElement>();

    public start() {
        alt.log("Noclip started");
        alt.emitServer('noclip:start');

        const gameplayCamPos = natives.getGameplayCamCoord();
        const gameplayCamRot = natives.getGameplayCamRot(2);

        this.camera = natives.createCameraWithParams(alt.hash('DEFAULT_SCRIPTED_CAMERA'), gameplayCamPos.x, gameplayCamPos.y, gameplayCamPos.z, 0, 0, gameplayCamRot.z, natives.getGameplayCamFov(), false, 2);

        natives.setCamActiveWithInterp(this.camera, natives.getRenderingCam(), 500, 0, 0);
        natives.renderScriptCams(true, true, 500, true, false, 0);

        natives.setEntityInvincible(alt.Player.local.scriptID, true);
        natives.freezeEntityPosition(alt.Player.local.scriptID, true);

        this.initTick();
    }

    private initTick() {
        this.noclipTick = alt.everyTick(() => {
            natives.disableControlAction(0, 1, true);
            natives.disableControlAction(0, 2, true);
            natives.disableControlAction(0, 14, true);
            natives.disableControlAction(0, 15, true);
            natives.disableControlAction(0, 24, true);
            natives.disableControlAction(0, 25, true);
            natives.disableControlAction(0, 30, true);
            natives.disableControlAction(0, 31, true);
            natives.disableControlAction(0, 49, true);

            this.handleMovement();
        });
    }

    public saveCamera() {
        const pos = natives.getCamCoord(this.camera);
        const rot = natives.getCamRot(this.camera, 2);
        const fov = natives.getGameplayCamFov();

        if (this.cameraList.length > 10) return;

        const data: ICameraElement = {
            coords: pos,
            rotation: rot,
            fov
        }

        this.cameraList.push(data);

        alt.log('Saved point');
    }

    public startCamera() {
        if (this.cameraList.length < 2) return;

        alt.log('Playing cameras');

        natives.renderScriptCams(false, false, 0, false, false, 0);

        let cameraIndex = 0;

        let cameraData = this.cameraList[cameraIndex + 1];
        let currentCamera = natives.createCameraWithParams(alt.hash('DEFAULT_SCRIPTED_CAMERA'), cameraData.coords.x, cameraData.coords.y, cameraData.coords.z, cameraData.rotation.x, cameraData.rotation.y, cameraData.rotation.z, cameraData.fov, false, 2);
        cameraData = this.cameraList[cameraIndex];
        let nextCamera = natives.createCameraWithParams(alt.hash('DEFAULT_SCRIPTED_CAMERA'), cameraData.coords.x, cameraData.coords.y, cameraData.coords.z, cameraData.rotation.x, cameraData.rotation.y, cameraData.rotation.z, cameraData.fov, false, 2);
        natives.setCamActiveWithInterp(currentCamera, nextCamera, this.cameraMovementTime, 1, 1);
        natives.renderScriptCams(true, true, 1500, true, false, 0);
        cameraIndex++;

        let interval = alt.setInterval(() => {
            if (cameraIndex < this.cameraList.length - 1) {
                cameraData = this.cameraList[cameraIndex + 1];
                currentCamera = natives.createCameraWithParams(alt.hash('DEFAULT_SCRIPTED_CAMERA'), cameraData.coords.x, cameraData.coords.y, cameraData.coords.z, cameraData.rotation.x, cameraData.rotation.y, cameraData.rotation.z, cameraData.fov, false, 2);
                cameraData = this.cameraList[cameraIndex];
                nextCamera = natives.createCameraWithParams(alt.hash('DEFAULT_SCRIPTED_CAMERA'), cameraData.coords.x, cameraData.coords.y, cameraData.coords.z, cameraData.rotation.x, cameraData.rotation.y, cameraData.rotation.z, cameraData.fov, false, 2);
                natives.setCamActiveWithInterp(currentCamera, nextCamera, this.cameraMovementTime, 1, 1);
                natives.renderScriptCams(true, true, 1500, true, false, 0);
                cameraIndex++;
            } else {
                alt.clearInterval(interval);
                natives.stopRenderingScriptCamsUsingCatchUp(false, 0, 0, 0);
                natives.setCamActive(this.camera, true);
                natives.renderScriptCams(true, true, 1500, true, false, 0);
                cameraIndex = 0;
            }
        }, this.cameraMovementTime);
    }


    private handleMovement() {
        const pos = natives.getCamCoord(this.camera);
        const rot = natives.getCamRot(this.camera, 2);

        const dir = new DirectionVector(pos, rot);
        const fwd = dir.forward(3.5);
        const sens = this.getSensitivity();

        if (!alt.gameControlsEnabled()) return;

        if (natives.isDisabledControlPressed(0, ActionKeys.SpeedUp)) {
            this.sensMultiplier += 2;

            if (this.sensMultiplier >= 100) this.sensMultiplier = 100;
        }

        if (natives.isDisabledControlPressed(0, ActionKeys.SpeedDown)) {
            this.sensMultiplier -= 2;

            if (this.sensMultiplier <= 2) this.sensMultiplier = 2;
        }

        if (natives.isDisabledControlPressed(0, ActionKeys.Forward) && natives.isDisabledControlPressed(0, ActionKeys.Right)) {
            const forward = dir.forward(sens);
            const right = dir.right(sens);

            const finishedPos = {
                x: (forward.x + right.x) / 2,
                y: (forward.y + right.y) / 2,
                z: (forward.z + right.z) / 2.
            };

            natives.setCamCoord(this.camera, finishedPos.x, finishedPos.y, finishedPos.z);
        }

        else if (natives.isDisabledControlPressed(0, ActionKeys.Forward) && natives.isDisabledControlPressed(0, ActionKeys.Left)) {
            const forward = dir.forward(sens);
            const left = dir.right(-sens);

            const finishedPos = {
                x: (forward.x + left.x) / 2,
                y: (forward.y + left.y) / 2,
                z: (forward.z + left.z) / 2,
            };

            natives.setCamCoord(this.camera, finishedPos.x, finishedPos.y, finishedPos.z);
        }

        else if (natives.isDisabledControlPressed(0, ActionKeys.Backward) && natives.isDisabledControlPressed(0, ActionKeys.Right)) {
            const back = dir.forward(-sens);
            const right = dir.right(sens);

            const finishedPos = {
                x: (back.x + right.x) / 2,
                y: (back.y + right.y) / 2,
                z: (back.z + right.z) / 2,
            };

            natives.setCamCoord(this.camera, finishedPos.x, finishedPos.y, finishedPos.z);
        }

        else if (natives.isDisabledControlPressed(0, ActionKeys.Backward) && natives.isDisabledControlPressed(0, ActionKeys.Left)) {
            const back = dir.forward(-sens);
            const left = dir.right(-sens);

            const finishedPos = {
                x: (back.x + left.x) / 2,
                y: (back.y + left.y) / 2,
                z: (back.z + left.z) / 2,
            };

            natives.setCamCoord(this.camera, finishedPos.x, finishedPos.y, finishedPos.z);
        } else {
            let direction = null;

            if (natives.isDisabledControlPressed(0, ActionKeys.Forward)) {
                direction = dir.forward(sens);
            }

            if (natives.isDisabledControlPressed(0, ActionKeys.Backward)) {
                direction = dir.forward(-sens);
            }

            if (natives.isDisabledControlPressed(0, ActionKeys.Left)) {
                direction = dir.right(-sens);
            }

            if (natives.isDisabledControlPressed(0, ActionKeys.Right)) {
                direction = dir.right(sens);
            }

            if (direction !== null) {
                natives.setCamCoord(this.camera, direction.x, direction.y, direction.z);
            }
        }

        if (Date.now() > nextUpdate) {
            nextUpdate = Date.now() + timeBetweenPlayerUpdates;
            alt.emitServer('noclip:pos:set', fwd.x, fwd.y, fwd.z);
        }

        if (!natives.isPauseMenuActive()) this.processCameraRotation();
    }

    private processCameraRotation() {
        const camRot = natives.getCamRot(this.camera, 2);
        const mouseX = natives.getDisabledControlNormal(1, 1);
        const mouseY = natives.getDisabledControlNormal(1, 2);

        const mouseSens = natives.getProfileSetting(13);

        let finalRot = {
            x: camRot.x - mouseY * mouseSens,
            y: camRot.y,
            z: camRot.z - mouseX * mouseSens,
        };

        if (finalRot.x >= 89) {
            finalRot.x = 89;
        }

        if (finalRot.x <= -89) {
            finalRot.x = -89;
        }

        natives.setCamRot(this.camera, finalRot.x, finalRot.y, finalRot.z, 2);
        natives.setEntityRotation(alt.Player.local.scriptID, finalRot.x, finalRot.y, finalRot.z, 2, true);
        natives.forceCameraRelativeHeadingAndPitch(finalRot.x, finalRot.y, finalRot.z);
        natives.setRadarZoom(0);
    }

    private getSensitivity(): number {
        let currentSens = this.sensitivity;

        if (natives.isDisabledControlPressed(0, ActionKeys.Shift)) {
            if (natives.isDisabledControlPressed(0, ActionKeys.BoostSensitivity)) {
                currentSens *= this.sensMultiplier;
            }

            return (currentSens * this.sensMultiplier);
        }

        if (natives.isDisabledControlPressed(0, ActionKeys.ResetSensitivity)) {
            return (0.035);
        }

        return currentSens;
    }

    public stop() {
        alt.clearEveryTick(this.noclipTick);
        this.noclipTick = null;

        this.camera = null;
        natives.renderScriptCams(false, true, 500, true, false, 0);

        const position = natives.getEntityCoords(alt.Player.local.scriptID, true);
        let [_, ground] = natives.getGroundZFor3dCoord(position.x, position.y, position.z, 0, false, false);
        natives.setEntityCoordsNoOffset(alt.Player.local.scriptID, position.x, position.y, ground, false, false, false);
        natives.freezeEntityPosition(alt.Player.local.scriptID, false);
        natives.setEntityInvincible(alt.Player.local.scriptID, false);

        alt.emitServer('noclip:stop');
        alt.log("Noclip stopped");
    }
}

enum ActionKeys {
    ToggleNoclip = 75, // K
    SaveCamera = 72, // H
    StartCamera = 79, // O
    Forward = 32, // W
    Backward = 33, // S
    Left = 34, // A
    Right = 30, // D
    ResetSensitivity = 36, // LCTRL
    BoostSensitivity = 38, // E
    Shift = 21, // LSHIFT
    SpeedUp = 15, // SCROLL UP
    SpeedDown = 14, // SCROLL DOWN
}

class DirectionVector {
    private position: alt.IVector3;
    private readonly rotation: alt.IVector3;

    constructor(position: alt.IVector3, rotation: alt.IVector3) {
        this.position = position;
        this.rotation = rotation;
    }

    eulerToQuaternion(rotation: alt.IVector3) {
        const roll = rotation.x * (Math.PI / 180.0);
        const pitch = rotation.y * (Math.PI / 180.0);
        const yaw = rotation.z * (Math.PI / 180.0);

        const qx =
            Math.sin(roll / 2) * Math.cos(pitch / 2) * Math.cos(yaw / 2) -
            Math.cos(roll / 2) * Math.sin(pitch / 2) * Math.sin(yaw / 2);
        const qy =
            Math.cos(roll / 2) * Math.sin(pitch / 2) * Math.cos(yaw / 2) +
            Math.sin(roll / 2) * Math.cos(pitch / 2) * Math.sin(yaw / 2);
        const qz =
            Math.cos(roll / 2) * Math.cos(pitch / 2) * Math.sin(yaw / 2) -
            Math.sin(roll / 2) * Math.sin(pitch / 2) * Math.cos(yaw / 2);
        const qw =
            Math.cos(roll / 2) * Math.cos(pitch / 2) * Math.cos(yaw / 2) +
            Math.sin(roll / 2) * Math.sin(pitch / 2) * Math.sin(yaw / 2);

        return { x: qx, y: qy, z: qz, w: qw };
    }

    forwardVector(): alt.IVector3 {
        const quatRot = this.eulerToQuaternion(this.rotation);
        const fVectorX = 2 * (quatRot.x * quatRot.y - quatRot.w * quatRot.z);
        const fVectorY = 1 - 2 * (quatRot.x * quatRot.x + quatRot.z * quatRot.z);
        const fVectorZ = 2 * (quatRot.y * quatRot.z + quatRot.w * quatRot.x);

        return new alt.Vector3({ x: fVectorX, y: fVectorY, z: fVectorZ });
    }

    forward(distance: number): alt.IVector3 {
        const forwardVector = this.forwardVector();

        return new alt.Vector3({
            x: this.position.x + forwardVector.x * distance,
            y: this.position.y + forwardVector.y * distance,
            z: this.position.z + forwardVector.z * distance,
        });
    }

    rightVector() {
        const quatRot = this.eulerToQuaternion(this.rotation);

        const rVectorX = 1 - 2 * (quatRot.y * quatRot.y + quatRot.z * quatRot.z);
        const rVectorY = 2 * (quatRot.x * quatRot.y + quatRot.w * quatRot.z);
        const rVectorZ = 2 * (quatRot.x * quatRot.z - quatRot.w * quatRot.y);

        return new alt.Vector3({ x: rVectorX, y: rVectorY, z: rVectorZ });
    }

    right(distance: number) {
        const rightVector = this.rightVector();

        return new alt.Vector3({
            x: this.position.x + rightVector.x * distance,
            y: this.position.y + rightVector.y * distance,
            z: this.position.z + rightVector.z * distance,
        });
    }
}