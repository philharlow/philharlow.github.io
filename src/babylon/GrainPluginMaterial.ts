import * as BABYLON from "@babylonjs/core";

export default class GrainPluginMaterial extends BABYLON.MaterialPluginBase {
	constructor(material: BABYLON.Material) {
		super(material, "Grain", 600);
		this._enable(true);
	}

	getClassName() {
		return "GrainPluginMaterial";
	}

	getCustomCode(shaderType: string) {
		return shaderType === "vertex"
			? null
			: {
					CUSTOM_FRAGMENT_MAIN_END: `
                    gl_FragColor.rgb += dither(vPositionW.xy, 0.5);
                    gl_FragColor.rgb = max(gl_FragColor.rgb, 0.0);
            `,
			  };
	}
}
