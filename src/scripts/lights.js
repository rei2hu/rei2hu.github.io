(() => {
	const LIGHTS_KEY = "LIGHTS_KEY";
	const lights = document.getElementById("lights");

	const matchQuery = window.matchMedia("(prefers-color-scheme: light)");
	const checkLights = (query) => {
		// default to color scheme if there is nothing saved
		// only need to check against light mode because dark is default
		if (localStorage.getItem(LIGHTS_KEY) === null) {
			lights.checked = query.matches;
		} else {
			lights.checked = localStorage.getItem(LIGHTS_KEY) === "true";
		}
	};
	checkLights(matchQuery);
	matchQuery.addEventListener("change", checkLights);

	// update settings when checkbox is changed
	lights.addEventListener("change", () => {
		localStorage.setItem(LIGHTS_KEY, lights.checked);
	});
})();
