class Cube {
  constructor() {
    this.type = 'cube';
    //this.position = [0.0, 0.0, 0.0];
    this.color = [1.0, 1.0, 1.0, 1.0];
    //this.size = 10.0;
    //this.segments = 6;
    this.matrix = new Matrix4();
  }

  render() {
    // get data
    //var xy = this.position;
    var rgba = this.color;
    //var size = this.size;
    
    // pass the matrix of this cube to uniform shader variable
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // Front of cube
    gl.uniform4f(u_FragColor, rgba[0]*0.9, rgba[1]*0.9, rgba[2]*0.9, rgba[3]);
    drawTriangle3D( [0, 0, 0,     1, 0, 0,    1, 1, 0] );
    drawTriangle3D( [0, 0, 0,     1, 1, 0,    0, 1, 0] );

    // Back of cube
    gl.uniform4f(u_FragColor, rgba[0]*0.8, rgba[1]*0.8, rgba[2]*0.8, rgba[3]);
    drawTriangle3D( [0, 0, 1,     1, 0, 1,    1, 1, 1] );
    drawTriangle3D( [0, 0, 1,     1, 1, 1,    0, 1, 1] );

    // Top of cube
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    drawTriangle3D( [0, 1, 0,     0, 1, 1,    1, 1, 1] );
    drawTriangle3D( [0, 1, 0,     1, 1, 1,    1, 1, 0] );

    // Bottom of cube
    gl.uniform4f(u_FragColor, rgba[0]*0.5, rgba[1]*0.5, rgba[2]*0.5, rgba[3]);
    drawTriangle3D( [0, 0, 0,     1, 0, 1,    0, 0, 1] );
    drawTriangle3D( [0, 0, 0,     1, 0, 0,    1, 0, 1] );

    // Left side of cube
    gl.uniform4f(u_FragColor, rgba[0]*0.7, rgba[1]*0.7, rgba[2]*0.7, rgba[3]);
    drawTriangle3D( [0, 0, 0,     0, 0, 1,    0, 1, 1] );
    drawTriangle3D( [0, 0, 0,     0, 1, 1,    0, 1, 0] );

    // Right side of cube
    gl.uniform4f(u_FragColor, rgba[0]*0.6, rgba[1]*0.6, rgba[2]*0.6, rgba[3]);
    drawTriangle3D( [1, 0, 0,     1, 1, 1,    1, 0, 1] );
    drawTriangle3D( [1, 0, 0,     1, 1, 0,    1, 1, 1] );


}
}

