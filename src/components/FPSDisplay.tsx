import React, { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components/macro";
import { babylonScene } from "../babylon/BabylonScene";

const FPSDiv = styled.div`
	position: absolute;
	bottom: 0px;
	right: 0px;
	width: 50px;
	height: 16px;
	color: #ccc6;
	background-color: #6666;
	text-align: center;
	font-size: 12px;
`;

const FPSDisplay = (): React.ReactElement => {
	const [attached, setAttached] = useState(false);
	const fpsDiv = useRef<HTMLDivElement>(null);

	const onRenderLoop = useCallback(() => {
		if (fpsDiv.current && babylonScene) {
			const fps = babylonScene.scene.getEngine().getFps();
			fpsDiv.current.innerHTML = fps.toFixed() + " FPS";
		}
	}, [fpsDiv]);

	useEffect(() => {
		if (babylonScene && attached === false) {
			babylonScene.scene.registerBeforeRender(onRenderLoop);
			setAttached(true);
		}
	}, [attached]);

	return <FPSDiv ref={fpsDiv}>0</FPSDiv>;
};

export default FPSDisplay;
