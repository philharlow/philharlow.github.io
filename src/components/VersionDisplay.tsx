import React from "react";
import styled from "styled-components/macro";
import pjson from "../../package.json";

const VersionDisplayDiv = styled.div`
	position: absolute;
	bottom: 0px;
	right: 0px;
	width: 50px;
	height: 12px;
	background-color: #6666;
	color: #ccc6;
	text-align: center;
	font-size: 9px;
`;

const VersionDisplay = () => {
	const build = process.env.REACT_APP_BUILD ?? "local";
	const version = `${pjson.version}-${build}`;

	return <VersionDisplayDiv>{version}</VersionDisplayDiv>;
};

export default VersionDisplay;
