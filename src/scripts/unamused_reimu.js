// for template related scripts
(function () {
  for (const c of document.getElementById("nav").children) {
    if (c.children[0].href === document.URL) {
      c.children[0].removeAttribute("href");
      break;
    }
  }
})();

function removeUnneededToggle(self) {
  // whew watch out
  const checkbox = self.parentElement.querySelector(`input[type="checkbox"]`);
  const code = self.parentElement.querySelector(`code`);

  // remove the checkbox if the element doesn't scroll
  // css sets a max height
  if (code.scrollHeight <= code.clientHeight) {
    checkbox.remove();
  }
}

document
  .querySelectorAll("pre > input + span + code")
  .forEach((element) => removeUnneededToggle(element));
