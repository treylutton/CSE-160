class Point {
  constructor() {
    this.type = 'point';
    this.position = [0.0, 0.0, 0.0];
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.size = 10.0;
  }
  render() {
    // get data
    var xy = this.position;
    var rgba = this.color;
    var size = this.size;

    // Stop using buffer to send attribute... (turned on by drawTriangle() - causes bug when switching shapes, since attributes are sent using buffer for triangle)
    gl.disableVertexAttribArray(a_Position);

    // This line could replace the lines above and below, but we would need to create the buffer first
    // See draw triangle function if deciding to switch to a buffer for points
    // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([ xy[0], xy[1] ]), gl.DYNAMIC_DRAW);

    // Pass the position of a point to a_Position variable in GLSL
    gl.vertexAttrib3f(a_Position, xy[0], xy[1], 0.0);
    
    // Pass the color of a point to u_FragColor variable in GLSL
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    
    // Pass the size of a point to u_Size variable in GLSL
    gl.uniform1f(u_Size, size);
    
    // Draw
    gl.drawArrays(gl.POINTS, 0, 1);
  }
}
