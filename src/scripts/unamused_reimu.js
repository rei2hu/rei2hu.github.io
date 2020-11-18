// for template related scripts
(function () {
  for (const c of document.getElementById("nav").children) {
    if (c.children[0].href === document.URL) {
      c.children[0].removeAttribute("href");
      break;
    }
  }
})();

let firstRun = true;
// eslint-disable-next-line no-unused-vars
function toggleCodeBlock(self) {
  // whew watch out
  const text = self.parentElement.children[0];
  const code = self.parentElement.children[1];

  // for first time, display is not set so we determine whether to start
  // collapsed or not by the height of the element
  const attr = code.getAttribute("cut");
  if (attr) {
    const cut = attr === "1";
    code.setAttribute("cut", cut ? "0" : "1");
    text.innerHTML = cut ? "shrink (-)" : "expand (+)";
  } else if (firstRun && code.offsetHeight > window.innerHeight * 0.5) {
    // if code block is greater than 75% of screen, start out collapsed
    code.setAttribute("cut", "1");
    text.innerHTML = "expand (+)";
    text.style.marginLeft = "1em";
    text.style.cursor = "pointer";
    text.style.display = "inline-block";
    text.addEventListener("click", toggleCodeBlock.bind(null, self));
  }
}

document
  .querySelectorAll("pre > p")
  .forEach((element) => toggleCodeBlock(element));
firstRun = false;
