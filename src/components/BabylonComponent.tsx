import SceneComponent from "babylonjs-hook";
import { useEffect } from "react";
import styled from "styled-components/macro";
import React from "react";
import { createScene, destroyScene } from "../babylon/BabylonScene";
import FPSDisplay from "./FPSDisplay";

const CanvasDiv = styled.div`
	position: relative;
	width: 100%;
	height: 100%;
`;

const BabylonCanvas = styled(SceneComponent)`
	width: 100%;
	height: 100%;
	outline: none;
`;

const BabylonSceneDiv = styled.div`
	position: relative;
	display: flex;
	flex-grow: 1;
	width: 100%;
	height: 100%;
`;

const InspectorDiv = styled.div`
	height: 100%;
	z-index: 100;
	&& .color-picker-float {
		margin-left: 150px; // Hack to fix position of color picker
	}
`;

const BabylonScene = () => {
	// Handle destruction of this element, and clean up the babylon scene references
	useEffect(() => {
		return function cleanup() {
			destroyScene();
		};
	}, []);

	return (
		<BabylonSceneDiv id="babylonScene">
			<InspectorDiv id="inspectorDiv" />
			<CanvasDiv>
				<BabylonCanvas antialias onSceneReady={(scene) => createScene(scene)} id="babylon-canvas" />
				<FPSDisplay />
			</CanvasDiv>
		</BabylonSceneDiv>
	);
};

export default BabylonScene;
