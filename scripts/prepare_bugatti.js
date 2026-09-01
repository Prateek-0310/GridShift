import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

class FileReaderPolyfill {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(buf => {
      this.result = buf;
      if (this.onload) this.onload({ target: this });
      if (this.onloadend) this.onloadend({ target: this });
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then(buf => {
      this.result = 'data:application/octet-stream;base64,' + Buffer.from(buf).toString('base64');
      if (this.onload) this.onload({ target: this });
      if (this.onloadend) this.onloadend({ target: this });
    });
  }
}
globalThis.FileReader = FileReaderPolyfill;

async function prepareBugatti() {
  console.log('🏎️ Processing Bugatti Chiron 2017 3D Model...');

  const mtlPath = 'src/assets/Bugatti Chiron 2017/bugatti/bugatti.mtl';
  const objPath = 'src/assets/Bugatti Chiron 2017/bugatti/bugatti.obj';

  if (!fs.existsSync(mtlPath) || !fs.existsSync(objPath)) {
    console.error('Model files not found in src/assets/Bugatti Chiron 2017/bugatti/');
    return;
  }

  const mtlContent = fs.readFileSync(mtlPath, 'utf8');
  const objContent = fs.readFileSync(objPath, 'utf8');

  const mtlLoader = new MTLLoader();
  const materials = mtlLoader.parse(mtlContent);
  materials.preload();

  const objLoader = new OBJLoader();
  objLoader.setMaterials(materials);
  const root = objLoader.parse(objContent);

  // 1. Remove non-car entities (studio lights, background cyc wall, sun planes)
  const removePatterns = ['alights', 'sun', 'Plane.047', 'Plane.036', 'Plane.024', 'Cylinder.027', 'Cube.038', 'Icosphere'];
  const toRemove = [];
  root.traverse(child => {
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

  // 2. Identify and separate wheel meshes from body
  let flMesh = null, frMesh = null, rearMesh = null;
  const bodyMeshes = [];

  root.children.forEach(child => {
    if (child.name === 'Cube.046_Cube.063') {
      flMesh = child;
    } else if (child.name === 'Cube.048_Cube.080') {
      frMesh = child;
    } else if (child.name === 'Cube.039') {
      rearMesh = child;
    } else {
      bodyMeshes.push(child);
    }
  });

  // Calculate original wheel centers
  const flCenter = new THREE.Vector3(-2.202, 0.932, 3.237);
  const frCenter = new THREE.Vector3(3.166, 0.912, 2.288);
  const rlCenter = new THREE.Vector3(-3.166, 0.950, -4.851);
  const rrCenter = new THREE.Vector3(1.536, 0.962, -5.800);

  const frontCenter = flCenter.clone().add(frCenter).multiplyScalar(0.5);
  const rearCenter = rlCenter.clone().add(rrCenter).multiplyScalar(0.5);
  const carCenter = frontCenter.clone().add(rearCenter).multiplyScalar(0.5);

  const dir = frontCenter.clone().sub(rearCenter);
  const yaw = Math.atan2(dir.x, dir.z); // Alignment angle to +Z axis
  const scale = 2.70 / dir.length(); // Standardize wheelbase to 2.7 units
  const bottomY = -0.10;
  const groundShiftY = -(bottomY - carCenter.y) * scale;

  function transformVector(vec) {
    const v = vec.clone().sub(carCenter);
    v.applyAxisAngle(new THREE.Vector3(0, 1, 0), -yaw);
    v.multiplyScalar(scale);
    v.y += groundShiftY;
    return v;
  }

  function transformGeometry(geom) {
    geom.translate(-carCenter.x, -carCenter.y, -carCenter.z);
    geom.rotateY(-yaw);
    geom.scale(scale, scale, scale);
    geom.translate(0, groundShiftY, 0);
  }

  // Create unified Car Group
  const carGroup = new THREE.Group();
  carGroup.name = 'BugattiChiron';

  const bodyGroup = new THREE.Group();
  bodyGroup.name = 'Body';
  carGroup.add(bodyGroup);

  // Transform all body geometries
  bodyMeshes.forEach(m => {
    if (m.geometry) {
      transformGeometry(m.geometry);
      bodyGroup.add(m);
    }
  });

  // Split rear wheels
  let rlMesh = null, rrMesh = null;
  if (rearMesh && rearMesh.geometry) {
    const fullGeom = rearMesh.geometry;
    const pos = fullGeom.attributes.position;
    const norm = fullGeom.attributes.normal;
    const uv = fullGeom.attributes.uv;

    const leftVerts = [], leftNorms = [], leftUVs = [];
    const rightVerts = [], rightNorms = [];

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      if (x < -0.8) {
        leftVerts.push(x, y, z);
        if (norm) leftNorms.push(norm.getX(i), norm.getY(i), norm.getZ(i));
      } else {
        rightVerts.push(x, y, z);
        if (norm) rightNorms.push(norm.getX(i), norm.getY(i), norm.getZ(i));
      }
    }

    const rlGeom = new THREE.BufferGeometry();
    rlGeom.setAttribute('position', new THREE.Float32BufferAttribute(leftVerts, 3));
    if (leftNorms.length) rlGeom.setAttribute('normal', new THREE.Float32BufferAttribute(leftNorms, 3));

    const rrGeom = new THREE.BufferGeometry();
    rrGeom.setAttribute('position', new THREE.Float32BufferAttribute(rightVerts, 3));
    if (rightNorms.length) rrGeom.setAttribute('normal', new THREE.Float32BufferAttribute(rightNorms, 3));

    rlMesh = new THREE.Mesh(rlGeom, rearMesh.material);
    rlMesh.name = 'Wheel_RL';
    rrMesh = new THREE.Mesh(rrGeom, rearMesh.material);
    rrMesh.name = 'Wheel_RR';
  }

  // Create Wheels with Local Pivots
  const wheelsConfig = [
    { name: 'Wheel_FL', mesh: flMesh, origCenter: flCenter, isFront: true },
    { name: 'Wheel_FR', mesh: frMesh, origCenter: frCenter, isFront: true },
    { name: 'Wheel_RL', mesh: rlMesh, origCenter: rlCenter, isFront: false },
    { name: 'Wheel_RR', mesh: rrMesh, origCenter: rrCenter, isFront: false }
  ];

  const wheelsGroup = new THREE.Group();
  wheelsGroup.name = 'Wheels';
  carGroup.add(wheelsGroup);

  wheelsConfig.forEach(w => {
    if (!w.mesh) return;
    const geom = w.mesh.geometry;
    transformGeometry(geom);

    // Calculate transformed center for local pivot
    const transCenter = transformVector(w.origCenter);

    // Center geometry around its local pivot
    geom.translate(-transCenter.x, -transCenter.y, -transCenter.z);

    const pivot = new THREE.Group();
    pivot.name = `${w.name}_Pivot`;
    pivot.position.copy(transCenter);

    const wheelSpinGroup = new THREE.Group();
    wheelSpinGroup.name = `${w.name}_Spin`;
    wheelSpinGroup.add(w.mesh);

    pivot.add(wheelSpinGroup);
    wheelsGroup.add(pivot);
  });

  // Convert & Upgrade Materials for PBR Realism
  carGroup.traverse(child => {
    if (child.isMesh && child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      const newMats = mats.map(m => {
        const name = m.name || '';
        const isMainBody = name.includes('BLUE.002');
        const isSecondaryBody = name.includes('NAVY');
        const isGlass = name.includes('glass') || name.includes('window');
        const isRedLight = name.includes('red') || name.includes('breaks');
        const isChrome = name.includes('silver') || name.includes('Trim') || name.includes('aluminiumm');
        const isTire = name.includes('tyre');
        const isBrakeDisk = name.includes('brake_disk');
        const isCaliper = name.includes('cALLIPERS');
        const isGrill = name.includes('GRILL');

        let color = 0x00f0ff; // Default cyan body
        if (isMainBody) color = 0x00f0ff;
        else if (isSecondaryBody) color = 0x071529;
        else if (isChrome) color = 0xd1d5db;
        else if (isTire) color = 0x18181b;
        else if (isBrakeDisk) color = 0x64748b;
        else if (isCaliper) color = 0x00f0ff;
        else if (isGrill) color = 0x09090b;
        else if (isRedLight) color = 0xef4444;
        else if (m.color) color = m.color.getHex();

        const mat = new THREE.MeshStandardMaterial({
          name: name,
          color: color,
          metalness: (isChrome || isBrakeDisk) ? 0.95 : (isMainBody || isSecondaryBody ? 0.88 : (isTire ? 0.08 : 0.4)),
          roughness: isChrome ? 0.08 : (isMainBody || isSecondaryBody ? 0.16 : (isTire ? 0.85 : (isGlass ? 0.05 : 0.45))),
          transparent: isGlass || (m.opacity < 1),
          opacity: isGlass ? 0.65 : 1.0,
          envMapIntensity: 1.5
        });

        if (isRedLight) {
          mat.emissive = new THREE.Color(0xff0022);
          mat.emissiveIntensity = 0.8;
        }

        return mat;
      });
      child.material = Array.isArray(child.material) ? newMats : newMats[0];
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  // Optimize geometries with vertex deduplication
  carGroup.traverse(child => {
    if (child.isMesh && child.geometry) {
      try {
        const indexed = BufferGeometryUtils.mergeVertices(child.geometry, 0.0005);
        indexed.computeVertexNormals();
        child.geometry = indexed;
      } catch (e) {}
    }
  });

  // Export to assets/bugatti.glb & src/assets/bugatti.glb
  console.log('📦 Exporting clean GLB model...');
  const exporter = new GLTFExporter();
  const glbPromise = new Promise((resolve, reject) => {
    exporter.parse(carGroup, resolve, reject, { binary: true });
  });

  const glb = await glbPromise;
  const buf = Buffer.from(glb);
  fs.mkdirSync('assets', { recursive: true });
  fs.writeFileSync('assets/bugatti.glb', buf);
  fs.mkdirSync('src/assets', { recursive: true });
  fs.writeFileSync('src/assets/bugatti.glb', buf);
  console.log(`✅ Success! Created assets/bugatti.glb (${(buf.length / 1024 / 1024).toFixed(2)} MB)`);
}

prepareBugatti().catch(console.error);
