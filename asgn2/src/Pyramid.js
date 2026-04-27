class Pyramid {
  static vertices = null;
  static buffer   = null;

  constructor() {
    this.type = 'prism';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
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
  }

  render() {
    // get color
    var rgba = this.color;
    
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

    // pass the matrix of this cube to uniform shader variable
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // Base
    gl.uniform4f(u_FragColor, rgba[0]*0.5, rgba[1]*0.5, rgba[2]*0.5, rgba[3]);
    gl.drawArrays(gl.TRIANGLES, 0, 6);  // verts 0 ------ 6 => base of pyramid 

    // Front side
    gl.uniform4f(u_FragColor, rgba[0]*0.9, rgba[1]*0.9, rgba[2]*0.9, rgba[3]);
    gl.drawArrays(gl.TRIANGLES, 6, 3);  // verts 6 --- 9 => front of pyramid 

    // Right side
    gl.uniform4f(u_FragColor, rgba[0]*0.7, rgba[1]*0.7, rgba[2]*0.7, rgba[3]);
    gl.drawArrays(gl.TRIANGLES, 9, 3);  // verts 9 --- 12 => right of pyramid 

    // Back side
    gl.uniform4f(u_FragColor, rgba[0]*0.8, rgba[1]*0.8, rgba[2]*0.8, rgba[3]);
    gl.drawArrays(gl.TRIANGLES, 12, 3);  // verts 12 --- 15 => back of pyramid 

    // Left side
    gl.uniform4f(u_FragColor, rgba[0]*0.6, rgba[1]*0.6, rgba[2]*0.6, rgba[3]);
    gl.drawArrays(gl.TRIANGLES, 6, 3);  // verts 15 --- 18 => front of pyramid 
}
}

