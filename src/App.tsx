import React, { ReactElement, Suspense } from "react";
import "./App.css";
import Home from "./components/Home";

function App(): ReactElement {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<Home />
		</Suspense>
	);
}

export default App;
