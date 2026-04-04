// asg0.js -- Trey Lutton -- 4/3/2026

// globals
var canvas;
var ctx;

function main() {
    // retrieve canvas element
    canvas = document.getElementById('example');

    // error if failed to get canvas
    if (!canvas) {
        console.log('Failed to retrieve the <canvas> element');
        return;
    }

    // get rendering context
    ctx = canvas.getContext('2d');
    ctx.fillStyle = "black";
    ctx.fillRect(0,0, canvas.width, canvas.height);
}

function drawVector(v, color) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.moveTo(200, 200);
    ctx.lineTo(200 + v.elements[0] * 20, 200 - v.elements[1] * 20);
    ctx.stroke();
}

function handleDrawEvent() {
    // 1. clear canvas
    ctx.fillStyle = "black";
    ctx.fillRect(0,0, canvas.width, canvas.height);

    // 2a. read the values of the text boxes to create v1
    let x1 = parseFloat(document.getElementById('x1').value);
    let y1 = parseFloat(document.getElementById('y1').value);
    let v1 = new Vector3([x1, y1, 0]);

    // 2b. read the values of the text boxes to create v2
    let x2 = parseFloat(document.getElementById('x2').value);
    let y2 = parseFloat(document.getElementById('y2').value);
    let v2 = new Vector3([x2, y2, 0]);

    // 3. draw v1 in red, v2 in blue
    drawVector(v1, "red");
    drawVector(v2, "blue");
}

function handleDrawOperationEvent() {
    // 1. clear canvas
    ctx.fillStyle = "black";
    ctx.fillRect(0,0, canvas.width, canvas.height);

    // 2a. read the values of the text boxes to create v1
    let x1 = parseFloat(document.getElementById('x1').value);
    let y1 = parseFloat(document.getElementById('y1').value);
    let v1 = new Vector3([x1, y1, 0]);

    // 2b. read the values of the text boxes to create v2
    let x2 = parseFloat(document.getElementById('x2').value);
    let y2 = parseFloat(document.getElementById('y2').value);
    let v2 = new Vector3([x2, y2, 0]);

    // 3. draw v1 in red, v2 in blue
    drawVector(v1, "red");
    drawVector(v2, "blue");

    // 4. read operation and draw resultant vector/s
    let operation = document.getElementById('op-select').value;
    if (operation == "add") {
        v1.add(v2);
        drawVector(v1, "green");
    }
    else if (operation == "sub") {
        v1.sub(v2);
        drawVector(v1, "green");
    }
    else if (operation == "mul") {
        let scalar = parseFloat(document.getElementById('scalar').value);
        v1.mul(scalar);
        v2.mul(scalar);
        drawVector(v1, "green");
        drawVector(v2, "green");
    }
    else if (operation == "div") {
        let scalar = parseFloat(document.getElementById('scalar').value);
        v1.div(scalar);
        v2.div(scalar);
        drawVector(v1, "green");
        drawVector(v2, "green");
    }
    else if (operation == "norm") {
        v1.normalize();
        v2.normalize();
        drawVector(v1, "green");
        drawVector(v2, "green");
    }
    else if (operation == "mag") {
        console.log("v1: ",v1.magnitude(), "\tv2: ", v2.magnitude());
    }
    else if (operation == "ang") {
        console.log("angle between: ", angleBetween(v1, v2));
    }
    else if (operation = "area") {
        console.log("area: ", areaTriangle(v1, v2));
    }
}

function angleBetween(v1, v2) {
    let dot = Vector3.dot(v1, v2);
    dot /= (v1.magnitude() * v2.magnitude()); // = cos(theta)
    return (Math.acos(dot) * 180) / Math.PI;    // * 180/PI converts rad to deg
}

function areaTriangle(v1, v2) {
    let cross = Vector3.cross(v1, v2);
    let area = cross.magnitude() / 2;   // area of parallelogram / 2 = area of triangle
    return area;
}