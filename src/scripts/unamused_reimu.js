// for template related scripts
(function () {
	const nav = document.getElementById("nav");
	if (nav) {
		const links = nav.getElementsByTagName("a");
		for (const link of links) {
			if (link.href === document.URL) {
				link.removeAttribute("href");
				break;
			}
		}
	}

	function removeUnneededToggle(self) {
		// whew watch out
		const checkbox = self.parentElement.querySelector(
			`input[type="checkbox"]`
		);
		const code = self.parentElement.querySelector(`code`);

		// remove the checkbox if the element doesn't scroll
		// +2 because I think the border or something, maybe just +1 though.
		// helps clear out for single line blocks
		if (code.scrollHeight <= code.clientHeight + 2) {
			checkbox.remove();
		}
	}

	document
		.querySelectorAll("pre > input + label + code")
		.forEach((element) => removeUnneededToggle(element));
})();
