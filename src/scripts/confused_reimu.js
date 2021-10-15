// the main page layout
(function () {
  bottomRightLinks();

  function bottomRightLinks() {
    var div = document.createElement("div");
    var innerDiv;
    div.addEventListener("mouseenter", function () {
      innerDiv = document.createElement("div");
      innerDiv.style.bottom = "1.5rem";
      // r2hkri (at) gm4il d0t corn
      innerDiv.innerHTML =
        "email: " +
        atob("cjJoa3JpIChhdCkgZ2" + 0 + "" + 0 + "aWwgZDB0IGNvcm4=");
      div.appendChild(innerDiv);
    });
    div.addEventListener("mouseleave", function () {
      if (innerDiv) div.removeChild(innerDiv);
      innerDiv = null;
    });
    div.style.bottom = "1.5rem";
    div.style.right = "1.5rem";
    div.style.position = "fixed";
    div.style.textAlign = "right";
    div.style.zIndex = 1;
    div.innerHTML = "mouse over for contact info";
    document.body.appendChild(div);
  }
})();
