// for controlling the nav menu found in template
(function () {
  for (const c of document.getElementById("nav").children) {
    if (c.children[0].href === document.URL) {
      c.children[0].removeAttribute("href");
      break;
    }
  }
})();
