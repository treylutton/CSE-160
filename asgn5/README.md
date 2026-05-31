# README for CSE 160 Assignment 5

## Author
Trey Lutton - tlutton@ucsc.edu - May 2026

## Sources:
- Ground texture maps from [sharetexture.com](https://www.sharetextures.com/textures/ground/ground_11).
- Tree models by [Quaternius](https://poly.pizza/u/Quaternius) from poly pizza.
- three.js [shaders](https://github.com/mrdoob/three.js/tree/dev/src/renderers/shaders).
- onBeforeCompile method [example](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_materials_modified.html).
- [Simplex noise](https://www.npmjs.com/package/simplex-noise).

## Extra Features:

### Tree Sway Animation - Shader Injection:
- Added animation to make the tree models I downloaded to sway in the wind. I did this with the [onBeforeCompile](https://threejs.org/docs/?q=onBefore#Material.onBeforeCompile) material method, injecting uniforms variables and replacing [this](https://github.com/mrdoob/three.js/blob/dev/src/renderers/shaders/ShaderChunk/project_vertex.glsl.js) part of the mesh's vertex shader. I got the tree shadows to animate as well by creating [custom depth materials](https://threejs.org/docs/?q=customdep#Object3D.customDepthMaterial) and applying the same shader replacement.

### Random Vegetation - Ray Casting:
- Randomized vegetation placement and rotation in scene using the three.js [Raycaster](https://threejs.org/docs/#Raycaster.intersectObject). Casts rays down from the sky at random x and z positions, creates an instance of the model at the first intersection with the terrain object.

### Procedural Terrain Generation - Simplex Noise:
- Procedurally generated ground terrain. Creates a plane and loops through the vertices, uses the x and y object-space coordinates as the seeds in a 2D simplex noise sampler. Uses multiple layers (sometimes called octaves), with decreasing amplitude (persistence) and increasing frequency (lacunarity). Fully tunable with parameter sliders and world regeneration button. 