// basically loads a script from a url
/* eslint-disable camelcase */
/* eslint-disable no-unused-vars */
/* eslint-disable no-new-func */
/* eslint-disable no-eval */

const whitelist = [
	"/scripts/unamused_reimu.bmp",
	"/scripts/playful_reimu.bmp",
	"/scripts/cozy_reimu.bmp",
];

var load_backup_image = function (url) {
	if (!whitelist.includes(url)) return;

	if (typeof fetch !== "undefined") {
		fetch(url)
			.then((res) => res.text())
			.then(eval);
	} else {
		var xhr = new XMLHttpRequest();
		xhr.open("get", url);
		xhr.onload = function () {
			new Function(xhr.response)();
		};
	}
};

// this lets the #star script load properly on any page
// eslint-disable-next-line no-undef
ext = {};
