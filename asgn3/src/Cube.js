class Cube {
  // statics - better for performance - each cube has a reference
  static vertices = null;
  static buffer   = null;
  static uv       = null;
  static uv_buf   = null;

  constructor() {
    this.type = 'cube';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
  }

  static generateVertices() {
    Cube.vertices = new Float32Array([0,0,0,  1,0,0,  1,1,0,      // front
                                      0,0,0,  1,1,0,  0,1,0,      // ^ 6 verts
                                      0,0,1,  1,0,1,  1,1,1,      // back
                                      0,0,1,  1,1,1,  0,1,1,      // ^ 12 verts
                                      0,1,0,  0,1,1,  1,1,1,      // top
                                      0,1,0,  1,1,1,  1,1,0,      // ^ 18 verts
                                      0,0,0,  1,0,1,  0,0,1,      // bottom
                                      0,0,0,  1,0,0,  1,0,1,      // ^ 24 verts
                                      0,0,0,  0,0,1,  0,1,1,      // left
                                      0,0,0,  0,1,1,  0,1,0,      // ^ 30 verts
                                      1,0,0,  1,1,1,  1,0,1,      // right
                                      1,0,0,  1,1,0,  1,1,1]);    // ^ 36 verts
  }

  static generateUV() {
    Cube.uv = new Float32Array([0,0,  1,0,  1,1,            // front
                                0,0,  1,1,  0,1,
                                0,0,  1,0,  1,1,            // back
                                0,0,  1,1,  0,1,
                                0,0,  0,1,  1,1,            // top
                                0,0,  1,1,  1,0,
                                0,0,  1,1,  0,1,            // bottom
                                0,0,  1,0,  1,1,
                                0,0,  1,0,  1,1,            // left
                                0,0,  1,1,  0,1,
                                0,0,  1,1,  1,0,            // right
                                0,0,  0,1,  1,1,]);
  }

  render() {
    // get color
    var rgba = this.color;    

    // get vertices (once)
    if (Cube.vertices == null) {
      Cube.generateVertices();
    }

    // create buffer (once)
    if (Cube.buffer == null) {

      Cube.buffer = gl.createBuffer();
      if (!Cube.buffer) {
        console.log('Failed to create the cube buffer object.');
        return -1;
      }

      // Bind the buffer object to target
      gl.bindBuffer(gl.ARRAY_BUFFER, Cube.buffer);

      // Write date into the buffer object (once, cube vertices are constant) (use STATIC_DRAW w this approach)
      gl.bufferData(gl.ARRAY_BUFFER, Cube.vertices, gl.STATIC_DRAW);

    } else {

      // Bind the buffer object to target
      gl.bindBuffer(gl.ARRAY_BUFFER, Cube.buffer);
    }

    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);

    // get uv (once)
    if (Cube.uv == null) {
      Cube.generateUV();
    }

    // create uv buffer (once)
    if (Cube.uv_buf == null) {

      Cube.uv_buf = gl.createBuffer();
      if (!Cube.uv_buf) {
        console.log('Failed to create UV buffer object.');
        return -1;
      }

      // Bind the UV buffer to target
      gl.bindBuffer(gl.ARRAY_BUFFER, Cube.uv_buf);

      // write data into uv buffer object (once, UV mappings will stay constant)
      gl.bufferData(gl.ARRAY_BUFFER, Cube.uv, gl.STATIC_DRAW);

    } else {
      // Bind the UV buffer to target
      gl.bindBuffer(gl.ARRAY_BUFFER, Cube.uv_buf);
    }

    // assign buffer object to a_UV variable
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);

    // enable assignment to a_UV variable
    gl.enableVertexAttribArray(a_UV);

    // pass the matrix of this cube to uniform shader variable
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // Front of cube
    gl.uniform4f(u_FragColor, rgba[0]*0.9, rgba[1]*0.9, rgba[2]*0.9, rgba[3]);
    gl.drawArrays(gl.TRIANGLES, 0, 6);  // verts 0 ------ 6 => front of cube

    // Back of cube
    gl.uniform4f(u_FragColor, rgba[0]*0.8, rgba[1]*0.8, rgba[2]*0.8, rgba[3]);
    gl.drawArrays(gl.TRIANGLES, 6, 6);  // verts 6 ------ 12 => back of cube

    // Top of cube
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);  // top brightest
    gl.drawArrays(gl.TRIANGLES, 12, 6);  // verts 12 ------ 18 => top of cube

    // Bottom of cube
    gl.uniform4f(u_FragColor, rgba[0]*0.5, rgba[1]*0.5, rgba[2]*0.5, rgba[3]);
    gl.drawArrays(gl.TRIANGLES, 18, 6);  // verts 18 ------ 24 => bottom of cube

    // Left side of cube
    gl.uniform4f(u_FragColor, rgba[0]*0.7, rgba[1]*0.7, rgba[2]*0.7, rgba[3]);
    gl.drawArrays(gl.TRIANGLES, 24, 6);  // verts 24 ------ 30 => left of cube

    // Right side of cube
    gl.uniform4f(u_FragColor, rgba[0]*0.6, rgba[1]*0.6, rgba[2]*0.6, rgba[3]);
    gl.drawArrays(gl.TRIANGLES, 30, 6);  // verts 30 ------ 36 => top of cube
 }
}

