// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform float u_Size;
  void main() {
    gl_Position = a_Position;
    gl_PointSize = u_Size;
  }`

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;  // uniform
  void main() {
    gl_FragColor = u_FragColor;
  }`

  // Global Variables
  let canvas;
  let gl;
  let a_Position;
  let u_FragColor;
  let u_Size;

// init function for webgl
function init_webgl() {
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  // Note: switching from the old call drastically improved performance, always load context this way
  // gl = getWebGLContext(canvas); <-- leads to low FPS when shape list large
  gl = canvas.getContext("webgl", {preserveDrawingBuffer: true});
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
}

// init function for shaders 
function init_shaders() {
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  // Get the storage location of u_Size
  u_Size = gl.getUniformLocation(gl.program, 'u_Size');
  if (!u_Size) {
    console.log('Failed to get the storage location of u_Size');
    return;
  }
}

// Constants
const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

// Global Variables - UI
let g_selectedColor=[1.0,1.0,1.0,1.0]; // default to white
let g_selectedSize=10;                 // default to 10.0
let g_selectedType=CIRCLE;             // default to circles
let g_selectedSegmentsPerCircle=10;    // default to 10 segments/circle

function init_html_ui_elements() {

  // button events
  document.getElementById('b_green').onclick = function() { 
    // set selected color
    g_selectedColor = [0.0, 1.0, 0.0, 1.0]; 
    // update sliders to reflect new color
    document.getElementById('s_red').value = 0;
    document.getElementById('s_green').value = 100;
    document.getElementById('s_blue').value = 0;
  };
  document.getElementById('b_red').onclick = function() { 
    // set selected color
    g_selectedColor = [1.0, 0.0, 0.0, 1.0]; 
    // update sliders to reflect new color
    document.getElementById('s_red').value = 100;
    document.getElementById('s_green').value = 0;
    document.getElementById('s_blue').value = 0;
  };
  document.getElementById('b_blue').onclick = function() { 
    // set selected color
    g_selectedColor = [0.0, 0.2, 1.0, 1.0]; 
    // update sliders to reflect new color
    document.getElementById('s_red').value = 0;
    document.getElementById('s_green').value = 20;
    document.getElementById('s_blue').value = 100;
  };
  document.getElementById('b_erase').onclick = function() { 
    // set selected color
    g_selectedColor = [0.0, 0.0, 0.0, 1.0]; 
    // update sliders to reflect new color
    document.getElementById('s_red').value = 0;
    document.getElementById('s_green').value = 0;
    document.getElementById('s_blue').value = 0;
  };

  document.getElementById('b_clear').onclick = function() { g_shape_list = []; render_all_shapes(); };   // just empty the shape list, and re-render
  document.getElementById('b_point').onclick = function() { g_selectedType = POINT; };
  document.getElementById('b_triangle').onclick = function() { g_selectedType = TRIANGLE; };
  document.getElementById('b_circle').onclick = function() { g_selectedType = CIRCLE; };

  // slider events 
  // NOTE: swithced addEventListener param from 'mouseup' to 'input'
  // fixes sliders not updating when click is released while cursor is off the slider.
  document.getElementById('s_red').addEventListener('input', function() { g_selectedColor[0] = this.value/100; });
  document.getElementById('s_green').addEventListener('input', function() { g_selectedColor[1] = this.value/100; });
  document.getElementById('s_blue').addEventListener('input', function() { g_selectedColor[2] = this.value/100; });
  document.getElementById('s_size').addEventListener('input', function() { g_selectedSize = this.value; });
  document.getElementById('s_segments').addEventListener('input', function() { g_selectedSegmentsPerCircle = this.value; });
}

// MAIN FUNCTION
function main() {
  // init
  init_webgl();
  init_shaders();
  init_html_ui_elements();

  // Register function (event handler) to be called on a mouse press
  canvas.onmousedown = click;
  canvas.onmousemove = function(ev) { if (ev.buttons == 1) { click(ev); } };

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);
}

var g_shape_list = [];

// Update our "world" on click, then draw
function click(ev) {
  // get canvas oriented coordinates from click event
  [x,y] = convert_coordinates_ev_to_gl(ev);

  let p;
  if (g_selectedType == POINT) {
    p = new Point();
  } else if (g_selectedType == TRIANGLE) {
    p = new Triangle();
  } else {
    p = new Circle();
    p.segments = g_selectedSegmentsPerCircle;
  }
  p.position = [x, y];
  p.color = g_selectedColor.slice();
  p.size = g_selectedSize;
  g_shape_list.push(p);

  // render the shapes on the canvas
  render_all_shapes();
}

function convert_coordinates_ev_to_gl(ev) {
  // convert between event coordinate system and webgl/canvas coordinates
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

  return([x,y]);
}

function render_all_shapes() {
  // record start time
  var start_time = performance.now();

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  // get number of shapes
  var len = g_shape_list.length;

  // renger each shape
  for (let i = 0; i < len; i++) {
    g_shape_list[i].render();
  }

  // get the total duration & display
  var duration = performance.now() - start_time;
  text_to_html("numdot: " + len + " ms: " + Math.floor(duration) + " fps: " + Math.floor(1000/duration), 'p_performance');
}

function text_to_html(text, html_id) {
  var html_elem = document.getElementById(html_id);
  if (!html_elem) {
    console.log("Failed to get ID: " + html_id + " from HTML document.");
    return;
  }
  html_elem.innerHTML = text;
}

