// basically loads a script from a url
/* eslint-disable camelcase */
/* eslint-disable no-unused-vars */
/* eslint-disable no-new-func */
/* eslint-disable no-eval */
var load_backup_image = function (url) {
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

// eslint-disable-next-line no-undef
ext = {};
