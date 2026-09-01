/**
 * Realistic Particle Systems: Tire Smoke, Skid Marks, Exhaust Boost Flames,
 * Rain Streaks, and Crash Sparks.
 */

class ParticleSystem {
  constructor(scene) {
    this.scene = scene;

    // 1. Drift Smoke Particles
    this.smokePool = [];
    this.maxSmoke = 120;
    this.initSmoke();

    // 2. Nitro Exhaust Boost Flames
    this.flamePool = [];
    this.maxFlames = 80;
    this.initFlames();

    // 3. Crash Sparks
    this.sparkPool = [];
    this.maxSparks = 100;
    this.initSparks();

    // 4. Rain Particles
    this.rainCount = 2000;
    this.rainMesh = null;
    this.isRaining = false;
    this.initRain();

    // 5. Skid Marks Buffer
    this.skidSegments = [];
    this.maxSkids = 200;
    this.skidMaterial = new THREE.MeshBasicMaterial({
      color: 0x111111,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });
  }

  initSmoke() {
    const geo = new THREE.DodecahedronGeometry(0.35, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0,
      roughness: 1.0,
      flatShading: true
    });

    for (let i = 0; i < this.maxSmoke; i++) {
      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.visible = false;
      this.scene.add(mesh);
      this.smokePool.push({
        mesh: mesh,
        active: false,
        life: 0,
        maxLife: 1.0,
        velocity: new THREE.Vector3(),
        rotSpeed: new THREE.Vector3()
      });
    }
  }

  initFlames() {
    const geo = new THREE.ConeGeometry(0.18, 0.7, 8);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    for (let i = 0; i < this.maxFlames; i++) {
      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.visible = false;
      this.scene.add(mesh);
      this.flamePool.push({
        mesh: mesh,
        active: false,
        life: 0,
        maxLife: 0.25,
        velocity: new THREE.Vector3(),
        scaleStart: 1.0
      });
    }
  }

  initSparks() {
    const geo = new THREE.SphereGeometry(0.08, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffbe0b,
      blending: THREE.AdditiveBlending
    });

    for (let i = 0; i < this.maxSparks; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.sparkPool.push({
        mesh: mesh,
        active: false,
        life: 0,
        maxLife: 0.6,
        velocity: new THREE.Vector3()
      });
    }
  }

  initRain() {
    const rainGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.rainCount * 6); // 2 vertices per drop

    for (let i = 0; i < this.rainCount; i++) {
      const x = (Math.random() - 0.5) * 120;
      const y = Math.random() * 50;
      const z = (Math.random() - 0.5) * 120;

      positions[i * 6] = x;
      positions[i * 6 + 1] = y;
      positions[i * 6 + 2] = z;

      positions[i * 6 + 3] = x;
      positions[i * 6 + 4] = y - 1.2;
      positions[i * 6 + 5] = z;
    }

    rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const rainMat = new THREE.LineBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.6
    });

    this.rainMesh = new THREE.LineSegments(rainGeo, rainMat);
    this.rainMesh.visible = false;
    this.scene.add(this.rainMesh);
  }

  spawnSmoke(pos, baseVelocity) {
    const p = this.smokePool.find(item => !item.active);
    if (!p) return;

    p.active = true;
    p.life = 0;
    p.maxLife = 0.5 + Math.random() * 0.4;
    p.mesh.visible = true;
    p.mesh.position.copy(pos);
    p.mesh.position.y += 0.15;
    p.mesh.scale.set(0.4, 0.4, 0.4);
    p.mesh.material.opacity = 0.6;

    p.velocity.set(
      (Math.random() - 0.5) * 0.08 + (baseVelocity ? baseVelocity.x * 0.1 : 0),
      0.03 + Math.random() * 0.04,
      (Math.random() - 0.5) * 0.08 + (baseVelocity ? baseVelocity.z * 0.1 : 0)
    );
    p.rotSpeed.set(
      (Math.random() - 0.5) * 0.1,
      (Math.random() - 0.5) * 0.1,
      (Math.random() - 0.5) * 0.1
    );
  }

  spawnNitroFlame(tipPos, carDir, isBoost) {
    const p = this.flamePool.find(item => !item.active);
    if (!p) return;

    p.active = true;
    p.life = 0;
    p.maxLife = 0.18 + Math.random() * 0.1;
    p.mesh.visible = true;
    p.mesh.position.copy(tipPos);

    // Color gradient between Electric Cyan and Neon Purple
    p.mesh.material.color.setHex(isBoost ? (Math.random() > 0.4 ? 0x00f0ff : 0xbd00ff) : 0xff5500);

    const speed = 0.6 + Math.random() * 0.3;
    p.velocity.set(
      -Math.sin(carDir) * speed + (Math.random() - 0.5) * 0.08,
      (Math.random() - 0.5) * 0.04,
      -Math.cos(carDir) * speed + (Math.random() - 0.5) * 0.08
    );

    p.scaleStart = isBoost ? 1.4 : 0.8;
    p.mesh.scale.set(p.scaleStart, p.scaleStart, p.scaleStart * 1.5);
  }

  spawnSparks(pos, count = 15) {
    let spawned = 0;
    for (let p of this.sparkPool) {
      if (!p.active) {
        p.active = true;
        p.life = 0;
        p.maxLife = 0.3 + Math.random() * 0.3;
        p.mesh.visible = true;
        p.mesh.position.copy(pos);
        p.velocity.set(
          (Math.random() - 0.5) * 0.5,
          Math.random() * 0.4 + 0.1,
          (Math.random() - 0.5) * 0.5
        );
        spawned++;
        if (spawned >= count) break;
      }
    }
  }

  addSkidMark(startPos, endPos) {
    if (startPos.distanceTo(endPos) < 0.1) return;

    // Create a 2D quad strip along tire contact
    const width = 0.32;
    const dir = new THREE.Vector3().subVectors(endPos, startPos).normalize();
    const normal = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(width * 0.5);

    const geom = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      startPos.x - normal.x, 0.02, startPos.z - normal.z,
      startPos.x + normal.x, 0.02, startPos.z + normal.z,
      endPos.x - normal.x,   0.02, endPos.z - normal.z,

      endPos.x - normal.x,   0.02, endPos.z - normal.z,
      startPos.x + normal.x, 0.02, startPos.z + normal.z,
      endPos.x + normal.x,   0.02, endPos.z + normal.z
    ]);

    geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    const mesh = new THREE.Mesh(geom, this.skidMaterial);
    this.scene.add(mesh);
    this.skidSegments.push(mesh);

    if (this.skidSegments.length > this.maxSkids) {
      const old = this.skidSegments.shift();
      this.scene.remove(old);
      old.geometry.dispose();
    }
  }

  setRain(active) {
    this.isRaining = active;
    if (this.rainMesh) {
      this.rainMesh.visible = active;
    }
  }

  update(delta, playerPos) {
    // 1. Update Smoke
    this.smokePool.forEach(p => {
      if (p.active) {
        p.life += delta;
        const progress = p.life / p.maxLife;
        if (progress >= 1.0) {
          p.active = false;
          p.mesh.visible = false;
        } else {
          p.mesh.position.add(p.velocity);
          p.mesh.rotation.x += p.rotSpeed.x;
          p.mesh.rotation.y += p.rotSpeed.y;
          p.mesh.rotation.z += p.rotSpeed.z;
          const scale = 0.4 + progress * 1.6;
          p.mesh.scale.set(scale, scale, scale);
          p.mesh.material.opacity = (1.0 - progress) * 0.6;
        }
      }
    });

    // 2. Update Nitro Flames
    this.flamePool.forEach(p => {
      if (p.active) {
        p.life += delta;
        const progress = p.life / p.maxLife;
        if (progress >= 1.0) {
          p.active = false;
          p.mesh.visible = false;
        } else {
          p.mesh.position.add(p.velocity);
          const s = p.scaleStart * (1.0 - progress * 0.8);
          p.mesh.scale.set(s, s, s * 1.2);
          p.mesh.material.opacity = (1.0 - progress) * 0.9;
        }
      }
    });

    // 3. Update Sparks
    this.sparkPool.forEach(p => {
      if (p.active) {
        p.life += delta;
        const progress = p.life / p.maxLife;
        if (progress >= 1.0) {
          p.active = false;
          p.mesh.visible = false;
        } else {
          p.velocity.y -= 0.015; // gravity
          p.mesh.position.add(p.velocity);
          if (p.mesh.position.y < 0.05) {
            p.mesh.position.y = 0.05;
            p.velocity.y = -p.velocity.y * 0.4;
          }
        }
      }
    });

    // 4. Update Rain
    if (this.isRaining && this.rainMesh && playerPos) {
      const posAttr = this.rainMesh.geometry.attributes.position;
      const arr = posAttr.array;
      const speedY = 48 * delta;

      for (let i = 0; i < this.rainCount; i++) {
        arr[i * 6 + 1] -= speedY;
        arr[i * 6 + 4] -= speedY;

        // Wrap around player box
        if (arr[i * 6 + 1] < 0) {
          const rx = playerPos.x + (Math.random() - 0.5) * 100;
          const rz = playerPos.z + (Math.random() - 0.5) * 100;
          const ry = 40 + Math.random() * 15;

          arr[i * 6] = rx;
          arr[i * 6 + 1] = ry;
          arr[i * 6 + 2] = rz;

          arr[i * 6 + 3] = rx;
          arr[i * 6 + 4] = ry - 1.2;
          arr[i * 6 + 5] = rz;
        }
      }
      posAttr.needsUpdate = true;
    }
  }

  clear() {
    this.smokePool.forEach(p => { p.active = false; p.mesh.visible = false; });
    this.flamePool.forEach(p => { p.active = false; p.mesh.visible = false; });
    this.sparkPool.forEach(p => { p.active = false; p.mesh.visible = false; });
    this.skidSegments.forEach(s => { this.scene.remove(s); s.geometry.dispose(); });
    this.skidSegments = [];
  }
}
