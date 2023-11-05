// the main page layout
(function () {
	bottomRightLinks();

	function bottomRightLinks() {
		var div = document.getElementById("e");
		var content = "(domain without .extension) @ (domain)";
		div.addEventListener("mouseenter", function () {
			div.innerHTML = atob(
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
		div.style.zIndex = 1;
		div.innerHTML = content;
		document.body.appendChild(div);
	}
})();
