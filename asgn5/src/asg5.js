import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { WIND_UNIFORMS_GLSL, WIND_PROJECT_VERTEX_GLSL } from './shaders.js';
import { createNoise2D } from 'simplex-noise';
import { Sky } from 'three/addons/objects/Sky.js';
import { Water } from 'three/addons/objects/Water.js';

// sky
let g_sky;
let g_sun_elevation = 3;
let g_sun_azimuth   = 180;
// GLOBALS
let g_renderer;
let g_scene;
let g_canvas;
// camera
let g_camera;
let g_controls;
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
let g_mat_water;
const g_mat_x = new THREE.LineBasicMaterial( { color: 0xff0000 } );
const g_mat_y = new THREE.LineBasicMaterial( { color: 0x00ff00 } );
const g_mat_z = new THREE.LineBasicMaterial( { color: 0x0000ff } );
// textures
let g_tex_stone;
let g_tex_wood;
let g_tex_grass;
let g_tex_background;
let g_water_norm;
// models
let g_pine1_glb;
let g_pine2_glb;
let g_pine3_glb;
let g_grass_glb;
let g_fern_glb;
let g_models_loaded = false;
// WORLD OBJECT ARRAYS
let g_lights = [];
let g_sun;
let g_mod_objects = [];
let g_terrain;
let g_water;
// ANIMATION GLOBALS
let g_prev_time = 0;
let g_frame = 0;
let performance_element;
let g_wind_freq = 2.0;
let g_wind_amp  = 0.02;
let g_wind_x    = 1.0;
let g_wind_z    = 1.0;
let g_wind_rip  = 0.5;
let g_grass_amp = 10.0;
// glb children (vegetation wind toggle for these child names)
const g_childnames_leaves = new Set(["Pine_2_2", "Pine_4_2", "Pine_5_2"]);
const g_childnames_trunks = new Set(["Pine_2_1", "Pine_4_1", "Pine_5_1"]);
const g_childnames_grass  = new Set(["Grass_Common_Short"]);
const g_childnames_fern   = new Set(["Fern_1"]);
// cache of all wind-animated meshes built during vegetation placement
let g_wind_mesh_list = [];
// procedural terrain generation
let g_layers = 8;
let g_persistence = 0.4;
let g_lacunarity = 2.0;
let g_layer0_freq = 0.01;
let g_layer0_amp  = 10;
let g_world_size = 150;
let g_world_divs = 100;
let g_pine_count = 40;
let g_fern_count = 40;
let g_grass_count = 500;
// terrain smoothing (islands) and water tuners
let g_island_size = 0.3;   // normalized dist from center where smoothing to ocean floor starts
let g_edge_depth = -5;      // guaranteed world space ground plane Y coordinate at edges
let g_water_level = 1;

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
    glb.position.copy(position);

    // traverses the glb object tree
    // modifies certain fields and injects vertex shader code for wind sway
    glb.traverse(child => {
        if (child.isMesh) {
            // get some insight into the different objects in the model (floods console with procedural generation)
            //console.log(child.name, child.material.map);
            // disable transparency (May change this back, seems to make the tree .glb models look better)
            child.material.transarent = false;

            const leaves = g_childnames_leaves.has(child.name);
            const trunk = g_childnames_trunks.has(child.name);
            const grass = g_childnames_grass.has(child.name);
            const fern = g_childnames_fern.has(child.name);

            child.material.side = THREE.DoubleSide;
            child.material.envMapIntensity = 0.5;
            child.material.depthWrite = true;
            child.castShadow = !grass; // since blades are so small this looks weird with light source far away
            child.receiveShadow = true;

            if (leaves || trunk || grass || fern) {
                g_wind_mesh_list.push({ mesh: child, grass, fern, tree: leaves || trunk });

                child.material.onBeforeCompile = function (shader) {
                    inject_wind_shaders(shader, WIND_PROJECT_VERTEX_GLSL, grass);
                    child.material.userData.shader = shader;
                };

                // https://threejs.org/docs/?q=customD#Object3D.customDepthMaterial
                // makes shadows animate with trees.
                const depthMat = new THREE.MeshDepthMaterial();
                depthMat.onBeforeCompile = shader => {
                    inject_wind_shaders(shader, WIND_PROJECT_VERTEX_GLSL, grass);
                    child.userData.depthShader = shader;
                };
                child.customDepthMaterial = depthMat;
            }
        };

    })

    return glb;
}

// https://threejs.org/docs/#api/en/core/Raycaster.intersectObject
function place_on_terrain(terrain, glb_scene, count, range, grass, fern) {
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
        // if the ray hit something above the water plane level
        if (hits.length > 0 && hits[0].point.y > ((grass) ? g_water_level : g_water_level + (fern ? 0.5 : 1.5))) {
            // creates a tree on first intersection point
            const tree = setup_glb_tree_model(glb_scene.clone(true), hits[0].point);
            // random y rotation
            tree.rotation.y = Math.random() * Math.PI * 2;
            placed.push(tree);
        }
    }
    return placed;
}

function generate_terrain() {
    const noise2D = createNoise2D();
    const ground_plane = new THREE.PlaneGeometry(g_world_size, g_world_size, g_world_divs, g_world_divs);
    // get the entire vertex position buffer
    const pos = ground_plane.attributes.position;

    // for each vertex in the 
    for (let i = 0; i < pos.count; i++) {
        // samples x and y positions to set z value
        // note that the plane geometry is created in XY plane
        // mesh is rotated after applying noise, so Z ends up being the height
        const x = pos.getX(i);
        const y = pos.getY(i);
        let z_value = 0;
        
        // copies so we can modify without changing settings
        let freq = g_layer0_freq;
        let amp = g_layer0_amp;

        for (let i = 0; i < g_layers; i++) {
            z_value += noise2D(x * freq, y * freq) * amp;
            amp *= g_persistence;
            freq *= g_lacunarity;
        }

        // blends sampled noise with the ocean floor, increasingly as we approach
        // edges of ground plane. this makes islands look natural and prevents jagged edges 
        // at edge of ground plane
        const norm_dist = Math.sqrt(x * x + y * y) / (g_world_size / 2);
        const lerp = smoothstep(norm_dist);
        z_value = z_value * (1 - lerp) + g_edge_depth * lerp;
        
        pos.setZ(i, z_value);
    }

    ground_plane.computeVertexNormals();

    const mesh = new THREE.Mesh(ground_plane, g_mat_ground);
    // rotate the mesh from XY plane to XZ plane
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 2;
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    // update the global terrain transform matrix
    // so the Raycaster sees the rotation (when placing vegetation)
    mesh.updateMatrixWorld(true);
    return mesh;
}

// https://en.wikipedia.org/wiki/Smoothstep
function smoothstep(norm_dist) {
    // clamp / convert to [0,1]
    const clamped = Math.min(1, Math.max(0, (norm_dist - g_island_size) / (1 - g_island_size)));
    return clamped * clamped * (3.0 - 2.0 * clamped);
}

async function load_models() {
    const loader = new GLTFLoader();
    g_pine1_glb = await loader.loadAsync('../resources/pine-1.glb');
    g_pine2_glb = await loader.loadAsync('../resources/pine-2.glb');
    g_pine3_glb = await loader.loadAsync('../resources/pine-3.glb');
    g_fern_glb = await loader.loadAsync('../resources/fern.glb');
    g_grass_glb = await loader.loadAsync('../resources/grass.glb');
    g_models_loaded = true;
}

function regenerate_world() {
    g_wind_mesh_list = [];

    // update sun shadow camera frustrum to fit the selected world size
    const half = g_world_size / 2;
    g_sun.shadow.camera.left   = -half;
    g_sun.shadow.camera.right  =  half;
    g_sun.shadow.camera.top    =  half;
    g_sun.shadow.camera.bottom = -half;
    g_sun.shadow.camera.updateProjectionMatrix();

    // free memory from old objects
    for (let i = 0; i < g_mod_objects.length; i++) {
        g_scene.remove(g_mod_objects[i]);
    }

    if (g_terrain) {
        g_scene.remove(g_terrain);
        g_terrain.geometry.dispose();
    }

    // generate new objects
    g_terrain = generate_terrain();
    const vegetation = place_on_terrain(g_terrain, g_pine1_glb.scene, Math.trunc(g_pine_count / 3), g_world_size, false, false)
          .concat(place_on_terrain(g_terrain, g_pine2_glb.scene, Math.trunc(g_pine_count / 3), g_world_size, false, false))
          .concat(place_on_terrain(g_terrain, g_pine3_glb.scene, Math.trunc(g_pine_count / 3), g_world_size, false, false))
          .concat(place_on_terrain(g_terrain, g_fern_glb.scene, g_fern_count, g_world_size, false, true))
          .concat(place_on_terrain(g_terrain, g_grass_glb.scene, g_grass_count, g_world_size, true, false));

    if (!g_water) create_water();

    // add objects to scene
    g_mod_objects = vegetation;
    for (let i = 0; i < g_mod_objects.length; i++) g_scene.add(g_mod_objects[i]);
    g_scene.add(g_terrain, g_water);

    const btn = document.getElementById('btn_regen');
    btn.textContent = 'Generate Island';
    btn.classList.remove('generating');
    btn.disabled = false;
}


function create_water() {
    const water_geo = new THREE.PlaneGeometry(2048, 2048);

    g_water = new Water(water_geo, {
        textureWidth:    512,
        textureHeight:   512,
        waterNormals:    g_water_norm,
        sunDirection:    g_sun.position.clone().normalize(),
        sunColor:        0xffffcc,
        waterColor:      0x0C5070,
        distortionScale: 10,
        colorSpace: THREE.SRGBColorSpace,
        fog: g_scene.fog
    });
    g_water.material.fog = true;
    g_water.rotation.x = -Math.PI / 2;
    g_water.receiveShadow = false;
    g_water.position.y = g_water_level;
    g_water.updateMatrixWorld(true);

}




function init_html_ui_elements() {
    g_canvas = document.getElementById('c');
    performance_element = document.getElementById('p_performance');
    document.getElementById('s_wind_freq').addEventListener('input', function() { g_wind_freq = this.value / 10.0;});
    document.getElementById('s_wind_amp').addEventListener('input', function() { g_wind_amp = this.value / 100.0;});
    document.getElementById('s_wind_x').addEventListener('input', function() { g_wind_x = this.value / 10.0; });
    document.getElementById('s_wind_z').addEventListener('input', function() { g_wind_z = this.value / 10.0; });
    document.getElementById('s_wind_rip').addEventListener('input', function() { g_wind_rip = this.value / 10.0; });
    document.getElementById('s_layers').addEventListener('input',      function() { g_layers      = this.value; });
    document.getElementById('s_persistence').addEventListener('input', function() { g_persistence = this.value / 100.0; });
    document.getElementById('s_lacunarity').addEventListener('input',  function() { g_lacunarity  = this.value / 10.0; });
    document.getElementById('s_layer0_freq').addEventListener('input', function() { g_layer0_freq = this.value / 1000.0; });
    document.getElementById('s_layer0_amp').addEventListener('input',  function() { g_layer0_amp  = this.value; });
    document.getElementById('s_world_size').addEventListener('input',  function() { g_world_size  = this.value; });
    document.getElementById('s_world_divs').addEventListener('input',  function() { g_world_divs  = this.value; });
    document.getElementById('s_pine_count').addEventListener('input',  function() { g_pine_count  = this.value; });
    document.getElementById('s_fern_count').addEventListener('input',  function() { g_fern_count  = this.value; });
    document.getElementById('s_grass_count').addEventListener('input', function() { g_grass_count = this.value; });
    document.getElementById('s_sun_azimuth').addEventListener('input', function() { g_sun_azimuth = this.value; update_sun(); });
    document.getElementById('btn_regen').addEventListener('click', () => {
        const btn = document.getElementById('btn_regen');
        btn.textContent = 'Generating...';
        btn.classList.add('generating');
        btn.disabled = true;
        setTimeout(regenerate_world, 0);
    });
}

function init_camera() {
    const fov = 75;
    const aspect = g_canvas.width / g_canvas.height;  // the canvas default
    const near = 1;
    const far = 1200;
    g_camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    g_camera.position.set(g_camera_X, g_camera_Y, g_camera_Z);

    g_gui.add(g_camera, 'fov', 1, 180).onChange(() => g_camera.updateProjectionMatrix());
    g_gui.add(g_camera, 'near', .1, 50).onChange(() => g_camera.updateProjectionMatrix());
    g_gui.add(g_camera, 'far', 1, 2000).onChange(() => g_camera.updateProjectionMatrix());

    g_controls = new OrbitControls(g_camera, g_renderer.domElement);
    //controls.target.set(0,5,0); controls.update();
}

function init_renderer() {
    g_renderer = new THREE.WebGLRenderer({antialias: true, canvas: g_canvas});
    g_renderer.setSize(g_canvas.width, g_canvas.height);
    g_renderer.shadowMap.enabled = true;
    g_renderer.shadowMap.type = THREE.BasicShadowMap;
    // synchronize shadowMap update to my render loop
    g_renderer.shadowMap.autoUpdate = false;
}

function create_scene() {
    g_scene = new THREE.Scene();

    // add all lights to scene
    for (let i = 0; i < g_lights.length; i++) {
        g_scene.add(g_lights[i]);
    }

    // add all model objects
    for (let i = 0; i < g_mod_objects.length; i++) {
        g_scene.add(g_mod_objects[i]);
    }

    g_scene.add(g_sky);
    g_scene.fog = new THREE.FogExp2(0x6e5353, 0.0015);
}

function set_ground_texture_params(tex) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(50, 50);
    tex.minFilter = THREE.LinearMipmapNearestFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
}

function load_textures() {
    const loader = new THREE.TextureLoader();

    const ground_base = set_ground_texture_params(loader.load('../resources/ground/textures/1K-ground_11_basecolor.png'));
    const ground_ao = set_ground_texture_params(loader.load('../resources/ground/textures/1K-ground_11_ambientocclusion.png'));
    const ground_bump = set_ground_texture_params(loader.load('../resources/ground/textures/1K-ground_11_height.png'));
    //const ground_met = set_ground_texture_params(loader.load('../resources/ground/textures/1K-ground_11_metallic.png'));
    const ground_norm = set_ground_texture_params(loader.load('../resources/ground/textures/1K-ground_11_normal.png'));
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

    g_water_norm = loader.load('../resources/waternormals.jpg');
    g_water_norm.wrapS = THREE.RepeatWrapping;
    g_water_norm.wrapT = THREE.RepeatWrapping;
    g_water_norm.repeat.set(30, 30);
}


function create_mesh(geometry, material, position) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    return mesh;
}

function create_sky() {
    g_sky = new Sky();
    g_sky.scale.setScalar(4500);

    // uniform list
    // https://github.com/mrdoob/three.js/blob/master/examples/jsm/objects/Sky.js
    const uniforms = g_sky.material.uniforms;
    uniforms['turbidity'].value        = 100;
    uniforms['rayleigh'].value         = 2;
    uniforms['mieCoefficient'].value   = 0.00004;
    uniforms['mieDirectionalG'].value  = 0.1;
    uniforms['cloudScale'].value       = 0.001;
    uniforms['cloudSpeed'].value       = 0.001;
    uniforms['cloudCoverage'].value    = 0.4;

    update_sun();
}

function update_sun() {
    const sun_dir = new THREE.Vector3();
    sun_dir.setFromSphericalCoords(1, deg_to_rad(90 - g_sun_elevation), deg_to_rad(g_sun_azimuth));
    g_sky.material.uniforms['sunPosition'].value.copy(sun_dir);

    // raises light angle above the visual sun - shorter shadows
    const light_dir = new THREE.Vector3();
    light_dir.setFromSphericalCoords(1, deg_to_rad(90 - (g_sun_elevation + 15)), deg_to_rad(g_sun_azimuth));
    g_sun.position.copy(light_dir).multiplyScalar(60);
}

function create_lights() {
    //https://github.com/mrdoob/three.js/blob/master/src/lights/LightShadow.js
    g_sun = new THREE.DirectionalLight(0xffffcc, .8);
    g_sun.castShadow = true;
    g_sun.shadow.mapSize.width  = 4096;
    g_sun.shadow.mapSize.height = 4096;
    g_sun.shadow.normalBias = .1;
    g_sun.shadow.camera.near = 10;
    g_sun.shadow.camera.far  = 120;

    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    const hem = new THREE.HemisphereLight( 0xaaaaff, 0x334466, .2);

    g_lights.push(g_sun, hem, ambient);
}

function update_uniforms(shader, time, grass, fern, tree) {
    shader.uniforms.u_time.value      = time;
    shader.uniforms.u_wind_amp.value  = g_wind_amp * (grass ? g_grass_amp : 1.0) * (fern ? g_grass_amp / 2.5 : 1.0);
    shader.uniforms.u_wind_freq.value = g_wind_freq;
    shader.uniforms.u_wind_x.value    = g_wind_x;
    shader.uniforms.u_wind_z.value    = g_wind_z;
    shader.uniforms.u_wind_rip.value  = g_wind_rip * (grass ? g_grass_amp / 5.0 : 1.0) * (tree ? 0.5 : 1.0);
}

function animate(time) {
    if (!g_scene) return;

    const duration = time - g_prev_time;
    g_prev_time = time;
    performance_element.innerHTML =
        'fps: ' + Math.floor(1000 / duration) + '<br>ms: ' + Math.floor(duration);

    time *= 0.001;  // seconds
    
    // update wind shader uniforms only on cached wind-animated meshes (avoids full scene traverse each frame)
    for (const entry of g_wind_mesh_list) {
        const { mesh, grass, fern, tree } = entry;
        if (mesh.material.userData.shader) update_uniforms(mesh.material.userData.shader, time, grass, fern, tree);
        if (mesh.userData.depthShader) update_uniforms(mesh.userData.depthShader, time, grass, fern, tree);
    }

    // pass time to built in water shaders and sky shaders
    g_water.material.uniforms['time'].value = time * 0.3;
    g_sky.material.uniforms['time'].value = time * 0.05;

    // update shadows every other frame for performance
    g_renderer.shadowMap.needsUpdate = (++g_frame % 2 === 0);

    g_renderer.render(g_scene, g_camera);

    // render again
    requestAnimationFrame(animate);
}

function main() {
    init_html_ui_elements();
    // creates camera/renderer
    init_renderer();
    init_camera();

    // creates the scene
    create_lights();
    create_sky();
    create_scene();
    regenerate_world();

    // begin animation
    requestAnimationFrame(animate);
}

load_textures();
await load_models();
main();
