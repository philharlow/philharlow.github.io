import React, { ReactElement } from "react";
import styled from "styled-components/macro";
import BabylonScene from "./BabylonComponent";

const HomeDiv = styled.div`
	width: 100%;
	height: 100%;
	overflow: hidden;
	display: flex;
	flex-direction: column;
`;

function Home(): ReactElement {
	return (
		<HomeDiv>
			<BabylonScene />
		</HomeDiv>
	);
}

export default Home;
