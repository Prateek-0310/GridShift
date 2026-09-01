/**
 * Procedural 3D Articulated Walking Pedestrians
 * Natural walking cycle (swinging arms & legs, hip bounce),
 * diverse urban attire, sidewalk & crosswalk pathing, and reactive panic evade AI.
 */

class PedestrianManager {
  constructor(scene) {
    this.scene = scene;
    this.pedestrians = [];
    this.maxPedestrians = 28;

    // Palette of clothing & skin tones
    this.shirtColors = [
      0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899,
      0x00f0ff, 0xf8fafc, 0x1e293b, 0xfacc15, 0x6366f1
    ];
    this.pantsColors = [0x1e293b, 0x334155, 0x475569, 0x0f172a, 0x1e1b4b];
    this.skinColors = [0xffdbac, 0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524];
  }

  createPedestrianModel() {
    const root = new THREE.Group();

    // Random colors
    const skinMat = new THREE.MeshStandardMaterial({
      color: this.skinColors[Math.floor(Math.random() * this.skinColors.length)],
      roughness: 0.8
    });
    const shirtMat = new THREE.MeshStandardMaterial({
      color: this.shirtColors[Math.floor(Math.random() * this.shirtColors.length)],
      roughness: 0.7
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: this.pantsColors[Math.floor(Math.random() * this.pantsColors.length)],
      roughness: 0.8
    });
    const shoeMat = new THREE.MeshStandardMaterial({
      color: Math.random() > 0.5 ? 0xffffff : 0x111827,
      roughness: 0.6
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: [0x1e1e1e, 0x451a03, 0x78350f, 0xd97706, 0x000000][Math.floor(Math.random() * 5)],
      roughness: 0.9
    });

    // 1. Torso / Shirt
    const torsoGeo = new THREE.BoxGeometry(0.5, 0.65, 0.28);
    const torso = new THREE.Mesh(torsoGeo, shirtMat);
    torso.position.y = 1.15;
    torso.castShadow = true;
    root.add(torso);

    // 2. Head & Hair
    const headGeo = new THREE.SphereGeometry(0.18, 12, 12);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.set(0, 1.62, 0);
    head.castShadow = true;
    root.add(head);

    // Hair / Cap
    const hairGeo = new THREE.SphereGeometry(0.19, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 1.64, 0);
    root.add(hair);

    // 3. Arms (Pivot at Shoulders y = 1.4)
    const armGeo = new THREE.BoxGeometry(0.13, 0.55, 0.13);
    armGeo.translate(0, -0.24, 0); // Center at top pivot

    // Left Arm Pivot
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.32, 1.42, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, shirtMat);
    leftArmMesh.castShadow = true;
    leftArmPivot.add(leftArmMesh);

    // Hand
    const handGeo = new THREE.SphereGeometry(0.07, 8, 8);
    const leftHand = new THREE.Mesh(handGeo, skinMat);
    leftHand.position.set(0, -0.52, 0);
    leftArmPivot.add(leftHand);
    root.add(leftArmPivot);

    // Right Arm Pivot
    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.32, 1.42, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, shirtMat);
    rightArmMesh.castShadow = true;
    rightArmPivot.add(rightArmMesh);

    const rightHand = new THREE.Mesh(handGeo, skinMat);
    rightHand.position.set(0, -0.52, 0);
    rightArmPivot.add(rightHand);
    root.add(rightArmPivot);

    // 4. Legs (Pivot at Hips y = 0.85)
    const legGeo = new THREE.BoxGeometry(0.16, 0.78, 0.16);
    legGeo.translate(0, -0.38, 0); // Center at top hip joint

    const shoeGeo = new THREE.BoxGeometry(0.17, 0.12, 0.28);

    // Left Leg Pivot
    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.16, 0.85, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, pantsMat);
    leftLegMesh.castShadow = true;
    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(0, -0.78, 0.05);
    leftShoe.castShadow = true;
    leftLegPivot.add(leftLegMesh, leftShoe);
    root.add(leftLegPivot);

    // Right Leg Pivot
    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.16, 0.85, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, pantsMat);
    rightLegMesh.castShadow = true;
    const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rightShoe.position.set(0, -0.78, 0.05);
    rightShoe.castShadow = true;
    rightLegPivot.add(rightLegMesh, rightShoe);
    root.add(rightLegPivot);

    return {
      group: root,
      leftArm: leftArmPivot,
      rightArm: rightArmPivot,
      leftLeg: leftLegPivot,
      rightLeg: rightLegPivot
    };
  }

  spawnPedestrian(zPos) {
    const modelData = this.createPedestrianModel();
    const isLeft = Math.random() > 0.5;
    const sidewalkX = isLeft ? (-14.0 - Math.random() * 2.5) : (14.0 + Math.random() * 2.5);

    // Direction: 1 = forward (+Z), -1 = backward (-Z)
    const dir = Math.random() > 0.5 ? 1 : -1;

    modelData.group.position.set(sidewalkX, 0.15, zPos);
    modelData.group.rotation.y = dir === 1 ? 0 : Math.PI;

    this.scene.add(modelData.group);

    return {
      model: modelData,
      x: sidewalkX,
      baseX: sidewalkX,
      z: zPos,
      dir: dir,
      walkSpeed: 1.6 + Math.random() * 0.9,
      walkPhase: Math.random() * Math.PI * 2,
      isEvading: false,
      evadeTimer: 0
    };
  }

  init(playerZ) {
    for (let i = 0; i < this.maxPedestrians; i++) {
      const z = playerZ - 20 + i * 16 + (Math.random() - 0.5) * 8;
      this.pedestrians.push(this.spawnPedestrian(z));
    }
  }

  update(delta, playerPos) {
    for (let i = 0; i < this.pedestrians.length; i++) {
      const p = this.pedestrians[i];

      // 1. Distance to Player Car
      const distToPlayer = p.model.group.position.distanceTo(playerPos);

      // 2. Reactive Panic Evade Logic
      if (distToPlayer < 4.2 && !p.isEvading) {
        p.isEvading = true;
        p.evadeTimer = 1.8;
        // Leap outwards away from road
        const evadeDir = p.x < 0 ? -1 : 1;
        p.x += evadeDir * 2.5;
      }

      if (p.isEvading) {
        p.evadeTimer -= delta;
        if (p.evadeTimer <= 0) {
          p.isEvading = false;
          p.x = p.baseX;
        }
      }

      // 3. Move along Sidewalk
      const currentSpeed = p.isEvading ? (p.walkSpeed * 2.5) : p.walkSpeed;
      p.z += p.dir * currentSpeed * delta;
      p.walkPhase += currentSpeed * delta * 5.0;

      // Update Group Position
      p.model.group.position.z = p.z;
      p.model.group.position.x = THREE.MathUtils.lerp(p.model.group.position.x, p.x, 0.15);

      // Natural Hip Vertical Bounce
      p.model.group.position.y = 0.15 + Math.abs(Math.sin(p.walkPhase * 2)) * 0.05;

      // 4. Articulated Walk Animation (Swinging Limbs)
      if (p.isEvading) {
        // Panic Hands-Up Pose
        p.model.leftArm.rotation.x = -2.2;
        p.model.rightArm.rotation.x = -2.2;
        p.model.leftLeg.rotation.x = Math.sin(p.walkPhase) * 0.9;
        p.model.rightLeg.rotation.x = -Math.sin(p.walkPhase) * 0.9;
      } else {
        // Natural Walk Cycle
        const swing = Math.sin(p.walkPhase);
        p.model.leftLeg.rotation.x = swing * 0.65;
        p.model.rightLeg.rotation.x = -swing * 0.65;
        p.model.leftArm.rotation.x = -swing * 0.55;
        p.model.rightArm.rotation.x = swing * 0.55;
      }

      // 5. Recycle Pedestrians when far behind or far ahead
      if (p.z < playerPos.z - 50) {
        p.z = playerPos.z + 160 + Math.random() * 40;
        p.dir = Math.random() > 0.5 ? 1 : -1;
        p.model.group.rotation.y = p.dir === 1 ? 0 : Math.PI;
        p.isEvading = false;
      } else if (p.z > playerPos.z + 240) {
        p.z = playerPos.z - 30;
      }
    }
  }

  clear() {
    this.pedestrians.forEach(p => this.scene.remove(p.model.group));
    this.pedestrians = [];
  }
}
