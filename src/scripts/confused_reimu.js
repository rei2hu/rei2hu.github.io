// the main page layout
(function () {
	bottomRightLinks();

	function bottomRightLinks() {
		var div = document.getElementById("e");
		var content = "email: (domain without .extension) @ (domain)";
		div.addEventListener("mouseenter", function () {
			div.innerHTML =
				"email: " +
				atob(
					"cmVpbXUgKGF" +
						(0x10 & 0) +
						"KSByZWltdSBkb" +
						(6 - 3) +
						"Qgd" +
						(1 + 2) +
						"M="
				);
		});
		div.addEventListener("mouseleave", function () {
			div.innerHTML = content;
		});
		div.style.bottom = "1.5rem";
		div.style.right = "1.5rem";
		div.style.position = "fixed";
		div.style.textAlign = "right";
		div.style.zIndex = 1;
		div.innerHTML = content;
		document.body.appendChild(div);
	}
})();
