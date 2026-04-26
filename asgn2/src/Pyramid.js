class Pyramid {
  constructor() {
    this.type = 'prism';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
  }

  render() {
    // get data
    //var xy = this.position;
    var rgba = this.color;
    //var size = this.size;
    
    // pass the matrix of this cube to uniform shader variable
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // note that the tip of the pyramid extends in the positive z direction
    // while the base of the pyramid lays in the xy plane
    // rotation required to be vertical on screen, because z is the depth direction in webgl

    // Base
    gl.uniform4f(u_FragColor, rgba[0]*0.5, rgba[1]*0.5, rgba[2]*0.5, rgba[3]);
    drawTriangle3D( [0,0,0,   1,1,0,   1,0,0] );
    drawTriangle3D( [0,0,0,   0,1,0,   1,1,0] );

    // Front side
    gl.uniform4f(u_FragColor, rgba[0]*0.9, rgba[1]*0.9, rgba[2]*0.9, rgba[3]);
    drawTriangle3D( [0,0,0,   1,0,0,   0.5,0.5,1] );

    // Right side
    gl.uniform4f(u_FragColor, rgba[0]*0.7, rgba[1]*0.7, rgba[2]*0.7, rgba[3]);
    drawTriangle3D( [1,0,0,   1,1,0,   0.5,0.5,1] );

    // Back side
    gl.uniform4f(u_FragColor, rgba[0]*0.8, rgba[1]*0.8, rgba[2]*0.8, rgba[3]);
    drawTriangle3D( [1,1,0,   0,1,0,   0.5,0.5,1] );

    // Left side
    gl.uniform4f(u_FragColor, rgba[0]*0.6, rgba[1]*0.6, rgba[2]*0.6, rgba[3]);
    drawTriangle3D( [0,1,0,   0,0,0,   0.5,0.5,1] );
}
}

