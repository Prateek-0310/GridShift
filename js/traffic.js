/**
 * Multilane Traffic AI Simulation
 * Distinct traffic lanes, variable vehicle models/colors, brake lights,
 * lane changes, near-miss scoring, and precise collision detection.
 */

class TrafficManager {
  constructor(scene) {
    this.scene = scene;
    this.vehicles = [];
    this.maxTraffic = 14;
    this.lanes = [-7.5, -2.5, 2.5, 7.5];

    this.carColors = [
      0x3b82f6, 0xef4444, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899, 0xffffff, 0x1e293b
    ];
    this.startGraceTimer = 5.0;
  }

  createTrafficVehicle(laneX, zPos) {
    const color = this.carColors[Math.floor(Math.random() * this.carColors.length)];
    const types = ['hypercar', 'muscle', 'cyber', 'exotic'];
    const type = types[Math.floor(Math.random() * types.length)];
    const carData = CarBuilder.createCar({
      bodyColor: color,
      type: type,
      isPlayer: false,
      underglowColor: color
    });

    carData.group.position.set(laneX, 0, zPos);
    this.scene.add(carData.group);

    // AI Properties
    const laneIndex = this.lanes.indexOf(laneX);
    // Inner lanes go faster
    const baseSpeed = laneIndex === 1 || laneIndex === 2 ? (0.45 + Math.random() * 0.25) : (0.35 + Math.random() * 0.2);

    return {
      data: carData,
      mesh: carData.group,
      laneX: laneX,
      targetLaneX: laneX,
      speed: baseSpeed,
      baseSpeed: baseSpeed,
      isBraking: false,
      laneChangeTimer: 5 + Math.random() * 10,
      nearMissLogged: false
    };
  }

  init(playerZ) {
    this.startGraceTimer = 5.0;
    for (let i = 0; i < this.maxTraffic; i++) {
      const lane = this.lanes[i % this.lanes.length];
      // Give extra clearance in the player's starting lane (x = 2.5) so runway is completely open
      const laneOffset = (lane === 2.5) ? 50 : 0;
      const z = playerZ + 80 + laneOffset + i * 20 + (Math.random() - 0.5) * 8;
      this.vehicles.push(this.createTrafficVehicle(lane, z));
    }
  }

  update(delta, playerPos, playerSpeed, onNearMiss, onCollision, onRearHit) {
    if (this.startGraceTimer > 0) {
      this.startGraceTimer -= delta;
    }

    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];

      // 1. Move vehicle forward along highway
      v.mesh.position.z += v.speed * 60 * delta;

      // 2. Smooth lane changing
      if (Math.abs(v.mesh.position.x - v.targetLaneX) > 0.05) {
        v.mesh.position.x += (v.targetLaneX - v.mesh.position.x) * 0.04;
        v.mesh.rotation.y = (v.targetLaneX - v.mesh.position.x) * 0.15;
      } else {
        v.mesh.position.x = v.targetLaneX;
        v.mesh.rotation.y = 0;
      }

      // 3. AI Lane Decision Timer
      v.laneChangeTimer -= delta;
      if (v.laneChangeTimer <= 0) {
        v.laneChangeTimer = 8 + Math.random() * 12;
        // 30% chance to switch adjacent lane
        if (Math.random() > 0.65) {
          const currentIdx = this.lanes.indexOf(v.targetLaneX);
          const dir = Math.random() > 0.5 ? 1 : -1;
          const nextIdx = currentIdx + dir;
          if (nextIdx >= 0 && nextIdx < this.lanes.length) {
            v.targetLaneX = this.lanes[nextIdx];
          }
        }
      }

      // 4. Animate wheels
      v.data.wheels.forEach(w => {
        w.rotation.x += v.speed * 0.6;
      });

      // 5. Check distance to vehicle ahead (Braking logic)
      let vehicleAhead = false;
      for (let j = 0; j < this.vehicles.length; j++) {
        if (i === j) continue;
        const other = this.vehicles[j];
        if (Math.abs(other.mesh.position.x - v.mesh.position.x) < 2.0) {
          const distZ = other.mesh.position.z - v.mesh.position.z;
          if (distZ > 0 && distZ < 25) {
            vehicleAhead = true;
            break;
          }
        }
      }

      // Traffic also brakes if player is directly ahead or during start phase
      if (Math.abs(playerPos.x - v.mesh.position.x) < 2.2) {
        const playerDistZ = playerPos.z - v.mesh.position.z;
        if (playerDistZ > 0 && (playerDistZ < 30 || (this.startGraceTimer > 0 && playerDistZ < 60))) {
          vehicleAhead = true;
        }
      }

      if (vehicleAhead) {
        // Slow down & light up red brake lights
        v.speed = Math.max(0.1, v.speed - 0.015);
        v.data.brakeGlow.intensity = 2.5;
        v.data.tailLights.forEach(tl => tl.material.color.setHex(0xff0022));
      } else {
        // Accelerate back to cruise speed
        if (v.speed < v.baseSpeed) v.speed += 0.005;
        v.data.brakeGlow.intensity = 0.8;
      }

      // 6. Player Collision & Near-Miss Detection (Protected during start grace period)
      if (this.startGraceTimer <= 0) {
        const dx = Math.abs(playerPos.x - v.mesh.position.x);
        const relativeZ = v.mesh.position.z - playerPos.z;
        const dz = Math.abs(relativeZ);

        // Collision box (Car width ~2.1m, length ~4.4m)
        if (dx < 1.95 && dz < 4.0) {
          if (relativeZ >= 0) {
            // Player's car hit someone in front -> END GAME
            if (onCollision) onCollision(v);
          } else {
            // Traffic car hit player from behind -> DO NOT END GAME
            // Push traffic car back & apply emergency braking to prevent clipping
            v.mesh.position.z = playerPos.z - 4.1;
            v.speed = Math.max(0.05, v.speed * 0.3);
            v.data.brakeGlow.intensity = 3.0;
            v.data.tailLights.forEach(tl => tl.material.color.setHex(0xff0022));
            if (onRearHit) onRearHit(v);
          }
        } else if (dx < 3.2 && dz < 4.8 && !v.nearMissLogged && playerSpeed > 0.6) {
          v.nearMissLogged = true;
          if (onNearMiss) onNearMiss(v);
        }
      }

      // 7. Respawn if far behind or ahead (Always recycle safely ahead of player)
      if (v.mesh.position.z < playerPos.z - 60) {
        // Recycle ahead of player
        v.mesh.position.z = playerPos.z + 180 + Math.random() * 100;
        v.targetLaneX = this.lanes[Math.floor(Math.random() * this.lanes.length)];
        v.mesh.position.x = v.targetLaneX;
        v.speed = v.baseSpeed;
        v.nearMissLogged = false;
      } else if (v.mesh.position.z > playerPos.z + 380) {
        v.mesh.position.z = playerPos.z + 140 + Math.random() * 80;
        v.targetLaneX = this.lanes[Math.floor(Math.random() * this.lanes.length)];
        v.mesh.position.x = v.targetLaneX;
        v.speed = v.baseSpeed;
        v.nearMissLogged = false;
      }
    }
  }

  clear() {
    this.vehicles.forEach(v => this.scene.remove(v.mesh));
    this.vehicles = [];
  }
}
