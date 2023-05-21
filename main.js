'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
const scale = 0.4;
let stereoCamera;
let rotationMatrix;

let point;
let texturePoint;
let rotateValue;

function deg2rad(angle) {
    return angle * Math.PI / 180;
}


// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.count = 0;
    this.iTextureBuffer = gl.createBuffer();

    this.BufferData = function (vertices) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        this.count = vertices.length / 3;
    }

    this.TextureBufferData = function (normals) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STREAM_DRAW);

        this.countText = normals.length / 2;
    }

    this.Draw = function () {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.vertexAttribPointer(shProgram.iAttribTexture, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribTexture);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
    }

    this.DisplayPoint = function () {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);
        gl.drawArrays(gl.LINE_STRIP, 0, this.count);
    }
}

function CreateSphereSurface(r = 0.1) {
    let vertexList = [];
    let lon = -Math.PI;
    let lat = -Math.PI * 0.5;
    while (lon < Math.PI) {
        while (lat < Math.PI * 0.5) {
            let ty = sphereSurfaceDate(r, lon, lat);
            vertexList.push(ty.x, ty.y, ty.z);
            lat += 0.05;
        }
        lat = -Math.PI * 0.5
        lon += 0.05;
    }
    return vertexList;
}

function sphereSurfaceDate(r, u, v) {
    let x = r * Math.sin(u) * Math.cos(v);
    let y = r * Math.sin(u) * Math.sin(v);
    let z = r * Math.cos(u);
    return { x: x, y: y, z: z };
}

// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    this.iAttribTexture = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;
    this.iTranslatePoint = -1;
    this.iTexturePoint = -1;
    this.iRotateValue = -1;
    this.iTMU = -1;

    this.Use = function () {
        gl.useProgram(this.prog);
    }
}

function leftFrustum(stereoCamera) {
    const { eyeSeparation, convergence, aspectRatio, fov, near, far } = stereoCamera;
    const top = near * Math.tan(fov / 2);
    const bottom = -top;

    const a = aspectRatio * Math.tan(fov / 2) * convergence;
    const b = a - eyeSeparation / 2;
    const c = a + eyeSeparation / 2;

    const left = -b * near / convergence;
    const right = c * near / convergence;

    return m4.frustum(left, right, bottom, top, near, far);
}

function rightFrustum(stereoCamera) {
    const { eyeSeparation, convergence, aspectRatio, fov, near, far } = stereoCamera;
    const top = near * Math.tan(fov / 2);
    const bottom = -top;

    const a = aspectRatio * Math.tan(fov / 2) * convergence;
    const b = a - eyeSeparation / 2;
    const c = a + eyeSeparation / 2;

    const left = -c * near / convergence;
    const right = b * near / convergence;
    return m4.frustum(left, right, bottom, top, near, far);
}

function drawLeft() {
    /* Set the values of the projection transformation */
    let projection = leftFrustum(stereoCamera);

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);
    if (rotationMatrix) {
      matAccum1 = m4.multiply(matAccum1, rotationMatrix);
    }

    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);

    gl.uniform1i(shProgram.iTMU, 0);
    gl.enable(gl.TEXTURE_2D);
    gl.uniform2fv(shProgram.iTexturePoint, [texturePoint.x, texturePoint.y]);
    gl.uniform1f(shProgram.iRotateValue, rotateValue);
    surface.Draw();
    let tr = RuledRotorCylind(map(texturePoint.x, 0, 1, 0, Math.PI * 2), map(texturePoint.y, 0, 1, 0, 2))
    gl.uniform3fv(shProgram.iTranslatePoint, [tr.x, tr.y, tr.z]);
    gl.uniform1f(shProgram.iRotateValue, 1100);
    point.DisplayPoint();

}

function drawRight() {
    /* Set the values of the projection transformation */
    let projection = rightFrustum(stereoCamera);

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);
    if (rotationMatrix) {
      matAccum1 = m4.multiply(matAccum1, rotationMatrix);
    }

    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);

    gl.uniform1i(shProgram.iTMU, 0);
    gl.enable(gl.TEXTURE_2D);
    gl.uniform2fv(shProgram.iTexturePoint, [texturePoint.x, texturePoint.y]);
    gl.uniform1f(shProgram.iRotateValue, rotateValue);
    surface.Draw();
    let tr = RuledRotorCylind(map(texturePoint.x, 0, 1, 0, Math.PI * 2), map(texturePoint.y, 0, 1, 0, 2))
    gl.uniform3fv(shProgram.iTranslatePoint, [tr.x, tr.y, tr.z]);
    gl.uniform1f(shProgram.iRotateValue, 1100);
    point.DisplayPoint();
}

/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    gl.clearColor(0, 0, 0, 1);
    // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.colorMask(true, false, false, true);
    drawLeft();
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.colorMask(false, true, true, true);
    drawRight();

}

function CreateSurfaceData() {
    let vertexList = [];

    let uStep = Math.PI * 2 / 50;
    let vStep = 2 / 50;

    for (let u = 0; u <= Math.PI * 2; u += uStep) {
        for (let v = 0; v <= 2; v += vStep) {
            let vert = RuledRotorCylind(u, v)
            let avert = RuledRotorCylind(u + uStep, v)
            let bvert = RuledRotorCylind(u, v + vStep)
            let cvert = RuledRotorCylind(u + uStep, v + vStep)

            vertexList.push(vert.x, vert.y, vert.z)
            vertexList.push(avert.x, avert.y, avert.z)
            vertexList.push(bvert.x, bvert.y, bvert.z)

            vertexList.push(avert.x, avert.y, avert.z)
            vertexList.push(cvert.x, cvert.y, cvert.z)
            vertexList.push(bvert.x, bvert.y, bvert.z)
        }
    }

    return vertexList;
}

function RuledRotorCylind(u, v) {
    const a = 2
    const b = 2
    const n = 1
    let x = (a + b * Math.sin(n * u)) * Math.cos(u) - v * Math.sin(u)
    let y = (a + b * Math.sin(n * u)) * Math.sin(u) + v * Math.cos(u)
    let z = b * Math.cos(n * u)
    return { x: x * scale, y: y * scale, z: z * scale }
}

function CreateTexture() {
    let texture = [];
    let uMax = Math.PI * 2
    let vMax = 2
    let uDelta = uMax / 50;
    let vDelta = vMax / 50;

    for (let u = 0; u <= uMax; u += uDelta) {
        for (let v = 0; v <= vMax; v += vDelta) {
            let tx = map(u, 0, uMax, 0, 1)
            let ty = map(v, 0, vMax, 0, 1)
            texture.push(tx, ty)
            tx = map(u + uDelta, 0, uMax, 0, 1)
            texture.push(tx, ty)
            tx = map(u, 0, uMax, 0, 1)
            ty = map(v + vDelta, 0, vMax, 0, 1)
            texture.push(tx, ty)
            tx = map(u + uDelta, 0, uMax, 0, 1)
            ty = map(v, 0, vMax, 0, 1)
            texture.push(tx, ty)
            ty = map(v + vDelta, 0, vMax, 0, 1)
            texture.push(tx, ty)
            tx = map(u, 0, uMax, 0, 1)
            ty = map(v + vDelta, 0, vMax, 0, 1)
            texture.push(tx, ty)
        }
    }

    return texture;
}

function map(val, f1, t1, f2, t2) {
    let m;
    m = (val - f1) * (t2 - f2) / (t1 - f1) + f2
    return Math.min(Math.max(m, f2), t2);
}

/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iTranslatePoint = gl.getUniformLocation(prog, 'translatePoint');
    shProgram.iAttribTexture = gl.getAttribLocation(prog, "texture");
    shProgram.iTexturePoint = gl.getUniformLocation(prog, 'texturePoint');
    shProgram.iRotateValue = gl.getUniformLocation(prog, 'rotateValue');
    shProgram.iTMU = gl.getUniformLocation(prog, 'tmu');

    surface = new Model('Surface');
    surface.BufferData(CreateSurfaceData());

    const ap = gl.canvas.width / gl.canvas.height;

    stereoCamera = {
        eyeSeparation: 0.004,
        convergence: 1,
        aspectRatio: ap,
        fov: deg2rad(25),
        near: 0.0001,
        far: 20,
    };


    LoadTexture()
    surface.TextureBufferData(CreateTexture());

    point = new Model('Point');
    point.BufferData(CreateSphereSurface());

    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    texturePoint = { x: 0.5, y: 0.5 }
    rotateValue = 0.0;
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    // const videoElement = document.querySelector('video');
    //
    // navigator.mediaDevices.getUserMedia({ video: true })
    //     .then(stream => {
    //         videoElement.srcObject = stream;
    //         videoElement.play();
    //     })
    //     .catch(error => {
    //         console.error('Error accessing user media', error);
        // });

    const eyeSeparationInput = document.getElementById("eyeSeparation");
    const convergenceInput = document.getElementById("convergence");
    const fovInput = document.getElementById("fov");
    const nearInput = document.getElementById("near");

    const stereoCam = () => {
        stereoCamera.eyeSeparation = parseFloat(eyeSeparationInput.value);
        stereoCamera.convergence = parseFloat(convergenceInput.value);
        stereoCamera.fov = deg2rad(parseFloat(fovInput.value));
        stereoCamera.near = parseFloat(nearInput.value);
        draw();
    }

    eyeSeparationInput.addEventListener("input", stereoCam);
    convergenceInput.addEventListener("input", stereoCam);
    fovInput.addEventListener("input", stereoCam);
    nearInput.addEventListener("input", stereoCam);

    spaceball = new TrackballRotator(canvas, draw, 0);


    // init magnetometer
    if ("Accelerometer" in window) {
      const magSensor = new Accelerometer({ frequency: 60 });
      magSensor.addEventListener("reading", (e) => {
        const rotationY = Math.atan2(magSensor.x, magSensor.z);
        const rotationMat = m4.yRotation(rotationY);
        console.dir(rotationMat);
        console.log(e);
        rotationMatrix = rotationMat;

        draw();
      });
      magSensor.start();

    } else {
      console.error("Magnetometer API is not supported");
    }

    draw();
}

function LoadTexture() {
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const image = new Image();
    image.crossOrigin = 'anonymus';

    // ����� � ����������, ���� ��������� ������  � ��� ������ �����
    image.src = "https://raw.githubusercontent.com/Artem-Usun/VGGI/CGW/brick-texture.png";
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            image
        );
        console.log("imageLoaded")
        draw()
    }
}

window.onkeydown = (e) => {
    switch (e.keyCode) {
        case 87:
            texturePoint.x -= 0.01;
            break;
        case 83:
            texturePoint.x += 0.01;
            break;
        case 65:
            texturePoint.y += 0.01;
            break;
        case 68:
            texturePoint.y -= 0.01;
            break;
    }
    texturePoint.x = Math.max(0.001, Math.min(texturePoint.x, 0.999));
    texturePoint.y = Math.max(0.001, Math.min(texturePoint.y, 0.999));
    draw();
}

onmousemove = (e) => {
    rotateValue = map(e.clientX, 0, window.outerWidth, 0, Math.PI);
    draw();
};
