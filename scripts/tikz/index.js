const { dvi2html } = require("dvi2html");
const { readFile } = require("fs").promises;
const pako = require("pako");
const { Writable } = require("stream");
const { join } = require("path");

const libraryP = import("./library.mjs");

const pages = 1000;

function copy(src) {
	const dst = new Uint8Array(src.length);
	dst.set(src);
	return dst;
}

// load wasm
const load = (async () => {
	const library = await libraryP;
	const code = await readFile(join(__dirname, "./tikz.wasm"));

	const core = await readFile(join(__dirname, "./tikz.gz"));
	const inf = new pako.Inflate();
	inf.push(core);

	const coredump = new Uint8Array(inf.result, 0, pages * 65536);

	// effectively synchronizes calls
	// the sync issue is probably in the fake file system so this is just a
	// workaround
	let lock = Promise.resolve();

	return async (markup, id = "sample") => {
		const wait = lock.then(async () => {
			// assume input is only \begin{tikzpicture} \end{tikzpicture}
			const input = `
				\\begin{document}
					${markup}
				\\end{document}
			`;

			library.deleteEverything();
			library.writeFileSync(`${id}.tex`, Buffer.from(input));

			const memory = new WebAssembly.Memory({
				initial: pages,
				maximum: pages,
			});
			const buffer = new Uint8Array(memory.buffer, 0, pages * 65536);
			buffer.set(copy(coredump));

			library.setMemory(memory.buffer);
			library.setInput(` ${id}.tex \n\\end\n`);

			await WebAssembly.instantiate(code, {
				library,
				env: { memory },
			});

			const dvi = library.readFileSync(`${id}.dvi`);
			let html = "";
			const page = new Writable({
				write(chunk, _, callback) {
					html += chunk.toString();
					callback();
				},
			});

			async function* streamBuffer() {
				yield Buffer.from(dvi);
			}

			const machine = await dvi2html(streamBuffer(), page);
			return { machine, html };
		});

		lock = wait;

		return wait;
	};
})();

module.exports = {
	load,
};
