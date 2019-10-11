//  GLOBALS VARIABLES
var gl;

var startPos, endPos, isDrawing = false, activeRockets = [], canvas;
var linesProgram, rocketsProgram, lineStartProgram, linesBuffer, rocketBuffer, lineStartBuffer;
var linePosition, vStartPosition, lineStartPosition, vStartVelocity, vStartTime, vColor, projectileType, timeLoc, gravityLoc;
var time = 0;
var particlesNumber = 0;
var activeParticlesNumber = 0;
var spawnInterval = 0;
var automode = false;
var timeSlider;
var autofireRate;
var explosionRadius;
var shrapnelMultiplier;


//  CONSTANTS
const GRAVITY = -0.5;
const SHRAPNEL_LIFESPAN = 2; // must be given in seconds times 60 (which is the assumed refresh rate)
const maxParticles = 65000;

//  MAIN
window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    autofireRate = document.getElementById("autofireSlider");
    timeSlider = document.getElementById("timeSlider");
    explosionRadius = document.getElementById("radiusSlider");
    shrapnelMultiplier = document.getElementById("shrapnelSlider");
    canvas.addEventListener("mousedown", mouseDown);
    canvas.addEventListener("mouseup", mouseUp);
    canvas.addEventListener("mousemove", mouseMovement);
    canvas.parentElement.addEventListener("keypress",keypressEvent);
    this.document.body.addEventListener("keypress",keypressEvent);

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
    
    projectileType = gl.getAttribLocation(rocketsProgram,"projectileType");
    gl.enableVertexAttribArray(projectileType);

    timeLoc = gl.getUniformLocation(rocketsProgram,"mTime");
    gravityLoc = gl.getUniformLocation(rocketsProgram,"gravity");

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

    gl.uniform1f(timeLoc,time);
    gl.uniform1f(gravityLoc, GRAVITY);
    gl.vertexAttribPointer(vStartPosition,2,gl.FLOAT,false,40,0);
    gl.vertexAttribPointer(vStartVelocity,2,gl.FLOAT,false,40,8);
    gl.vertexAttribPointer(vStartTime,1,gl.FLOAT,false,40,16);
    gl.vertexAttribPointer(vColor,4,gl.FLOAT,false,40,20)
    gl.vertexAttribPointer(projectileType,4,gl.FLOAT,false,40,36)
}

function render(){
    document.getElementById('timeSpeed').value= (this.timeSlider.value/5) + "x" ; 
    document.getElementById('timeElapsed').value = this.time.toFixed(2) + "s";
    document.getElementById('bufferState').value = this.particlesNumber % maxParticles;
    document.getElementById('autofireRate').value= (1 / this.autofireRate.value).toFixed(4);
    document.getElementById('explosionRadius').value= (this.explosionRadius.value / 5).toFixed(2);
    document.getElementById('shrapnelMultiplier').value= (this.shrapnelMultiplier.value / 2).toFixed(2);

    time += 1/(60 * 5 / this.timeSlider.value);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    //demasiado smol brian para meter a variar com o tempo
    if(automode && spawnInterval++ % (61 - this.autofireRate.value) == 0 )
        autoSpawn();
    
    if(isDrawing){

        bindLineStart();
        gl.drawArrays(gl.POINTS,0,1);
        
        bindLine();
        gl.drawArrays(gl.LINES, 0, 2);
        
    }
    bindRockets();

    activeRockets.forEach(x => x.firstExplosion());
    activeRockets.forEach(x => x.secondExplosion());
    
    for(;activeRockets.length != 0 && time >= activeRockets[0].getDeathTime() + 2.0;){
        activeRockets.shift();
    
        offset += activeRockets[0].getTotalProjectileCount();
    }
    

    if(activeRockets.length != 0 && time >= activeRockets[0].getTime() + 5.0){
        particlesNumber -= activeRockets[0].getTotalProjectileCount();
        offset += activeRockets[0].getTotalProjectileCount();
        
        if(offset >= maxParticles)
            offset = offset - maxParticles;
    }
    
    if(offset+particlesNumber > maxParticles)
    gl.drawArrays(gl.POINTS, offset, particlesNumber);
    else
        gl.drawArrays(gl.POINTS, 0, maxParticles - 1);
    
    requestAnimationFrame(render);
}

function autoSpawn(){
    var posX = vec2(-1 + Math.random()*2, -0.9);
    var posY = vec2(posX[0] + Math.random()*0.2, posX[1] + 0.9 + Math.random()*0.5);
    var rocket = new Rocket(posX, posY);
    activeRockets.push(rocket);
    gl.bindBuffer(gl.ARRAY_BUFFER,rocketBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, (particlesNumber++ * (10 * 4))%(maxParticles*(10*4)), flatten(rocket.getInfo()));
    
    if(activeParticlesNumber < maxParticles)
        activeParticlesNumber++;
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
    if (activeParticlesNumber < maxParticles)
        activeParticlesNumber++;
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
/**
 * ProjectileType = 0.0, se for o foguete
 * ProjectileType = 1.0, se for um fragmento
 * ProjectileType = 2.0, se for um fragmento de ejecao
 */
class Projectile{
    constructor(startPos, velocity,spawnTime = time,color = vec4(Math.random(),Math.random(),Math.random(),1.0),projectileType = 0.0){
        this.startPos = startPos;
        this.velocity = velocity;
        this.startTime = spawnTime;
        this.color = color;
        this.projectileType = projectileType;
    }



    getInfo(){
        return [this.startPos[0],this.startPos[1],this.velocity[0],this.velocity[1],this.startTime,
                    this.color[0],this.color[1],this.color[2],this.color[3], this.projectileType];
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
        this.deltaTime = 1.0;


        this.firstExplosionPos = this.calculateExplosionPos(0.0);
        this.secondExplosionPos = this.calculateExplosionPos(this.deltaTime);

        this.explosionVel = this.calculateExplosionVelocity();
        this.firstLevelShrapnel = this.generateFirstShrapnel();
        this.secondLevelShrapnel = this.generateSecondShrapnel();
        this.explodedFirst = false;
        this.explodedSecond = false;
        this.ejectionCounter = Math.PI/2.0;
        this.isMortar = (Math.random() < 0.5)
    }

    getDeathTime(){
        return this.explosionTime + this.deltaTime + 1.5;
    }

    getTotalProjectileCount(){
        return 1 + this.firstLevelShrapnel.length + this.secondLevelShrapnel.length;
    }

    firstExplosion(){
        
        if(!this.isMortar && !this.explodedFirst && Math.sin(this.ejectionCounter/((time-this.getTime()) * 2.5)) < 0)
            this.ejectFragment();
        
        this.ejectionCounter += 0.1;
        
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
         activeRockets.shift();
        }
    }

    ejectFragment(){
        gl.useProgram(rocketsProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER,rocketBuffer);

        var xPos = this.getStartPos()[0] + this.getStartVelocity()[0]*(time-this.getTime());
        var yPos = this.getStartPos()[1] + this.getStartVelocity()[1]*(time-this.getTime())
                                         + 0.5*GRAVITY*Math.pow((time - this.getTime()),2.0);

        var xVel = Math.random() *this.getStartVelocity()[0];
        var yVel = -2.0 * (this.getStartVelocity()[1] + GRAVITY*(time-this.getTime()));

        var s = new Shrapnel(vec2(xPos,yPos), vec2(xVel,yVel), time,this.getColor(),2.0);

        gl.bufferSubData(gl.ARRAY_BUFFER,(particlesNumber++ * 10*4)%(maxParticles*10*4),flatten(s.getInfo()));
           
        s = new Shrapnel(vec2(xPos,yPos), vec2(-1* xVel,yVel),time,this.getColor(),2.0);
        
        gl.bufferSubData(gl.ARRAY_BUFFER,(particlesNumber++ * 10*4)%(maxParticles*10*4),flatten(s.getInfo()));
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
    generateFirstShrapnel(){
        let shrapnel = [];

        var numberOfShrapnel = Math.floor(Math.random() * 240) + 10;
        for( var i = 0; i < numberOfShrapnel; i++){
           shrapnel.push(new Shrapnel(this.firstExplosionPos,null,this.explosionTime,this.getColor(),1.0));
        }

        return shrapnel;
    }

    generateSecondShrapnel(){
        let secondShrapnel = []
        let t = this.explosionTime + this.deltaTime;
        
        let numberOfShrapnel = Math.floor((Math.random() * 3 + 2) * (shrapnelMultiplier.value / 2));
        this.firstLevelShrapnel.forEach(element => {
            for (let i = 0; i<numberOfShrapnel;i++){
                let x = element.getStartPos()[0] + element.getStartVelocity()[0]*(t - element.getTime());
                let y = element.getStartPos()[1] + element.getStartVelocity()[1]*(t - element.getTime()) 
                                               + 0.5 * GRAVITY * Math.pow((t - element.getTime()),2.0);

                secondShrapnel.push(new Shrapnel(vec2(x,y),null,t,this.getColor(),1.0));
            }
        });

        return secondShrapnel;
    }

    /*generateRandomShrapnel(first){
        let shrapnel = [];
        let x = this.firstExplosionPos[0];
        let y = this.firstExplosionPos[1] - 0.1;
        shrapnel.push(new Shrapnel(vec2(x,y),vec2(x-this.firstExplosionPos[0],y-this.firstExplosionPos[1]),this.expTime,this.getColor()));
        
        x = this.firstExplosionPos[0]
        y = this.firstExplosionPos[1] - 0.2
        shrapnel.push(new Shrapnel(vec2(x,y),vec2(x-this.firstExplosionPos[0],y-this.firstExplosionPos[1]),this.expTime,this.getColor()));


        return shrapnel;
    }*/

    getShrapnel(){
        return this.firstLevelShrapnel;
    }
}

class Shrapnel extends Projectile{
    constructor(position,velocity,startTime,color,projectileType){
        let v = 0;
        if(velocity == null){
            var angle = Math.random()*2*Math.PI;
            var radius = Math.random()* 0.4 * (explosionRadius.value / 5);
            v = vec2(Math.cos(angle)*radius,Math.sin(angle)*radius)
        }
        else
            v = velocity
        super(position,v,startTime,color,projectileType);
    }
}