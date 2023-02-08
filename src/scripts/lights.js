(() => {
	const LIGHTS_KEY = "LIGHTS_KEY";
	const value = localStorage.getItem(LIGHTS_KEY);
	const lights = document.getElementById("lights");

	lights.checked = value === "true";
	lights.addEventListener("change", () => {
		localStorage.setItem(LIGHTS_KEY, lights.checked);
	});
})();
