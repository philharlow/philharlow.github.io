import * as BABYLON from "@babylonjs/core";
import "@babylonjs/inspector";
import GrainPluginMaterial from "./GrainPluginMaterial";
import { ThreeDText, ThreeDTextSettings } from "./ThreeDText";
import { getColorMaterial } from "./BabylonUtils";

export let babylonScene: BabylonScene | undefined = undefined;

export class BabylonScene {
	scene: BABYLON.Scene;
	camera: BABYLON.FreeCamera;
	canvas: BABYLON.Nullable<HTMLCanvasElement>;
	shadowGenerators: BABYLON.ShadowGenerator[] = [];
	sceneRoot: BABYLON.TransformNode;
	texts: ThreeDText[] = [];
	mouseOver = false;
	pointLight: BABYLON.PointLight;
	orbitAngle = 0;

	constructor(scene: BABYLON.Scene) {
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		babylonScene = this;
		this.scene = scene;

		this.scene.clearColor = new BABYLON.Color4(0.008, 0.012, 0.02, 1);
		const engine = this.scene.getEngine();
		this.canvas = engine.getRenderingCanvas();
		this.sceneRoot = new BABYLON.TransformNode("SceneRoot", this.scene);

		this.camera = new BABYLON.FreeCamera("Camera", new BABYLON.Vector3(0, 50, 0), scene);
		this.camera.target = new BABYLON.Vector3(0, 0, 0);
		this.camera.rotation.z = Math.PI;

		// Lights
		const hemiLight = new BABYLON.HemisphericLight("HemiLight", new BABYLON.Vector3(0.6, 1, 0.8), scene);
		hemiLight.intensity = 0.8; // Default intensity is 1. Let's dim the light a small amount
		hemiLight.parent = this.sceneRoot;

		let goalPos = new BABYLON.Vector3(0, 3, 0);
		this.pointLight = this.addPointLight("PointLight", goalPos, 0.2);

		this.buildHaxagons();
		this.buildText();

		// Watch for browser/canvas resize events
		window.addEventListener("resize", () => this.resized());

		this.canvas?.addEventListener("mouseover", () => (this.mouseOver = true));
		this.canvas?.addEventListener("mouseout", () => this.touchend());
		this.canvas?.addEventListener("touchstart", () => (this.mouseOver = true));
		this.canvas?.addEventListener("touchend", () => this.touchend());

		document.addEventListener("keydown", (event) => {
			if (event.key === "i") this.toggleInspector();
			if (event.key === "Escape") this.hideInspector();
		});

		const groundPlane = BABYLON.Plane.FromPositionAndNormal(BABYLON.Vector3.Zero(), BABYLON.Vector3.Up()); // Infinite plane at y=0
		this.canvas?.addEventListener("pointermove", () => {
			const ray = scene.createPickingRay(scene.pointerX, scene.pointerY, BABYLON.Matrix.Identity(), this.camera);
			const distance = ray.intersectsPlane(groundPlane);
			if (distance) {
				const hitPos = ray.origin.add(ray.direction.scale(distance));
				goalPos = new BABYLON.Vector3(hitPos.x, this.pointLight.position.y, hitPos.z);
			}
		});

		const lightOrbitRadius = 13;
		const orbitSpeed = 0.0005;

		scene.beforeRender = () => {
			if (!this.mouseOver) {
				this.orbitAngle += orbitSpeed * scene.deltaTime;
				const x = Math.sin(this.orbitAngle) * lightOrbitRadius;
				const y = Math.cos(this.orbitAngle) * lightOrbitRadius;
				goalPos = new BABYLON.Vector3(x, this.pointLight.position.y, y);
			}
			const lerpRate = this.mouseOver ? 0.1 : 0.01;
			this.pointLight.position = BABYLON.Vector3.Lerp(this.pointLight.position, goalPos, lerpRate);
			//camera.alpha = -Math.PI / 2 + (scene.pointerX / scene.getEngine().getRenderWidth() - 0.5) * 0.05;
			// camera.beta = (scene.pointerY / scene.getEngine().getRenderWidth()) * 0.3;
			// for (let i = 0; i < cols * rows; i++) {
			// 	const xPos = i % cols;
			// 	const yPos = Math.floor(i / cols);
			// 	const x = xSpacing * xPos;
			// 	const y = yPos * ySpacing + (xPos % 2) * 0.5 * ySpacing;
			// 	const z = Math.sin(0.4 * (xPos - yPos) + -0.002 * now) * 0.5;
			// 	const matrix = BABYLON.Matrix.Translation(x - cols * 0.5 * xSpacing, z, y - rows * 0.5 * ySpacing);
			// 	hexagon.thinInstanceSetMatrixAt(i, matrix, i + 1 === cols * rows);
			// }

			// camera.position = new BABYLON.Vector3(-0.2 * pointLight.position.x, 50, 0.2 * pointLight.position.z);
			// camera.setTarget(BABYLON.Vector3.Zero());
			// camera.rotation.z = Math.PI;

			// const map = (value: number, start1: number, stop1: number, start2: number, stop2: number) =>
			// 	Math.max(0, Math.min(1, (value - start1) / (stop1 - start1))) * (stop2 - start2) + start2;

			// for (let i = 0; i < cols * rows; i++) {
			// 	const xPos = i % cols;
			// 	const yPos = Math.floor(i / cols);
			// 	const x = xSpacing * xPos - cols * 0.5 * xSpacing;
			// 	const y = yPos * ySpacing + (xPos % 2) * 0.5 * ySpacing - rows * 0.5 * ySpacing;
			// 	const dist = Math.sqrt((x - pointLight.position.x) ** 2 + (y - pointLight.position.z) ** 2);
			// 	const z = map(dist, 0, 10, -1, 0.9);
			// 	const matrix = BABYLON.Matrix.Translation(x, z, y);
			// 	hexagon.thinInstanceSetMatrixAt(i, matrix, i + 1 === cols * rows);
			// }
		};

		this.resized();
	}

	resized() {
		this.scene.getEngine().resize();
		this.buildHaxagons();
		const aspect = this.canvas ? this.canvas.width / this.canvas.height : 1;
		const screenHeight = 2 * Math.tan(this.camera.fov / 2) * this.camera.position.y;
		const screenWidth = screenHeight * aspect;

		this.texts.forEach((text) => text.resized(screenWidth, screenHeight));
	}

	touchend() {
		this.mouseOver = false;
		// this.orbitAngle = Math.cos(this.pointLight.position.x / this.pointLight.position.z) * Math.PI * 2;
		// console.log(this.orbitAngle);
	}

	hexagon?: BABYLON.Mesh;
	buildHaxagons() {
		const radius = 1;
		const width = 2 * radius;
		const sqrt3 = Math.sqrt(3);
		const height = sqrt3 * radius;
		const xSpacing = width * 0.75 * 1.01;
		const ySpacing = height * 1.01;

		if (!this.hexagon) {
			const shape: BABYLON.Vector3[] = [];
			for (let i = 0; i < 6; i++) {
				const rot = (i * Math.PI) / 3;
				const point = new BABYLON.Vector3(radius * Math.cos(rot), 0, radius * Math.sin(rot));
				shape.push(point);
			}
			this.hexagon = BABYLON.MeshBuilder.ExtrudePolygon("Hexagon", { shape, depth: 1 }, this.scene);
			this.hexagon.material = getColorMaterial("#333333");
			this.hexagon.receiveShadows = true;
			this.addShadowCaster(this.hexagon);
			new GrainPluginMaterial(this.hexagon.material); // Fix for color banding
		}

		const aspect = this.canvas ? this.canvas.width / this.canvas.height : 1;
		const screenHeight = 2 * Math.tan(this.camera.fov / 2) * this.camera.position.y;
		const screenWidth = screenHeight * aspect;

		const cols = Math.ceil(screenWidth / xSpacing / 4) * 4 + 1;
		const rows = Math.ceil(screenHeight / ySpacing / 4) * 4 + 1;
		const lastIndex = cols * rows - 1;
		for (let i = 0; i < cols * rows; i++) {
			const xPos = i % cols;
			const yPos = Math.floor(i / cols);
			const x = xSpacing * xPos;
			const y = yPos * ySpacing + (xPos % 2) * 0.5 * ySpacing;
			const z = 0.5;
			const matrix = BABYLON.Matrix.Translation(x - cols * 0.5 * xSpacing, z, y - rows * 0.5 * ySpacing);
			if (i < this.hexagon.thinInstanceCount) this.hexagon.thinInstanceSetMatrixAt(i, matrix, i === lastIndex);
			else this.hexagon.thinInstanceAdd(matrix);
		}
	}

	buildText() {
		this.addText({
			text: "PhilHarlow.com",
			position: new BABYLON.Vector3(0, 1, 3),
			size: 4,
			color: "#777777",
			onMeshCreated: (mesh) => this.addShadowCaster(mesh),
		});

		const linkColors = {
			color: "#cccccc",
			hoverColor: "#3f76be",
			pressedColor: "#305f9d",
		};

		this.addText({
			text: "Projects",
			position: new BABYLON.Vector3(0, 1, 0),
			url: "https://philsprojects.wordpress.com/",
			onMeshCreated: (mesh) => this.addShadowCaster(mesh),
			...linkColors,
		});

		this.addText({
			text: "GitHub",
			position: new BABYLON.Vector3(0, 1, -3),
			url: "https://github.com/philharlow",
			onMeshCreated: (mesh) => this.addShadowCaster(mesh),
			...linkColors,
		});

		this.addText({
			text: "LinkedIn",
			position: new BABYLON.Vector3(0, 1, -6),
			url: "https://www.linkedin.com/in/philharlow",
			onMeshCreated: (mesh) => this.addShadowCaster(mesh),
			...linkColors,
		});
	}

	addText(settings: ThreeDTextSettings) {
		const text = new ThreeDText(settings, this);
		this.texts.push(text);
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
		const shadowGenerator = new BABYLON.ShadowGenerator(1024, light);
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
