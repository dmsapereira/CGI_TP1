//  GLOBALS VARIABLES
var gl;

var startPos, endPos, isDrawing = false, activeProjectiles = [], canvas;

//  CONSTANTS
const GRAVITY = -1;
const SHRAPNEL_LIFESPAN = 2; // must be given in seconds times 60 (which is the assumed refresh rate)

//  MAIN
window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    canvas.addEventListener("mousedown", mouseDown);
    canvas.addEventListener("mouseup", mouseUp);
    canvas.addEventListener("mousemove", mouseMovement);
    //canvas.width = window.innerWidth;
    //canvas.height = window.innerHeight;
    gl = WebGLUtils.setupWebGL(canvas);
    if(!gl) { alert("WebGL isn't available"); }
    
    gl.viewport(0,0,canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Load shaders and initialize attribute buffers
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Load the data into the GPU
    var bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, gl.FLOAT * 2, gl.STATIC_DRAW);

    // Associate our shader variables with our data buffer
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    render();
}

//  FUNCTIONS

/*
function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    const cemetery = this.activeProjectiles.filter(x => x.dead());
    const notYet = this.activeProjectiles.filter(x => !(x.dead()));
    const deadRockets = cemetery.filter(x => x instanceof Rocket);
    const newShrapnel = deadRockets.flatMap(generateRandomShrapnel); 
    this.activeProjectiles = notYet.concat(newShrapnel);
    gl.bufferData(gl.ARRAY_BUFFER, this.activeProjectiles.flatMap(x => x.getPosition()) , gl.STATIC_DRAW);
    gl.drawArrays(gl.POINTS, 0, 1);
    requestAnimationFrame(render);
}
*/

function render(){
    gl.clear(gl.COLOR_BUFFER_BIT);
    if(isDrawing){
        gl.bufferData(gl.ARRAY_BUFFER, flatten([startPos, endPos]), gl.STATIC_DRAW);
        gl.drawArrays(gl.LINES, 0, 2);
    }
    gl.bufferData(gl.ARRAY_BUFFER, flatten(activeProjectiles.flatMap(x => x.getPosition())) , gl.STATIC_DRAW);
    gl.drawArrays(gl.POINTS, 0, activeProjectiles.length);
    const cemetery = activeProjectiles.filter(x => x.dead());
    const notYet = activeProjectiles.filter(x => !(x.dead()));
    const deadRockets = cemetery.filter(x => x instanceof Rocket);
    const newShrapnel = deadRockets.flatMap(generateRandomShrapnel); 
    activeProjectiles = notYet.concat(newShrapnel);
    requestAnimationFrame(render);
}

function generateRandomShrapnel(rocket){
    var shrapnel = [];
    var numberOfShrapnel = Math.floor(Math.random() * 240) + 10;
    for( var i = 0; i < numberOfShrapnel; i++){
        shrapnel.push(new Shrapnel(rocket));
    }

    return shrapnel;
}


//  EVENTS

function mouseDown(event){
    if(event.button == 0){
        startPos = vec2(-1 + 2*event.offsetX/canvas.width, -1 + 2*(canvas.height - event.offsetY)/canvas.height);
        endPos = startPos;
        isDrawing = true;
    }
}

function mouseUp(event){
    isDrawing= false;
    activeProjectiles.push(new Rocket(startPos, endPos));
}

function mouseMovement(event){
    if(isDrawing){
        endPos = vec2(-1 + 2*event.offsetX/canvas.width, -1 + 2*(canvas.height - event.offsetY)/canvas.height);
    }
}


//  CLASSES
class Projectile{
    constructor(startPos, endPos){
        this.startPos = startPos;
        this.startVelocity = vec2(endPos[0] - this.startPos[0], endPos[1] - this.startPos[1]);
        this.time = -(1/60);
    }

    calculatePosition(){
        return vec2(this.startPos[0] + this.startVelocity[0] * this.getTime(), this.startPos[1] + (this.startVelocity[1] * this.getTime() + 0.5 * GRAVITY * Math.pow(this.getTime(), 2)));
    }

    calculateVelocity(){
        return vec2(this.startVelocity[0], this.startVelocity[1] + GRAVITY * this.getTime());
    }

    getPosition(){
        this.time += 1/60;
        return this.calculatePosition(this.getTime());
    }

    getVelocity(){
        return this.calculateVelocity(this.getTime());
    }

    getTime(){
        return this.time;
    }
}

class Rocket extends Projectile{
    constructor(startPos, endPos){
        super(startPos, endPos);
        this.explosionTime = -(endPos[1] - startPos[1]) / GRAVITY; //we calculate when the velocity in the Y component is 0 ^^
    }

    dead(){
        return this.getTime() >= this.explosionTime;    
    }
}

class Shrapnel extends Projectile{
    constructor(rocket){
        super(rocket.getPosition(), vec2(rocket.getVelocity()[0] + Math.random() - 0.5, rocket.getVelocity()[1] + Math.random() - 0.5));
        this.sweetEmbraceTime = SHRAPNEL_LIFESPAN;
    }

    dead(){ //NANI
        return this.getTime() >= this.sweetEmbraceTime;
    }
}
