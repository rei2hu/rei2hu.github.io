// the background effect but modified for the 404 page
(function () {
  document.body.removeChild(document.getElementById("very-cute-picture"));
  var canvas = document.createElement("canvas");
  canvas.id = "gate";
  canvas.style.top = 0;
  canvas.style.bottom = 0;
  canvas.style.left = 0;
  canvas.style.right = 0;
  canvas.style.margin = "auto";
  canvas.style.textAlign = "center";
  canvas.style.zIndex = -1;
  canvas.style.position = "fixed";
  canvas.width = w;
  canvas.height = h;
  document.body.appendChild(canvas);

  var starfield;
  var test = true;
  var n = 128;
  var w = 0;
  var h = 0;
  var x = 0;
  var y = 0;
  var z = 0;
  var colorRatio = 0;
  var starXSave;
  var starYSave;
  var starRatio = 256;
  var starSpeed = 1;
  var star = new Array(n);
  var cursorX = 0;
  var cursorY = 0;
  var mouseX = 0;
  var mouseY = 0;
  var canvasX = 0;
  var canvasY = 0;
  var context;
  var lastAnim = 0;

  function animate(time) {
    context.fillRect(0, 0, w, h);

    var oldAnim = lastAnim;
    lastAnim = time;
    var elapsed = (lastAnim - oldAnim) * 2;

    var nx = cursorX - x;
    var ny = cursorY - y;

    mouseX = Math.min(Math.max(mouseX - 32, nx), mouseX + 32);
    mouseY = Math.min(Math.max(mouseY - 32, ny), mouseY + 32);

    var dx = (mouseX / w) * elapsed;
    var dy = (mouseY / h) * elapsed;
    var dz = (starSpeed * elapsed) / 100;

    for (var i = 0; i < n; i++) {
      test = true;
      [, , , starXSave, starYSave] = star[i];

      star[i][0] += dx;
      if (star[i][0] > x << 1) {
        star[i][0] -= w << 1;
        test = false;
      }
      if (star[i][0] < -x << 1) {
        star[i][0] += w << 1;
        test = false;
      }

      star[i][1] += dy;
      if (star[i][1] > y << 1) {
        star[i][1] -= h << 1;
        test = false;
      }
      if (star[i][1] < -y << 1) {
        star[i][1] += h << 1;
        test = false;
      }

      star[i][2] -= dz;
      if (star[i][2] > z) {
        star[i][2] -= z;
        test = false;
      }
      if (star[i][2] < 0) {
        star[i][2] += z;
        test = false;
      }

      star[i][3] = x + (star[i][0] / star[i][2]) * starRatio;
      star[i][4] = y + (star[i][1] / star[i][2]) * starRatio;

      if (
        elapsed < 40 &&
        starXSave > 0 &&
        starXSave < w &&
        starYSave > 0 &&
        starYSave < h &&
        test
      ) {
        context.lineWidth = (1 - colorRatio * star[i][2]) * 4;
        context.beginPath();
        context.moveTo(starXSave, starYSave);
        context.lineTo(star[i][3], star[i][4]);
        context.stroke();
      }
    }

    var oldStyle = context.fillStyle;

    context.font = "bold 10em Courier";
    context.fillStyle = "white";
    context.fillText("404", 100, 200);
    var width = context.measureText("404").width / 2;
    context.font = "bold 1em Courier";
    context.fillText("you are lost in space", 100 + width, 250);

    context.fillStyle = oldStyle;

    requestAnimationFrame(animate);
  }

  function start() {
    updateSize();
    resetStars();
  }

  function resetStars() {
    for (var i = 0; i < n; i++) {
      star[i] = new Array(5);
      star[i][0] = Math.random() * w * 2 - x * 2;
      star[i][1] = Math.random() * h * 2 - y * 2;
      star[i][2] = Math.round(Math.random() * z);
      star[i][3] = 0;
      star[i][4] = 0;
    }

    starfield = document.getElementById("gate");
    starfield.style.position = "fixed";
    starfield.width = w;
    starfield.height = h;
    context = starfield.getContext("2d");
    context.fillStyle = "black";
    context.strokeStyle = "white";
  }

  document.addEventListener("mousemove", (evt) => {
    cursorX = evt.pageX - canvasX - window.scrollX;
    cursorY = evt.pageY - canvasY - window.scrollY;
  });

  function updateSize() {
    w = document.documentElement.clientWidth;
    h = document.documentElement.clientHeight;
    x = Math.round(w / 2);
    y = Math.round(h / 2);
    z = (w + h) / 2;
    colorRatio = 1 / z;
    cursorX = x;
    cursorY = y;
  }

  window.addEventListener("resize", start);

  start();
  requestAnimationFrame(animate);
})();
