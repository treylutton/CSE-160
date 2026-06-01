# README for CSE 160 Assignment 5

## Author
Trey Lutton - tlutton@ucsc.edu - May 2026

## Features & Implementation:

### Tree Sway Animation - Shader Injection
- Added animation to make the vegetation models I downloaded sway in the wind. I did this with the [onBeforeCompile](https://threejs.org/docs/?q=onBefore#Material.onBeforeCompile) material method, injecting uniforms variables and replacing [this](https://github.com/mrdoob/three.js/blob/dev/src/renderers/shaders/ShaderChunk/project_vertex.glsl.js) part of the mesh's vertex shader. Vegetation shadows mimic the animation with [custom depth materials](https://threejs.org/docs/?q=customdep#Object3D.customDepthMaterial) and the same shader replacement.

### Random Vegetation - Ray Casting
- Randomized vegetation in scene using the three.js [Raycaster](https://threejs.org/docs/#Raycaster.intersectObject). Casts rays down from the sky at random x and z positions over the ground plane, checks the world y coordinate of the first intersection and creates instances of the models in suitable locations.

### Procedural Terrain Generation - Simplex Noise & Smoothstep
- Procedurally generated ground terrain. Creates a plane and loops through the vertices, uses the x and y object-space coordinates as the seeds in a 2D simplex noise sampler. Uses multiple layers (sometimes called octaves), with decreasing amplitude (persistence) and increasing frequency (lacunarity). 
- Smoothstep between the sampled noise and the ocean floor to create natural looking islands and prevent plane edges from extending out of the water.

## Sources:
- Ground texture maps from [sharetexture.com](https://www.sharetextures.com/textures/ground/ground_11).
- Tree models by [Quaternius](https://poly.pizza/u/Quaternius) from poly pizza.
- three.js [water normal texture map](https://github.com/mrdoob/three.js/blob/dev/examples/textures/waternormals.jpg).
- three.js [shaders](https://github.com/mrdoob/three.js/tree/dev/src/renderers/shaders).
- onBeforeCompile method [example](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_materials_modified.html).
- [Simplex noise](https://www.npmjs.com/package/simplex-noise).
- [Smoothstep](https://en.wikipedia.org/wiki/Smoothstep) function wikipedia page.
- I used [Claude](claude.ai) to generate CSS code for the webpage, and to assist with research.