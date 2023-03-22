import * as BABYLON from "@babylonjs/core";
import * as opentype from "opentype.js";
import { Compiler, Font, TextMeshBuilder } from "babylon.font";
import earcut from "earcut";
import { getColorMaterial } from "./BabylonUtils";
import { BabylonScene } from "./BabylonScene";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).earcut = earcut;

interface Settings {
	size?: number;
	color?: string;
	hoverColor?: string;
	pressedColor?: string;
	url?: string;
	alignment?: "left" | "center" | "right";
	depth?: number;
	position?: BABYLON.Vector3;
	onMeshCreated?: (mesh: BABYLON.Mesh) => void;
}

export class ThreeDText {
	text: string;
	size = 2;
	depth = 0.5;
	alignment: "left" | "center" | "right" = "center";
	color!: string;
	hoverColor!: string;
	pressedColor!: string;
	position = BABYLON.Vector3.Zero();
	url?: string;

	root: BABYLON.TransformNode;
	boundingBox: BABYLON.Mesh;
	underline: BABYLON.Mesh;
	mesh?: BABYLON.Mesh;
	onMeshCreated?: (mesh: BABYLON.Mesh) => void;
	scene: BabylonScene;

	mat!: BABYLON.StandardMaterial;
	hoverMat!: BABYLON.StandardMaterial;
	pressedMat!: BABYLON.StandardMaterial;

	hovered = false;
	pressed = false;

	constructor(text: string, settings: Settings, scene: BabylonScene) {
		this.text = text;
		this.scene = scene;

		this.boundingBox = BABYLON.MeshBuilder.CreateBox("boundingBox", { width: 1, height: 1, depth: 1 }, scene.scene);
		this.boundingBox.visibility = 0;

		this.underline = BABYLON.MeshBuilder.CreateBox("underline", { width: 1, height: 1, depth: 0.1 }, scene.scene);
		this.underline.isPickable = false;

		if (settings.alignment) this.alignment = settings.alignment;
		if (settings.size) this.size = settings.size;
		if (settings.depth) this.depth = settings.depth;
		if (settings.position) this.position = settings.position;
		if (settings.url) this.setUrl(settings.url);
		if (settings.onMeshCreated) this.onMeshCreated = settings.onMeshCreated;
		if (settings.color) this.setColor(settings.color, settings.hoverColor, settings.pressedColor);
		else this.setColor("#cccccc");

		this.root = new BABYLON.TransformNode("ThreeDText-" + text, scene.scene);
		this.root.position = this.position;
		this.boundingBox.parent = this.root;
		this.underline.parent = this.root;

		// highlightMaterial.emissiveColor = BABYLON.Color3.FromHexString("#182b43");
		// this.underline.visibility = 0;

		this.createTextMesh();
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	resized(screenWidth: number, screenHeight: number) {
		// console.log("resized", this.mesh, screenWidth, screenHeight);
		if (this.mesh) {
			const paddedScreenWidth = 0.9 * screenWidth;
			const tooWide = this.boundingBox.scaling.x > paddedScreenWidth;
			const scale = tooWide ? paddedScreenWidth / this.boundingBox.scaling.x : 1;
			this.root.scaling.x = scale;
			this.root.scaling.z = scale;
		}
	}

	bindAction(trigger: number, cb: () => void) {
		this.boundingBox.actionManager?.registerAction(new BABYLON.ExecuteCodeAction(trigger, cb));
	}

	setColor(color: string, hoverColor?: string, pressedColor?: string) {
		this.color = color;
		this.hoverColor =
			hoverColor ?? BABYLON.Color3.FromHexString(color).add(new BABYLON.Color3(0.1, 0.1, 0.1)).toHexString();
		this.pressedColor =
			pressedColor ?? BABYLON.Color3.FromHexString(color).add(new BABYLON.Color3(0.2, 0.2, 0.2)).toHexString();

		this.mat = getColorMaterial(this.color);
		this.hoverMat = getColorMaterial(this.hoverColor);
		this.pressedMat = getColorMaterial(this.pressedColor);

		this.updateMat();
	}

	setHovered(hovered: boolean) {
		if (!this.url) return;
		this.hovered = hovered;
		this.updateMat();
	}

	setPressed(pressed: boolean) {
		if (!this.url) return;
		if (this.hovered && this.pressed && !pressed) {
			window.open(this.url, "_blank");
		}
		this.pressed = pressed;
		this.updateMat();
	}

	setUrl(url?: string) {
		this.url = url;
		if (this.url && this.boundingBox.actionManager) return;
		this.boundingBox.metadata = { threeDText: this };
		this.boundingBox.actionManager = new BABYLON.ActionManager(this.scene.scene);
		this.bindAction(BABYLON.ActionManager.OnPointerOverTrigger, () => this.setHovered(true));
		this.bindAction(BABYLON.ActionManager.OnPointerOutTrigger, () => this.setHovered(false));
		this.bindAction(BABYLON.ActionManager.OnPickDownTrigger, () => this.setPressed(true));
		this.bindAction(BABYLON.ActionManager.OnPickUpTrigger, () => this.setPressed(false));
		this.bindAction(BABYLON.ActionManager.OnPickOutTrigger, () => this.setPressed(false));
	}

	getMat() {
		if (this.pressed) return this.pressedMat;
		if (this.hovered) return this.hoverMat;
		return this.mat;
	}

	updateMat() {
		const mat = this.getMat();
		if (this.mesh) this.mesh.material = mat;
		this.underline.material = mat;
		this.underline.visibility = this.hovered ? 1 : 0;
	}

	setPosition(position: BABYLON.Vector3) {
		this.position = position;
		this.root.position = position;
	}

	setSize(size: number) {
		this.size = size;
		if (!this.mesh) return;
		this.mesh.scaling = BABYLON.Vector3.One().scaleInPlace(this.size);
	}

	async createTextMesh() {
		const compiler = await Compiler.Build();
		const font = await Font.Install("assets/Design System A 900.ttf", compiler, opentype);
		const builder = new TextMeshBuilder(BABYLON, earcut);
		const { text, depth } = this;
		const size = 1;
		const eps = 0.001;
		this.mesh = builder.create({ font, text, depth, size, eps, ppc: 2 }, this.scene.scene) as BABYLON.Mesh;
		this.mesh.scaling = BABYLON.Vector3.One().scaleInPlace(this.size);
		this.mesh.material = this.mat;
		this.mesh.parent = this.root;
		this.mesh.name = "TextMesh";
		this.mesh.isPickable = false;
		this.updateBounds();
		if (this.onMeshCreated) this.onMeshCreated(this.mesh);
	}

	getAlignmentOffset() {
		if (this.alignment === "right") return 2;
		if (this.alignment === "center") return 1;
		/*if (this.alignment === "left")*/ return 0;
	}

	updateBounds() {
		if (!this.mesh) return;
		const boundingBox = this.mesh.getBoundingInfo().boundingBox;
		const extents = boundingBox.extendSizeWorld.scale(this.size);
		this.mesh.position.x = -this.getAlignmentOffset() * extents.x;
		this.underline.position.z = -0.2 * extents.z;
		this.underline.scaling.x = extents.x * 2;
		this.boundingBox.scaling = extents.scale(2);
		this.boundingBox.position.z = extents.z;
		const aspect = this.scene.canvas ? this.scene.canvas.width / this.scene.canvas.height : 1;
		const screenHeight = 2 * Math.tan(this.scene.camera.fov / 2) * this.scene.camera.position.y;
		const screenWidth = screenHeight * aspect;
		if (this.scene.canvas) this.resized(screenWidth, screenHeight);
	}

	dispose() {
		this.mesh?.dispose();
	}
}
