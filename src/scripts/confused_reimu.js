// the main page layout
(function () {
  // centerDivLinks();
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

  // function centerDivLinks() {
  //   var links = [
  //     ["404", Math.random().toString(36).slice(2, 7)],
  //     ["github", "https://www.github.com/rei2hu"],
  //     ["posts", "/posts"],
  //   ].sort(function (a, b) {
  //     return a[0].length - b[0].length;
  //   });
  //   var div = document.createElement("div");
  //   // https://stackoverflow.com/questions/356809/best-way-to-center-a-div-on-a-page-vertically-and-horizontally
  //   div.style.position = "absolute";
  //   div.style.top = 0;
  //   div.style.bottom = 0;
  //   div.style.left = 0;
  //   div.style.right = 0;
  //   div.style.margin = "auto";
  //   div.style.width = "200px";
  //   div.style.height = "200px";
  //   div.style.textAlign = "center";
  //   div.style.zIndex = 1;
  //   for (var i = 0; i < links.length; i++) {
  //     var link = links[i][1];
  //     var text = links[i][0];
  //     var a = document.createElement("a");
  //     a.href = link;
  //     a.innerHTML = text;
  //     a.style.display = "inline-block";
  //     a.style.paddingBottom = "8px";

  //     a.style.pointerEvents = links[i][2] ? "none" : "";

  //     div.appendChild(a);
  //     div.appendChild(document.createElement("br"));
  //   }
  //   document.body.appendChild(div);
  // }
})();
