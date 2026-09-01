/**
 * Procedural Endless City Highway Generator
 * High-rise skyscrapers with lit windows, neon billboards, streetlights with point lights,
 * overhead gantry signs, tunnels/overpasses, and rotating collectibles.
 */

class CityWorld {
  constructor(scene) {
    this.scene = scene;
    this.chunks = [];
    this.collectibles = [];
    this.chunkSize = 160;
    this.roadWidth = 24; // 4 lanes
    this.activeChunkCount = 5;

    // Shared procedural textures & materials
    this.roadTex = TextureGenerator.createRoadTexture();
    this.sidewalkTex = TextureGenerator.createSidewalkTexture();

    this.roadMat = new THREE.MeshStandardMaterial({
      map: this.roadTex,
      roughness: 0.75,
      metalness: 0.15
    });

    this.sidewalkMat = new THREE.MeshStandardMaterial({
      map: this.sidewalkTex,
      roughness: 0.85,
      metalness: 0.05
    });

    this.grassMat = new THREE.MeshStandardMaterial({
      color: 0x064e3b,
      roughness: 0.95
    });

    this.metalPoleMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.8,
      roughness: 0.2
    });

    this.gantryMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.7,
      roughness: 0.3
    });

    this.neonTitles = [
      { title: 'CYBERPUNK', sub: 'NIGHT CITY 2077', color: '#00f0ff', bg: '#050811' },
      { title: 'VELOCITY', sub: 'HYPERCAR RACING', color: '#ff0055', bg: '#100511' },
      { title: 'NEON DRIVE', sub: 'SYNTHWAVE DREAMS', color: '#ffbe0b', bg: '#0a0a14' },
      { title: 'TOKYO DRIFT', sub: 'MIDNIGHT TOUGE', color: '#10b981', bg: '#05110d' },
      { title: 'NITRO BOOST', sub: 'OVERDRIVE MODE', color: '#a855f7', bg: '#110519' }
    ];
  }

  init(startZ = 0) {
    for (let i = -1; i < this.activeChunkCount; i++) {
      this.spawnChunk(startZ + i * this.chunkSize);
    }
  }

  createBuilding(x, z, height, width = 18, depth = 22) {
    const bGroup = new THREE.Group();

    // Building mesh
    const geo = new THREE.BoxGeometry(width, height, depth);
    const mat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createBuildingTexture(Math.floor(Math.random() * 4)),
      roughness: 0.35,
      metalness: 0.2
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, height / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    bGroup.add(mesh);

    // Rooftop Antenna with Blinking Red Light
    if (height > 40) {
      const antennaGeo = new THREE.CylinderGeometry(0.1, 0.3, 10, 8);
      const antennaMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 });
      const antenna = new THREE.Mesh(antennaGeo, antennaMat);
      antenna.position.set(x, height + 5, z);
      bGroup.add(antenna);

      const redLightGeo = new THREE.SphereGeometry(0.4, 8, 8);
      const redLightMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
      const beacon = new THREE.Mesh(redLightGeo, redLightMat);
      beacon.position.set(x, height + 10, z);
      bGroup.add(beacon);
    }

    // Facade Neon Billboard
    if (Math.random() > 0.45 && height > 30) {
      const signData = this.neonTitles[Math.floor(Math.random() * this.neonTitles.length)];
      const signTex = TextureGenerator.createNeonBillboardTexture(
        signData.title, signData.sub, signData.color, signData.bg
      );
      const signMat = new THREE.MeshBasicMaterial({ map: signTex });
      const signGeo = new THREE.PlaneGeometry(16, 8);
      const signMesh = new THREE.Mesh(signGeo, signMat);

      // Place on side facing the road
      const facingRoadX = x < 0 ? (x + width / 2 + 0.1) : (x - width / 2 - 0.1);
      signMesh.position.set(facingRoadX, 18 + Math.random() * (height - 25), z);
      signMesh.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
      bGroup.add(signMesh);
    }

    return bGroup;
  }

  createStreetLight(x, z, facingLeft) {
    const lightGroup = new THREE.Group();

    // Vertical Pole
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.18, 9, 8);
    const pole = new THREE.Mesh(poleGeo, this.metalPoleMat);
    pole.position.set(x, 4.5, z);
    pole.castShadow = true;
    lightGroup.add(pole);

    // Overhang Arm extending towards road
    const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.5, 8);
    armGeo.rotateZ(facingLeft ? -Math.PI / 3 : Math.PI / 3);
    const arm = new THREE.Mesh(armGeo, this.metalPoleMat);
    arm.position.set(facingLeft ? x + 1.2 : x - 1.2, 8.5, z);
    lightGroup.add(arm);

    // Lamp fixture head
    const lampGeo = new THREE.BoxGeometry(0.4, 0.15, 0.8);
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    const headX = facingLeft ? x + 2.5 : x - 2.5;
    lamp.position.set(headX, 9.2, z);
    lightGroup.add(lamp);

    // Downward Spotlight casting on road
    const spot = new THREE.SpotLight(0xfffae0, 2.5, 35, Math.PI / 4, 0.6, 1.5);
    spot.position.set(headX, 9.0, z);
    const target = new THREE.Object3D();
    target.position.set(headX + (facingLeft ? 2 : -2), 0, z);
    lightGroup.add(spot, target);
    spot.target = target;

    return lightGroup;
  }

  createOverheadGantry(z) {
    const gantry = new THREE.Group();

    // Side pillars
    const pillarGeo = new THREE.BoxGeometry(0.8, 11, 0.8);
    const pL = new THREE.Mesh(pillarGeo, this.gantryMat);
    pL.position.set(-14.5, 5.5, z);
    const pR = pL.clone();
    pR.position.x = 14.5;
    gantry.add(pL, pR);

    // Cross beam
    const beamGeo = new THREE.BoxGeometry(30, 1.2, 1.2);
    const beam = new THREE.Mesh(beamGeo, this.gantryMat);
    beam.position.set(0, 10.5, z);
    gantry.add(beam);

    // Electronic LED Matrix Sign
    const signTex = TextureGenerator.createNeonBillboardTexture('SPEED ZONE', 'HIGHWAY 101 NORTH', '#00f0ff', '#020617');
    const signMat = new THREE.MeshBasicMaterial({ map: signTex });
    const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.5), signMat);
    signMesh.position.set(0, 10.5, z + 0.65);
    gantry.add(signMesh);

    return gantry;
  }

  createTree(x, z) {
    const tree = new THREE.Group();
    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.45, 3.5, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, 1.75, z);
    trunk.castShadow = true;
    tree.add(trunk);

    // Foliage (stacked stylized spheres)
    const folMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.7, flatShading: true });
    const c1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8, 1), folMat);
    c1.position.set(x, 4.2, z);
    c1.castShadow = true;
    const c2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4, 1), folMat);
    c2.position.set(x, 5.8, z);
    c2.castShadow = true;
    tree.add(c1, c2);

    return tree;
  }

  createCoin(x, z) {
    const coinGroup = new THREE.Group();
    const coinGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.16, 20);
    coinGeo.rotateX(Math.PI / 2);
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xffbe0b,
      metalness: 0.9,
      roughness: 0.15,
      emissive: 0xd97706,
      emissiveIntensity: 0.3
    });
    const mesh = new THREE.Mesh(coinGeo, coinMat);
    coinGroup.add(mesh);
    coinGroup.position.set(x, 1.0, z);

    // Subtle glow light
    const glow = new THREE.PointLight(0xffbe0b, 1.0, 4);
    coinGroup.add(glow);

    return { group: coinGroup, type: 'coin', value: 250 };
  }

  createNitroPickup(x, z) {
    const nitroGroup = new THREE.Group();
    // Nitro canister cylinder
    const canGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.2, 16);
    const canMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x0088cc,
      emissiveIntensity: 0.5
    });
    const can = new THREE.Mesh(canGeo, canMat);
    nitroGroup.add(can);
    nitroGroup.position.set(x, 1.0, z);

    const glow = new THREE.PointLight(0x00f0ff, 1.5, 5);
    nitroGroup.add(glow);

    return { group: nitroGroup, type: 'nitro', value: 40 };
  }

  spawnChunk(zOffset) {
    const chunk = new THREE.Group();

    // 1. Road Surface (4 lanes)
    const roadGeo = new THREE.PlaneGeometry(this.roadWidth, this.chunkSize);
    const road = new THREE.Mesh(roadGeo, this.roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, zOffset);
    road.receiveShadow = true;
    chunk.add(road);

    // 2. Concrete Sidewalks & Curbs (Left & Right)
    const swWidth = 8;
    const swGeo = new THREE.PlaneGeometry(swWidth, this.chunkSize);

    const swL = new THREE.Mesh(swGeo, this.sidewalkMat);
    swL.rotation.x = -Math.PI / 2;
    swL.position.set(-this.roadWidth / 2 - swWidth / 2, 0.12, zOffset);
    swL.receiveShadow = true;

    const swR = new THREE.Mesh(swGeo, this.sidewalkMat);
    swR.rotation.x = -Math.PI / 2;
    swR.position.set(this.roadWidth / 2 + swWidth / 2, 0.12, zOffset);
    swR.receiveShadow = true;

    chunk.add(swL, swR);

    // 3. Ground / Grass Base beyond sidewalks
    const groundGeo = new THREE.PlaneGeometry(160, this.chunkSize);
    const ground = new THREE.Mesh(groundGeo, this.grassMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.05, zOffset);
    ground.receiveShadow = true;
    chunk.add(ground);

    // 4. Streetlights along sidewalks
    for (let z = -this.chunkSize / 2 + 20; z < this.chunkSize / 2; z += 40) {
      chunk.add(this.createStreetLight(-this.roadWidth / 2 - 1.2, zOffset + z, true));
      chunk.add(this.createStreetLight(this.roadWidth / 2 + 1.2, zOffset + z, false));

      // Trees
      chunk.add(this.createTree(-this.roadWidth / 2 - 5, zOffset + z + 18));
      chunk.add(this.createTree(this.roadWidth / 2 + 5, zOffset + z + 18));
    }

    // 5. Skyscrapers & Buildings
    const bSpacing = 32;
    for (let z = -this.chunkSize / 2 + 16; z < this.chunkSize / 2; z += bSpacing) {
      const heightL = 30 + Math.random() * 80;
      const heightR = 30 + Math.random() * 80;
      chunk.add(this.createBuilding(-28 - Math.random() * 8, zOffset + z, heightL, 20 + Math.random() * 6, 26));
      chunk.add(this.createBuilding(28 + Math.random() * 8, zOffset + z, heightR, 20 + Math.random() * 6, 26));
    }

    // 6. Occasional Overhead Gantry Sign
    if (Math.random() > 0.5) {
      chunk.add(this.createOverheadGantry(zOffset));
    }

    // 7. Collectibles (Coins & Nitro)
    for (let k = 0; k < 3; k++) {
      const laneX = [-7.5, -2.5, 2.5, 7.5][Math.floor(Math.random() * 4)];
      const coinZ = zOffset + (Math.random() - 0.5) * (this.chunkSize - 30);
      const isNitro = Math.random() > 0.75;
      const item = isNitro ? this.createNitroPickup(laneX, coinZ) : this.createCoin(laneX, coinZ);

      this.scene.add(item.group);
      this.collectibles.push(item);
    }

    this.scene.add(chunk);
    this.chunks.push({ group: chunk, z: zOffset });
  }

  update(playerZ) {
    // Spawn new chunk when player approaches end
    const lastChunk = this.chunks[this.chunks.length - 1];
    if (playerZ + this.chunkSize * 2.5 > lastChunk.z) {
      this.spawnChunk(lastChunk.z + this.chunkSize);
    }

    // Remove old chunks far behind player
    if (this.chunks.length > this.activeChunkCount + 2) {
      const firstChunk = this.chunks[0];
      if (playerZ - firstChunk.z > this.chunkSize * 2) {
        this.scene.remove(firstChunk.group);
        this.chunks.shift();
      }
    }

    // Animate rotating collectibles
    this.collectibles.forEach(c => {
      c.group.rotation.y += 0.04;
      c.group.position.y = 1.0 + Math.sin(Date.now() * 0.004 + c.group.position.z) * 0.15;
    });
  }

  clear() {
    this.chunks.forEach(c => this.scene.remove(c.group));
    this.collectibles.forEach(c => this.scene.remove(c.group));
    this.chunks = [];
    this.collectibles = [];
  }
}
