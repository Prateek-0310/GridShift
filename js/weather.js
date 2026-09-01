/**
 * Dynamic Weather & Time-of-Day Environment System
 * Smoothly transitions sky colors, directional sun/moon lighting,
 * atmospheric fog, and road wetness / reflections.
 */

class WeatherManager {
  constructor(scene, dirLight, hemiLight, particleSystem, cityWorld) {
    this.scene = scene;
    this.dirLight = dirLight;
    this.hemiLight = hemiLight;
    this.particles = particleSystem;
    this.city = cityWorld;
    this.currentPreset = 'cyber';

    this.presets = {
      sunset: {
        name: 'Sunset Golden Hour',
        skyColor: 0x9333ea,
        fogColor: 0xf97316,
        fogDensity: 0.007,
        dirLightColor: 0xffaa44,
        dirLightIntensity: 1.8,
        dirLightPos: [60, 40, 30],
        hemiSky: 0xfdba74,
        hemiGround: 0x431407,
        hemiIntensity: 0.8,
        roadRoughness: 0.7,
        isRaining: false
      },
      rain: {
        name: 'Rainy Midnight',
        skyColor: 0x030712,
        fogColor: 0x090e1a,
        fogDensity: 0.012,
        dirLightColor: 0x60a5fa,
        dirLightIntensity: 0.4,
        dirLightPos: [20, 60, -20],
        hemiSky: 0x1e293b,
        hemiGround: 0x020617,
        hemiIntensity: 0.5,
        roadRoughness: 0.18, // Wet road reflection!
        isRaining: true
      },
      day: {
        name: 'Clear Noon',
        skyColor: 0x38bdf8,
        fogColor: 0xbae6fd,
        fogDensity: 0.005,
        dirLightColor: 0xfffaed,
        dirLightIntensity: 2.2,
        dirLightPos: [50, 90, 40],
        hemiSky: 0xffffff,
        hemiGround: 0x475569,
        hemiIntensity: 1.0,
        roadRoughness: 0.75,
        isRaining: false
      },
      cyber: {
        name: 'Cyber Neon Night',
        skyColor: 0x050811,
        fogColor: 0x0b0f1d,
        fogDensity: 0.009,
        dirLightColor: 0x38bdf8,
        dirLightIntensity: 0.6,
        dirLightPos: [40, 60, 20],
        hemiSky: 0x6366f1,
        hemiGround: 0x090514,
        hemiIntensity: 0.6,
        roadRoughness: 0.6,
        isRaining: false
      }
    };
  }

  applyPreset(presetKey) {
    if (!this.presets[presetKey]) return;
    this.currentPreset = presetKey;
    const p = this.presets[presetKey];

    // Background & Fog
    this.scene.background = new THREE.Color(p.skyColor);
    this.scene.fog = new THREE.FogExp2(p.fogColor, p.fogDensity);

    // Directional Sun/Moon Light
    this.dirLight.color.setHex(p.dirLightColor);
    this.dirLight.intensity = p.dirLightIntensity;
    this.dirLight.position.set(p.dirLightPos[0], p.dirLightPos[1], p.dirLightPos[2]);

    // Hemisphere Ambient Light
    this.hemiLight.color.setHex(p.hemiSky);
    this.hemiLight.groundColor.setHex(p.hemiGround);
    this.hemiLight.intensity = p.hemiIntensity;

    // Road Material Wetness (Lower roughness creates glossy specular reflections)
    if (this.city && this.city.roadMat) {
      this.city.roadMat.roughness = p.roadRoughness;
      this.city.roadMat.metalness = p.isRaining ? 0.45 : 0.15;
      this.city.roadMat.needsUpdate = true;
    }

    // Rain Particles
    if (this.particles) {
      this.particles.setRain(p.isRaining);
    }
  }

  cycleWeather() {
    const keys = Object.keys(this.presets);
    const nextIdx = (keys.indexOf(this.currentPreset) + 1) % keys.length;
    this.applyPreset(keys[nextIdx]);
    return this.presets[keys[nextIdx]].name;
  }
}
