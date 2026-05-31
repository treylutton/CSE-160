// shared wind uniforms for all tree parts
export const WIND_UNIFORMS_GLSL = `
    uniform float u_time;
    uniform float u_wind_freq;
    uniform float u_wind_amp;
    uniform float u_wind_x;
    uniform float u_wind_z;
    uniform float u_wind_rip;
`;

// https://github.com/mrdoob/three.js/blob/dev/src/renderers/shaders/ShaderChunk/project_vertex.glsl.js
export const LEAVES_PROJECT_VERTEX_GLSL = `
    vec4 mvPosition = vec4( transformed, 1.0 );

    #ifdef USE_BATCHING
        mvPosition = batchingMatrix * mvPosition;
    #endif

    #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
    #endif

    mvPosition = modelMatrix * mvPosition;

    // ripple: per-leaf variation using object-space x/z position
    float sway = sin(u_time * u_wind_freq + transformed.x * u_wind_rip + transformed.z * u_wind_rip) * u_wind_amp * mvPosition.y;
    mvPosition.x += sway * u_wind_x;
    mvPosition.z += sway * u_wind_z;

    gl_Position = projectionMatrix * viewMatrix * mvPosition;
`;

// ^ same but does not ripple
export const TRUNK_PROJECT_VERTEX_GLSL = `
    vec4 mvPosition = vec4( transformed, 1.0 );

    #ifdef USE_BATCHING
        mvPosition = batchingMatrix * mvPosition;
    #endif

    #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
    #endif

    mvPosition = modelMatrix * mvPosition;

    float sway = sin(u_time * u_wind_freq) * u_wind_amp * mvPosition.y;
    mvPosition.x += sway * u_wind_x;
    mvPosition.z += sway * u_wind_z;

    gl_Position = projectionMatrix * viewMatrix * mvPosition;
`;
