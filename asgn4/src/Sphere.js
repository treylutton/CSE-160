class Sphere {
  // statics - better for performance - each cube has a reference
  static vertices = null;
  static buffer   = null;
  static uv       = null;
  static uv_buf   = null;
  static norm     = null;
  static norm_buf = null;

  constructor() {
    this.type    = 'sphere';
    this.color   = [1.0, 1.0, 1.0, 1.0];
    this.tex_num = -2;
    this.matrix  = new Matrix4();
    this.tex_color_weight = 0.5;
    this.lighting_enabled = true;
    this.normal_matrix = new Matrix4();
  }

  static generateCoordinates() {
    var d = Math.PI / 25;
    var verts = [];
    var uvs = [];

    for (var theta = 0; theta < Math.PI; theta += d) {
      for (var rho = 0; rho < 2 * Math.PI; rho += d) {
        var p1 = [Math.sin(theta) * Math.cos(rho),         Math.sin(theta) * Math.sin(rho),         Math.cos(theta)];
        var p2 = [Math.sin(theta + d) * Math.cos(rho),     Math.sin(theta + d) * Math.sin(rho),     Math.cos(theta + d)];
        var p3 = [Math.sin(theta) * Math.cos(rho + d),     Math.sin(theta) * Math.sin(rho + d),     Math.cos(theta)];
        var p4 = [Math.sin(theta + d) * Math.cos(rho + d), Math.sin(theta + d) * Math.sin(rho + d), Math.cos(theta + d)];

        var uv1 = [theta / Math.PI, rho / (2 * Math.PI)];
        var uv2 = [(theta + d) / Math.PI, rho / (2 * Math.PI)]
        var uv3 = [theta / Math.PI, (rho + d) / (2 * Math.PI)];
        var uv4 = [(theta + d) / Math.PI, (rho + d) / (2 * Math.PI)];

        // first triangle: p1, p2, p4
        verts = verts.concat(p1, p2, p4);
        uvs   = uvs.concat(uv1, uv2, uv4);

        // second triangle: p1, p4, p3
        verts = verts.concat(p1, p4, p3);
        uvs   = uvs.concat(uv1, uv4, uv3);
      }
    }

    Sphere.vertices = new Float32Array(verts);
    Sphere.uv       = new Float32Array(uvs);
    Sphere.norm     = new Float32Array(verts); // unit sphere: normal == position
  }

  render() {
    // get color
    var rgba = this.color;    

    // toggle lighting
    gl.uniform1i(u_lighting_enabled, this.lighting_enabled);

    // set the normal matrix
    this.normal_matrix.setInverseOf(this.matrix).transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, this.normal_matrix.elements);

    // get coordinates (once)
    if (Sphere.vertices == null) {
      Sphere.generateCoordinates();
    }

    // create vertex buffer (once)
    if (Sphere.buffer == null) {

      Sphere.buffer = gl.createBuffer();
      if (!Sphere.buffer) {
        console.log('Failed to create the sphere buffer object.');
        return -1;
      }

      // Bind the buffer object to target
      gl.bindBuffer(gl.ARRAY_BUFFER, Sphere.buffer);

      // Write date into the buffer object (once, sphere vertices are constant) (use STATIC_DRAW w this approach)
      gl.bufferData(gl.ARRAY_BUFFER, Sphere.vertices, gl.STATIC_DRAW);

    } else {

      // Bind the buffer object to target
      gl.bindBuffer(gl.ARRAY_BUFFER, Sphere.buffer);
    }

    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);

    // create uv buffer (once)
    if (Sphere.uv_buf == null) {

      Sphere.uv_buf = gl.createBuffer();
      if (!Sphere.uv_buf) {
        console.log('Failed to create UV buffer object.');
        return -1;
      }

      // Bind the UV buffer to target
      gl.bindBuffer(gl.ARRAY_BUFFER, Sphere.uv_buf);

      // write data into uv buffer object (once, UV mappings will stay constant)
      gl.bufferData(gl.ARRAY_BUFFER, Sphere.uv, gl.STATIC_DRAW);

    } else {
      // Bind the UV buffer to target
      gl.bindBuffer(gl.ARRAY_BUFFER, Sphere.uv_buf);
    }

    // assign buffer object to a_UV variable
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);

    // enable assignment to a_UV variable
    gl.enableVertexAttribArray(a_UV);

    if (Sphere.norm_buf == null) {

        Sphere.norm_buf = gl.createBuffer();
        if (!Sphere.norm_buf) {
            console.log('Failed to create normal buffer object.');
            return -1;
        }
    
        // Bind the buffer object to target
        gl.bindBuffer(gl.ARRAY_BUFFER, Sphere.norm_buf);

        // Write date into the norm buffer object (once, sphere normals are constant) (use STATIC_DRAW w this approach)
        gl.bufferData(gl.ARRAY_BUFFER, Sphere.norm, gl.STATIC_DRAW);

    } else {

      // Bind the normal buffer object to target
      gl.bindBuffer(gl.ARRAY_BUFFER, Sphere.norm_buf);
    }

    // Assign the norm buffer object to a_Normal variable
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    // Enable the assignment to a_Normal variable
    gl.enableVertexAttribArray(a_Normal);

    // pass the texture control int of this cube to frag shader
    gl.uniform1i(u_tex_enum, this.tex_num);

    // pass the texture color weight (float) of this cube to frag shader
    gl.uniform1f(u_tex_color_weight, this.tex_color_weight);

    // pass the matrix of this cube to uniform shader variable
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // pass the color of this sphere to uniform shader variable
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    // render the sphere
    gl.drawArrays(gl.TRIANGLES, 0, Sphere.vertices.length / 3);
  }
}

