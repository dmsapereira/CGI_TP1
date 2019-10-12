/*
*@authors
*David Pereira - 52890
*Filie José - 53277
*/

//  GLOBALS VARIABLES
var gl;

/**
 * mouse position upon mouseDown
 */
var startPos

/**
 * mouse position upon mouseMove
 */
var endPos; 

/**
 * Current offset for reading bufferData
 */
var offset = 0;


/**
 * checks if we're drawing a line or not
 */
var isDrawing = false; 

/**
 * currently drawn rockets
 */
var activeRockets = []; 

/**
 * HTML Canvas element
 */
var canvas; 

/**
 * program for the line
 */
var linesProgram;

/**
 * program for the rockets/shrapnel/trails
 */
var rocketsProgram  

/**
 * program for the rocket that appears while we're drawing
 */
var lineStartProgram; 

/**
 * buffer for the two points that define the line
 */
var linesBuffer; 

/**
 * buffer for all the rockets/shrapnel/trails
 */
var rocketBuffer; 

/**
 * buffer for the single point thats rendered upon the mouseDown event
 */
var lineStartBuffer;

/*
 * Attributes
 */
var linePosition;
var vStartPosition;
var lineStartPosition;
var vStartVelocity;
var vStartTime;
var vColor;
var projectileType;

/*
* Uniforms
*/
var timeLoc;
var gravityLoc;

/**
 * Time counter. Basically simulates time
 */
var time = 0;

/**
 * Counter thats incremented everytime a particle is created. Never decremented but is used
 * with a modulus with maxParticles
 */
var particlesNumber = 0;

/**
 * Counter thats used for calculating the interval between automatic launches
 */
var spawnInterval = 0;

/**
 * Are we auto launching?
 */
var automode = false;

/*
* HTML Information Elements
*/
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

/**
 * Changes the WebGL context to the Line
 */
function bindLine(){
    gl.useProgram(linesProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, linesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten([startPos, endPos]), gl.STATIC_DRAW);

    // Associate our shader variables with our data buffer
    gl.vertexAttribPointer(linePosition, 2, gl.FLOAT, false, 0, 0);
}

/**
 * Changes the WebGL context to the line's point 
 */
function bindLineStart(){
    gl.useProgram(lineStartProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, lineStartBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(startPos),gl.STATIC_DRAW);

    gl.vertexAttribPointer(lineStartPosition,2,gl.FLOAT,false,0,0);
}

/**
 * Changes the WebGL context to the rockets/shrapnel/trails
 */
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
    document.getElementById('bufferState').value = offset;
    document.getElementById('autofireRate').value= (1 / this.autofireRate.value).toFixed(4);
    document.getElementById('explosionRadius').value= (this.explosionRadius.value / 5).toFixed(2);
    document.getElementById('shrapnelMultiplier').value= (this.shrapnelMultiplier.value / 2).toFixed(2);

    //simulates the flow of time. Altered via the slider in the HTML
    time += 1/(60 * 5 / this.timeSlider.value);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    //Do we want to autospawn?
    //2nd part of the condition is for defining the launch interval
    if(automode && spawnInterval++ % (61 - this.autofireRate.value) == 0 )
        autoSpawn();
    
    if(isDrawing){

        bindLineStart();
        gl.drawArrays(gl.POINTS,0,1);
        
        bindLine();
        gl.drawArrays(gl.LINES, 0, 2);
        
    }
    bindRockets();

    // if a rocket has exploded, that explosion's effects will be calculated here
    activeRockets.forEach(x => x.firstExplosion());
    activeRockets.forEach(x => x.secondExplosion());
    
    //Periodically changes the offset for drawing so that we don't draw unecessary particles
    for(;activeRockets.length != 0 && time >= activeRockets[0].getDeathTime() + 2.0;){
        offset = activeRockets[0].getIndex();
        activeRockets.shift();
    }
    
    if(offset + particlesNumber >= maxParticles){
        gl.drawArrays(gl.POINTS, offset, maxParticles - offset - 1);
        if(particlesNumber >= maxParticles)
            gl.drawArrays(gl.POINTS, 0, maxParticles - 1);
        else
            gl.drawArrays(gl.POINTS, 0, particlesNumber);
    }else{
        if(particlesNumber >= maxParticles)
            gl.drawArrays(gl.POINTS, offset, maxParticles - 1);
        else
            gl.drawArrays(gl.POINTS, offset, particlesNumber);
    }

    requestAnimationFrame(render);
}

/**
 * Pushes a new rocket when it's autospawn origined
 */
function autoSpawn(){
    var posX = vec2(-1 + Math.random()*2, -0.9);
    var posY = vec2(posX[0] + Math.random()*0.2, posX[1] + 0.9 + Math.random()*0.5);
    var rocket = new Rocket(posX, posY);
    activeRockets.push(rocket);
    gl.bindBuffer(gl.ARRAY_BUFFER,rocketBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, (particlesNumber++ * (10 * 4))%(maxParticles*(10*4)), flatten(rocket.getInfo()));
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
        this.isMortar = (Math.random() < 0.5);
        this.index = particlesNumber%maxParticles;
    }

    /**
     * Returns the time at which we can be sure all the rocket's particles will have been gone
     */
    getDeathTime(){
        return this.explosionTime + this.deltaTime + 1.5;
    }

    /**
     * Returns the rockets index in the rockets array
     */
    getIndex(){
        return this.index;
    }

    /**
     * Explodes the rocket, launching the first level shrapnel into the air
     */
    firstExplosion(){
        
        if(!this.isMortar && !this.explodedFirst)
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

    /**
     * Explodes the rocket's first level shrapnel launching further shrapnel into the air
     */
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

    /**
     * Ejects the rocket's trail particles. 2 at a time
     */
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

    /**
     * Calculates the position of the rocket at the deltaTime
     * @param {*} deltaTime 
     */
    calculateExplosionPos(deltaTime){
        let x = this.getStartPos()[0] + this.getStartVelocity()[0]*(this.explosionTime - this.getTime() + deltaTime);
        let y = this.getStartPos()[1] + this.getStartVelocity()[1]*(this.explosionTime - this.getTime() + deltaTime) 
                                      + 0.5 * GRAVITY * Math.pow((this.explosionTime - this.getTime() + deltaTime),2.0);
    
        return vec2(x,y);
    }
    
    /**
     * Returns the rocket's velocity at the time of explosion
     */
    calculateExplosionVelocity(){
       let vx = this.getStartVelocity()[0];
       let vy = 0;
    
       return vec2(vx,vy);
    }

    /**
     * Used on the constructor only. Generates the shrapnel that will be launched upon the first explosion
     */
    generateFirstShrapnel(){
        let shrapnel = [];

        var numberOfShrapnel = Math.floor(Math.random() * 240) + 10;
        for( var i = 0; i < numberOfShrapnel; i++){
           shrapnel.push(new Shrapnel(this.firstExplosionPos,null,this.explosionTime,this.getColor(),1.0));
        }

        return shrapnel;
    }

    /**
     * Used on the constructor only. Generates the shrapnel that will be launched upon the second explosion
     */
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

    /**
     * Returns the first level shrapnel
     */
    getShrapnel(){
        return this.firstLevelShrapnel;
    }
}

/**
 * Represents the shrapnel. Be they first level, second level, or a trail
 */
class Shrapnel extends Projectile{
    constructor(position,velocity,startTime,color,projectileType){
        let v = 0;
        if(velocity == null){
            var angle = Math.random()*2*Math.PI;
            var radius = Math.random()* 0.4 * (explosionRadius.value / 5);
            v = vec2(Math.cos(angle)*radius,Math.sin(angle)*radius)
        }else
            v = velocity
        super(position,v,startTime,color,projectileType);
    }
}