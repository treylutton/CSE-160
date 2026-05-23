class Cube {
  // statics - better for performance - each cube has a reference
  static vertices = null;
  static buffer   = null;
  static uv       = null;
  static uv_buf   = null;
  static norm     = null;
  static norm_buf = null;

  constructor() {
    this.type    = 'cube';
    this.color   = [1.0, 1.0, 1.0, 1.0];
    this.matrix  = new Matrix4();
    this.tex_num = -2;
    this.tex_color_weight = 0.5;
    this.lighting_enabled = 1;
    this.normal_matrix = new Matrix4();
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

  static generateNormals() {
    // Vertex normals => 6 for each face of cube (3 * 2 Triangles)
    // all normals on same face point in same direction
    Cube.norm = new Float32Array([0,0,-1,  0,0,-1,  0,0,-1,          // front
                                  0,0,-1,  0,0,-1,  0,0,-1,
                                  0,0,1,    0,0,1,   0,0,1,          // back
                                  0,0,1,    0,0,1,   0,0,1,
                                  0,1,0,    0,1,0,   0,1,0,          // top
                                  0,1,0,    0,1,0,   0,1,0,
                                  0,-1,0,  0,-1,0,  0,-1,0,          // bottom
                                  0,-1,0,  0,-1,0,  0,-1,0,
                                  -1,0,0,  -1,0,0,  -1,0,0,          // left
                                  -1,0,0,  -1,0,0,  -1,0,0,          
                                  1,0,0,    1,0,0,   1,0,0,          // right
                                  1,0,0,    1,0,0,   1,0,0,]);
  }

  render() {
    // get color
    var rgba = this.color;    

    // toggle lighting
    gl.uniform1i(u_lighting_enabled, this.lighting_enabled);

    // set the normal matrix
    this.normal_matrix.setInverseOf(this.matrix).transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, this.normal_matrix.elements);

    // get vertices (once)
    if (Cube.vertices == null) {
      Cube.generateVertices();
    }

    // create vertex buffer (once)
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

    // get normals (once)
    if (Cube.norm == null) {
      Cube.generateNormals();
    }

    // create normal buffer (once)
    if (Cube.norm_buf == null) {

      Cube.norm_buf = gl.createBuffer();
      if (!Cube.norm_buf) {
        console.log('Failed to create normal buffer object.');
        return -1;
      }

      // Bind the norm buffer to target
      gl.bindBuffer(gl.ARRAY_BUFFER, Cube.norm_buf);

      // write data into norm buffer object (once, normal mappings will stay constant relative to cube space)
      gl.bufferData(gl.ARRAY_BUFFER, Cube.norm, gl.STATIC_DRAW);

    } else {
      // Bind the norm buffer to target
      gl.bindBuffer(gl.ARRAY_BUFFER, Cube.norm_buf);
    }

    // assign buffer object to a_Normal variable
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);

    // enable assignment to a_Normal variable
    gl.enableVertexAttribArray(a_Normal);

    // pass the texture control int of this cube to frag shader
    gl.uniform1i(u_tex_enum, this.tex_num);

    // pass the texture color weight (float) of this cube to frag shader
    gl.uniform1f(u_tex_color_weight, this.tex_color_weight);

    // pass the matrix of this cube to uniform shader variable
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    // draw cube
    gl.drawArrays(gl.TRIANGLES, 0, 36); 
    
  }
}

