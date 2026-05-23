class Pyramid {
  static vertices = null;
  static buffer   = null;

  constructor() {
    this.type = 'prism';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.lighting_enabled = true;
    this.normal_matrix = new Matrix4();
  }

  static generateVertices() {
    // note that the tip of the pyramid extends in the positive z direction
    // while the base of the pyramid lays in the xy plane
    // * rotation required to be vertical on screen, because z is the depth direction in webgl
    Pyramid.vertices = new Float32Array([0,0,0,   1,1,0,   1,0,0,       // base
                                         0,0,0,   0,1,0,   1,1,0,       // ^ 6 verts
                                         0,0,0,   1,0,0,   .5,.5,1,     // front 9
                                         1,0,0,   1,1,0,   .5,.5,1,     // right 12
                                         1,1,0,   0,1,0,   .5,.5,1,     // back 15
                                         0,1,0,   0,0,0,   .5,.5,1]);   // left 18

      var faces = [
      [[0,0,0], [1,1,0],     [1,0,0]],  // base tri 1
      [[0,0,0], [0,1,0],     [1,1,0]],  // base tri 2
      [[0,0,0], [1,0,0],   [.5,.5,1]],  // front
      [[1,0,0], [1,1,0],   [.5,.5,1]],  // right
      [[1,1,0], [0,1,0],   [.5,.5,1]],  // back
      [[0,1,0], [0,0,0],   [.5,.5,1]],  // left
    ];

    var norms = [];
    for (var face of faces) {
      var edge1 = new Vector3(face[1]).sub(new Vector3(face[0]));
      var edge2 = new Vector3(face[2]).sub(new Vector3(face[0]));
      var normal = Array.from(Vector3.cross(edge1, edge2).normalize().elements);
      norms = norms.concat(normal, normal, normal);
    }
    Pyramid.norm = new Float32Array(norms);
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
    if (Pyramid.vertices == null) {
      Pyramid.generateVertices();
    }

    // create buffer (once)
    if (Pyramid.buffer == null) {
      Pyramid.buffer = gl.createBuffer();
      if (!Pyramid.buffer) {
        console.log('Failed to create the Pyramid buffer object.');
        return -1;
      }

      // Bind the buffer object to target
      gl.bindBuffer(gl.ARRAY_BUFFER, Pyramid.buffer);

      // Write date into the buffer object (once, pyramid vertices are constant)
      gl.bufferData(gl.ARRAY_BUFFER, Pyramid.vertices, gl.DYNAMIC_DRAW);
    } else {
      // Bind the buffer object to target
      gl.bindBuffer(gl.ARRAY_BUFFER, Pyramid.buffer);
    }

    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);

    // create buffer (once)
    if (Pyramid.norm_buf == null) {
      Pyramid.norm_buf = gl.createBuffer();
      if (!Pyramid.norm_buf) {
        console.log('Failed to create the Pyramid normal buffer object.');
        return -1;
      }

      // Bind the buffer object to target
      gl.bindBuffer(gl.ARRAY_BUFFER, Pyramid.norm_buf);

      // Write date into the buffer object (once, pyramid vertices are constant)
      gl.bufferData(gl.ARRAY_BUFFER, Pyramid.norm, gl.DYNAMIC_DRAW);
    } else {
      // Bind the buffer object to target
      gl.bindBuffer(gl.ARRAY_BUFFER, Pyramid.norm_buf);
    }

    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Normal);

    // pass the matrix of this cube to uniform shader variable
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // pass color to shader
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    
    // draw the pyramid
    gl.drawArrays(gl.TRIANGLES, 0, 18);
}
}


