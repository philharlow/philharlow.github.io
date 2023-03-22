import React, { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components/macro";
import { babylonScene } from "../babylon/BabylonScene";

const FPSDiv = styled.div`
	position: fixed;
	bottom: 12px;
	right: 0px;
	width: 60px;
	height: 16px;
	background-color: #6666;
	color: #ccc6;
	text-align: center;
	font-size: 12px;
	border-radius: 5px 0 0 0;
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
