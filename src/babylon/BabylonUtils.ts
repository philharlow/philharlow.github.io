/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as BABYLON from "@babylonjs/core";
import { babylonScene } from "./BabylonScene";

const colorMats = new Map<string, BABYLON.StandardMaterial>();
export const getColorMaterial = (color: string) => {
	const existing = colorMats.get(color);
	if (existing) return existing;

	const mat = new BABYLON.StandardMaterial("mat-" + color, babylonScene!.scene);
	mat.diffuseColor = BABYLON.Color3.FromHexString(color);
	mat.specularColor = BABYLON.Color3.Black();
	mat.backFaceCulling = false;
	colorMats.set(color, mat);
	return mat;
};
