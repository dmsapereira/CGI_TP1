//  GLOBALS VARIABLES
var gl;

var startPos, endPos, isDrawing = false, activeProjectiles = [], canvas;
var linesProgram, rocketsProgram, lineStartProgram, linesBuffer, rocketBuffer, lineStartBuffer;
var linePosition, vStartPosition, lineStartPosition, vStartVelocity, vStartTime, vColor;
var time = 0;
var particlesNumber = 0;


//  CONSTANTS
const GRAVITY = -0.2;
const SHRAPNEL_LIFESPAN = 2; // must be given in seconds times 60 (which is the assumed refresh rate)
const maxParticles = 65000;

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
    linesProgram = initShaders(gl, "lineVertex-shader", "lineFragment-shader");
    rocketsProgram = initShaders(gl, "rocketVertex-shader", "projectileFragment-shader");
    lineStartProgram = initShaders(gl, "lineStartVertex-shader", "lineStartFragment-shader")
    
    linesBuffer = gl.createBuffer();
    rocketBuffer = gl.createBuffer();
    lineStartBuffer = gl.createBuffer();


    gl.useProgram(rocketsProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER,rocketBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 4 * 9 * maxParticles,gl.STATIC_DRAW);

    linePosition = gl.getAttribLocation(linesProgram, "vPosition");
    gl.enableVertexAttribArray(linePosition);    
    
    lineStartPosition = gl.getAttribLocation(lineStartProgram, "vPosition");
    gl.enableVertexAttribArray(lineStartPosition);
    
    vStartPosition = gl.getAttribLocation(rocketsProgram,"vStartPosition");
    gl.enableVertexAttribArray(vStartPosition);
    
    vStartVelocity = gl.getAttribLocation(rocketsProgram,"vStartVelocity");
    gl.enableVertexAttribArray(vStartVelocity);
    
    vStartTime = gl.getAttribLocation(rocketsProgram,"vStartTime");
    gl.enableVertexAttribArray(vStartTime);
    
    vColor = gl.getAttribLocation(rocketsProgram,"vColor");
    gl.enableVertexAttribArray(vColor);
    

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

function bindLine(){
    gl.useProgram(linesProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, linesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten([startPos, endPos]), gl.STATIC_DRAW);

    // Associate our shader variables with our data buffer
    gl.vertexAttribPointer(linePosition, 2, gl.FLOAT, false, 0, 0);
}


function bindLineStart(){
    gl.useProgram(lineStartProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, lineStartBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(startPos),gl.STATIC_DRAW);

    gl.vertexAttribPointer(lineStartPosition,2,gl.FLOAT,false,0,0);
}
function bindRockets(){
    gl.bindBuffer(gl.ARRAY_BUFFER,rocketBuffer);
    gl.useProgram(rocketsProgram);
    //gl.bufferData(gl.ARRAY_BUFFER,flatten(activeProjectiles.flatMap(x => x.getInfo())),gl.STATIC_DRAW);

    gl.uniform1f(gl.getUniformLocation(rocketsProgram,"mTime"),time);
    gl.uniform1f(gl.getUniformLocation(rocketsProgram,"gravity"), GRAVITY);
    gl.vertexAttribPointer(vStartPosition,2,gl.FLOAT,false,36,0);
    gl.vertexAttribPointer(vStartVelocity,2,gl.FLOAT,false,36,8);
    gl.vertexAttribPointer(vStartTime,1,gl.FLOAT,false,36,16);
    gl.vertexAttribPointer(vColor,4,gl.FLOAT,false,36,20)
}

function render(){
    time += 1/60;
    gl.clear(gl.COLOR_BUFFER_BIT);
    if(isDrawing){

        bindLineStart();
        gl.drawArrays(gl.POINTS,0,1);
        
        bindLine();
        gl.drawArrays(gl.LINES, 0, 2);
        
    }
    //gl.bufferData(gl.ARRAY_BUFFER, flatten(activeProjectiles.flatMap(x => x.getPosition())) , gl.STATIC_DRAW);
    bindRockets();
    gl.drawArrays(gl.POINTS, 0, particlesNumber);
    const cemetery = activeProjectiles.filter(x => x.dead());
    /*const notYet = activeProjectiles.filter(x => !(x.dead()));
    const deadRockets = cemetery.filter(x => x instanceof Rocket);
    const newShrapnel = deadRockets.flatMap(x => x.getShrapnel); 
    activeProjectiles = notYet.concat(newShrapnel);
    */
    requestAnimationFrame(render);
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
    gl.useProgram(rocketsProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER,rocketBuffer);
    var rocket = new Rocket(startPos, endPos);
    activeProjectiles.push(rocket);



    gl.bufferSubData(gl.ARRAY_BUFFER, (particlesNumber++ * 9 * 4)%(maxParticles*9*4), flatten(rocket.getInfo()));
    console.log(flatten(rocket.getInfo()));
    //activeProjectiles.push(new Rocket(startPos, endPos));
}

function mouseMovement(event){
    if(isDrawing){
        endPos = vec2(-1 + 2*event.offsetX/canvas.width, -1 + 2*(canvas.height - event.offsetY)/canvas.height);
    }
}


//  CLASSES
class Projectile{
    constructor(startPos, endPos,spawnTime = time,color = vec4(Math.random(),Math.random(),Math.random(),1.0)){
        this.startPos = startPos;
        this.velocity = vec2(endPos[0] - startPos[0], endPos[1] - startPos[1]);
        this.startTime = spawnTime;
        this.color = color;
        console.log("VELOCITY: ", this.color[0]);
    }



    getInfo(){
        return [this.startPos[0],this.startPos[1],this.velocity[0],this.velocity[1],this.startTime,
                    this.color[0],this.color[1],this.color[2],this.color[3]];
    }

    getColor(){
        return this.color;
    }

    getTime(){
        return this.startTime;
    }

    getStartPos(){
        return this.startPos;
    }

    getStartVelocity(){
        return this.velocity;
    }
}

class Rocket extends Projectile{
    constructor(startPos, endPos){
        super(startPos, endPos);
        this.explosionTime = this.getTime() + (-1 * this.getStartVelocity()[1]/ GRAVITY); //we calculate when the velocity in the Y component is 0 ^^
        console.log("TIME: ", time);
        console.log(this.explosionTime);
        
        this.explosionPos = this.calculateExplosionPos();
        console.log(this.explosionPos)

        this.explosionVel = this.calculateExplosionVelocity();
        this.shrapnel = this.generateRandomShrapnel();
        this.exploded = false;
    }

    dead(){
        if(time >= this.explosionTime && !this.exploded){
            console.log(time);
            gl.useProgram(rocketsProgram)
            gl.bindBuffer(gl.ARRAY_BUFFER, rocketBuffer);
            this.shrapnel.forEach(function(x){
               gl.bufferSubData(gl.ARRAY_BUFFER, (particlesNumber++ * 9 * 4)%(maxParticles*9*4), flatten(x.getInfo()));
         });
         this.exploded = true;   
        }
         
    }

    calculateExplosionPos(){
        let x = this.getStartPos()[0] + this.getStartVelocity()[0]*(this.explosionTime - this.getTime());
        let y = this.getStartPos()[1] + this.getStartVelocity()[1]*(this.explosionTime - this.getTime()) + 0.5 * GRAVITY * Math.pow((this.explosionTime - this.getTime()),2.0);
    
        return vec2(x,y);
    }

    getDeathPosition(){
        return this.explosionPos;
    }
    
    calculateExplosionVelocity(){
       let vx = this.getStartVelocity()[0];
       let vy = 0;
    
       return vec2(vx,vy);
    }

    getDeathVelocity(){
        return this.explosionVel;
    }

    generateRandomShrapnel(){
        let shrapnel = [];

        var numberOfShrapnel = Math.floor(Math.random() * 240) + 10;
        for( var i = 0; i < numberOfShrapnel; i++){
           shrapnel.push(new Shrapnel(this,this.explosionTime,this.getColor()));
        }

        return shrapnel;
    }

    getShrapnel(){
        return this.shrapnel;
    }
}

class Shrapnel extends Projectile{
    constructor(rocket,startTime,color){
        super(rocket.getDeathPosition(), vec2((Math.random() - 0.5)*0.5,(Math.random()- 0.5)*0.5),startTime,color);
        this.lifespan = SHRAPNEL_LIFESPAN;
    }

    dead(){ //NANI
        return time >= this.lifespan;
    }
}