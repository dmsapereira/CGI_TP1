//  GLOBALS VARIABLES
var gl;

var startPos, endPos, isDrawing = false, activeRockets = [], canvas;
var linesProgram, rocketsProgram, lineStartProgram, linesBuffer, rocketBuffer, lineStartBuffer;
var linePosition, vStartPosition, lineStartPosition, vStartVelocity, vStartTime, vColor, isShrapnel;
var time = 0;
var particlesNumber = 0;
var spawnInterval = 0;
var automode = false;


//  CONSTANTS
const GRAVITY = -0.5;
const SHRAPNEL_LIFESPAN = 2; // must be given in seconds times 60 (which is the assumed refresh rate)
const maxParticles = 65000;

//  MAIN
window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    canvas.addEventListener("mousedown", mouseDown);
    canvas.addEventListener("mouseup", mouseUp);
    canvas.addEventListener("mousemove", mouseMovement);
    canvas.parentElement.addEventListener("keypress",keypressEvent);

    gl = WebGLUtils.setupWebGL(canvas);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
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


    linePosition = gl.getAttribLocation(linesProgram, "vPosition");
    gl.enableVertexAttribArray(linePosition); 
    
    lineStartPosition = gl.getAttribLocation(lineStartProgram, "vPosition");
    gl.enableVertexAttribArray(lineStartPosition);



    gl.useProgram(rocketsProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER,rocketBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 4 * 10 * maxParticles,gl.STATIC_DRAW);   
    
    vStartPosition = gl.getAttribLocation(rocketsProgram,"vStartPosition");
    gl.enableVertexAttribArray(vStartPosition);
    
    vStartVelocity = gl.getAttribLocation(rocketsProgram,"vStartVelocity");
    gl.enableVertexAttribArray(vStartVelocity);
    
    vStartTime = gl.getAttribLocation(rocketsProgram,"vStartTime");
    gl.enableVertexAttribArray(vStartTime);
    
    vColor = gl.getAttribLocation(rocketsProgram,"vColor");
    gl.enableVertexAttribArray(vColor);
    
    isShrapnel = gl.getAttribLocation(rocketsProgram,"isShrapnel");
    gl.enableVertexAttribArray(isShrapnel);

    render();
}

//  FUNCTIONS

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
    gl.vertexAttribPointer(vStartPosition,2,gl.FLOAT,false,40,0);
    gl.vertexAttribPointer(vStartVelocity,2,gl.FLOAT,false,40,8);
    gl.vertexAttribPointer(vStartTime,1,gl.FLOAT,false,40,16);
    gl.vertexAttribPointer(vColor,4,gl.FLOAT,false,40,20)
    gl.vertexAttribPointer(isShrapnel,4,gl.FLOAT,false,40,36)
}

function render(){
    time += 1/60;
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    if(automode && spawnInterval++ % 6 == 0 )
        autoSpawn();
    
    if(isDrawing){

        bindLineStart();
        gl.drawArrays(gl.POINTS,0,1);
        
        bindLine();
        gl.drawArrays(gl.LINES, 0, 2);
        
    }
    bindRockets();
    gl.drawArrays(gl.POINTS, 0, particlesNumber);
    activeRockets.filter(x => x.firstExplosion());
    activeRockets.filter(x => x.secondExplosion());
    
    requestAnimationFrame(render);
}

function autoSpawn(){
    startPos = vec2(-1 + Math.random()*2, -0.9);
    endPos = vec2(startPos[0] + Math.random()*0.2, startPos[1] + 0.9 + Math.random()*0.5);

    mouseUp();
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
    activeRockets.push(rocket);



    gl.bufferSubData(gl.ARRAY_BUFFER, (particlesNumber++ * (10 * 4))%(maxParticles*(10*4)), flatten(rocket.getInfo()));
}

function mouseMovement(event){
    if(isDrawing){
        endPos = vec2(-1 + 2*event.offsetX/canvas.width, -1 + 2*(canvas.height - event.offsetY)/canvas.height);
    }
}

function keypressEvent(event){
    if(event.key == " ")
        automode = !automode;
}


//  CLASSES
class Projectile{
    constructor(startPos, velocity,spawnTime = time,color = vec4(Math.random(),Math.random(),Math.random(),1.0),isShrapnel = 0.0){
        this.startPos = startPos;
        this.velocity = velocity;
        this.startTime = spawnTime;
        this.color = color;
        this.isShrapnel = isShrapnel
    }



    getInfo(){
        return [this.startPos[0],this.startPos[1],this.velocity[0],this.velocity[1],this.startTime,
                    this.color[0],this.color[1],this.color[2],this.color[3], this.isShrapnel];
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
        super(startPos, vec2(endPos[0] - startPos[0], endPos[1] - startPos[1]));
        this.explosionTime = this.getTime() + (-1 * this.getStartVelocity()[1]/ GRAVITY); //we calculate when the velocity in the Y component is 0 ^^
        this.deltaTime = 0.7;


        this.firstExplosionPos = this.calculateExplosionPos(0.0);
        this.secondExplosionPos = this.calculateExplosionPos(this.deltaTime);

        this.explosionVel = this.calculateExplosionVelocity();
        this.firstLevelShrapnel = this.generateRandomShrapnel(true);
        this.secondLevelShrapnel = this.generateRandomShrapnel(false);
        this.explodedFirst = false;
        this.explodedSecond = false;
    }

    firstExplosion(){
        if(time >= this.explosionTime && !this.explodedFirst){
            gl.useProgram(rocketsProgram)
            gl.bindBuffer(gl.ARRAY_BUFFER, rocketBuffer);
            this.firstLevelShrapnel.forEach(function(x){
               gl.bufferSubData(gl.ARRAY_BUFFER, (particlesNumber++ * (10 * 4))%(maxParticles*(10*4)), flatten(x.getInfo()));
         });
         this.explodedFirst = true;   
        }
         
    }

    secondExplosion(){
        if(time >= this.explosionTime + this.deltaTime && !this.explodedSecond){
            gl.useProgram(rocketsProgram)
            gl.bindBuffer(gl.ARRAY_BUFFER, rocketBuffer);
            this.secondLevelShrapnel.forEach(function(x){
               gl.bufferSubData(gl.ARRAY_BUFFER, (particlesNumber++ * (10 * 4))%(maxParticles*(10*4)), flatten(x.getInfo()));
         });
         this.explodedSecond = true;   
        }
    }

    calculateExplosionPos(deltaTime){
        let x = this.getStartPos()[0] + this.getStartVelocity()[0]*(this.explosionTime - this.getTime() + deltaTime);
        let y = this.getStartPos()[1] + this.getStartVelocity()[1]*(this.explosionTime - this.getTime() + deltaTime) 
                                      + 0.5 * GRAVITY * Math.pow((this.explosionTime - this.getTime() + deltaTime),2.0);
    
        return vec2(x,y);
    }
    
    calculateExplosionVelocity(){
       let vx = this.getStartVelocity()[0];
       let vy = 0;
    
       return vec2(vx,vy);
    }

    /**
     * first = true se for a primeira explosao
     */
    generateRandomShrapnel(first){
        let shrapnel = [];
        let expPos;
        let expTime;

        if(first){
            expPos = this.firstExplosionPos;
            expTime = this.explosionTime;
        }else{
            expPos = this.secondExplosionPos;
            expTime = this.explosionTime + this.deltaTime;

        }

        var numberOfShrapnel = Math.floor(Math.random() * 240) + 10;
        for( var i = 0; i < numberOfShrapnel; i++){
           shrapnel.push(new Shrapnel(expPos,expTime,this.getColor()));
        }

        return shrapnel;
    }

    getShrapnel(){
        return this.firstLevelShrapnel;
    }
}

class Shrapnel extends Projectile{
    constructor(position,startTime,color){
        var angle = Math.random()*2*Math.PI;
        var radius = Math.random()*0.4;

        super(position, vec2(Math.cos(angle)*radius,Math.sin(angle)*radius),startTime,color,1.0);
    }
}