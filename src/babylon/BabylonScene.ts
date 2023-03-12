import * as BABYLON from "@babylonjs/core";
import "@babylonjs/inspector";
import * as opentype from "opentype.js";
import { Compiler, Font, TextMeshBuilder } from "babylon.font";
import earcut from "earcut";
import GrainPluginMaterial from "./GrainPluginMaterial";
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
		// camera.attachControl(this.canvas, true);

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
		hexagon.material = this.getMaterial("#333333");
		hexagon.receiveShadows = true;
		new GrainPluginMaterial(hexagon.material); // Fix for color banding

		const cols = 60;
		const rows = 26;
		for (let i = 0; i < cols * rows; i++) {
			const xPos = i % cols;
			const yPos = Math.floor(i / cols);
			const x = xSpacing * xPos;
			const y = yPos * ySpacing + (xPos % 2) * 0.5 * ySpacing;
			const z = 0.5;
			const matrix = BABYLON.Matrix.Translation(x - cols * 0.5 * xSpacing, z, y - rows * 0.5 * ySpacing);
			hexagon.thinInstanceAdd(matrix);
		}

		//const map = (val: number, min: number, max: number) => Math.min(Math.max(val, 0), 1) * (max - min) + min;
		const defaultMat = this.getMaterial("#cccccc");
		this.addText("PhilHarlow.com", 4).then((mesh) => {
			//mesh.scaling = BABYLON.Vector3.One().scale(map(window.innerWidth, 0.5, 2));
			mesh.position.addInPlace(new BABYLON.Vector3(0, 1, 1));
			mesh.material = this.getMaterial("#777777");
		});
		this.addText("Projects").then((mesh) => {
			mesh.position.addInPlace(new BABYLON.Vector3(0, 1, -2));
			mesh.metadata = { url: "https://philsprojects.wordpress.com/" };
			mesh.material = defaultMat;
		});
		this.addText("Github").then((mesh) => {
			mesh.position.addInPlace(new BABYLON.Vector3(0, 1, -5));
			mesh.metadata = { url: "https://github.com/philharlow" };
			mesh.material = defaultMat;
		});
		this.addText("LinkedIn").then((mesh) => {
			mesh.position.addInPlace(new BABYLON.Vector3(0, 1, -8));
			mesh.metadata = { url: "https://www.linkedin.com/in/philharlow" };
			mesh.material = defaultMat;
		});

		// Lights
		const hemiLight = new BABYLON.HemisphericLight("HemiLight", new BABYLON.Vector3(0.6, 1, 0.8), scene);
		hemiLight.intensity = 0.8; // Default intensity is 1. Let's dim the light a small amount
		hemiLight.parent = this.sceneRoot;

		// this.addDirectionalLight("DirectionalLight", new BABYLON.Vector3(-0.6, -0.55, -0.8), 1);
		const pointLight = this.addPointLight("PointLight", new BABYLON.Vector3(0, 3, 0), 0.2);

		// Watch for browser/canvas resize events
		window.addEventListener("resize", () => this.scene.getEngine().resize());

		document.addEventListener("keydown", (event) => {
			if (event.key === "i") this.toggleInspector();
			if (event.key === "Escape") this.hideInspector();
		});

		scene.onPointerDown = function (evt, pickResult) {
			if (pickResult.pickedMesh?.metadata?.url) {
				window.location.href = pickResult.pickedMesh.metadata.url;
			}
		};

		const groundPlane = BABYLON.Plane.FromPositionAndNormal(BABYLON.Vector3.Zero(), BABYLON.Vector3.Up()); // Infinite plane at y=0

		let highlightedMesh: BABYLON.AbstractMesh | null;
		const highlightMaterial = this.getMaterial("#1D3D68");
		highlightMaterial.emissiveColor = BABYLON.Color3.FromHexString("#182b43");
		scene.onPointerMove = () => {
			const pickResult = scene.pickWithBoundingInfo(scene.pointerX, scene.pointerY);
			if (pickResult?.pickedMesh !== highlightedMesh) {
				const hasUrl = pickResult?.pickedMesh?.metadata?.url;
				document.body.style.cursor = hasUrl ? "pointer" : "auto";

				if (highlightedMesh && highlightedMesh.metadata?.url) highlightedMesh.material = defaultMat;
				if (pickResult?.pickedMesh && hasUrl) pickResult.pickedMesh.material = highlightMaterial;
				highlightedMesh = pickResult?.pickedMesh || null;
			}

			const ray = scene.createPickingRay(scene.pointerX, scene.pointerY, BABYLON.Matrix.Identity(), camera);
			const distance = ray.intersectsPlane(groundPlane);
			if (distance) {
				const hitPos = ray.origin.add(ray.direction.scale(distance));
				const goalPos = new BABYLON.Vector3(hitPos.x, pointLight.position.y, hitPos.z);
				pointLight.position = BABYLON.Vector3.Lerp(pointLight.position, goalPos, 0.1);
			}
			//camera.alpha = -Math.PI / 2 + (scene.pointerX / scene.getEngine().getRenderWidth() - 0.5) * 0.05;
			// camera.beta = (scene.pointerY / scene.getEngine().getRenderWidth()) * 0.3;
		};
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

	addText = async (text: string, size = 2, depth = 0.5) => {
		const compiler = await Compiler.Build();
		const font = await Font.Install("assets/Design System A 900.ttf", compiler, opentype);
		const builder = new TextMeshBuilder(BABYLON, earcut);
		const mesh = builder.create({ font, text, size, depth, eps: 0.001, ppc: 2 }, this.scene) as BABYLON.Mesh;
		mesh.name = text;
		mesh.position.x -= mesh.getBoundingInfo().boundingBox.extendSize.x; // Center text
		this.addShadowCaster(mesh);
		return mesh;
	};

	getMaterial = (color: string) => {
		const mat = new BABYLON.StandardMaterial("mat-" + color, this.scene);
		mat.diffuseColor = BABYLON.Color3.FromHexString(color);
		mat.backFaceCulling = false;
		mat.specularColor = BABYLON.Color3.Black();
		return mat;
	};

	addShadowGenerator(light: BABYLON.IShadowLight) {
		const shadowGenerator = new BABYLON.ShadowGenerator(4096, light);
		shadowGenerator.usePoissonSampling = true;
		shadowGenerator.bias = 0; // 0.001;
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
