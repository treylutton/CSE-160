import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { WIND_UNIFORMS_GLSL, LEAVES_PROJECT_VERTEX_GLSL, TRUNK_PROJECT_VERTEX_GLSL } from './shaders.js';

// GLOBALS
let g_renderer;
let g_scene;
let g_canvas;
// camera
let g_camera;
let g_camera_X = 0;
let g_camera_Y = 5;
let g_camera_Z = 10;
// gui
let g_gui = new GUI({ title: 'Camera Settings', container: document.getElementById('canvas-container') });;
// axis lines to help debugging
let g_x_axis = [new THREE.Vector3(0,0,0), new THREE.Vector3(10,0,0)];
let g_y_axis = [new THREE.Vector3(0,0,0), new THREE.Vector3(0,10,0)];
let g_z_axis = [new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,10)];
// geometries
const g_geo_x = new THREE.BufferGeometry; g_geo_x.setFromPoints(g_x_axis);
const g_geo_y = new THREE.BufferGeometry; g_geo_y.setFromPoints(g_y_axis);
const g_geo_z = new THREE.BufferGeometry; g_geo_z.setFromPoints(g_z_axis);
const g_geo_cube = new THREE.BoxGeometry(1,1,1);
const g_geo_plane = new THREE.PlaneGeometry(2000, 2000, 1, 1);
const g_geo_sphere = new THREE.SphereGeometry( 2000, 100, 100);
// materials
let g_mat_phong_stone;
let g_mat_phong_wood;
let g_mat_basic_grass;
let g_mat_ground;
const g_mat_x = new THREE.LineBasicMaterial( { color: 0xff0000 } );
const g_mat_y = new THREE.LineBasicMaterial( { color: 0x00ff00 } );
const g_mat_z = new THREE.LineBasicMaterial( { color: 0x0000ff } );
// textures
let g_tex_stone;
let g_tex_wood;
let g_tex_grass;
let g_background;
// all objects & lights
let g_test_objects = [];
let g_objects = [];
let g_lights = [];
let g_mod_objects = [];
// ANIMATION GLOBALS
let g_wind_freq = 1.5;
let g_wind_amp  = 0.02;
let g_wind_x    = 1.0;
let g_wind_z    = 1.0;
let g_wind_rip  = 0.5;

function deg_to_rad(deg) {
    return deg * (Math.PI / 180);
}

function inject_wind_shaders(shader, project_vertex_chunk) {
    // https://github.com/mrdoob/three.js/blob/dev/examples/webgl_materials_modified.html
    shader.uniforms.u_time      = { value: 0.0 };
    shader.uniforms.u_wind_freq = { value: g_wind_freq };
    shader.uniforms.u_wind_amp  = { value: g_wind_amp };
    shader.uniforms.u_wind_x    = { value: g_wind_x };
    shader.uniforms.u_wind_z    = { value: g_wind_z };
    shader.uniforms.u_wind_rip  = { value: g_wind_rip };
    shader.vertexShader = WIND_UNIFORMS_GLSL + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(`#include <project_vertex>`, project_vertex_chunk);
}

// im using many trees by the same creator so this 
// is a function that converts their models to my preferences (& sets position)
function setup_glb_tree_model(glb, position) {
    // set the model position (hardcoded in load_models)
    glb.scene.position.copy(position);

    // traverses the glb object tree
    // modifies certain fields and injects vertex shader code for wind sway
    glb.scene.traverse(child => {
        if (child.isMesh) {
            // get some insight into the different objects in the tree model
            //console.log(child.name, child.material.map);

            child.material.side = THREE.DoubleSide;
            child.castShadow = true;
            child.receiveShadow = true;
            
            // disable transparency (May change this back, seems to make the tree .glb models look better)
            //child.material.transarent = false;

            if (child.name == "Pine_2_2" || child.name == "Pine_2_1") {
                const project_vertex_chunk = child.name == "Pine_2_2" ? LEAVES_PROJECT_VERTEX_GLSL : TRUNK_PROJECT_VERTEX_GLSL;

                child.material.onBeforeCompile = function (shader) {
                    inject_wind_shaders(shader, project_vertex_chunk);
                    child.material.userData.shader = shader;
                };

                // https://threejs.org/docs/?q=customD#Object3D.customDepthMaterial
                // makes shadows animate with trees.
                const depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
                depthMat.onBeforeCompile = function (shader) {
                    inject_wind_shaders(shader, project_vertex_chunk);
                    child.material.userData.depthShader = shader;
                };
                child.customDepthMaterial = depthMat;
            }
        };

    })

    return glb.scene;
}

async function load_models() {
    // initialize the asynchronus loader
    const loader = new GLTFLoader();

    // trees
    const pine1 = setup_glb_tree_model(await loader.loadAsync('../resources/pine-1.glb'), new THREE.Vector3(0,0,-4));
    const pine2 = setup_glb_tree_model(await loader.loadAsync('../resources/pine-1.glb'), new THREE.Vector3(5,0,-5));

    pine2.rotation.y = deg_to_rad(240);

    g_mod_objects.push(pine1,pine2);
}

function update_camera_settings() {
    g_camera.updateProjectionMatrix();
}

function init_html_ui_elements() {
    g_canvas = document.getElementById('c');
    document.getElementById('s_wind_freq').addEventListener('input', function() { g_wind_freq = this.value / 10.0;});
    document.getElementById('s_wind_amp').addEventListener('input', function() { g_wind_amp = this.value / 100.0;});
    document.getElementById('s_wind_x').addEventListener('input', function() { g_wind_x = this.value / 10.0; });
    document.getElementById('s_wind_z').addEventListener('input', function() { g_wind_z = this.value / 10.0; });
    document.getElementById('s_wind_rip').addEventListener('input', function() { g_wind_rip = this.value / 10.0; });
}

function init_camera() {
    const fov = 75;
    const aspect = g_canvas.width / g_canvas.height;  // the canvas default
    const near = 0.1;
    const far = 50;
    g_camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    g_camera.position.set(g_camera_X, g_camera_Y, g_camera_Z);

    g_gui.add(g_camera, 'fov', 1, 180);
    g_gui.add(g_camera, 'near', 0.1, 50);
    g_gui.add(g_camera, 'far', 1, 1000);

    const controls = new OrbitControls(g_camera, g_renderer.domElement);
    //controls.target.set(0,5,0); controls.update();
}

function init_renderer() {
    g_renderer = new THREE.WebGLRenderer({antialias: true, canvas: g_canvas});
    g_renderer.setSize(g_canvas.width, g_canvas.height);
    g_renderer.shadowMap.enabled = true;
}

function init_scene() {
    g_scene = new THREE.Scene();

    /*
    // add all test objects to scene
    for (let i = 0; i < g_test_objects.length; i++) {
        g_scene.add(g_test_objects[i]);
    }
    */
    // add all objects to scene
    for (let i = 0; i < g_objects.length; i++) {
        g_scene.add(g_objects[i]);
    }

    // add all lights to scene
    for (let i = 0; i < g_lights.length; i++) {
        g_scene.add(g_lights[i]);
    }

    // model objects
    for (let i = 0; i < g_mod_objects.length; i++) {
        g_scene.add(g_mod_objects[i]);
    }
}

function set_ground_texture_params(tex) {
    // blurs significantly at distance but very detailed up close
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(200, 200);
    tex.minFilter = THREE.LinearMipmapNearestFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
}

function load_textures() {
    const loader = new THREE.TextureLoader();

    g_tex_stone = loader.load('../resources/stone-brick.png');
    g_tex_wood = loader.load('../resources/wood.png');

    g_tex_stone.colorSpace = THREE.SRGBColorSpace;
    g_tex_wood.colorSpace = THREE.SRGBColorSpace;

    g_mat_phong_stone = new THREE.MeshPhongMaterial({map: g_tex_stone});
    g_mat_phong_wood = new THREE.MeshPhongMaterial({map: g_tex_wood});

    const ground_base = set_ground_texture_params(loader.load('../resources/ground/textures/1K-ground_11_basecolor.png'));
    const ground_ao = set_ground_texture_params(loader.load('../resources/ground/textures/1K-ground_11_ambientocclusion.png'));
    const ground_bump = set_ground_texture_params(loader.load('../resources/ground/textures/1K-ground_11_height.png'));
    //const ground_met = set_ground_texture_params(loader.load('../resources/ground/textures/1K-ground_11_metallic.png'));
    const ground_norm = set_ground_texture_params(loader.load('../resources/ground/textures/1k-ground_11_normal.png'));
    //const ground_rough = set_ground_texture_params(loader.load('../resources/ground/textures/1k-ground_11_roughness.png'));

    ground_base.colorSpace = THREE.SRGBColorSpace;

    // cartoon style lighting fits well with low-poly trees.
    g_mat_ground = new THREE.MeshToonMaterial({
        map:          ground_base,
        aoMap:        ground_ao,
        bumpMap:      ground_bump,
        //metalnessMap: ground_met,
        normalMap:    ground_norm,
        //roughnessMap: ground_rough
    });

    // 
}


function create_mesh(geometry, material, position) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    return mesh;
}

function create_all_objects() {
    /*
    // axes
    g_objects.push(new THREE.Line(g_geo_x, g_mat_x),
                   new THREE.Line(g_geo_y, g_mat_y),
                   new THREE.Line(g_geo_z, g_mat_z));
    */

    // objects

    // GROUND PLANE
    const ground_plane = create_mesh(g_geo_plane, g_mat_ground, new THREE.Vector3(0, 0, 0));
    ground_plane.rotation.x = -Math.PI * 0.5;
    ground_plane.receiveShadow = true;
    g_objects.push(ground_plane);

    // test objects
    g_test_objects.push(create_mesh(g_geo_cube, g_mat_phong_stone, new THREE.Vector3(0,1,0)),
                   create_mesh(g_geo_cube, g_mat_phong_wood, new THREE.Vector3(2,1,0)),
                   create_mesh(g_geo_cube, g_mat_phong_wood, new THREE.Vector3(-2,1,0)));

    // lights
    const directional = new THREE.DirectionalLight(0xffffff, 0.4);
    directional.position.set(-1,2, 4);
    directional.castShadow = true;
    directional.shadow.camera.left   = -10;
    directional.shadow.camera.right  =  10;
    directional.shadow.camera.top    =  10;
    directional.shadow.camera.bottom = -10;
    directional.shadow.bias = -0.001;

    const ambient = new THREE.AmbientLight(0xffffff, 0.1);

    g_lights.push(directional, ambient);
}

function update_uniforms(shader, time) {
    shader.uniforms.u_time.value      = time;
    shader.uniforms.u_wind_amp.value  = g_wind_amp;
    shader.uniforms.u_wind_freq.value = g_wind_freq;
    shader.uniforms.u_wind_x.value    = g_wind_x;
    shader.uniforms.u_wind_z.value    = g_wind_z;
    shader.uniforms.u_wind_rip.value  = g_wind_rip;
}

function animate(time) {
    time *= 0.001;  // seconds
    
    // https://github.com/mrdoob/three.js/blob/dev/examples/webgl_materials_modified.html
    // line 149 => updating uniforms in injected shaders
    g_scene.traverse( function ( child ) {

        if ( child.isMesh && (child.name == "Pine_2_2" || child.name == "Pine_2_1") ) {
            // update the shader and the depth shader
            if (child.material.userData.shader) update_uniforms(child.material.userData.shader, time);
            if (child.material.userData.depthShader) update_uniforms(child.material.userData.depthShader, time);
        }
    });

    update_camera_settings();

    // render scene
    g_renderer.render(g_scene, g_camera);

    // render again
    requestAnimationFrame(animate);
}

function main() {
    init_html_ui_elements();
    load_textures();
    // creates camera/renderer
    init_renderer();
    init_camera();

    // creates all objects to add to scene

    create_all_objects();

    // creates the scene & adds objects
    init_scene();

    // begin animation
    requestAnimationFrame(animate);
}

await load_models();
main();