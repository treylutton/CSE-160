// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  void main() {
    gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
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
  let u_ModelMatrix;
  let u_GlobalRotateMatrix;

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

  // enable depth test for 3D rendering
  gl.enable(gl.DEPTH_TEST);

}

// init function for shaders 
function init_shaders() {
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {  // POTENTIAL ERROR HERE + gl.
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

  // Get the storage location of u_ModelMatrix
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  // Get the storage location of u_GlobalRotateMatrix
  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  if (!u_GlobalRotateMatrix) {
    console.log('Failed to get the storage location of u_GlobalRotateMatrix');
    return;
  }
}


// Global Variables - UI
let g_selectedColor=[1.0,1.0,1.0,1.0];   // default to white
let g_selectedCameraAngleY=320;          // default to 320 deg
let g_selectedCameraAngleX=360;          // default to no rotation (one full rotation so slider starts centered)
let g_mouseClicked=false;                // default to not clicked
let g_lastMouseX=0;
let g_lastMouseY=0;
let g_canvasColor=[0.0,0.0,0.0,1.0];     // default to black
let g_selectedScale=0.5;                 // default to 1/2 scale
let g_selectedJoint_L_SH= 0;             // default to no rotation
let g_selectedJoint_FL_KN=0;             // ^^ 
let g_selectedJoint_R_SH= 0;
let g_selectedJoint_FR_KN=0;
let g_selectedJoint_L_HI= 0;
let g_selectedJoint_RL_KN=0;
let g_selectedJoint_R_HI= 0;
let g_selectedJoint_RR_KN=0;
let g_selectedJoint_FL_AN=0;
let g_selectedJoint_FR_AN=0;
let g_selectedJoint_RL_AN=0;
let g_selectedJoint_RR_AN=0;
let g_selectedJoint_neck =0;

// Global Variables - Animation
let g_walk_anim_on = false;
let g_time;
let g_poke_anim_on = false;
let g_poke_anim_start = 0;
let g_poke_anim_duration = 1000;

function init_html_ui_elements() {
  // slider events 
  document.getElementById('s_cam_tilt').addEventListener('input', function() { g_selectedCameraAngleX = this.value; render_all_shapes(); });
  document.getElementById('s_cam_angle').addEventListener('input', function() { g_selectedCameraAngleY = this.value; render_all_shapes(); });
  document.getElementById('s_scene_size').addEventListener('input', function() { g_selectedScale = this.value / 100.0; render_all_shapes(); });
  document.getElementById('s_joint_l_sh').addEventListener('input', function() { g_selectedJoint_L_SH = this.value; render_all_shapes(); });
  document.getElementById('s_joint_fl_kn').addEventListener('input', function() { g_selectedJoint_FL_KN = this.value; render_all_shapes(); });
  document.getElementById('s_joint_fl_an').addEventListener('input', function() { g_selectedJoint_FL_AN = this.value; render_all_shapes(); });
  document.getElementById('s_joint_fr_an').addEventListener('input', function() { g_selectedJoint_FR_AN = this.value; render_all_shapes(); });
  document.getElementById('s_joint_rl_an').addEventListener('input', function() { g_selectedJoint_RL_AN = this.value; render_all_shapes(); });
  document.getElementById('s_joint_rr_an').addEventListener('input', function() { g_selectedJoint_RR_AN = this.value; render_all_shapes(); });
  document.getElementById('s_joint_r_sh').addEventListener('input', function() { g_selectedJoint_R_SH = this.value; render_all_shapes(); });
  document.getElementById('s_joint_fr_kn').addEventListener('input', function() { g_selectedJoint_FR_KN = this.value; render_all_shapes(); });
  document.getElementById('s_joint_l_hi').addEventListener('input', function() { g_selectedJoint_L_HI = this.value; render_all_shapes(); });
  document.getElementById('s_joint_rl_kn').addEventListener('input', function() { g_selectedJoint_RL_KN = this.value; render_all_shapes(); });
  document.getElementById('s_joint_r_hi').addEventListener('input', function() { g_selectedJoint_R_HI = this.value; render_all_shapes(); });
  document.getElementById('s_joint_rr_kn').addEventListener('input', function() { g_selectedJoint_RR_KN = this.value; render_all_shapes(); });
  document.getElementById('s_joint_neck').addEventListener('input', function() { g_selectedJoint_neck = this.value; render_all_shapes(); });
  
  // button events
  document.getElementById('b_anim_tog').onclick = function() {
    g_walk_anim_on = !g_walk_anim_on;

    if (g_walk_anim_on) {
      this.style.backgroundColor = '#07FF07';
      this.textContent = 'Animation: ON';
    } else {
      this.style.backgroundColor = '#888';
      this.textContent = 'Animation: OFF';
    }
  }

  // dont open the browsers default rightlick menu
  canvas.oncontextmenu = function(ev) { ev.preventDefault();};

  // mouse events
  canvas.onmousedown = function(ev) {       // on click on canvas
    if (ev.button == 2 && ev.shiftKey) {
      g_poke_anim_on = true;
      g_poke_anim_start = performance.now();
      return;
    }

    g_mouseClicked = true;                  // record the click
    var [y,x] = convert_coordinates_ev_to_gl(ev);
    g_lastMouseX = x;
    g_lastMouseY = y;
  }
  canvas.onmouseup = function() {           // stop rotating when click released
    g_mouseClicked = false;
  }
  canvas.onmouseleave = function() {        // stop rotating when cursor leaves canvas
    g_mouseClicked = false;
  }
  canvas.onmousemove = function(ev) {
    if (!g_mouseClicked) return;

    var [y, x] = convert_coordinates_ev_to_gl(ev);

    var delta_X = x - g_lastMouseX;
    var delta_Y = y - g_lastMouseY;

    g_selectedCameraAngleY = parseFloat(g_selectedCameraAngleY) - delta_Y * 100;
    g_selectedCameraAngleX = parseFloat(g_selectedCameraAngleX) + delta_X * 100;

    document.getElementById('s_cam_tilt').value = g_selectedCameraAngleX;
    document.getElementById('s_cam_angle').value = g_selectedCameraAngleY;
    g_lastMouseX = x;
    g_lastMouseY = y;
  }

}

// MAIN FUNCTION
function main() {
  // init
  init_webgl();
  init_shaders();
  init_html_ui_elements();

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.7, 0.7, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  render_all_shapes();

  // start animation (infinite loop)
  requestAnimationFrame(tick);
}

// Called by browser repeatedly
function tick() { 
  var start_time = performance.now();
  g_time = performance.now();     // update g_time
  render_all_shapes();            // draw everything
  requestAnimationFrame(tick);    // tell the browser to call again
  // get the total duration & display
  var duration = performance.now() - start_time;
  text_to_html("ms: " + Math.floor(duration) + " fps: " + Math.floor(1000/duration), 'p_performance');

}

var g_shape_list = [];

function convert_coordinates_ev_to_gl(ev) {
  // convert between event coordinate system and webgl/canvas coordinates
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

  return([x,y]);
}

// colors definitions (global)
let c_body = [0.41, 0.33, 0.27, 1.0];
let c_hoof = [0.2, 0.2, 0.2, 1.0];
let c_horn = [.8,.8,.8,1];

function render_all_shapes() {
  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // pass u_GlobalRotateMatrix to shader
  var globalRotMat = new Matrix4().rotate(g_selectedCameraAngleY, 0, 1, 0)
                                  .rotate(g_selectedCameraAngleX,1,0,0)
                                  .scale(g_selectedScale, g_selectedScale, g_selectedScale);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

  // DRAW THE OX
  // chest
  var body = new Cube();
  body.color = c_body;
  body.matrix.translate(-0.35, -0.3, 0.0);
  body.matrix.scale(0.7, 0.6, 1.2);
  body.render();

  // legs and head
  if (g_poke_anim_on) {
    var time = (performance.now() - g_poke_anim_start) / g_poke_anim_duration;

    if (time >= 1.0) {

      g_poke_anim_on = false;

    } else {

    var bow_depth = Math.sin(time * Math.PI);   // 0 -> 1 -> 0 over the duration => bow up and down
    var sh = -45 * bow_depth;                   // shoulders bow back 0 -> -45 degrees
    var kn = 30 * bow_depth;                    // knees bend forward 0 -> 30 degrees
    var neck = -30 * bow_depth;                 // head bows down 0 -> -30 degrees
    
    draw_leg(-0.4, -0.35, -0.05, sh, kn, 0, true, false);     
    draw_leg( 0.4, -0.35, -0.05, sh, kn, 0, false, false);
    draw_leg(-0.4, -0.35, 0.75, 0, 0, 0, true, true);           // back legs dont move
    draw_leg( 0.4, -0.35, 0.75, 0, 0, 0, false, true);          // ^
    draw_head(-0.2, 0.1, -0.2, neck,true);

    return; // skip the rest if we drew the poke anim this frame
    }
  } if (g_walk_anim_on) { // if animation enabled, random angles from pi offset by deltas

    // choose deltas and get angles from time
    var d_upper = 0;
    var d_lower = -20;
    var shoulder_angle = 20*Math.sin(g_time / 300);
    var knee_angle = -shoulder_angle;
    var ankle_angle = 0;

    // draw legs
    draw_leg(-0.4, -0.35, -0.05, shoulder_angle + d_upper, knee_angle + d_lower, ankle_angle, true, false);  // front left
    draw_leg(.4, -0.35, -0.05, -shoulder_angle + d_upper, -knee_angle + d_lower, ankle_angle, false, false); // front right
    draw_leg(-0.4, -.35, .75, -shoulder_angle + d_upper, -knee_angle + d_lower, ankle_angle, true, true);    // back left
    draw_leg(.4,-.35, .75, shoulder_angle + d_upper, knee_angle + d_lower, ankle_angle, false, true);        // back right

    // draw head
    draw_head(-.2,.1,-.2, shoulder_angle / 2.0,false);
  } else {              // otherwise angles come from sliders

    // draw legs
    draw_leg(-0.4, - 0.35, -0.05, g_selectedJoint_L_SH, g_selectedJoint_FL_KN, g_selectedJoint_FL_AN, true, false);      // front left
    draw_leg(.4, -0.35, -0.05, g_selectedJoint_R_SH, g_selectedJoint_FR_KN, g_selectedJoint_FR_AN, false, false);        // front right
    draw_leg(-0.4, -.35, .75, g_selectedJoint_L_HI, g_selectedJoint_RL_KN, g_selectedJoint_RL_AN, true, true);           // back left
    draw_leg(.4,-.35, .75, g_selectedJoint_R_HI, g_selectedJoint_RR_KN, g_selectedJoint_RR_AN, false, true);             // front right
    
    // draw head
    draw_head(-.2,.1,-.2, g_selectedJoint_neck,false);
  }
}

function draw_head(anc_x, anc_y, anc_z, joint_angle_neck, axis_x) {
  // head
  var head = new Cube();
  head.color = c_body;
  head.matrix.translate(anc_x, anc_y, anc_z);
  head.matrix.translate(.2,0,.4);
  if (!axis_x) {
    head.matrix.rotate(joint_angle_neck, 0,1,0);
  } else {
    head.matrix.rotate(joint_angle_neck, 1,0,0);
  }
  head.matrix.translate(-.2,0,-.4);
  var head_matrix = new Matrix4(head.matrix);
  head.matrix.scale(.4,.4,.4);
  head.render();

  // nose/snout
  var nose = new Cube();
  nose.color = c_body; 
  nose.matrix = head_matrix;
  nose.matrix.translate(-.025,0,.1);
  nose.matrix.scale(.45,.2,-.2);
  nose.render();

  // eyes
  var eye_l = new Cube();
  eye_l.color = [0,0,0,1];
  eye_l.matrix = new Matrix4(head_matrix);
  eye_l.matrix.translate(0.0999, 1.3 ,0.32);
  eye_l.matrix.scale(.2,.2,.2);
  eye_l.render();
  var eye_r = new Cube();
  eye_r.color = [0,0,0,1];
  eye_r.matrix = new Matrix4(head_matrix);
  eye_r.matrix.translate(0.7001, 1.3 ,0.32);
  eye_r.matrix.scale(.2,.2,.2);
  eye_r.render();

  // horns
  var horn_ll = new Cube();
  horn_ll.color = c_horn;
  horn_ll.matrix = new Matrix4(head_matrix);
  horn_ll.matrix.translate(0.05,1.3,0);
  var horn_ll_matrix = new Matrix4(horn_ll.matrix);
  horn_ll.matrix.scale(-.3, .3, .3);
  horn_ll.render();
  var horn_lr = new Cube();
  horn_lr.color = c_horn;
  horn_lr.matrix = new Matrix4(head_matrix);
  horn_lr.matrix.translate(1.25,1.3,0);
  var horn_lr_matrix = new Matrix4(horn_lr.matrix);
  horn_lr.matrix.scale(-.3, .3, .3);
  horn_lr.render();

  // upper horn pyramids
  var horn_ul = new Pyramid();
  horn_ul.color = c_horn;
  horn_ul.matrix = horn_ll_matrix;
  horn_ul.matrix.translate(-.3,0.3,0.3);
  horn_ul.matrix.rotate(-90,1,0,0);
  horn_ul.matrix.scale(.15,.3,1);
  horn_ul.render();
  var horn_ur = new Pyramid();
  horn_ur.color = c_horn;
  horn_ur.matrix = horn_lr_matrix;
  horn_ur.matrix.translate(-0.15,0.3,0.3);
  horn_ur.matrix.rotate(-90,1,0,0);
  horn_ur.matrix.scale(.15,.3,1);
  horn_ur.render();
}

function draw_leg(anc_x, anc_y, anc_z, joint_angle_sh, joint_angle_kn, joint_angle_an, left_side, rear_leg) {
  // draw the shoulder (or hip)
  var shoulder = new Cube();
  shoulder.color = c_body;                                    // set the color
  shoulder.matrix.translate(anc_x, anc_y, anc_z);             // move to the anchor point (final translate)
  var flipped_x = -1;                                         // assume right leg
  if (left_side) {                                            // unless param left_side is true
    flipped_x = 1;                                            // then left leg
  }
  shoulder.matrix.scale(flipped_x,1,1);                       // use the param we just set to invert x
  shoulder.matrix.translate(.15,.25,.25);                     // translate back
  shoulder.matrix.rotate(joint_angle_sh,1,0,0);               // rotate (slider value)
  shoulder.matrix.translate(-.15,-.25,-.25);                  // translate pivot point to origin
  var shoulder_matrix = new Matrix4(shoulder.matrix);         // copy after *SETTING* R, T, before S
  shoulder.matrix.scale(.3,.5,.5);                            // set main scaler
  shoulder.render();                                          

  // draw the upper leg
  var upper_leg = new Cube();                                 
  upper_leg.color = c_body;                                   
  upper_leg.matrix = shoulder_matrix;                         // rebase coordinates relative to shoulder
  if (rear_leg) {
    upper_leg.matrix.translate(0,0,.125);                      // center upper leg to shoulder if rear
  }
  upper_leg.matrix.translate(.001,-.2,0);                     // move coordinates away from shoulder (small delta x removes 'x fighting' since we were trying to draw different colors at the same pixel).
  var upper_leg_matrix = new Matrix4(upper_leg.matrix);       // save a copy before adding scale
  upper_leg.matrix.scale(.25,.2,.25);                         // set main scaler 
  upper_leg.render();                                         // render the upper leg

  // draw lower leg
  var lower_leg = new Cube();
  lower_leg.color = c_body;
  lower_leg.matrix = upper_leg_matrix;                        // rebase coordinates relative to upper leg
  if (rear_leg) {
    // +x +z
    lower_leg.matrix.translate(.2,0,.25);
  }
  lower_leg.matrix.translate(.001, -0.4, 0);                  // translate to final pos (small delta for x fighting)
  lower_leg.matrix.translate(0, .4, 0);                       // move pivot point back
  if (rear_leg) {
    lower_leg.matrix.rotate(180,0,1,0);
  }
  lower_leg.matrix.rotate(joint_angle_kn, 1, 0, 0);           // rotate the knee joint
  lower_leg.matrix.translate(0, -.3, 0);                      // move pivot point to origin (origin is relative to copied matrix ^^)
  var lower_leg_matrix = new Matrix4(lower_leg.matrix);       // save rebased coordinates
  lower_leg.matrix.scale(.2, .3, .2);                         // set main scaler
  lower_leg.render();                                         // render the lower leg

  // draw the hoof
  var hoof = new Cube();
  hoof.color = c_hoof;
  hoof.matrix = lower_leg_matrix;                             // rebase coordinates relative to lower leg
  hoof.matrix.translate(0, -.1,0);                            // move to final pos
  hoof.matrix.translate(0,.1,0);
  hoof.matrix.rotate(joint_angle_an,1,0,0);
  hoof.matrix.translate(0,-.1,0);
  hoof.matrix.scale(0.2, 0.1, 0.2);                           // set main scaler
  hoof.render();
}

function text_to_html(text, html_id) {
  var html_elem = document.getElementById(html_id);
  if (!html_elem) {
    console.log("Failed to get ID: " + html_id + " from HTML document.");
    return;
  }
  html_elem.innerHTML = text;
}