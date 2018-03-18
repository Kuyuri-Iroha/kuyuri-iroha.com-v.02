{
'use strict'

let SIGNIFICANT_DIGITS = 100000;

/**
 * Class wrapping the 'three.js'.
 */
class ThreeJS
{
    static get VIEWPORT_HALFSIZE() {
        return 500;
    }

    /**
     * @constructor
     * @param {HTMLElement} target 
     * @param {THREE.Color} clearColor 
     */
    constructor(target, clearColor) {
        this.targetElem = target;
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.targetElem,
            antialias: true
        });
        let width = window.innerWidth;
        let height = window.innerHeight;
        this.aspect = height / width;
        this.renderer.setClearColor(0xfafafa, 1);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(width, height);
        let viewportWidth = ThreeJS.VIEWPORT_HALFSIZE * Math.min((window.innerWidth / 1920), 1.0);
        let viewportHeight = viewportWidth * this.aspect;
        this.camera = new THREE.OrthographicCamera(
            -viewportWidth, viewportWidth,
            -viewportHeight, viewportHeight,
            0.1, 1000
        );

        /**
         * Function for callback use.
         */
        this.onResize = () => {
            let width = window.innerWidth;
            let height = window.innerHeight;
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.setSize(width, height);

            this.aspect = height / width;
            let viewportWidth = ThreeJS.VIEWPORT_HALFSIZE * Math.min((window.innerWidth / 1920), 1.0)
            this.camera.left = -viewportWidth;
            this.camera.right = viewportWidth;
            this.camera.top = -viewportWidth * this.aspect;
            this.camera.bottom = viewportWidth * this.aspect;
            this.camera.updateProjectionMatrix();
        }
    }
}


/**
 * Class representing one panel of darkness.
 */
class Panel
{
    /**
     * @constructor
     * @param {THREE.Vector3} pos 
     * @param {number} size 
     * @param {THREE.Color} color 
     * @param {THREE.Scene} scene
     */
    constructor(pos, size, color, scene) {
        this.material = new THREE.SpriteMaterial({color: color});
        this.mesh = new THREE.Sprite(
            this.material
        );

        this.size = size;
        this.mesh.position.copy(pos);
        this.mesh.scale.set(this.size, this.size, 1);

        scene.add(this.mesh);
    }

    /**
     * 
     * @param {Particle} particle 
     */
    applyParticle(particle) {
        let panelPos = new THREE.Vector2(this.mesh.position.x, this.mesh.position.y);
        if(particle.isInRange(panelPos)) {
            let d = Math.round(panelPos.distanceTo(particle.pos) * SIGNIFICANT_DIGITS) / SIGNIFICANT_DIGITS;
            let intensity = Math.round(particle.intensity * SIGNIFICANT_DIGITS) / SIGNIFICANT_DIGITS;
            let i = Math.max(Math.min(intensity / (d * (d / 2)), 1.0), 0.001);
            i = i <= 0.01 ? i * 0.4 : i;
            let scale = (1.0 - i) * this.mesh.scale.x;
            scale = Math.round(scale * SIGNIFICANT_DIGITS) / SIGNIFICANT_DIGITS;
            this.mesh.scale.set(scale, scale, 1);
        }
    }

    /**
     * 
     * @param {Lights} lights 
     */
    applyLights(lights) {
        this.applyParticle(lights.core);
        for(let particle of lights.particles) {
            this.applyParticle(particle);
        }
    }

    /**
     * Function clearing previous frame scale.
     */
    clearScaling() {
        this.mesh.scale.set(this.size, this.size, 1);
    }
}

/**
 * CLass representing the Darkness.
 */
class Darkness
{
    static get Z_POSITION() {
        return -100;
    }
    static get DEAD_SPACE() {
        return 20;
    }
    static get LIGHTS_FALL_SPEED() {
        return 1.3;
    }
    /**
     * @constructor
     * @param {number} widthDivNum
     * @param {number} clearance
     * @param {THREE.Scene} scene
     * @param {ThreeJS} three
     */
    constructor(widthDivNum, clearance, scene, three) {
        console.assert(0 < widthDivNum);

        let densePanelSize = ThreeJS.VIEWPORT_HALFSIZE * 2 / widthDivNum;
        this.panelSize = densePanelSize - clearance / 2;
        let panelPosRel = densePanelSize / 2;

        //Panels.
        const MAGNIFICATION = Math.max(1, window.innerHeight / 1920);
        let panelPosX = -ThreeJS.VIEWPORT_HALFSIZE;
        let panelPosY = -ThreeJS.VIEWPORT_HALFSIZE * MAGNIFICATION;
        this.panels = [];
        let viewRange = Math.max(three.camera.right, three.camera.bottom) + this.panelSize;
        let ua = navigator.userAgent;
        let isMobile = (ua.indexOf('Mobile') > 0 ||
                        ua.indexOf('iPhone') > 0 ||
                        ua.indexOf('iPod') > 0 ||
                        ua.indexOf('iPad') > 0 ||
                        ua.indexOf('Android') > 0 ||
                        ua.indexOf('Windows Phone') > 0);
        for(let y = 0; y < widthDivNum * MAGNIFICATION; y++) {
            let panelsRow = [];
            panelPosY += panelPosRel;
            for(let x = 0; x < widthDivNum; x++) {
                panelPosX += panelPosRel;
                if(isMobile && 
                    (panelPosX < -viewRange ||
                    viewRange < panelPosX ||
                    panelPosY < -viewRange ||
                    viewRange < panelPosY)) {
                    continue;
                }
                panelsRow.push(
                    new Panel(
                        new THREE.Vector3(panelPosX, panelPosY, Darkness.Z_POSITION),
                        this.panelSize, 0x0f0f0f, scene)
                );
                panelPosX += panelPosRel;
            }
            this.panels.push(panelsRow);
            panelPosY += panelPosRel;
            panelPosX = -ThreeJS.VIEWPORT_HALFSIZE;
        }

        //Lights.
        this.lights = [];
        this.timer = 0;
        this.prevLightXPos = NaN;
    }

    /**
     * @param {number} aspect
     * @param {three} three
     */
    createLight(aspect, three) {
        let lightXPos = 0;
        let viewRangeX = three.camera.right + this.panelSize;
        let viewRangeY = three.camera.bottom + this.panelSize;
        let corrected = Math.min(viewRangeX * 1.3, ThreeJS.VIEWPORT_HALFSIZE);
        do {
            lightXPos = Math.random() * (corrected * 2) - corrected;
        } while(this.prevLightXPos - Darkness.DEAD_SPACE <= lightXPos &&
                    lightXPos <= this.prevLightXPos + Darkness.DEAD_SPACE)
        this.prevLightXPos = lightXPos;
        let light = new Lights(lightXPos, -viewRangeY - Lights.CORE_INTENSITY - 300);

        this.lights.push(light);
    }

    /**
     * @param {number} aspect
     */
    updateLights(aspect) {
        for(let light of this.lights) {
            light.core.vel.y = Darkness.LIGHTS_FALL_SPEED;
            light.update();
        }
        this.lights = this.lights.filter(function(light) {
            return light.core.pos.y <= ThreeJS.VIEWPORT_HALFSIZE * aspect + Lights.CORE_INTENSITY + 300;
        });
    }

    /**
     * 
     * @param {Mouse} mouse 
     * @param {number} aspect
     * @param {ThreeJS} three
     */
    update(mouse, aspect, three) {
        //Apply Lights.
        for(let yPanel of this.panels) {
            for(let xPanel of yPanel) {
                let viewRangeX = three.camera.right + this.panelSize;
                let viewRangeY = three.camera.bottom + this.panelSize;
                if(xPanel.mesh.position.x < -viewRangeX ||
                    viewRangeX < xPanel.mesh.position.x ||
                    xPanel.mesh.position.y < -viewRangeY ||
                    viewRangeY < xPanel.mesh.position.y) {
                        continue;
                }
                xPanel.clearScaling();
                for(let light of this.lights) {
                    xPanel.applyLights(light);
                }
            }
        }

        //Update Lights.
        this.updateLights(aspect);

        //Create Lights.
        let span = 600;
        if(this.timer % span === 0) {
            this.createLight(aspect, three);
        }
        this.timer++;
    }
}

/**
 * Class catching a mouse pointer.
 */
class Mouse
{
    /**
     * @constructor
     * @param {ThreeJS} three
     */
    constructor(three) {
        this.pos = new THREE.Vector2(0, 0);
        let onMouseMove = (e) => {
            this.pos.x = (e.clientX / three.targetElem.clientWidth * 2 - 1) * ThreeJS.VIEWPORT_HALFSIZE;
            this.pos.y = (e.clientY / three.targetElem.clientHeight * 2 - 1) * (ThreeJS.VIEWPORT_HALFSIZE * three.aspect);
        }
        three.targetElem.addEventListener('mousemove', onMouseMove);
    }
}

/**
 * Class representing a particle.
 */
class Particle
{
    /**
     * Constant representing the range by intensity * RANGE_RATE. 
     */
    static get RANGE_RATE() {
        return 30;
    }
    /**
     * 
     * @param {number} x 
     * @param {number} y 
     * @param {number} intensity 
     */
    constructor(x, y, intensity) {
        this.pos = new THREE.Vector2(x, y);
        this.intensity = intensity;
        this.vel = new THREE.Vector2(0, 0);
        this.acc = new THREE.Vector2(0, 0);
        this.initialPos = new THREE.Vector2(0, 0);
        this.initialVel = new THREE.Vector2(0, 0);
        this.initialIntentisy = 0;
        this.lifespan = 100;
        this.livingTime = 0;
    }

    /**
     * Function setting initial values.
     */
    setInitial() {
        this.initialPos = this.pos.clone();
        this.initialVel = this.vel.clone();
        this.initialIntentisy = this.intensity;
    }

    /**
     * Function moving self-position in velocity.
     */
    moveInVelocity() {
        this.pos.add(this.vel);
    }

    /**
     * Function moving self-position in acceleration.
    */
    moveInAcceleration() {
        this.vel.add(this.acc);
        this.pos.add(this.vel);
        this.acc.set(0, 0);
    }

    decay() {
        this.intensity -= this.initialIntentisy / this.lifespan;
        this.livingTime++;
    }

    isBright() {
        return this.livingTime <= this.lifespan;
    }

    isInRange(pos) {
        let undefined;
        if(pos === undefined) {
            return false;
        }
        let ratio = 1;
        if(this.intensity < Lights.CORE_INTENSITY) {
            ratio = 5;
        }
        let range = this.intensity * ratio;
        return pos.distanceToSquared(this.pos) < range * range;
    }
}

/**
 * Class representing the Lights.
 */
class Lights
{
    static get CORE_INTENSITY() {
        return 400;
    }
    static get PARTICLE_INTENSITY() {
        return 50;
    }
    static get PARTICLE_MOMENTUM() {
        return 2;
    }
    static get MAX_SPEED() {
        return 20;
    }
    static get INJECITON_ANGLE_RANGE() {
        return Math.PI / 6;
    }

    /**
     * @constructor
     * @param {number} x 
     * @param {number} y 
     */
    constructor(x, y) {
        this.core = new Particle(x, y, Lights.CORE_INTENSITY);
        this.particles = [];
        this.timer = 0;
        this.particleDir = new THREE.Vector2(0, -1);
    }

    /**
     * 
     */
    createParticle() {
        let particle = new Particle(this.core.pos.x, this.core.pos.y, Lights.PARTICLE_INTENSITY);

        let injectionAngle = Math.random() * (Lights.INJECITON_ANGLE_RANGE * 2) - Lights.INJECITON_ANGLE_RANGE;
        let injectionDir = this.particleDir.rotateAround(new THREE.Vector2(0, 0), injectionAngle);
        particle.vel = injectionDir.setLength(Lights.PARTICLE_MOMENTUM);
        particle.setInitial();

        this.particles.push(particle);
    }

    /**
     * 
     * @param {THREE.Vector2} [target = null]
     */
    update(target = null) {
        this.timer++;

        let prevPos = this.core.pos.clone();
        if(target !== null) {
            this.core.vel.subVectors(target, this.core.pos);
        }
        this.particles = this.particles.filter(function(particle) {
            return particle.isBright();
        });
        this.core.moveInAcceleration();
        for(let i = 0, length = this.particles.length; i < length; i++) {
            this.particles[i].moveInAcceleration();
            this.particles[i].decay();
        }

        //Set particle direction vector.
        if(!prevPos.equals(this.core.pos)) {
            prevPos.sub(this.core.pos);
            prevPos.normalize();
            this.particleDir = prevPos;
        }

        //Create particle.
        const GRANULARITY = 1000;
        let alpha = Math.min(this.core.vel.length() / Lights.MAX_SPEED, 1.0);
        let span = Math.floor(GRANULARITY / (GRANULARITY * alpha));
        if(this.timer % span === 0) {
            this.createParticle();
        }
    }
}


let onInit = () => {
    let three = new ThreeJS(document.getElementById('floatingWhite'), 0xfffff);

    //Create scene.
    let scene = new THREE.Scene();

    //Create Square.
    let divNum = Math.floor(50 * (window.innerWidth / 1920));
    let darkness = new Darkness(50, 0, scene, three);

    //Create Mouse.
    let mouse = new Mouse(three);

    //Window resize function.
    let onResize = () => {
        three.onResize();
    }
    window.addEventListener('resize', onResize);

    //Animation function.
    let tick = () => {
        requestAnimationFrame(tick);

        darkness.update(mouse, three.aspect, three);

        three.renderer.render(scene, three.camera);
    }
    tick();
}

window.addEventListener('DOMContentLoaded', onInit);
}