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
let g_selectedType=POINT;              // default to points
let g_selectedSegmentsPerCircle=10;    // default to 10 segments/circle
let g_canvasColor=[0.0,0.0,0.0,1.0];   // default to black

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
    g_selectedColor = g_canvasColor; 
    // update sliders to reflect new color
    document.getElementById('s_red').value = g_canvasColor[0] * 100;
    document.getElementById('s_green').value = g_canvasColor[1] * 100;
    document.getElementById('s_blue').value = g_canvasColor[2] * 100;
  };

  document.getElementById('b_clear').onclick = function() { g_shape_list = []; render_all_shapes(); };   // just empty the shape list, and re-render
  document.getElementById('b_draw').onclick = draw_picture;
  document.getElementById('b_setclearcolor').onclick = function() {
    gl.clearColor(g_selectedColor[0], g_selectedColor[1], g_selectedColor[2], g_selectedColor[3]);
    g_canvasColor = g_selectedColor.slice();  // slice -> copy current value instead of copy reference
    render_all_shapes();  // re-render the shapes after clearing to new color.
  }
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

function draw_picture() {
  // we will "draw" each triangle by adding them to the g_shape_list
  // and calling render_all_shapes(). This preserves whatever was on the canvas
  
  // create the trianlges and push them to the tri list

  // ------ GROUND --------
  var g1 = new Triangle();
  var g2 = new Triangle();
  var g3 = new Triangle();
  var g4 = new Triangle();

  g1.position = [ -1.0,-1.0,   0.0,-1.0,   -1.0,-0.8 ];  // vertices counter-clockwise = front-facing
  g2.position = [ -1.0,-0.8,   0.0,-1.0,    0.0,-0.8 ];
  g3.position = [  0.0,-0.8,   0.0,-1.0,    1.0,-0.8 ];
  g4.position = [  0.0,-1.0,   1.0,-1.0,    1.0,-0.8 ];

  c_ground = [ 0.5, 0.5, 0.5, 1.0 ];
  g1.color = c_ground;
  g2.color = c_ground;
  g3.color = c_ground;
  g4.color = c_ground;

  g_shape_list.push(g1);
  g_shape_list.push(g2);
  g_shape_list.push(g3);
  g_shape_list.push(g4);

  // ------ LETTERS -------
  var t1 = new Triangle();
  var t2 = new Triangle();
  var t3 = new Triangle();
  var t4 = new Triangle();
  var l1 = new Triangle();
  var l2 = new Triangle();
  var l3 = new Triangle();
  var l4 = new Triangle();

  t1.position = [ -0.6,-0.8,    -0.4,-0.8,   -0.4,-0.4 ];
  t2.position = [ -0.4,-0.4,    -0.6,-0.4,   -0.6,-0.8 ];
  t3.position = [ -0.2,-0.2,    -0.8,-0.2,   -0.8,-0.4 ];
  t4.position = [ -0.8,-0.4,    -0.2,-0.4,   -0.2,-0.2 ];
  l1.position = [  0.2,-0.2,     0.2,-0.8,    0.4,-0.2 ];
  l2.position = [  0.2,-0.8,     0.4,-0.8,    0.4,-0.2 ];
  l3.position = [  0.4,-0.8,     0.6,-0.8,    0.6,-0.6 ];
  l4.position = [  0.6,-0.6,     0.4,-0.6,    0.4,-0.8 ];

  c_letter = [ 0.5, 0.3, 0.25, 1.0];

  t1.color = c_letter;
  t2.color = c_letter;
  t3.color = c_letter;
  t4.color = c_letter;
  l1.color = c_letter;
  l2.color = c_letter;
  l3.color = c_letter;
  l4.color = c_letter;

  g_shape_list.push(t1);
  g_shape_list.push(t2);
  g_shape_list.push(t3);
  g_shape_list.push(t4);
  g_shape_list.push(l1);
  g_shape_list.push(l2);
  g_shape_list.push(l3);
  g_shape_list.push(l4);

  // ------ GRASS ---------
  var c_grass = [ 0.3, 0.5, 0.2, 1.0 ];

  for (var i = -1.0; i < 1.0; i += 0.2) {
    var p1_x = i;
    var p1_y = -0.8;
    var p2_x = p1_x + 0.1;
    var p2_y = p1_y;
    var p3_x = p2_x;
    var p3_y = p2_y + 0.1;

    var tri = new Triangle();
    tri.position = [ p1_x,p1_y,   p2_x,p2_y,    p3_x,p3_y ];
    tri.color = c_grass;
    g_shape_list.push(tri);
  }

  // ------ LEAVES --------
  var tleaf1 = new Triangle();
  var tleaf2 = new Triangle();
  var tleaf3 = new Triangle();
  var tleaf4 = new Triangle();
  var tleaf5 = new Triangle();
  var tleaf6 = new Triangle();
  var tleaf7 = new Triangle();
  var tleaf8 = new Triangle();
  var tleaf9 = new Triangle();
  var tleaf10= new Triangle();

  var lleaf1 = new Triangle();
  var lleaf2 = new Triangle();
  var lleaf3 = new Triangle();
  var lleaf4 = new Triangle();
  var lleaf5 = new Triangle();
  var lleaf6 = new Triangle();
  var lleaf7 = new Triangle();
  var lleaf8 = new Triangle();
  var lleaf9 = new Triangle();
  var lleaf10= new Triangle();


  tleaf1.position = [ -0.5,-0.2,   -0.2,-0.2,  -0.5, 0.1 ];
  tleaf2.position = [ -0.8,-0.2,   -0.5,-0.2,  -0.5, 0.1 ];
  tleaf3.position = [ -0.2,-0.2,   -0.2,-0.3,  -0.1,-0.3 ];
  tleaf4.position = [ -0.2,-0.4,   -0.1,-0.3,  -0.2,-0.3 ];
  tleaf5.position = [ -0.3,-0.5,   -0.2,-0.4,  -0.3,-0.4 ];
  tleaf6.position = [ -0.3,-0.5,   -0.3,-0.4,  -0.4,-0.4 ];
  tleaf7.position = [ -0.7,-0.5,   -0.6,-0.4,  -0.7,-0.4 ];
  tleaf8.position = [ -0.7,-0.5,   -0.7,-0.4,  -0.8,-0.4 ];
  tleaf9.position = [ -0.9,-0.3,   -0.8,-0.3,  -0.8,-0.2 ];
  tleaf10.position =[ -0.9,-0.3,   -0.8,-0.4,  -0.8,-0.3 ];

  lleaf1.position = [  0.0,-0.5,    0.2,-0.5,   0.2,-0.3 ];
  lleaf2.position = [  0.0,-0.4,    0.2,-0.4,   0.2,-0.2 ];
  lleaf3.position = [  0.0,-0.3,    0.2,-0.3,   0.2,-0.1 ];
  lleaf4.position = [  0.4,-0.3,    0.4,-0.5,   0.6,-0.5 ];
  lleaf5.position = [  0.4,-0.2,    0.4,-0.4,   0.6,-0.4 ];
  lleaf6.position = [  0.4,-0.1,    0.4,-0.3,   0.6,-0.3 ];
  lleaf7.position = [  0.2,-0.1,    0.3,-0.1,   0.3, 0.0 ];
  lleaf8.position = [  0.3, 0.0,    0.3,-0.1,   0.4,-0.1 ];
  lleaf9.position = [  0.2,-0.1,    0.2,-0.2,   0.4,-0.1 ];
  lleaf10.position= [  0.4,-0.1,    0.2,-0.2,   0.4,-0.2 ];

  tleaf1.color = c_grass;
  tleaf2.color = c_grass;
  tleaf3.color = c_grass;
  tleaf4.color = c_grass;
  tleaf5.color = c_grass;
  tleaf6.color = c_grass;
  tleaf7.color = c_grass;
  tleaf8.color = c_grass;
  tleaf9.color = c_grass;
  tleaf10.color= c_grass;
  lleaf1.color = c_grass;
  lleaf2.color = c_grass;
  lleaf3.color = c_grass;
  lleaf4.color = c_grass;
  lleaf5.color = c_grass;
  lleaf6.color = c_grass;
  lleaf7.color = c_grass;
  lleaf8.color = c_grass;
  lleaf9.color = c_grass;
  lleaf10.color= c_grass;
  
  g_shape_list.push(tleaf1);
  g_shape_list.push(tleaf2);
  g_shape_list.push(tleaf3);
  g_shape_list.push(tleaf4);
  g_shape_list.push(tleaf5);
  g_shape_list.push(tleaf6);
  g_shape_list.push(tleaf7);
  g_shape_list.push(tleaf8);
  g_shape_list.push(tleaf9);
  g_shape_list.push(tleaf10);
  g_shape_list.push(lleaf1);
  g_shape_list.push(lleaf2);
  g_shape_list.push(lleaf3);
  g_shape_list.push(lleaf4);
  g_shape_list.push(lleaf5);
  g_shape_list.push(lleaf6);
  g_shape_list.push(lleaf7);
  g_shape_list.push(lleaf8);
  g_shape_list.push(lleaf9);
  g_shape_list.push(lleaf10);

  // ----- MOON ------
  var m1 = new Triangle();
  var m2 = new Triangle();
  var m3 = new Triangle();
  var m4 = new Triangle();

  m1.position = [ 0.4,0.5,    0.6,0.5,    0.6,0.6 ];
  m2.position = [ 0.4,0.8,    0.6,0.7,    0.6,0.8 ];
  m3.position = [ 0.7,0.8,    0.6,0.8,    0.6,0.5 ];
  m4.position = [ 0.6,0.5,    0.7,0.5,    0.7,0.8 ];

  c_moon = [ 1.0, 1.0, 0.0, 1.0 ];

  m1.color = c_moon;
  m2.color = c_moon;
  m3.color = c_moon;
  m4.color = c_moon;

  g_shape_list.push(m1);
  g_shape_list.push(m2);
  g_shape_list.push(m3);
  g_shape_list.push(m4);

  // Draw everything in g_shapes_list
  render_all_shapes();

}

