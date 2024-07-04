(() => {
	const file = "/scripts/tikz.js";

	if (window.Worker) {
		const tikzWorker = new Worker(file);
		const eleMap = {};

		tikzWorker.onmessage = (m) => {
			const { machine, html, message: { id } } = m.data;
			const element = eleMap[id];
			const div = document.createElement('div');

			div.style.display = 'flex';
			div.style.width = machine.paperwidth.toString() + "pt";
			div.style.height = machine.paperheight.toString() + "pt";
			div.style['align-items'] = 'center';
			div.style['justify-content'] = 'center';

			div.innerHTML = html;
			let svg = div.getElementsByTagName('svg');
			svg[0].setAttribute("width", machine.paperwidth.toString() + "pt");
			svg[0].setAttribute("height", machine.paperheight.toString() + "pt");
			svg[0].setAttribute("viewBox", `-72 -72 ${machine.paperwidth} ${machine.paperheight}`);

			element.parentNode.replaceChild(div, element);
		};

		window.onload = () => {
			[...document.querySelectorAll("script[type='text/tikz']")].forEach((e, i) => {
				eleMap[i] = e;
				tikzWorker.postMessage({ input: e.childNodes[0].nodeValue, id: i });
			});
		};
	} else {
		const s = document.createElement("script");
		s.src = file;
		document.body.appendChild(s);
	}
})();
