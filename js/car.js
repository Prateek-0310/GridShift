/**
 * Hyperdrive 3D - Supercar Generator & 3D Model Integrator
 * Features:
 * 1. Bugatti Chiron 2017 (3D Blender Model with dynamic PBR shaders & independent wheel physics)
 * 2. Venom GT (Widebody Muscle Supercar)
 * 3. Cyberpunk Rayfield (Futuristic Cyber Roadster)
 * 4. Centenario Spider (Exotic Italian Supercar)
 */

const CarBuilder = {
  modelCache: {
    bugatti: null,
    loading: false,
    callbacks: []
  },

  /**
   * Preload 3D Model (GLB or OBJ/MTL)
   */
  preload: function(onLoaded) {
    if (this.modelCache.bugatti) {
      if (onLoaded) onLoaded(this.modelCache.bugatti);
      return;
    }

    if (onLoaded) this.modelCache.callbacks.push(onLoaded);
    if (this.modelCache.loading) return;
    this.modelCache.loading = true;

    // 1. Attempt GLTF/GLB loader first (ultra-fast binary loading)
    if (typeof THREE.GLTFLoader !== 'undefined') {
      const gltfLoader = new THREE.GLTFLoader();
      const glbUrls = ['assets/bugatti.glb', 'src/assets/bugatti.glb'];

      const tryLoadGLB = (index) => {
        if (index >= glbUrls.length) {
          this.loadOBJModel();
          return;
        }

        gltfLoader.load(
          glbUrls[index],
          (gltf) => {
            console.log('🏎️ Bugatti Chiron 3D GLB Model Loaded successfully!');
            this.modelCache.bugatti = gltf.scene;
            this.modelCache.loading = false;
            const cbs = [...this.modelCache.callbacks];
            this.modelCache.callbacks = [];
            cbs.forEach(cb => cb(this.modelCache.bugatti));
          },
          undefined,
          (err) => {
            console.warn(`GLB load failed for ${glbUrls[index]}, trying next...`, err);
            tryLoadGLB(index + 1);
          }
        );
      };

      tryLoadGLB(0);
    } else {
      this.loadOBJModel();
    }
  },

  /**
   * Fallback OBJ/MTL Loader for raw blender export
   */
  loadOBJModel: function() {
    if (typeof THREE.OBJLoader === 'undefined') {
      console.warn('Three.js OBJLoader not found, using procedural hypercar.');
      this.modelCache.loading = false;
      return;
    }

    const objPath = 'src/assets/Bugatti Chiron 2017/bugatti/bugatti.obj';
    const mtlPath = 'src/assets/Bugatti Chiron 2017/bugatti/bugatti.mtl';

    const loadDirectOBJ = () => {
      const objLoader = new THREE.OBJLoader();
      objLoader.load(
        objPath,
        (obj) => {
          this.processRawOBJ(obj);
        },
        undefined,
        (err) => {
          console.warn('OBJ load error:', err);
          this.modelCache.loading = false;
        }
      );
    };

    if (typeof THREE.MTLLoader !== 'undefined') {
      const mtlLoader = new THREE.MTLLoader();
      mtlLoader.load(
        mtlPath,
        (materials) => {
          materials.preload();
          const objLoader = new THREE.OBJLoader();
          objLoader.setMaterials(materials);
          objLoader.load(
            objPath,
            (obj) => this.processRawOBJ(obj),
            undefined,
            () => loadDirectOBJ()
          );
        },
        undefined,
        () => loadDirectOBJ()
      );
    } else {
      loadDirectOBJ();
    }
  },

  /**
   * Process and align raw OBJ model
   */
  processRawOBJ: function(obj) {
    const removePatterns = ['alights', 'sun', 'Plane.047', 'Plane.036', 'Plane.024', 'Cylinder.027', 'Cube.038', 'Icosphere'];
    const toRemove = [];

    obj.traverse(child => {
      if (removePatterns.some(p => child.name && child.name.includes(p))) {
        toRemove.push(child);
      }
      if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        if (mats.some(m => m.name && (m.name.includes('Studio_Lights') || m.name.includes('sun') || m.name.includes('back_drop')))) {
          toRemove.push(child);
        }
      }
    });
    toRemove.forEach(c => {
      if (c.parent) c.parent.remove(c);
    });

    const carCenter = new THREE.Vector3(-0.1665, 0.939, -1.2815);
    const yaw = 0.159007; // ~9.11 deg
    const scale = 0.3296;
    const groundShiftY = (0.939 - (-0.10)) * scale;

    const carGroup = new THREE.Group();
    carGroup.name = 'BugattiChiron';

    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'Body';
    carGroup.add(bodyGroup);

    obj.traverse(child => {
      if (child.isMesh && child.geometry) {
        child.geometry.translate(-carCenter.x, -carCenter.y, -carCenter.z);
        child.geometry.rotateY(-yaw);
        child.geometry.scale(scale, scale, scale);
        child.geometry.translate(0, groundShiftY, 0);

        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    bodyGroup.add(obj);
    this.modelCache.bugatti = carGroup;
    this.modelCache.loading = false;
    const cbs = [...this.modelCache.callbacks];
    this.modelCache.callbacks = [];
    cbs.forEach(cb => cb(this.modelCache.bugatti));
  },

  /**
   * Main entry point to create a car instance
   */
  createCar: function(config = {}) {
    const {
      bodyColor = 0x00f0ff,
      type = 'hypercar',
      isPlayer = false,
      underglowColor = 0x00f0ff
    } = config;

    // Start background preloading if not yet initiated
    if (!this.modelCache.bugatti && !this.modelCache.loading) {
      this.preload();
    }

    // Root vehicle group that stays constant
    const carGroup = new THREE.Group();
    carGroup.name = isPlayer ? `PlayerCar_${type}` : `TrafficCar_${type}`;

    // Child container for vehicle body geometry & wheels
    const modelContainer = new THREE.Group();
    modelContainer.name = 'ModelContainer';
    carGroup.add(modelContainer);

    // Initial vehicle data object
    const carData = {
      group: carGroup,
      modelContainer: modelContainer,
      type: type,
      wheels: [],
      frontPivots: [],
      steeringWheel: null,
      exhaustTips: [],
      bodyMaterial: null,
      underglowMesh: null,
      underglowLight: null,
      brakeGlow: null,
      tailLights: [],
      headlights: { leftSpot: null, rightSpot: null },
      is3DModel: false
    };

    // Lights setup
    this.setupVehicleLights(carData, config);

    // Populate modelContainer with appropriate geometry
    if (type === 'hypercar' && this.modelCache.bugatti) {
      this.populateBugattiModel(carData, config);
    } else {
      this.populateProceduralModel(carData, config);

      // If hypercar was requested and 3D model is still downloading, upgrade once ready
      if (type === 'hypercar' && !this.modelCache.bugatti) {
        this.preload(() => {
          if (!carData.group.parent) return; // Car was removed
          this.populateBugattiModel(carData, config);
        });
      }
    }

    return carData;
  },

  /**
   * Setup headlights, underglow, and brake lighting
   */
  setupVehicleLights: function(carData, config) {
    const { isPlayer = false, underglowColor = 0x00f0ff } = config;
    const carGroup = carData.group;

    // Spotlights for player car
    let leftSpot = null;
    let rightSpot = null;
    if (isPlayer) {
      leftSpot = new THREE.SpotLight(0xffffff, 3.8, 80, Math.PI / 6, 0.35, 1.2);
      leftSpot.position.set(-0.72, 0.58, 2.15);
      const leftTarget = new THREE.Object3D();
      leftTarget.position.set(-0.72, 0, 45);
      carGroup.add(leftSpot, leftTarget);
      leftSpot.target = leftTarget;

      rightSpot = new THREE.SpotLight(0xffffff, 3.8, 80, Math.PI / 6, 0.35, 1.2);
      rightSpot.position.set(0.72, 0.58, 2.15);
      const rightTarget = new THREE.Object3D();
      rightTarget.position.set(0.72, 0, 45);
      carGroup.add(rightSpot, rightTarget);
      rightSpot.target = rightTarget;
    }
    carData.headlights = { leftSpot, rightSpot };

    // Brake Glow Light
    const brakeGlowLight = new THREE.PointLight(0xff0022, 0.9, 8);
    brakeGlowLight.position.set(0, 0.62, -2.5);
    carGroup.add(brakeGlowLight);
    carData.brakeGlow = brakeGlowLight;

    // Neon Underglow
    const underglowGeo = new THREE.PlaneGeometry(1.6, 3.6);
    const underglowMat = new THREE.MeshBasicMaterial({
      color: underglowColor,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    const underglow = new THREE.Mesh(underglowGeo, underglowMat);
    underglow.rotation.x = -Math.PI / 2;
    underglow.position.set(0, 0.06, 0);
    carGroup.add(underglow);
    carData.underglowMesh = underglow;

    const underglowLight = new THREE.PointLight(underglowColor, 1.3, 5.5);
    underglowLight.position.set(0, 0.2, 0);
    carGroup.add(underglowLight);
    carData.underglowLight = underglowLight;
  },

  /**
   * Populate modelContainer with the 3D Bugatti Chiron mesh
   */
  populateBugattiModel: function(carData, config = {}) {
    const { bodyColor = 0x00f0ff, isPlayer = false } = config;
    const container = carData.modelContainer;

    // Clear previous placeholder geometry
    while (container.children.length > 0) {
      container.remove(container.children[0]);
    }

    carData.wheels = [];
    carData.frontPivots = [];
    carData.tailLights = [];
    carData.exhaustTips = [];

    // Clone Bugatti hierarchy
    const model = this.modelCache.bugatti.clone(true);
    container.add(model);

    // Dynamic Body Paint Material
    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      metalness: 0.90,
      roughness: 0.15,
      envMapIntensity: 1.8
    });
    carData.bodyMaterial = bodyMat;

    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.5,
      roughness: 0.5,
      map: (typeof TextureGenerator !== 'undefined') ? TextureGenerator.createCarbonFiberTexture() : null
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.98,
      roughness: 0.03
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x050b14,
      metalness: 0.1,
      roughness: 0.04,
      transmission: 0.85,
      transparent: true,
      opacity: 0.85
    });

    const tailLightMat = new THREE.MeshStandardMaterial({
      color: 0xff0022,
      emissive: new THREE.Color(0xff0022),
      emissiveIntensity: 0.9,
      roughness: 0.2
    });

    // Find and configure body meshes & wheels
    model.traverse(child => {
      if (child.name.includes('_Pivot')) {
        if (child.name.includes('FL') || child.name.includes('FR')) {
          carData.frontPivots.push(child);
        }
      }

      if (child.name.includes('_Spin')) {
        carData.wheels.push(child);
      }

      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        const matName = child.material ? (Array.isArray(child.material) ? child.material[0]?.name : child.material.name) : '';

        if (matName.includes('BLUE') || matName.includes('NAVY') || child.name.includes('Plane.028')) {
          child.material = bodyMat;
        } else if (matName.includes('glass') || matName.includes('window')) {
          child.material = glassMat;
        } else if (matName.includes('silver') || matName.includes('Trim') || matName.includes('aluminiumm')) {
          child.material = chromeMat;
        } else if (matName.includes('red') || matName.includes('breaks') || child.name.includes('Plane.014')) {
          child.material = tailLightMat;
          carData.tailLights.push(child);
        }
      }
    });

    // Fallback wheels if hierarchy was flat
    if (carData.wheels.length === 0) {
      const wheelPositions = [
        { x: -0.90, y: 0.35, z: 1.35, isFront: true },
        { x: 0.90,  y: 0.35, z: 1.35, isFront: true },
        { x: -0.82, y: 0.35, z: -1.35, isFront: false },
        { x: 0.82,  y: 0.35, z: -1.35, isFront: false }
      ];

      const rimMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.9, roughness: 0.15 });
      const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });

      wheelPositions.forEach(pos => {
        const wGroup = new THREE.Group();
        const tireGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.30, 20);
        tireGeo.rotateZ(Math.PI / 2);
        const tire = new THREE.Mesh(tireGeo, tireMat);
        tire.castShadow = true;
        wGroup.add(tire);

        const rimGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.32, 16);
        rimGeo.rotateZ(Math.PI / 2);
        const rim = new THREE.Mesh(rimGeo, rimMat);
        wGroup.add(rim);

        if (pos.isFront) {
          const pivot = new THREE.Group();
          pivot.position.set(pos.x, pos.y, pos.z);
          pivot.add(wGroup);
          container.add(pivot);
          carData.frontPivots.push(pivot);
        } else {
          wGroup.position.set(pos.x, pos.y, pos.z);
          container.add(wGroup);
        }
        carData.wheels.push(wGroup);
      });
    }

    // Interior Cabin Steering Wheel
    const interiorGroup = new THREE.Group();
    interiorGroup.position.set(0, 0.65, 0);

    const steerGroup = new THREE.Group();
    steerGroup.position.set(-0.35, 0.25, 0.30);
    const wheelRingGeo = new THREE.TorusGeometry(0.16, 0.025, 8, 20);
    const steerRing = new THREE.Mesh(wheelRingGeo, carbonMat);
    steerGroup.add(steerRing);
    steerGroup.rotation.x = 0.35;
    interiorGroup.add(steerGroup);
    container.add(interiorGroup);
    carData.steeringWheel = steerGroup;

    // Quad Exhaust Tips for Nitro fire flames
    const exhaustGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.25, 10);
    exhaustGeo.rotateX(Math.PI / 2);
    const exhaustPositions = [-0.22, -0.07, 0.07, 0.22];
    exhaustPositions.forEach(x => {
      const ex = new THREE.Mesh(exhaustGeo, chromeMat);
      ex.position.set(x, 0.32, -2.32);
      container.add(ex);
      carData.exhaustTips.push(ex);
    });

    // Taillight bar
    const tlGeo = new THREE.BoxGeometry(1.5, 0.08, 0.08);
    const tlMesh = new THREE.Mesh(tlGeo, tailLightMat);
    tlMesh.position.set(0, 0.62, -2.25);
    container.add(tlMesh);
    carData.tailLights.push(tlMesh);

    carData.is3DModel = true;
    console.log('✨ Mounted Bugatti Chiron 3D model into vehicle container!');
  },

  /**
   * Populate modelContainer with procedural meshes
   */
  populateProceduralModel: function(carData, config = {}) {
    const { bodyColor = 0x00f0ff, type = 'hypercar' } = config;
    const container = carData.modelContainer;

    while (container.children.length > 0) {
      container.remove(container.children[0]);
    }

    carData.wheels = [];
    carData.frontPivots = [];
    carData.tailLights = [];
    carData.exhaustTips = [];

    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      metalness: 0.88,
      roughness: 0.16,
      envMapIntensity: 1.6
    });
    carData.bodyMaterial = bodyMat;

    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.45,
      roughness: 0.55,
      map: (typeof TextureGenerator !== 'undefined') ? TextureGenerator.createCarbonFiberTexture() : null
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x050b14,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.8,
      transparent: true,
      opacity: 0.88
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.96,
      roughness: 0.04
    });

    // Lower Chassis
    const chassisWidth = type === 'muscle' ? 2.25 : 2.1;
    const chassisGeo = new THREE.BoxGeometry(chassisWidth, 0.45, 4.4);
    const chassis = new THREE.Mesh(chassisGeo, bodyMat);
    chassis.position.y = 0.42;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    container.add(chassis);

    let exhaustPositions = [-0.55, -0.38, 0.38, 0.55];
    let exhaustY = 0.28;

    if (type === 'hypercar') {
      const hoodGeo = new THREE.BoxGeometry(1.95, 0.28, 1.85);
      const hood = new THREE.Mesh(hoodGeo, bodyMat);
      hood.position.set(0, 0.62, 1.1);
      hood.rotation.x = 0.09;
      hood.castShadow = true;
      container.add(hood);

      const splitterGeo = new THREE.BoxGeometry(2.18, 0.06, 0.75);
      const splitter = new THREE.Mesh(splitterGeo, carbonMat);
      splitter.position.set(0, 0.18, 2.22);
      container.add(splitter);

      const cabinGeo = new THREE.BoxGeometry(1.6, 0.6, 2.1);
      const cabin = new THREE.Mesh(cabinGeo, glassMat);
      cabin.position.set(0, 0.95, -0.2);
      container.add(cabin);

      const wingGeo = new THREE.BoxGeometry(2.35, 0.06, 0.5);
      const wing = new THREE.Mesh(wingGeo, carbonMat);
      wing.position.set(0, 1.35, -2.15);
      wing.castShadow = true;

      const uprightGeo = new THREE.BoxGeometry(0.06, 0.5, 0.3);
      const uL = new THREE.Mesh(uprightGeo, carbonMat);
      uL.position.set(-0.75, 1.1, -2.1);
      const uR = uL.clone();
      uR.position.x = 0.75;
      container.add(wing, uL, uR);

      const diffGeo = new THREE.BoxGeometry(2.1, 0.22, 0.6);
      const diffuser = new THREE.Mesh(diffGeo, carbonMat);
      diffuser.position.set(0, 0.22, -2.15);
      diffuser.rotation.x = -0.15;
      container.add(diffuser);

      exhaustPositions = [-0.22, -0.07, 0.07, 0.22];
      exhaustY = 0.32;

    } else if (type === 'muscle') {
      const hoodGeo = new THREE.BoxGeometry(2.1, 0.35, 1.9);
      const hood = new THREE.Mesh(hoodGeo, bodyMat);
      hood.position.set(0, 0.66, 1.05);
      hood.rotation.x = 0.05;
      container.add(hood);

      const blowerGeo = new THREE.BoxGeometry(0.6, 0.22, 0.65);
      const blower = new THREE.Mesh(blowerGeo, chromeMat);
      blower.position.set(0, 0.88, 1.1);
      container.add(blower);

      const cabinGeo = new THREE.BoxGeometry(1.72, 0.62, 2.3);
      const cabin = new THREE.Mesh(cabinGeo, glassMat);
      cabin.position.set(0, 0.96, -0.2);
      container.add(cabin);

      const ducktailGeo = new THREE.BoxGeometry(2.1, 0.2, 0.35);
      ducktailGeo.rotateX(0.4);
      const ducktail = new THREE.Mesh(ducktailGeo, carbonMat);
      ducktail.position.set(0, 0.85, -2.18);
      container.add(ducktail);

      exhaustPositions = [-0.65, -0.45, 0.45, 0.65];

    } else if (type === 'cyber') {
      const hoodGeo = new THREE.BoxGeometry(2.0, 0.22, 2.0);
      const hood = new THREE.Mesh(hoodGeo, bodyMat);
      hood.position.set(0, 0.58, 1.15);
      hood.rotation.x = 0.12;
      container.add(hood);

      const canopyGeo = new THREE.CylinderGeometry(0.75, 0.85, 2.1, 16);
      canopyGeo.rotateX(Math.PI / 2);
      const canopy = new THREE.Mesh(canopyGeo, glassMat);
      canopy.position.set(0, 0.95, -0.2);
      container.add(canopy);

      const cyberStripGeo = new THREE.BoxGeometry(1.9, 0.08, 0.08);
      const cyberFront = new THREE.Mesh(cyberStripGeo, new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
      cyberFront.position.set(0, 0.52, 2.22);
      container.add(cyberFront);

      const cyberRear = new THREE.Mesh(cyberStripGeo, new THREE.MeshBasicMaterial({ color: 0xff0055 }));
      cyberRear.position.set(0, 0.65, -2.22);
      container.add(cyberRear);

      exhaustPositions = [-0.25, 0.25];
      exhaustY = 0.35;

    } else if (type === 'exotic') {
      const hoodGeo = new THREE.BoxGeometry(1.95, 0.25, 1.9);
      const hood = new THREE.Mesh(hoodGeo, bodyMat);
      hood.position.set(0, 0.6, 1.1);
      hood.rotation.x = 0.1;
      container.add(hood);

      const stripeGeo = new THREE.BoxGeometry(0.2, 0.02, 4.3);
      const stripe = new THREE.Mesh(stripeGeo, new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 }));
      stripe.position.set(0, 0.74, 0);
      container.add(stripe);

      const cabinGeo = new THREE.BoxGeometry(1.58, 0.52, 1.8);
      const cabin = new THREE.Mesh(cabinGeo, glassMat);
      cabin.position.set(0, 0.9, -0.2);
      container.add(cabin);

      exhaustPositions = [-0.18, 0.18];
      exhaustY = 0.62;
    }

    // Exhausts
    const exhaustGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.3, 12);
    exhaustGeo.rotateX(Math.PI / 2);
    exhaustPositions.forEach(x => {
      const ex = new THREE.Mesh(exhaustGeo, chromeMat);
      ex.position.set(x, exhaustY, -2.35);
      container.add(ex);
      carData.exhaustTips.push(ex);
    });

    // Interior & Steering Wheel
    const interiorGroup = new THREE.Group();
    interiorGroup.position.set(0, 0.65, 0);
    const steerGroup = new THREE.Group();
    steerGroup.position.set(-0.35, 0.24, 0.32);
    const wheelRingGeo = new THREE.TorusGeometry(0.16, 0.025, 8, 20);
    const wheelCenterGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.04, 8);
    wheelCenterGeo.rotateX(Math.PI / 2);
    steerGroup.add(new THREE.Mesh(wheelRingGeo, carbonMat), new THREE.Mesh(wheelCenterGeo, chromeMat));
    steerGroup.rotation.x = 0.35;
    interiorGroup.add(steerGroup);
    container.add(interiorGroup);
    carData.steeringWheel = steerGroup;

    // Taillights
    const tailLightGeo = new THREE.BoxGeometry(0.75, 0.1, 0.08);
    const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const tlL = new THREE.Mesh(tailLightGeo, tailLightMat);
    tlL.position.set(-0.6, 0.6, -2.22);
    const tlR = tlL.clone();
    tlR.position.x = 0.6;
    container.add(tlL, tlR);
    carData.tailLights.push(tlL, tlR);

    // Wheels
    const wheelPositions = [
      { x: -1.08, y: 0.38, z: 1.35, isFront: true },
      { x: 1.08,  y: 0.38, z: 1.35, isFront: true },
      { x: -1.08, y: 0.40, z: -1.35, isFront: false },
      { x: 1.08,  y: 0.40, z: -1.35, isFront: false }
    ];

    const wheelRimMat = new THREE.MeshStandardMaterial({
      color: type === 'cyber' ? 0x00f0ff : (type === 'muscle' ? 0x18181b : 0x475569),
      metalness: 0.9,
      roughness: 0.15
    });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });

    wheelPositions.forEach((pos) => {
      const wheelGroup = new THREE.Group();
      const radius = pos.isFront ? 0.38 : 0.40;

      const tireGeo = new THREE.CylinderGeometry(radius, radius, 0.32, 20);
      tireGeo.rotateZ(Math.PI / 2);
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.castShadow = true;
      wheelGroup.add(tire);

      const rimGeo = new THREE.CylinderGeometry(radius * 0.72, radius * 0.72, 0.34, 16);
      rimGeo.rotateZ(Math.PI / 2);
      wheelGroup.add(new THREE.Mesh(rimGeo, wheelRimMat));

      if (pos.isFront) {
        const pivot = new THREE.Group();
        pivot.position.set(pos.x, pos.y, pos.z);
        pivot.add(wheelGroup);
        container.add(pivot);
        carData.frontPivots.push(pivot);
      } else {
        wheelGroup.position.set(pos.x, pos.y, pos.z);
        container.add(wheelGroup);
      }
      carData.wheels.push(wheelGroup);
    });

    carData.is3DModel = false;
  }
};
