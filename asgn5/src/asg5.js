import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { WIND_UNIFORMS_GLSL, WIND_PROJECT_VERTEX_GLSL } from './shaders.js';

// GLOBALS
let g_renderer;
let g_scene;
let g_canvas;
// camera
let g_camera;
let g_camera_X = 20;
let g_camera_Y = 20;
let g_camera_Z = 50;
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
let g_tex_background;
// all objects & lights
let g_test_objects = [];
let g_objects = [];
let g_lights = [];
let g_mod_objects = [];
// ANIMATION GLOBALS
let g_wind_freq = 2.0;
let g_wind_amp  = 0.02;
let g_wind_x    = 1.0;
let g_wind_z    = 1.0;
let g_wind_rip  = 0.5;
let g_grass_amp = 10.0;
// glb children (vegetation wind toggle for these child names)
let g_childnames_leaves = ["Pine_2_2", "Pine_4_2", "Pine_5_2"];
let g_childnames_trunks = ["Pine_2_1", "Pine_4_1", "Pine_5_1"];
let g_childnames_grass  = ["Grass_Common_Short"]
let g_childnames_fern   = ["Fern_1"];

function deg_to_rad(deg) {
    return deg * (Math.PI / 180);
}

function inject_wind_shaders(shader, project_vertex_chunk, grass) {
    // https://github.com/mrdoob/three.js/blob/dev/examples/webgl_materials_modified.html
    shader.uniforms.u_time      = { value: 0.0 };
    shader.uniforms.u_wind_freq = { value: g_wind_freq };
    shader.uniforms.u_wind_x    = { value: g_wind_x };
    shader.uniforms.u_wind_z    = { value: g_wind_z };
    shader.uniforms.u_wind_amp  = { value: g_wind_amp * (grass ? g_grass_amp : 1.0)};
    shader.uniforms.u_wind_rip  = { value: g_wind_rip * (grass ? g_grass_amp / 5.0 : 1.0)};
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
            console.log(child.name, child.material.map);

            child.material.side = THREE.DoubleSide;
            child.castShadow = true;
            child.receiveShadow = true;
            
            // disable transparency (May change this back, seems to make the tree .glb models look better)
            //child.material.transarent = false;

            const leaves = g_childnames_leaves.includes(child.name);
            const trunk = g_childnames_trunks.includes(child.name);
            const grass = g_childnames_grass.includes(child.name);
            const fern = g_childnames_fern.includes(child.name);

            if (leaves || trunk || grass || fern) {

                child.material.onBeforeCompile = function (shader) {
                    inject_wind_shaders(shader, WIND_PROJECT_VERTEX_GLSL, grass);
                    child.material.userData.shader = shader;
                };

                // https://threejs.org/docs/?q=customD#Object3D.customDepthMaterial
                // makes shadows animate with trees.
                const depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
                depthMat.onBeforeCompile = function (shader) {
                    inject_wind_shaders(shader, WIND_PROJECT_VERTEX_GLSL, grass);
                    child.material.userData.depthShader = shader;
                };
                child.customDepthMaterial = depthMat;
            }
        };

    })

    return glb.scene;
}

// https://threejs.org/docs/#api/en/core/Raycaster.intersectObject
function place_on_terrain(terrain, glb_scene, count, range) {
    const raycaster = new THREE.Raycaster();
    const down = new THREE.Vector3(0, -1, 0);
    const placed = [];

    while (placed.length < count) {
        // gets random x, z in range
        const x = (Math.random() - 0.5) * range;
        const z = (Math.random() - 0.5) * range;
        // casts rays down from random position in sky
        raycaster.set(new THREE.Vector3(x, 20, z), down);
        const hits = raycaster.intersectObject(terrain, true);
        if (hits.length > 0) {
            // creates a tree on first intersection point
            const tree = setup_glb_tree_model({ scene: glb_scene.clone(true) }, hits[0].point);
            // random y rotation
            tree.rotation.y = Math.random() * Math.PI * 2;
            placed.push(tree);
        }
    }
    return placed;
}

async function load_models() {
    const loader = new GLTFLoader();

    // terrain loaded first — place_on_terrain raycasts against it so it must exist
    const terrainGlb = await loader.loadAsync('../resources/terrain.glb');
    const terrain = terrainGlb.scene;
    //terrain.scale.set(0.5, 0.5, 0.5);
    terrain.traverse(child => {
        if (child.isMesh) {
            child.material = g_mat_ground;
            child.receiveShadow = true;
        }
    });
    
    // use below if scaling terrain
    //terrain.updateWorldMatrix(true,true);

    // load each pine type once, then scatter copies across terrain
    // range is world-space units — tune to match your terrain footprint
    const pine_1_glb = await loader.loadAsync('../resources/pine-1.glb');
    const pine_2_glb = await loader.loadAsync('../resources/pine-2.glb');
    const pine_3_glb = await loader.loadAsync('../resources/pine-3.glb');
    const fern_glb = await loader.loadAsync('../resources/fern.glb');
    const grass_glb = await loader.loadAsync('../resources/grass.glb');
    const pines = place_on_terrain(terrain, pine_1_glb.scene, 30, 100)
          .concat(place_on_terrain(terrain, pine_2_glb.scene, 30, 100))
          .concat(place_on_terrain(terrain, pine_3_glb.scene, 30, 100));
    const ferns = place_on_terrain(terrain, fern_glb.scene, 30, 100);
    const grass = place_on_terrain(terrain, grass_glb.scene, 1000, 100)
   

    g_mod_objects = g_mod_objects.concat(pines, grass, ferns, terrain);
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
    const far = 200;
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

    // set background
    g_scene.background = g_tex_background;
}

function set_ground_texture_params(tex) {
    // TODO: rethink after swapping from ground plane to custom terrain
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
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
        side:         THREE.DoubleSide  // need double sided for raycaster
    });



    // sky box cube map
    g_tex_background = loader.load('../resources/sky2.png', () => {
        g_tex_background.mapping = THREE.EquirectangularRefractionMapping;
        g_tex_background.colorSpace = THREE.SRGBColorSpace;
    });
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
    //const ground_plane = create_mesh(g_geo_plane, g_mat_ground, new THREE.Vector3(0, 0, 0));
    //ground_plane.rotation.x = -Math.PI * 0.5;
    //ground_plane.receiveShadow = true;
    //g_objects.push(ground_plane);

    // test objects
    g_test_objects.push(create_mesh(g_geo_cube, g_mat_phong_stone, new THREE.Vector3(0,1,0)),
                   create_mesh(g_geo_cube, g_mat_phong_wood, new THREE.Vector3(2,1,0)),
                   create_mesh(g_geo_cube, g_mat_phong_wood, new THREE.Vector3(-2,1,0)));

    // lights
    const directional = new THREE.DirectionalLight(0xffaa00, 0.5);
    directional.position.set(0,60,100);
    directional.castShadow = true;
    directional.shadow.camera.left   = -50;
    directional.shadow.camera.right  =  50;
    directional.shadow.camera.top    =  50;
    directional.shadow.camera.bottom = -50;
    directional.shadow.bias = -0.001;

    const ambient = new THREE.AmbientLight(0xffff00, 0.1);

    g_lights.push(directional, ambient);
}

function update_uniforms(shader, time, grass, fern) {
    shader.uniforms.u_time.value      = time;
    shader.uniforms.u_wind_amp.value  = g_wind_amp * (grass ? g_grass_amp : 1.0) * (fern ? g_grass_amp / 2.5 : 1.0);
    shader.uniforms.u_wind_freq.value = g_wind_freq;
    shader.uniforms.u_wind_x.value    = g_wind_x;
    shader.uniforms.u_wind_z.value    = g_wind_z;
    shader.uniforms.u_wind_rip.value  = g_wind_rip * (grass ? g_grass_amp / 5.0 : 1.0);
}

function animate(time) {
    time *= 0.001;  // seconds
    
    // https://github.com/mrdoob/three.js/blob/dev/examples/webgl_materials_modified.html
    // line 149 => updating uniforms in injected shaders
    g_scene.traverse( function ( child ) {

        const leaves = g_childnames_leaves.includes(child.name);
        const trunk = g_childnames_trunks.includes(child.name);
        const grass = g_childnames_grass.includes(child.name);
        const fern = g_childnames_fern.includes(child.name);

        if ( child.isMesh && ( leaves || trunk || grass || fern )) {
            // update the shader and the depth shader
            if (child.material.userData.shader) update_uniforms(child.material.userData.shader, time, grass, fern);
            if (child.material.userData.depthShader) update_uniforms(child.material.userData.depthShader, time, grass, fern);
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

load_textures();
await load_models();
main();