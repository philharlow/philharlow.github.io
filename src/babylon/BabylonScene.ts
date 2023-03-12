import * as BABYLON from "@babylonjs/core";
import "@babylonjs/inspector";
// Include earcut for polgon creation
import earcut from "earcut";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).earcut = earcut;

export class BabylonScene {
	scene: BABYLON.Scene;
	canvas: BABYLON.Nullable<HTMLCanvasElement>;
	shadowGenerators: BABYLON.ShadowGenerator[] = [];
	sceneRoot: BABYLON.TransformNode;

	constructor(scene: BABYLON.Scene) {
		this.scene = scene;
		// this.scene.useRightHandedSystem = true;
		this.scene.clearColor = new BABYLON.Color4(0.008, 0.012, 0.02, 1);
		const engine = this.scene.getEngine();
		this.canvas = engine.getRenderingCanvas();
		this.sceneRoot = new BABYLON.TransformNode("SceneRoot", this.scene);

		const camera = new BABYLON.ArcRotateCamera("Camera", -Math.PI / 2, 0, 50, BABYLON.Vector3.Zero());
		camera.attachControl(this.canvas, true);

		const sqrt3 = Math.sqrt(3);

		const radius = 1;
		const width = 2 * radius;
		const height = sqrt3 * radius;
		const xSpacing = width * 0.75 * 1.01;
		const ySpacing = height * 1.01;

		const shape: BABYLON.Vector3[] = [];
		for (let i = 0; i < 6; i++) {
			const rot = (i * Math.PI) / 3;
			const point = new BABYLON.Vector3(radius * Math.cos(rot), 0, radius * Math.sin(rot));
			shape.push(point);
		}

		const hexagon = BABYLON.MeshBuilder.ExtrudePolygon("polygon", { shape, depth: 1 }, scene);

		const cols = 60;
		const rows = 26;
		for (let i = 0; i < cols * rows; i++) {
			const xPos = i % cols;
			const yPos = Math.floor(i / cols);
			const x = xSpacing * xPos;
			const y = yPos * ySpacing + (xPos % 2) * 0.5 * ySpacing;
			const z = 0;
			const matrix = BABYLON.Matrix.Translation(x - cols * 0.5 * xSpacing, z, y - rows * 0.5 * ySpacing);
			hexagon.thinInstanceAdd(matrix);
		}

		const importPromise = BABYLON.SceneLoader.ImportMeshAsync(undefined, "", "assets/PhilHarlow3D.glb", scene);
		importPromise.then((result) => {
			const root = result.meshes[0];
			root.rotation = new BABYLON.Vector3(Math.PI, 0, 0);
			root.scaling = BABYLON.Vector3.One().scale(3);
			root.position = new BABYLON.Vector3(0, 0.51, 0);
			//console.log("loaded", result.meshes);
		});

		// Lights
		const hemiLight = new BABYLON.HemisphericLight("HemiLight", new BABYLON.Vector3(0, -1, 0), scene);
		hemiLight.intensity = 0.6; // Default intensity is 1. Let's dim the light a small amount
		hemiLight.parent = this.sceneRoot;

		this.addDirectionalLight("DirectionalLight", new BABYLON.Vector3(0.6, -0.55, 0.58), 0.2);

		// Watch for browser/canvas resize events
		window.addEventListener("resize", () => this.scene.getEngine().resize());

		document.addEventListener("keydown", (event) => {
			if (event.key === "i") this.toggleInspector();
			if (event.key === "Escape") this.hideInspector();
		});
	}

	dispose() {
		console.log("StoreScene dispose");
		this.scene.dispose();
	}

	addPointLight(name: string, position: BABYLON.Vector3, intensity: number): BABYLON.PointLight {
		const pointLight = new BABYLON.PointLight(name, position, this.scene);
		pointLight.intensity = intensity;

		this.addShadowGenerator(pointLight);
		return pointLight;
	}

	addDirectionalLight(name: string, direction: BABYLON.Vector3, intensity: number): BABYLON.DirectionalLight {
		const directionalLight = new BABYLON.DirectionalLight(name, direction, this.scene);
		directionalLight.intensity = intensity;
		directionalLight.shadowOrthoScale = 0.001;
		directionalLight.autoUpdateExtends = true;
		directionalLight.autoCalcShadowZBounds = true;
		directionalLight.parent = this.sceneRoot;

		this.addShadowGenerator(directionalLight);
		return directionalLight;
	}

	addShadowGenerator(light: BABYLON.IShadowLight) {
		const shadowGenerator = new BABYLON.ShadowGenerator(4096, light);
		shadowGenerator.usePoissonSampling = true;
		shadowGenerator.bias = 0.001;
		shadowGenerator.normalBias = 0.01;
		shadowGenerator.transparencyShadow = true;
		this.shadowGenerators.push(shadowGenerator);
	}

	addShadowCaster(mesh: BABYLON.AbstractMesh) {
		for (const shadowGenerator of this.shadowGenerators) shadowGenerator.addShadowCaster(mesh, true);
	}

	toggleInspector = () => {
		if (this.scene.debugLayer.isVisible()) {
			this.scene.debugLayer.hide();
		} else {
			const inspectorDiv = document.getElementById("inspectorDiv");
			const config: BABYLON.IInspectorOptions = {
				globalRoot: inspectorDiv || undefined,
				enablePopup: false,
				embedMode: true,
				handleResize: true,
			};
			this.scene.debugLayer.show(config).catch(() => "something went wrong");
		}
	};

	hideInspector = () => {
		if (this.scene.debugLayer.isVisible()) {
			this.scene.debugLayer.hide();
		}
	};
}

export let babylonScene: BabylonScene | undefined = undefined;

export function createScene(scene: BABYLON.Scene): BabylonScene {
	destroyScene();
	babylonScene = new BabylonScene(scene);
	// console.log("CreateScene storeScene=", storeScene);
	return babylonScene;
}

export function destroyScene() {
	babylonScene?.dispose();
	babylonScene = undefined;
}
