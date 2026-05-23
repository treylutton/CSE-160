// Vertex shader program
var VSHADER_SOURCE = `
  precision mediump float;

  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute vec3 a_Normal;

  varying vec2 v_UV;
  varying vec3 v_Normal;
  varying vec4 v_vertexPosition;

  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  uniform mat4 u_NormalMatrix;

  void main()
  {
    // sets position
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;

    // passes varying variables to frag shaders
    v_UV = a_UV;
    v_Normal = normalize(vec3(u_NormalMatrix * vec4(a_Normal, 1.0)));
    v_vertexPosition = u_ModelMatrix * a_Position;  // conver to world coords
  }`

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;

  uniform vec4 u_FragColor;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2;
  uniform sampler2D u_Sampler3;
  uniform int u_tex_enum;
  uniform float u_tex_color_weight;
  uniform vec3 u_lightPosition;
  uniform vec3 u_cameraPosition;
  uniform bool u_lighting_enabled;
  uniform bool u_global_lighting_enabled;

  varying vec3 v_Normal;
  varying vec2 v_UV;
  varying vec4 v_vertexPosition;

  void main() 
  {
    if (u_tex_enum == -3)
    {
      gl_FragColor = vec4((v_Normal+1.0)/2.0, 1.0);
    }
    else if (u_tex_enum == -2) 
    {
      gl_FragColor = u_FragColor;                   // use color
    } 

    else if (u_tex_enum == -1 ) 
    {
      gl_FragColor = vec4(v_UV, 1.0, 1.0);          // use debug UV color
    } 

    else if (u_tex_enum == 0)
    {
      // Uses a linear interpolation between the sampled texture color and the selected color
      // Uniform variable 'u_tex_color_weight' controls the ratio between tex & color.
      // texture0 is also tiled (scaled UV vector)
      gl_FragColor = (1.0 - u_tex_color_weight) * u_FragColor + u_tex_color_weight * texture2D(u_Sampler0, v_UV * 8.0);
    }

    else if (u_tex_enum == 1)
    {
      gl_FragColor = (1.0 - u_tex_color_weight) * u_FragColor + u_tex_color_weight * texture2D(u_Sampler1, v_UV);
    }

    else if (u_tex_enum == 2)
    {
      gl_FragColor = (1.0 - u_tex_color_weight) * u_FragColor + u_tex_color_weight * texture2D(u_Sampler2, v_UV);
    }

    else if (u_tex_enum == 3)
    {
      gl_FragColor = (1.0 - u_tex_color_weight) * u_FragColor + u_tex_color_weight * texture2D(u_Sampler3, v_UV);
    }

    else 
    {
      gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);      // error - red
    }

    // LIGHTING
    if (u_global_lighting_enabled) 
    {
      if (u_lighting_enabled) 
      {
      // tuning variables
      float Ka = 0.2;
      float Kd = 1.0;
      float Ks = 1.0;
      float distance_attenuation_factor = 0.01;

      // component calculations
      vec3 lightVector = u_lightPosition - vec3(v_vertexPosition);
      float r = length(lightVector);
      vec3 L = normalize(lightVector);
      float NdotL = max(dot(v_Normal, L), 0.0);
      float attenuation = 1.0 / (1.0 + (distance_attenuation_factor * (r * r)));
      vec3 E = normalize(u_cameraPosition - vec3(v_vertexPosition));
      vec3 R = reflect(-L, v_Normal);

      vec4 ambient = gl_FragColor * Ka;
      vec4 diffuse = gl_FragColor * Kd * NdotL * attenuation;
      vec4 specular = gl_FragColor * Ks * pow(max(dot(E, R), 0.0), 10.0);

      gl_FragColor = ambient + diffuse + specular;
      gl_FragColor.a = 1.0;
      }
    }
  }`

  // Global Variables
  let canvas;
  let camera;
  let gl;
  let a_Position;
  let a_UV;
  let a_Normal;
  let u_Sampler0;
  let u_Sampler1;
  let u_Sampler2;
  let u_Sampler3;
  let u_tex_enum;
  let u_tex_color_weight;
  let u_FragColor;
  let u_ModelMatrix;
  let u_GlobalRotateMatrix;
  let u_ViewMatrix;
  let u_ProjectionMatrix;
  let u_NormalMatrix;
  let u_lightPosition;
  let u_cameraPosition;
  let u_lighting_enabled;
  let u_global_lighting_enabled;

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

  a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  if (a_Normal < 0) {
    console.log('Failed to get the storage location of a_Normal');
    return;
  }

  // Get the storage location of a_UV
  a_UV = gl.getAttribLocation(gl.program, 'a_UV');
  if (a_UV < 0) {
    console.log('Failed to get the storage location of a_UV');
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  // Get the storage location of u_FragColor
  u_lighting_enabled = gl.getUniformLocation(gl.program, 'u_lighting_enabled');
  if (!u_lighting_enabled) {
    console.log('Failed to get the storage location of u_lighting_enabled');
    return;
  }

  // Get the storage location of u_FragColor
  u_global_lighting_enabled = gl.getUniformLocation(gl.program, 'u_global_lighting_enabled');
  if (!u_global_lighting_enabled) {
    console.log('Failed to get the storage location of u_global_lighting_enabled');
    return;
  }

  // Get the storage location of u_lightPosition
  u_lightPosition = gl.getUniformLocation(gl.program, 'u_lightPosition');
  if (u_lightPosition < 0) {
    console.log('Failed to get the storage location of u_lightPosition');
    return;
  }

  // Get the storage location of u_lightPosition
  u_cameraPosition = gl.getUniformLocation(gl.program, 'u_cameraPosition');
  if (u_cameraPosition < 0) {
    console.log('Failed to get the storage location of u_cameraPosition');
    return;
  }

  // Get the storage location of u_ModelMatrix
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  // Get the storage location of u_NormalMatrix
  u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  if (!u_NormalMatrix) {
    console.log('Failed to get the storage location of u_NormalMatrix');
    return;
  }

  // Get the storage location of u_GlobalRotateMatrix
  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  if (!u_GlobalRotateMatrix) {
    console.log('Failed to get the storage location of u_GlobalRotateMatrix');
    return;
  }

  // Get the storage location of u_ModelMatrix
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  if (!u_ProjectionMatrix) {
    console.log('Failed to get the storage location of u_ProjectionMatrix');
    return;
  }

  // Get the storage location of u_ModelMatrix
  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  if (!u_ViewMatrix) {
    console.log('Failed to get the storage location of u_ViewMatrix');
    return;
  }

  // get the storage location of u_Sampler0
  u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
  if (!u_Sampler0) {
    console.log('Failed to get the location of u_Sampler0.');
    return false;
  }

  u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
  if (!u_Sampler1) {
    console.log('Failed to get the location of u_Sampler1.');
    return false;
  }

  u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2');
  if (!u_Sampler2) {
    console.log('Failed to get the location of u_Sampler2.');
    return false;
  }

  u_Sampler3 = gl.getUniformLocation(gl.program, 'u_Sampler3');
  if (!u_Sampler3) {
    console.log('Failed to get the location of u_Sampler3.');
    return false;
  }

  u_tex_enum = gl.getUniformLocation(gl.program, 'u_tex_enum');
  if (!u_tex_enum) {
    console.log('Failed to get the location of u_tex_enum.');
    return false;
  }

  // get the storage location of u_Sampler0
  u_tex_color_weight = gl.getUniformLocation(gl.program, 'u_tex_color_weight');
  if (!u_tex_color_weight) {
    console.log('Failed to get the location of u_tex_color_weight.');
    return false;
  }
}

function init_textures() {
  // create the image object
  var i_grass = new Image();
  if (!i_grass) {
    console.log('Failed to create image object.');
    return false;
  }

  var i_sky = new Image();
  if (!i_sky) {
    console.log('Failed to create image object.');
    return false;
  }

  var i_wood = new Image();
  if (!i_wood) {
    console.log('Failed to create image object.');
    return false;
  }

  var i_brick = new Image();
  if (!i_brick) {
    console.log('Failed to create image object.');
    return false;
  }

  // register the event handler to be called on loading an image
  i_grass.onload = function() { load_img_TEXTURE0(i_grass); };
  i_sky.onload = function() { load_img_TEXTURE1(i_sky); };
  i_wood.onload = function() { load_img_TEXTURE2(i_wood);};
  i_brick.onload = function() { load_img_TEXTURE3(i_brick);};

  i_grass.src = '../lib/tex/grass.png';
  i_sky.src = '../lib/tex/sky-day.png';
  i_wood.src = '../lib/tex/wood.png';
  i_brick.src = '../lib/tex/stone-brick.png';
}

function load_img_TEXTURE0(image) {
  // create the texture object
  var tex = gl.createTexture();
  if (!tex) {
    console.log('Failed to create the texture object.');
    return false;
  }

  // flip Y axis
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

  // enable texture unit 0
  gl.activeTexture(gl.TEXTURE0);

  // bind texture object to target
  gl.bindTexture(gl.TEXTURE_2D, tex);

  // set the texture image
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

  // generate mipmaps and use trilinear filtering to eliminate moire patterns
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

  gl.uniform1i(u_Sampler0, 0);
}

function load_img_TEXTURE1(image) {
  // create the texture object
  var tex = gl.createTexture();
  if (!tex) {
    console.log('Failed to create the texture object.');
    return false;
  }

  // flip Y axis
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

  // enable texture unit 1
  gl.activeTexture(gl.TEXTURE1);

  // bind texture object to target
  gl.bindTexture(gl.TEXTURE_2D, tex);

  // set the texture image
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

  // generate mipmaps and use trilinear filtering to eliminate moire patterns
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

  gl.uniform1i(u_Sampler1, 1);
}

function load_img_TEXTURE2(image) {
  // create the texture object
  var tex = gl.createTexture();
  if (!tex) {
    console.log('Failed to create the texture object.');
    return false;
  }

  // flip Y axis
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

  // enable texture unit 1
  gl.activeTexture(gl.TEXTURE2);

  // bind texture object to target
  gl.bindTexture(gl.TEXTURE_2D, tex);

  // set the texture image
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

  // generate mipmaps and use trilinear filtering to eliminate moire patterns
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

  gl.uniform1i(u_Sampler2, 2);
}

function load_img_TEXTURE3(image) {
  // create the texture object
  var tex = gl.createTexture();
  if (!tex) {
    console.log('Failed to create the texture object.');
    return false;
  }

  // flip Y axis
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

  // enable texture unit 1
  gl.activeTexture(gl.TEXTURE3);

  // bind texture object to target
  gl.bindTexture(gl.TEXTURE_2D, tex);

  // set the texture image
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

  // generate mipmaps and use trilinear filtering to eliminate moire patterns
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

  gl.uniform1i(u_Sampler3, 3);
}

// Global Variables - UI
let g_clearColor=[.3,.4,.1,1];
let g_selectedColor=[1.0,1.0,1.0,1.0];
let g_selectedCameraAngleY=360;
let g_selectedCameraAngleX=360; 
let g_mouseClicked=false;
let g_lastMouseX=0;
let g_lastMouseY=0;
let g_canvasColor=[0.0,0.0,0.0,1.0];
let g_selectedScale=1.0;
// Global Variables - World
let g_playerSpeed=0.02;
let g_mouse_sens=.2;
let g_lightX=0, g_lightY=10, g_lightZ=0;
let g_lightAngle=0;
// Global Variables - Animation
let g_ox_speed=0.01;
let g_walk_anim_on = false;
let g_light_anim_on = false;
let g_time;
let g_poke_anim_on = false;
let g_poke_anim_start = 0;
let g_poke_anim_duration = 1000;
let g_last_frame_time = 0;
// Ox joint globals
let g_selectedJoint_L_SH= 0;
let g_selectedJoint_FL_KN=0;
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
let g_global_lighting_enabled=1;
let g_normal_tog = false;

function init_html_ui_elements() {
  // slider events 
  document.getElementById('s_player_speed').addEventListener('input', function() { g_playerSpeed = this.value / 100.0; render_all_shapes(); });
  document.getElementById('s_mouse_sens').addEventListener('input', function() { g_mouse_sens = this.value / 100.0; render_all_shapes(); });
  document.getElementById('s_ox_speed').addEventListener('input', function() { g_ox_speed = this.value / 1000.0; render_all_shapes(); });
  document.getElementById('s_light_x').addEventListener('input', function() { g_lightX = this.value; render_all_shapes(); });
  document.getElementById('s_light_y').addEventListener('input', function() { g_lightY = this.value; render_all_shapes(); });
  document.getElementById('s_light_z').addEventListener('input', function() { g_lightZ = this.value; render_all_shapes(); });
  document.getElementById('s_fov').addEventListener('input', function() 
  {
    camera.fov = this.value;
    camera.proj_matrix.setPerspective(camera.fov, canvas.width / canvas.height, 0.1, 1000);
    render_all_shapes(); 
  });
  

  // Ox movement button
  document.getElementById('b_anim_tog').onclick = function() {
    g_walk_anim_on = !g_walk_anim_on;

    if (g_walk_anim_on) {
      this.style.backgroundColor = '#07FF07';
      this.textContent = 'Ox Movement: ON';
    } else {
      this.style.backgroundColor = '#888';
      this.textContent = 'Ox Movement: OFF';
    }
  }

  // light animation button
  document.getElementById('b_light_anim_tog').onclick = function() {
    g_light_anim_on = !g_light_anim_on;

    if (g_light_anim_on) {
      this.style.backgroundColor = '#07FF07';
      this.textContent = 'Light Animation: ON';
    } else {
      this.style.backgroundColor = '#888';
      this.textContent = 'Light Animation: OFF';
    }
  }

  // Normal button
  document.getElementById('b_normal_tog').onclick = function() {
    g_normal_tog = !g_normal_tog;

    if (g_normal_tog) {
      this.style.backgroundColor = '#07FF07';
      this.textContent = 'Debug Normals: ON';
    } else {
      this.style.backgroundColor = '#888';
      this.textContent = 'Debug Normals: OFF';
    }
  }

  // light animation button
  document.getElementById('b_lighting_tog').onclick = function() {
    g_global_lighting_enabled = !g_global_lighting_enabled;

    if (g_global_lighting_enabled) {
      this.style.backgroundColor = '#07FF07';
      this.textContent = 'Light Animation: ON';
    } else {
      this.style.backgroundColor = '#888';
      this.textContent = 'Light Animation: OFF';
    }
  }

  // dont open the browsers default rightlick menu
  canvas.oncontextmenu = function(ev) { ev.preventDefault();};

  // mouse events
  canvas.onmousedown = function(ev) {       // on click on canvas
    if (ev.button == 2 && ev.shiftKey) {    // Shift + Right Click
      g_poke_anim_on = true;
      g_poke_anim_start = performance.now();
      return;
    } else if (ev.button == 0 && ev.shiftKey) { // Shift + Left Click
      canvas.requestPointerLock(); // locks the cursor to the canvas, wraps around
    } else if (ev.button == 0 && document.pointerLockElement === canvas) { // Left Click while locked
      rm_block();
    }

    g_mouseClicked = true;                  // record the click
    //var [x,y] = convert_coordinates_ev_to_gl(ev);
    //g_lastMouseX = x;
    //g_lastMouseY = y;
  }
  document.onmouseup = function() {         // stop rotating wherever mouse is released
    g_mouseClicked = false;
  }
  canvas.onmousemove = function(ev) {
    if (document.pointerLockElement !== canvas) return;
    camera.pan_mouse(ev.movementX * g_mouse_sens, ev.movementY * g_mouse_sens);
  }

}
function init() {
  // all init functions
  init_webgl();
  init_shaders();
  init_html_ui_elements();
  init_textures();

  // set the clear color and clear the canvas
  gl.clearColor(g_clearColor[0], g_clearColor[1], g_clearColor[2], g_clearColor[3]);
  gl.clear(gl.COLOR_BUFFER_BIT);
}
let g_keys = new Set();

function main() {
  init();

  // register event handlers
  document.onkeydown = function(ev) { g_keys.add(ev.keyCode); };
  document.onkeyup   = function(ev) { g_keys.delete(ev.keyCode); };

  // create camera
  camera = new Camera();

  render_all_shapes();

  g_time = performance.now();

  // start animation (infinite loop)
  requestAnimationFrame(tick);
}

function process_keys() {
  if (g_keys.has(87)) camera.move_forward();  // w
  if (g_keys.has(83)) camera.move_backward(); // s
  if (g_keys.has(65)) camera.move_left();     // a
  if (g_keys.has(68)) camera.move_right();    // d
  if (g_keys.has(81)) camera.pan_left();      // q
  if (g_keys.has(69)) camera.pan_right();     // e
}

function rm_block() {
  // f_x = at_x - eye_x 
  var f_x = camera.at.elements[0] - camera.eye.elements[0];
  var f_z = camera.at.elements[2] - camera.eye.elements[2];

  // compute ||f||
  var magnitude = Math.sqrt((f_x * f_x) + (f_z * f_z));

  // normalize
  f_x /= magnitude;
  f_z /= magnitude;

  // walk the ray out from camera in .5 unit steps till 4.5 units
  for (var d = 0.5; d <= 4.5; d += 0.5) {
    // take the step and convert coordinates to map index
    var x_idx = Math.floor(camera.eye.elements[0] + f_x * d + 16);
    var z_idx = Math.floor(camera.eye.elements[2] + f_z * d + 16);
    // stop if the ray is out of the map 
    if (x_idx < 0 || x_idx >= 32 || z_idx < 0 || z_idx >= 32) break;
    // rm a block from that cell if non-empty
    if (g_map[x_idx * 32 + z_idx] > 0) {
      g_map[x_idx * 32 + z_idx]--;
      // rm at most one block => return
      return;
    }
  }
}
let g_anim_pause = false;

function update_light(dt) {
  g_lightAngle += dt * 0.002;   // ~1 full revolution per ~3 seconds
  g_lightX = 10 * Math.cos(g_lightAngle);
  g_lightY = 15;
  g_lightZ = 10 * Math.sin(g_lightAngle);
}

function update_ox(dt) 
{
  // decrease the 'time to live' of the current action by time passed
  g_ox_turn_timer -= dt;

  // choose a new action if expired TTL
  if (g_ox_turn_timer <= 0) {
    if (g_anim_pause) g_anim_pause = false;

    // 50% chance to wait 1 second
    if (Math.random() < 0.5) {
      g_anim_pause = true;
      g_ox_turn_timer = 1000;
    }

    g_ox_angle = Math.random() * 360;                // random angle
    g_ox_turn_timer = 3000 + Math.random() * 3000;   // new direction 3-6 seconds
  }

  if (g_anim_pause) return;

  // Convert angle to rad, and convert for ox offset 
  // its originally drawn facing -90 degrees in XZ plane
  var rad = g_ox_angle * Math.PI / 180;

  // compute new x and z
  g_ox_dx = Math.cos(rad) * g_ox_speed;
  g_ox_dz = Math.sin(rad) * g_ox_speed;

  // detect if the new position is a collision by checking body radius in +x, -x, +z, -z directions
  var blocked = false;
  var vectors = [[.7, 0], [-.7, 0], [0, .7], [0, -.7]];

  // checks for objects 'radius' GL units away from Ox center
  // in cardinal directions.
  for (var i = 0; i < 4; i++)
  {
    var x_idx = Math.floor(g_ox_x + g_ox_dx + 16 + vectors[i][0]);
    var z_idx = Math.floor(g_ox_z + g_ox_dz + 16 + vectors[i][1]);

    if (x_idx < 0 || x_idx >= 32 || z_idx < 0 || z_idx >= 32 || g_map[x_idx * 32 + z_idx] != 0) 
    {
      blocked = true;
      break;
    }
  }
  // update pos if available
  if (!blocked)
  {
    g_ox_x += g_ox_dx;
    g_ox_z += g_ox_dz;
  }
  else
  {
    // when the path is blocked we want to go backwards
    //g_ox_x -= g_ox_dx;
    //g_ox_z -= g_ox_dz;
    g_ox_angle += 180;

  }

  // rebuild the base matrix: translate to world pos, then rotate to face heading
  g_ox_base = new Matrix4();
  g_ox_base.translate(g_ox_x, 0, g_ox_z);
  // Theres a conversion in the rotation from the position I originally
  // draw the ox (first quadrant, facing -90 degrees = facing -Z axis)
  // add 90 to face the angle of rotation, and invert to get the correct direction
  g_ox_base.translate(0, 0, .6);                        // translate center back
  g_ox_base.rotate(-1 * (g_ox_angle + 90), 0, 1, 0);    // rotate about Y axis
  g_ox_base.translate(0, 0, -.6);                       // translate center to origin
}

// Called by browser repeatedly
function tick() {
  var start_time = performance.now();
  var duration = start_time - g_time; // get duration
  g_time = start_time;                // update g_time
  process_keys();
  if (g_walk_anim_on) update_ox(duration);
  if (g_light_anim_on) update_light(duration);
  render_all_shapes();                // draw everything
  text_to_html("ms: " + Math.floor(duration) + " fps: " + Math.floor(1000/duration), 'p_performance');
  requestAnimationFrame(tick);    // tell the browser to call again
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

// colors definitions (global)
let c_body = [0.41, 0.33, 0.27, 1.0];
let c_hoof = [0.2, 0.2, 0.2, 1.0];
let c_horn = [.8,.8,.8,1];

// Ox animation/ AI globals
let g_ox_x = -8, g_ox_z = -12;
let g_ox_angle = 180;
let g_ox_turn_timer = 0;
var g_ox_base = new Matrix4().translate(g_ox_x, 0, g_ox_z).rotate(g_ox_angle, 0,1,0); // world transform applied to ox body, head, legs

// global map
var g_map = [
  5,4,5,4,5,4,5,4,5,4,5,4,5,4,5,4,5,4,5,4,5,4,5,4,5,4,5,4,5,4,5,4,
  4,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,5,
  5,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,4,
  4,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,5,
  5,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,4,
  4,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,5,
  5,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,4,
  4,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,5,
  5,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,4,
  4,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,5,
  5,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,4,
  4,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,5,
  5,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,4,
  4,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,5,
  5,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,4,
  4,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,5,
  5,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,4,
  4,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,5,
  5,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,4,
  4,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,5,
  5,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,4,
  4,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,5,
  5,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,4,
  4,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,5,
  5,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,4,
  4,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,5,
  5,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,4,
  4,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,5,
  5,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,4,
  4,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,5,
  5,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,4,
  4,5,4,5,4,5,4,5,4,5,4,5,4,5,4,5,4,5,4,5,4,5,4,5,4,5,4,5,4,5,4,5,
];

function draw_map() {
  for (var x = 0; x < 32; x++) {
    for (var y = 0; y < 32; y++) {
      for (var h = 0; h < g_map[x * 32 + y]; h++) {
        var c = new Cube();
        c.color = [0,0,0,1];
        c.tex_color_weight = .7;
        c.tex_num = (x == 0 || x == 31 || y == 0 || y == 31) ? 3 : 2;
        c.matrix.translate(x - 16, h - 1, y - 16);
        c.render();
      }
    }
  }
}

function render_all_shapes() {
  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // pass the projection matrix to vertex shader
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.proj_matrix.elements);

  // pass the view matrix to vertex shader
  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.view_matrix.elements);

  // pass u_GlobalRotateMatrix to shader
  var global_rotate_matrix = new Matrix4().rotate(g_selectedCameraAngleY, 0, 1, 0)
                                  .rotate(g_selectedCameraAngleX,1,0,0)
                                  .scale(g_selectedScale, g_selectedScale, g_selectedScale);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, global_rotate_matrix.elements);

  // pass light position to fragment shader
  gl.uniform3f(u_lightPosition, g_lightX, g_lightY, g_lightZ);

  // pass camera position to fragment shader
  gl.uniform3f(u_cameraPosition, camera.eye.elements[0], camera.eye.elements[1], camera.eye.elements[2]);

  // pass lighting toggle
  gl.uniform1i(u_global_lighting_enabled, g_global_lighting_enabled);

  // draw the moving light
  var moving_light = new Cube();
  moving_light.lighting_enabled = 1;
  moving_light.color = [5,5,0,1];
  moving_light.matrix.translate(g_lightX, g_lightY, g_lightZ);
  moving_light.matrix.scale(-.3,-.3,-.3);
  moving_light.matrix.translate(-.5,0,-.5);      // translate to origin
  moving_light.render();

  // draw the ground plane
  var floor = new Cube();
  floor.color = [0.0,0.0,0.0,1.0];
  floor.tex_num = 0;
  floor.tex_color_weight = .7;
  floor.matrix.translate(0,-1,0);
  floor.matrix.scale(32,0.001,32);      // offsetting by 0.001 fixes lighting on ground
  floor.matrix.translate(-.5,0,-.5);
  floor.render();

  // draw the sky sphere
  var skys = new Sphere();
  skys.color = [0,0,0,1];
  skys.tex_num = 1;
  skys.tex_color_weight = 0.05;
  skys.lighting_enabled = 0;
  skys.matrix.rotate(180, 1,0,1);
  skys.matrix.scale(100,100,100);
  skys.render();

  // draw all the cubes in the map
  draw_map();

  // Draw a test sphere
  var test = new Sphere();
  test.color = [.2,.2,.2,1];
  test.tex_num = -2;
  if (g_normal_tog) test.tex_num = -3;
  test.matrix.translate(0,4,0);
  test.matrix.scale(2,2,2);
  test.render();

  // DRAW THE OX
  // chest
  var body = new Cube();
  body.color = c_body;
  if (g_normal_tog) body.tex_num = -3;
  body.matrix = new Matrix4(g_ox_base); // start from ox world transform
  body.matrix.translate(-0.35, -0.3, 0);
  body.matrix.scale(0.7, 0.6, 1.2);
  body.render();

  // legs and head
  if (g_poke_anim_on) {
    var time = (performance.now() - g_poke_anim_start) / g_poke_anim_duration;

    if (time >= 1.0) {

      g_poke_anim_on = false;

    } else {

    var bow_depth = Math.sin(time * Math.PI);   // 0 -> 1 -> 0 over the duration => bow up and down
    var sh = -15 * bow_depth;                   // shoulders bow back 0 -> -15 degrees
    var kn = 15 * bow_depth;                    // knees bend forward 0 -> 15 degrees
    var neck = -30 * bow_depth;                 // head bows down 0 -> -30 degrees
    
    draw_leg(-0.4, -0.35, -0.05, sh, kn, 0, true, false);     
    draw_leg( 0.4, -0.35, -0.05, sh, kn, 0, false, false);
    draw_leg(-0.4, -0.35, 0.75, 0, 0, 0, true, true);           // back legs dont move
    draw_leg( 0.4, -0.35, 0.75, 0, 0, 0, false, true);          // ^
    draw_head(-0.2, 0.1, -0.2, neck,true);

    return; // skip the rest if we drew the poke anim this frame
    }
  } if (g_walk_anim_on && !g_anim_pause) { // if animation enabled, random angles from pi offset by deltas

    // choose deltas and get angles from time
    var d_upper = 0;
    var d_lower = -20;
    var shoulder_angle = 15*Math.sin(g_time / 300);
    var knee_angle = -shoulder_angle;
    var ankle_angle = 0;

    // draw legs
    draw_leg(-0.4, -0.35, -0.05, shoulder_angle + d_upper, knee_angle + d_lower, ankle_angle, true, false);  // front left
    draw_leg(.4, -0.35, -0.05, -shoulder_angle + d_upper, -knee_angle + d_lower, ankle_angle, false, false); // front right
    draw_leg(-0.4, -.35, .8, -shoulder_angle + d_upper, -knee_angle + d_lower, ankle_angle, true, true);    // back left
    draw_leg(.4,-.35, .8, shoulder_angle + d_upper, knee_angle + d_lower, ankle_angle, false, true);        // back right

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
  if (g_normal_tog) head.tex_num = -3;
  head.matrix = new Matrix4(g_ox_base); // start from ox world transform
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
  nose.tex_num = head.tex_num;
  nose.matrix = head_matrix;
  nose.matrix.translate(-.025,-0.001,.1);           // small delta Y to rm Y fighting on bottom of jaw
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
  if (g_normal_tog) horn_ll.tex_num = -3;
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
  shoulder.color = c_body;
  if (g_normal_tog) shoulder.tex_num = -3;                    
  shoulder.matrix = new Matrix4(g_ox_base);                   // start from ox world transform
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
  upper_leg.tex_num = shoulder.tex_num;                                   
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
  lower_leg.tex_num = shoulder.tex_num;
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
  hoof.tex_num = shoulder.tex_num;
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