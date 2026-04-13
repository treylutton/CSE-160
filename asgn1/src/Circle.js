class Circle {
  constructor() {
    this.type = 'circle';
    this.position = [0.0, 0.0, 0.0];
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.size = 10.0;
    this.segments = 6;
  }

  render() {
    // get data
    var xy = this.position;
    var rgba = this.color;
    var size = this.size;

    // Pass the color of a point to u_FragColor variable in GLSL
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    
    // split circle into triangle segments, compute vertices for each triangle, draw
    var r = size / 200.0     // radius
    let alpha = 360 / this.segments;

    // for each segment (each triangle)
    for (var a = 0; a < 360; a += alpha) {
        // get the center - first vertex of triangle
        let center = [ xy[0], xy[1] ];

        // compute the two vectors (edges for this triangle segment of the circle)
        // using polar coordinate conversion (x,y) = (rcos(theta), rsin(theta))
        let v1 = [ r * Math.cos(a * Math.PI / 180), r * Math.sin(a * Math.PI / 180) ];
        let v2 = [ r * Math.cos((a + alpha) * Math.PI / 180), r * Math.sin((a + alpha) * Math.PI / 180) ];

        // compute the two additional vertices of the triangle
        let p1 = [ center[0] + v1[0], center[1] + v1[1] ];
        let p2 = [ center[0] + v2[0], center[1] + v2[1] ];

        // draw this triangle
        drawTriangle( [ center[0], center[1],   p1[0], p1[1],   p2[0], p2[1] ] );
    }

}
}

