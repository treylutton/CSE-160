import * as THREE from 'three';


// GLOBALS
let g_renderer;
let g_scene;
let g_canvas;
// camera
let g_camera;
let g_camera_X = 0;
let g_camera_Y = 0;
let g_camera_Z = 5;
// geometries
const g_geo_cube = new THREE.BoxGeometry(1,1,1);
// materials
const g_mat_phong_green = new THREE.MeshPhongMaterial({color: 0x444444});
// all objects & lights
let g_objects = [];
let g_lights = [];

function update_camera() {
    // camera position is equivalent to the "eye" vector
    g_camera.position.set(g_camera_X, g_camera_Y, g_camera_Z);
}

function init_html_ui_elements() {
    g_canvas = document.getElementById('c');
}

function init_camera() {
    const fov = 75;
    const aspect = g_canvas.width / g_canvas.height;  // the canvas default
    const near = 0.1;
    const far = 50;
    g_camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
}

function init_renderer() {
    g_renderer = new THREE.WebGLRenderer({antialias: true, canvas: g_canvas});
    g_renderer.setSize(g_canvas.width, g_canvas.height);
}

function init_scene() {
    g_scene = new THREE.Scene();

    // add all objects to scene
    for (let i = 0; i < g_objects.length; i++) {
        g_scene.add(g_objects[i]);
    }

    // add all lights to scene
    for (let i = 0; i < g_lights.length; i++) {
        g_scene.add(g_lights[i]);
    }
}

function create_mesh(geometry, material, position) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    return mesh;
}

function create_all_objects() {

    // objects
    g_objects.push(create_mesh(g_geo_cube, g_mat_phong_green, new THREE.Vector3(0,0,0)),
                   create_mesh(g_geo_cube, g_mat_phong_green, new THREE.Vector3(2,0,0)),
                   create_mesh(g_geo_cube, g_mat_phong_green, new THREE.Vector3(-2,0,0)));

    // lights
    const directional = new THREE.DirectionalLight(0xffffff, 3);
    directional.position.set(-1,2, 4);

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);

    g_lights.push(directional, ambient);
}

function render(time) {
    time *= 0.001;  // seconds

    // update scene

    // -- test animation --
    // objects with unique animations will need to be 
    // global, non animated objects can stay in g_objects
    for (let i = 0; i < g_objects.length; i++) {
        g_objects[i].rotation.x = time * (i + 1);
        g_objects[i].rotation.y = time * (i + 1);
    }

    // update camera
    update_camera();

    // render scene
    g_renderer.render(g_scene, g_camera);

    // render again
    requestAnimationFrame(render);
}

function main() {
  init_html_ui_elements();

  // creates camera/renderer
  init_camera();
  init_renderer();

  // creates all objects to add to scene
  create_all_objects();

  // creates the scene & adds objects
  init_scene();

  // begin animation
  requestAnimationFrame(render);
}

main();