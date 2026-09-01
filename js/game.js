/**
 * Realistic 3D Driving Simulator - Main Game Engine
 * Physics, 6-Speed Transmission, Drift Mechanics, Suspension,
 * Multi-Camera System, Minimap Radar, Particle Effects, Sound Engine, and UI Sync.
 */

class GameEngine {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    // Lighting
    this.dirLight = null;
    this.hemiLight = null;

    // Modules
    this.cityWorld = null;
    this.trafficMgr = null;
    this.particles = null;
    this.weatherMgr = null;

    // Player Car State
    this.playerCarData = null;
    this.playerCar = null;
    this.speed = 0;
    this.acceleration = 0.045;
    this.brakeForce = 0.065;
    this.friction = 0.985;
    this.maxSpeed = 2.4; // ~200 km/h
    this.nitroMaxSpeed = 3.6; // ~300 km/h
    this.baseMaxSpeed = 2.4;

    // Steering & Dynamics
    this.steerAngle = 0;
    this.maxSteerAngle = 0.038;
    this.steerReturnSpeed = 0.88;
    this.lateralVelocity = 0;
    this.driftAngle = 0;
    this.isDrifting = false;
    this.driftScore = 0;

    // 3D Suspension Pitch/Roll
    this.pitchAngle = 0;
    this.rollAngle = 0;

    // Transmission & RPM
    this.currentGear = 1;
    this.gearRatios = [0, 0.45, 0.9, 1.45, 2.0, 2.7, 3.8];
    this.rpm = 900;
    this.isRedline = false;

    // Nitro System
    this.nitro = 100;
    this.isNitroActive = false;
    this.maxNitro = 100;

    // Camera Modes: 0: Chase, 1: Cockpit, 2: Hood/Bumper, 3: Cinematic Drone
    this.cameraMode = 0;
    this.cameraModes = ['Dynamic Chase', 'Interior Cockpit', 'Bonnet / Hood', 'Cinematic Drone'];
    this.camLagPos = new THREE.Vector3();
    this.camLagLook = new THREE.Vector3();
    this.screenShake = 0;

    // Game Stats
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('hyperdrive_highscore') || '0', 10);
    this.distance = 0;
    this.nearMissCombo = 0;
    this.isGameOver = false;
    this.isPaused = false;

    // Customization Settings
    this.playerColor = 0x00f0ff;
    this.underglowColor = 0x00f0ff;
    this.currentCarType = 'hypercar';
    this.pedestrians = null;

    // Input Keys
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      handbrake: false,
      nitro: false
    };

    // DOM Elements
    this.dom = {
      score: document.getElementById('val-score'),
      highScore: document.getElementById('val-highscore'),
      distance: document.getElementById('val-dist'),
      speedDigital: document.getElementById('digital-speed'),
      speedUnit: document.getElementById('speed-unit'),
      gaugeProgress: document.getElementById('gauge-circle'),
      gearBox: document.getElementById('gear-num'),
      rpmBar: document.getElementById('rpm-fill'),
      nitroBar: document.getElementById('nitro-fill'),
      comboBanner: document.getElementById('combo-banner'),
      fxOverlay: document.getElementById('fx-overlay'),
      camToast: document.getElementById('cam-toast'),
      minimapCanvas: document.getElementById('minimap-canvas'),
      gameOverModal: document.getElementById('game-over-modal'),
      finalScore: document.getElementById('go-final-score'),
      finalDist: document.getElementById('go-final-dist'),
      finalNearMiss: document.getElementById('go-final-nearmiss'),
      garageModal: document.getElementById('garage-modal')
    };

    this.minimapCtx = this.dom.minimapCanvas ? this.dom.minimapCanvas.getContext('2d') : null;
    this.clock = new THREE.Clock();
  }

  init() {
    this.setupScene();
    this.setupLighting();
    this.setupPlayerCar();
    this.setupSubsystems();
    this.setupInputListeners();
    this.setupUI();

    // Start Clock & Render Loop
    this.clock.start();
    this.animate();
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050811);
    this.scene.fog = new THREE.FogExp2(0x0b0f1d, 0.009);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1200);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    document.getElementById('canvas-container').appendChild(this.renderer.domElement);
  }

  setupLighting() {
    this.hemiLight = new THREE.HemisphereLight(0x6366f1, 0x090514, 0.6);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    this.dirLight.position.set(40, 70, 30);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 180;
    this.dirLight.shadow.camera.left = -35;
    this.dirLight.shadow.camera.right = 35;
    this.dirLight.shadow.camera.top = 35;
    this.dirLight.shadow.camera.bottom = -35;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);
  }

  setupPlayerCar() {
    this.playerCarData = CarBuilder.createCar({
      bodyColor: this.playerColor,
      type: this.currentCarType,
      isPlayer: true,
      underglowColor: this.underglowColor
    });
    this.playerCar = this.playerCarData.group;
    this.playerCar.position.set(2.5, 0, 0); // Start in middle-right lane
    this.scene.add(this.playerCar);

    // Initial camera position behind player
    this.camLagPos.set(2.5, 5, -12);
    this.camLagLook.set(2.5, 1.2, 10);
  }

  setupSubsystems() {
    this.particles = new ParticleSystem(this.scene);
    this.cityWorld = new CityWorld(this.scene);
    this.cityWorld.init(0);

    this.trafficMgr = new TrafficManager(this.scene);
    this.trafficMgr.init(0);

    this.pedestrians = new PedestrianManager(this.scene);
    this.pedestrians.init(0);

    this.weatherMgr = new WeatherManager(
      this.scene, this.dirLight, this.hemiLight, this.particles, this.cityWorld
    );
    this.weatherMgr.applyPreset('cyber');
  }

  setupInputListeners() {
    // Keyboard
    window.addEventListener('keydown', (e) => this.handleKeyEvent(e, true));
    window.addEventListener('keyup', (e) => this.handleKeyEvent(e, false));

    // Window Resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Touch / Mobile On-Screen Buttons
    this.setupTouchControls();

    // Audio init on first interaction
    const startAudio = () => {
      if (window.soundEngine) window.soundEngine.init();
      window.removeEventListener('pointerdown', startAudio);
      window.removeEventListener('keydown', startAudio);
    };
    window.addEventListener('pointerdown', startAudio);
    window.addEventListener('keydown', startAudio);
  }

  handleKeyEvent(eventOrCode, isPressed) {
    if (this.isGameOver) return;
    const code = typeof eventOrCode === 'string' ? eventOrCode : eventOrCode.code;

    if (code === 'KeyW' || code === 'ArrowUp') this.keys.forward = isPressed;
    if (code === 'KeyS' || code === 'ArrowDown') this.keys.backward = isPressed;
    if (code === 'KeyA' || code === 'ArrowLeft') this.keys.left = isPressed;
    if (code === 'KeyD' || code === 'ArrowRight') this.keys.right = isPressed;
    if (code === 'Space') {
      this.keys.handbrake = isPressed;
      if (isPressed && typeof eventOrCode === 'object' && eventOrCode.preventDefault) {
        eventOrCode.preventDefault();
      }
    }
    if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyN') {
      this.keys.nitro = isPressed;
    }

    if (isPressed) {
      if (code === 'KeyC') this.cycleCamera();
      if (code === 'KeyT') this.cycleWeather();
      if (code === 'KeyM') this.toggleAudio();
    }
  }

  setupTouchControls() {
    const bindBtn = (id, key) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart', (e) => { e.preventDefault(); this.keys[key] = true; el.classList.add('active'); });
      el.addEventListener('touchend', (e) => { e.preventDefault(); this.keys[key] = false; el.classList.remove('active'); });
      el.addEventListener('mousedown', () => { this.keys[key] = true; el.classList.add('active'); });
      el.addEventListener('mouseup', () => { this.keys[key] = false; el.classList.remove('active'); });
    };

    bindBtn('t-btn-left', 'left');
    bindBtn('t-btn-right', 'right');
    bindBtn('t-btn-gas', 'forward');
    bindBtn('t-btn-brake', 'backward');
    bindBtn('t-btn-nitro', 'nitro');
    bindBtn('t-btn-drift', 'handbrake');
  }

  setupUI() {
    document.getElementById('btn-cam')?.addEventListener('click', () => this.cycleCamera());
    document.getElementById('btn-weather')?.addEventListener('click', () => this.cycleWeather());
    document.getElementById('btn-garage')?.addEventListener('click', () => this.openGarage());
    document.getElementById('btn-audio')?.addEventListener('click', () => this.toggleAudio());
    document.getElementById('garage-close-btn')?.addEventListener('click', () => this.closeGarage());
    document.getElementById('btn-restart')?.addEventListener('click', () => this.resetGame());

    // Supercar Model Selector
    document.querySelectorAll('.car-model-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.car-model-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const modelKey = card.dataset.model;
        this.setCarModel(modelKey);
      });
    });

    // Color Pickers
    document.querySelectorAll('.car-color-dot').forEach(dot => {
      dot.addEventListener('click', (e) => {
        document.querySelectorAll('.car-color-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        const color = parseInt(dot.dataset.color, 16);
        this.setCarColor(color);
      });
    });

    document.querySelectorAll('.neon-color-dot').forEach(dot => {
      dot.addEventListener('click', (e) => {
        document.querySelectorAll('.neon-color-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        const color = parseInt(dot.dataset.color, 16);
        this.setUnderglowColor(color);
      });
    });
  }

  setCarModel(modelKey) {
    if (!['hypercar', 'muscle', 'cyber', 'exotic'].includes(modelKey)) return;
    this.currentCarType = modelKey;

    // Model Performance Tuning
    if (modelKey === 'hypercar') {
      this.baseMaxSpeed = 2.45;
      this.nitroMaxSpeed = 3.65;
      this.acceleration = 0.048;
      this.maxSteerAngle = 0.038;
    } else if (modelKey === 'muscle') {
      this.baseMaxSpeed = 2.38;
      this.nitroMaxSpeed = 3.55;
      this.acceleration = 0.056; // High launch torque
      this.maxSteerAngle = 0.042; // Drifty
    } else if (modelKey === 'cyber') {
      this.baseMaxSpeed = 2.60;
      this.nitroMaxSpeed = 3.90; // High top end
      this.acceleration = 0.045;
      this.maxSteerAngle = 0.036;
    } else if (modelKey === 'exotic') {
      this.baseMaxSpeed = 2.50;
      this.nitroMaxSpeed = 3.75;
      this.acceleration = 0.050;
      this.maxSteerAngle = 0.040; // Precision handling
    }

    // Save previous transform
    const curPos = this.playerCar ? this.playerCar.position.clone() : new THREE.Vector3(2.5, 0, 0);
    const curRot = this.playerCar ? this.playerCar.rotation.clone() : new THREE.Euler(0, 0, 0);

    if (this.playerCar) {
      this.scene.remove(this.playerCar);
    }

    // Generate new car mesh
    this.playerCarData = CarBuilder.createCar({
      bodyColor: this.playerColor,
      type: this.currentCarType,
      isPlayer: true,
      underglowColor: this.underglowColor
    });

    this.playerCar = this.playerCarData.group;
    this.playerCar.position.copy(curPos);
    this.playerCar.rotation.copy(curRot);
    this.scene.add(this.playerCar);

    const modelNames = {
      hypercar: 'Apex Phantom (Hypercar)',
      muscle: 'Venom GT (Widebody Muscle)',
      cyber: 'Cyberpunk Rayfield (Cyber Roadster)',
      exotic: 'Centenario Spider (Exotic Spider)'
    };
    this.showToast(`Selected: ${modelNames[modelKey] || modelKey}`);
  }

  cycleCamera() {
    this.cameraMode = (this.cameraMode + 1) % this.cameraModes.length;
    this.showToast(`Camera: ${this.cameraModes[this.cameraMode]}`);
  }

  cycleWeather() {
    const name = this.weatherMgr.cycleWeather();
    this.showToast(`Weather: ${name}`);
  }

  toggleAudio() {
    const muted = window.soundEngine ? window.soundEngine.toggleMute() : true;
    const btn = document.getElementById('btn-audio');
    if (btn) btn.innerHTML = muted ? '🔇 Sound: Off' : '🔊 Sound: On';
    this.showToast(muted ? 'Audio Muted' : 'Audio Enabled');
  }

  showToast(text) {
    if (!this.dom.camToast) return;
    this.dom.camToast.innerText = text;
    this.dom.camToast.classList.add('visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.dom.camToast.classList.remove('visible');
    }, 1500);
  }

  setCarColor(colorHex) {
    this.playerColor = colorHex;
    if (this.playerCarData) {
      this.playerCarData.bodyMaterial.color.setHex(colorHex);
    }
  }

  setUnderglowColor(colorHex) {
    this.underglowColor = colorHex;
    if (this.playerCarData) {
      this.playerCarData.underglowMesh.material.color.setHex(colorHex);
      this.playerCarData.underglowLight.color.setHex(colorHex);
    }
  }

  openGarage() {
    this.isPaused = true;
    this.dom.garageModal?.classList.add('active');
  }

  closeGarage() {
    this.isPaused = false;
    this.dom.garageModal?.classList.remove('active');
  }

  updatePhysics(delta) {
    if (this.isGameOver || this.isPaused) return;

    // 1. Nitro Boost
    if (this.keys.nitro && this.nitro > 0 && this.speed > 0.3) {
      this.isNitroActive = true;
      this.nitro = Math.max(0, this.nitro - 28 * delta);
      this.speed += this.acceleration * 1.5;
      this.maxSpeed = this.nitroMaxSpeed;
      this.dom.fxOverlay?.classList.add('nitro-active');
      window.soundEngine?.setNitro(true);

      // Nitro Flame Particles
      const exhaustPos = this.playerCar.position.clone();
      exhaustPos.y += 0.28;
      exhaustPos.z -= 2.3;
      this.particles.spawnNitroFlame(exhaustPos, this.playerCar.rotation.y, true);
    } else {
      this.isNitroActive = false;
      this.maxSpeed = this.baseMaxSpeed;
      this.dom.fxOverlay?.classList.remove('nitro-active');
      window.soundEngine?.setNitro(false);
      // Slow passive nitro recharge
      this.nitro = Math.min(this.maxNitro, this.nitro + 3 * delta);
    }

    // 2. Acceleration & Braking
    if (this.keys.forward) {
      this.speed += this.acceleration;
      this.pitchAngle = THREE.MathUtils.lerp(this.pitchAngle, 0.04, 0.1); // Squat backward
    } else if (this.keys.backward) {
      this.speed -= this.brakeForce;
      this.pitchAngle = THREE.MathUtils.lerp(this.pitchAngle, -0.06, 0.15); // Dive forward
      // Taillight bright brake glow
      this.playerCarData.brakeGlow.intensity = 3.0;
      this.playerCarData.tailLights.forEach(tl => tl.material.color.setHex(0xff0022));
    } else {
      this.pitchAngle = THREE.MathUtils.lerp(this.pitchAngle, 0, 0.1);
      this.playerCarData.brakeGlow.intensity = 0.8;
      this.playerCarData.tailLights.forEach(tl => tl.material.color.setHex(0xef4444));
    }

    // Speed limits & natural friction
    this.speed *= this.friction;
    this.speed = Math.max(-0.6, Math.min(this.maxSpeed, this.speed));

    // 3. Steering & Drift Mechanics
    const speedRatio = Math.abs(this.speed) / this.maxSpeed;
    const effectiveMaxSteer = this.maxSteerAngle * (1.2 - speedRatio * 0.45);

    if (this.keys.left) {
      this.steerAngle = Math.min(effectiveMaxSteer, this.steerAngle + 0.005);
    } else if (this.keys.right) {
      this.steerAngle = Math.max(-effectiveMaxSteer, this.steerAngle - 0.005);
    } else {
      this.steerAngle *= this.steerReturnSpeed;
    }

    // Handbrake / Power Drift Trigger
    this.isDrifting = (this.keys.handbrake || (Math.abs(this.steerAngle) > 0.025 && this.speed > 1.2));

    if (this.isDrifting && Math.abs(this.speed) > 0.4) {
      const driftDir = this.steerAngle > 0 ? 1 : -1;
      this.driftAngle = THREE.MathUtils.lerp(this.driftAngle, this.steerAngle * 2.8, 0.12);
      this.rollAngle = THREE.MathUtils.lerp(this.rollAngle, -driftDir * 0.08, 0.1);

      // Spawn Drift Smoke & Road Skids
      const rearLeft = this.playerCar.position.clone().add(new THREE.Vector3(-1.08, 0.05, -1.35));
      const rearRight = this.playerCar.position.clone().add(new THREE.Vector3(1.08, 0.05, -1.35));

      this.particles.spawnSmoke(rearLeft, new THREE.Vector3(this.lateralVelocity, 0, this.speed));
      this.particles.spawnSmoke(rearRight, new THREE.Vector3(this.lateralVelocity, 0, this.speed));

      if (this.lastSkidPosL) {
        this.particles.addSkidMark(this.lastSkidPosL, rearLeft);
        this.particles.addSkidMark(this.lastSkidPosR, rearRight);
      }
      this.lastSkidPosL = rearLeft.clone();
      this.lastSkidPosR = rearRight.clone();

      // Sound
      window.soundEngine?.updateTireScreech(Math.abs(this.driftAngle) * 20);

      // Drift Combo Score
      this.driftScore += 15;
      this.score += 2;
    } else {
      this.driftAngle = THREE.MathUtils.lerp(this.driftAngle, 0, 0.1);
      this.rollAngle = THREE.MathUtils.lerp(this.rollAngle, -this.steerAngle * 1.5, 0.1);
      this.lastSkidPosL = null;
      this.lastSkidPosR = null;
      window.soundEngine?.updateTireScreech(0);
    }

    // 4. Update Position & Orientation
    if (Math.abs(this.speed) > 0.01) {
      const forwardDir = this.speed > 0 ? 1 : -1;
      this.playerCar.rotation.y += this.steerAngle * forwardDir;
    }

    // Apply pitch & roll to chassis
    this.playerCar.rotation.x = this.pitchAngle;
    this.playerCar.rotation.z = this.rollAngle;

    // Movement forward + lateral drift slip
    const moveZ = Math.cos(this.playerCar.rotation.y + this.driftAngle * 0.4) * this.speed;
    const moveX = Math.sin(this.playerCar.rotation.y + this.driftAngle * 0.4) * this.speed;

    this.playerCar.position.z += moveZ;
    this.playerCar.position.x += moveX;

    // Clamp player to highway bounds (-11.2 to +11.2)
    if (this.playerCar.position.x < -11.2) {
      this.playerCar.position.x = -11.2;
      this.speed *= 0.85;
      this.particles.spawnSparks(this.playerCar.position, 8);
    } else if (this.playerCar.position.x > 11.2) {
      this.playerCar.position.x = 11.2;
      this.speed *= 0.85;
      this.particles.spawnSparks(this.playerCar.position, 8);
    }

    // 5. Wheels & Steering Animations
    this.playerCarData.wheels.forEach(w => {
      w.rotation.x += this.speed * 0.55;
    });

    // Front Wheels pivot with steering
    this.playerCarData.frontPivots.forEach(pivot => {
      pivot.rotation.y = this.steerAngle * 1.6;
    });

    // Cockpit Interior Steering Wheel rotates
    if (this.playerCarData.steeringWheel) {
      this.playerCarData.steeringWheel.rotation.z = -this.steerAngle * 5.0;
    }

    // Directional shadow follows player along Z
    this.dirLight.position.z = this.playerCar.position.z + 30;
    this.dirLight.target.position.z = this.playerCar.position.z;

    // 6. 6-Speed Transmission & RPM calculation
    this.updateGears();

    // 7. Update Score & Distance
    if (this.speed > 0.05) {
      this.distance += (this.speed * 0.05);
      this.score += Math.round(this.speed * 1.5);
    }

    // 8. Update Audio Engine
    const rpmRatio = (this.rpm - 800) / (8500 - 800);
    const speedKmh = Math.round(Math.abs(this.speed) * 85);
    window.soundEngine?.updateEngine(rpmRatio, this.keys.forward || this.keys.nitro, speedKmh);

    // 9. Check Collectibles Pickup
    this.checkCollectibles();
  }

  updateGears() {
    const kmh = Math.abs(this.speed) * 85;
    let targetGear = 1;

    if (kmh > 240) targetGear = 6;
    else if (kmh > 180) targetGear = 5;
    else if (kmh > 130) targetGear = 4;
    else if (kmh > 85) targetGear = 3;
    else if (kmh > 40) targetGear = 2;
    else targetGear = 1;

    if (targetGear !== this.currentGear) {
      this.currentGear = targetGear;
      window.soundEngine?.playGearShift();
    }

    // RPM based on speed within current gear bracket
    const gearBaseSpeed = [0, 0, 40, 85, 130, 180, 240][this.currentGear];
    const gearTopSpeed = [0, 45, 90, 135, 185, 245, 320][this.currentGear];
    const gearRatio = (kmh - gearBaseSpeed) / (gearTopSpeed - gearBaseSpeed);
    this.rpm = 900 + Math.max(0, Math.min(1, gearRatio)) * 7400;
    this.isRedline = this.rpm > 7800;
  }

  updateCamera() {
    const pPos = this.playerCar.position;
    const pRotY = this.playerCar.rotation.y;

    if (this.cameraMode === 0) {
      // Dynamic Spring Chase Cam
      const dist = 11.5 + (this.speed / this.maxSpeed) * 3.5;
      const height = 4.8;
      const camTargetPos = new THREE.Vector3(
        pPos.x - Math.sin(pRotY) * dist,
        pPos.y + height,
        pPos.z - Math.cos(pRotY) * dist
      );

      this.camLagPos.lerp(camTargetPos, 0.12);
      this.camera.position.copy(this.camLagPos);

      const lookTarget = new THREE.Vector3(
        pPos.x + Math.sin(pRotY) * 6,
        pPos.y + 1.2,
        pPos.z + Math.cos(pRotY) * 6 + 6
      );
      this.camLagLook.lerp(lookTarget, 0.15);
      this.camera.lookAt(this.camLagLook);

      // Speed FOV Punch
      this.camera.fov = 60 + (this.speed / this.maxSpeed) * 12 + (this.isNitroActive ? 8 : 0);
      this.camera.updateProjectionMatrix();

    } else if (this.cameraMode === 1) {
      // First Person Cockpit Cam (Inside cabin looking past steering wheel)
      const cockpitOffset = new THREE.Vector3(
        -0.35, // Left-hand drive
        1.05,
        0.1
      ).applyAxisAngle(new THREE.Vector3(0, 1, 0), pRotY);

      this.camera.position.copy(pPos).add(cockpitOffset);

      const lookAt = pPos.clone().add(
        new THREE.Vector3(
          Math.sin(pRotY) * 30 - 0.35,
          1.0,
          Math.cos(pRotY) * 30
        )
      );
      this.camera.lookAt(lookAt);
      this.camera.fov = 72;
      this.camera.updateProjectionMatrix();

    } else if (this.cameraMode === 2) {
      // Hood / Bumper Cam (Extreme speed sensation)
      const hoodOffset = new THREE.Vector3(0, 0.75, 1.8).applyAxisAngle(new THREE.Vector3(0, 1, 0), pRotY);
      this.camera.position.copy(pPos).add(hoodOffset);

      const lookAt = pPos.clone().add(
        new THREE.Vector3(Math.sin(pRotY) * 40, 0.6, Math.cos(pRotY) * 40)
      );
      this.camera.lookAt(lookAt);
      this.camera.fov = 78;
      this.camera.updateProjectionMatrix();

    } else if (this.cameraMode === 3) {
      // Cinematic Drone Cam
      const angle = Date.now() * 0.0008;
      this.camera.position.set(
        pPos.x + Math.sin(angle) * 16,
        pPos.y + 9,
        pPos.z + Math.cos(angle) * 16
      );
      this.camera.lookAt(pPos.x, pPos.y + 1.5, pPos.z + 4);
    }

    // Screen Shake on impact / top speed
    if (this.screenShake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.screenShake;
      this.camera.position.y += (Math.random() - 0.5) * this.screenShake;
      this.screenShake *= 0.88;
    }
  }

  checkCollectibles() {
    const list = this.cityWorld.collectibles;
    for (let i = list.length - 1; i >= 0; i--) {
      const c = list[i];
      if (this.playerCar.position.distanceTo(c.group.position) < 2.3) {
        if (c.type === 'coin') {
          this.score += c.value;
          this.showCombo(`🪙 +${c.value} TURBO COIN!`);
          window.soundEngine?.playCoinSound();
        } else if (c.type === 'nitro') {
          this.nitro = Math.min(this.maxNitro, this.nitro + c.value);
          this.showCombo(`⚡ +${c.value}% NITRO BOOST!`);
          window.soundEngine?.playCoinSound();
        }
        this.scene.remove(c.group);
        list.splice(i, 1);
      }
    }
  }

  triggerNearMiss(trafficVehicle) {
    this.nearMissCombo++;
    const bonus = 500 * this.nearMissCombo;
    this.score += bonus;
    this.nitro = Math.min(this.maxNitro, this.nitro + 18);
    this.showCombo(`🔥 NEAR MISS x${this.nearMissCombo}! +${bonus}`);
    window.soundEngine?.playNearMissSound();
  }

  triggerRearBump(trafficVehicle) {
    if (this.isGameOver) return;

    // Screen bump
    this.screenShake = Math.max(this.screenShake, 0.45);

    // Sparks at rear bumper
    const rearPos = this.playerCar.position.clone();
    rearPos.y += 0.35;
    rearPos.z -= 2.2;
    this.particles.spawnSparks(rearPos, 22);

    // Sound
    window.soundEngine?.playBumpSound();

    // Push player forward with speed impulse
    const pushSpeed = trafficVehicle ? Math.max(0.2, trafficVehicle.speed * 1.1) : 0.25;
    this.speed = Math.min(this.maxSpeed, this.speed + pushSpeed * 0.4);

    // Minor forward pitch dive/lurch
    this.pitchAngle = 0.04;

    // Non-fatal HUD feedback
    this.showCombo('⚡ REAR IMPACT DEFLECTED! +BUMP');
  }

  triggerCrash(trafficVehicle) {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.screenShake = 1.2;

    this.dom.fxOverlay?.classList.add('crash-active');
    this.particles.spawnSparks(this.playerCar.position, 40);
    window.soundEngine?.playCrashSound();

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('hyperdrive_highscore', this.highScore.toString());
    }

    // Show Game Over Modal
    setTimeout(() => {
      if (this.dom.finalScore) this.dom.finalScore.innerText = this.score.toLocaleString();
      if (this.dom.finalDist) this.dom.finalDist.innerText = `${Math.round(this.distance)} m`;
      if (this.dom.finalNearMiss) this.dom.finalNearMiss.innerText = `${this.nearMissCombo}`;
      this.dom.gameOverModal?.classList.add('active');
    }, 600);
  }

  showCombo(text) {
    if (!this.dom.comboBanner) return;
    this.dom.comboBanner.innerText = text;
    this.dom.comboBanner.style.display = 'block';
    clearTimeout(this.comboTimer);
    this.comboTimer = setTimeout(() => {
      if (this.dom.comboBanner) this.dom.comboBanner.style.display = 'none';
    }, 1800);
  }

  updateHUD() {
    const kmh = Math.round(Math.abs(this.speed) * 85);

    // Speedometer
    if (this.dom.speedDigital) this.dom.speedDigital.innerText = kmh;
    if (this.dom.score) this.dom.score.innerText = this.score.toLocaleString();
    if (this.dom.highScore) this.dom.highScore.innerText = this.highScore.toLocaleString();
    if (this.dom.distance) this.dom.distance.innerText = `${Math.round(this.distance)} m`;
    if (this.dom.gearBox) this.dom.gearBox.innerText = this.speed < -0.05 ? 'R' : this.currentGear;

    // Gauge Arc Progress (235 max offset down to 60)
    const speedRatio = Math.min(1.0, kmh / 320);
    const dashOffset = 235 - speedRatio * 175;
    if (this.dom.gaugeProgress) {
      this.dom.gaugeProgress.style.strokeDashoffset = dashOffset;
      if (this.isRedline) {
        this.dom.gaugeProgress.classList.add('redline');
      } else {
        this.dom.gaugeProgress.classList.remove('redline');
      }
    }

    // RPM Fill Bar
    if (this.dom.rpmBar) {
      const rpmPercent = Math.min(100, ((this.rpm - 800) / (8500 - 800)) * 100);
      this.dom.rpmBar.style.width = `${rpmPercent}%`;
    }

    // Nitro Fill Bar
    if (this.dom.nitroBar) {
      this.dom.nitroBar.style.width = `${this.nitro}%`;
    }

    // Render Minimap Radar
    this.renderMinimap();
  }

  renderMinimap() {
    if (!this.minimapCtx) return;
    const ctx = this.minimapCtx;
    const w = 110;
    const h = 150;

    ctx.clearRect(0, 0, w, h);

    // Highway Road Lanes
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(15, 0, w - 30, h);

    // Center divider
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();

    // Radar distance range (-20m behind to +120m ahead)
    const pZ = this.playerCar.position.z;
    const pX = this.playerCar.position.x;
    const mapY = (z) => h - 25 - ((z - pZ) / 120) * (h - 30);
    const mapX = (x) => w / 2 + (x / 12) * ((w - 30) / 2);

    // Traffic Dots
    ctx.fillStyle = '#ef4444';
    this.trafficMgr.vehicles.forEach(v => {
      const vx = mapX(v.mesh.position.x);
      const vy = mapY(v.mesh.position.z);
      if (vy >= 0 && vy <= h) {
        ctx.beginPath();
        ctx.arc(vx, vy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Collectible Dots
    ctx.fillStyle = '#ffbe0b';
    this.cityWorld.collectibles.forEach(c => {
      const cx = mapX(c.group.position.x);
      const cy = mapY(c.group.position.z);
      if (cy >= 0 && cy <= h) {
        ctx.beginPath();
        ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Player Triangle Dot
    const px = mapX(pX);
    const py = mapY(pZ);
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(px, py - 5);
    ctx.lineTo(px - 4, py + 4);
    ctx.lineTo(px + 4, py + 4);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  resetGame() {
    this.isGameOver = false;
    this.isPaused = false;
    this.speed = 0;
    this.steerAngle = 0;
    this.driftAngle = 0;
    this.score = 0;
    this.distance = 0;
    this.nitro = 100;
    this.nearMissCombo = 0;

    // Reset Player
    this.playerCar.position.set(2.5, 0, 0);
    this.playerCar.rotation.set(0, 0, 0);

    // Reset Subsystems
    this.particles.clear();
    this.cityWorld.clear();
    this.cityWorld.init(0);
    this.trafficMgr.clear();
    this.trafficMgr.init(0);
    this.pedestrians.clear();
    this.pedestrians.init(0);

    // Hide Modals
    this.dom.gameOverModal?.classList.remove('active');
    this.dom.fxOverlay?.classList.remove('crash-active');
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.1);

    if (!this.isPaused) {
      this.updatePhysics(delta);
      this.updateCamera();
      this.particles.update(delta, this.playerCar.position);
      this.cityWorld.update(this.playerCar.position.z);
      this.pedestrians.update(delta, this.playerCar.position);
      this.trafficMgr.update(
        delta,
        this.playerCar.position,
        this.speed,
        (v) => this.triggerNearMiss(v),
        (v) => this.triggerCrash(v),
        (v) => this.triggerRearBump(v)
      );
      this.updateHUD();
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Instantiate Game Engine on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.game = new GameEngine();
  window.game.init();
});
