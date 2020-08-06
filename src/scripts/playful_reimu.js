// the background effect
/* eslint-disable */
(function () {
  document.body.removeChild(document.getElementById("very-cute-picture"));
  var canvas = document.createElement("canvas");
  canvas.id = "gate";
  canvas.style.top = 0;
  canvas.style.bottom = 0;
  canvas.style.left = 0;
  canvas.style.right = 0;
  canvas.style.margin = 'auto';
  canvas.style.textAlign = 'center';
  canvas.style.zIndex = -1;
  document.body.appendChild(canvas);

  function $i(id) {
    return document.getElementById(id);
  }

  function get_screen_size() {
    var w = document.documentElement.clientWidth;
    var h = document.documentElement.clientHeight;
    return Array(w, h);
  }

  // number of stars
  var n = 64;

  var w = 0;
  var h = 0;

  var x = 0;
  var y = 0;
  var z = 0;

  var star_color_ratio = 0;
  var star_x_save;
  var star_y_save;
  var star_ratio = 64;
  var star_speed = 0.5;
  var star = new Array(n);

  var cursor_x = 0;
  var cursor_y = 0;

  var canvas_x = 0;
  var canvas_y = 0;
  var context;

  var lastAnim;
  var fadein = 0;

  function init() {
    for (var i = 0; i < n; i++) {
      star[i] = new Array(5);

      // 
      star[i][0] = Math.random() * w * 2 - x * 2;
      star[i][1] = Math.random() * h * 2 - y * 2;
      star[i][2] = Math.round(Math.random() * z);

      // position
      star[i][3] = 0;
      star[i][4] = 0;
    }

    var starfield = $i("gate");
    starfield.style.position = "fixed";
    starfield.width = w;
    starfield.height = h;
    context = starfield.getContext("2d");
    context.fillStyle = "rgb(255,255,255)";
    context.strokeStyle = "rgb(0,0,0)";
  }

  function anim() {
    var temp = lastAnim;
    lastAnim = Date.now();
    var elapsed = (lastAnim - temp) / 30;

    if (fadein < 1) {
      fadein += 0.01 * elapsed;
      var fadein_color = (255 * (1 - fadein)) | 0;
      context.strokeStyle = "rgb(" +
        fadein_color + "," +
        fadein_color + "," +
        fadein_color + ")";
    }

    var mouse_x = cursor_x - x;
    var mouse_y = cursor_y - y;
    context.fillRect(0, 0, w, h);

    for (var i = 0; i < n; i++) {
      var test = true;
      
      star_x_save = star[i][3];
      star_y_save = star[i][4];

      star[i][0] += mouse_x / w * 100 * elapsed;
      if (star[i][0] > x << 1) {
        star[i][0] -= w << 1;
        test = false;
      }
      if (star[i][0] < -x << 1) {
        star[i][0] += w << 1;
        test = false;
      }

      star[i][1] += mouse_y / w * 100 * elapsed;
      if (star[i][1] > y << 1) {
        star[i][1] -= h << 1;
        test = false;
      }
      if (star[i][1] < -y << 1) {
        star[i][1] += h << 1;
        test = false;
      }

      star[i][2] -= star_speed * elapsed;
      if (star[i][2] > z) {
        star[i][2] -= z;
        test = false;
      }
      if (star[i][2] < 0) {
        star[i][2] += z;
        test = false;
      }



      // new positions = center + x speed
      star[i][3] = x + (star[i][0] / star[i][2]) * star_ratio;
      star[i][4] = y + (star[i][1] / star[i][2]) * star_ratio;

      if (
        star_x_save > 0 &&
        star_x_save < w &&
        star_y_save > 0 &&
        star_y_save < h &&
        test
      ) {
        context.lineWidth = (1 - star_color_ratio * star[i][2]) * 2;
        context.beginPath();
        context.moveTo(star_x_save, star_y_save);
        context.lineTo(star[i][3], star[i][4]);
        context.stroke();
        context.closePath();
      }
    }

    // timeout = setTimeout(anim, fps);
    timeout = window.requestAnimationFrame(anim);
  }

  function move(evt) {
    evt = evt || event;
    cursor_x = evt.pageX - canvas_x - window.scrollX;
    cursor_y = evt.pageY - canvas_y - window.scrollY;
  }

  function start() {
    resize();
    lastAnim = Date.now();
    anim();
  }

  function resize() {
    var sizes = get_screen_size();
    w = sizes[0];
    h = sizes[1];
    x = Math.round(w / 2);
    y = Math.round(h / 2);
    z = (w + h) / 2;
    star_color_ratio = 1 / z;
    cursor_x = x;
    cursor_y = y;
    init();
  }

  document.onmousemove = move;
  document.body.onresize = resize;
  // start();
  setTimeout(start, 5000);
})();
