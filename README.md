# 🏎️ HYPERDRIVE 3D • Ultra-Realistic Web Driving Simulator

An immersive browser-based 3D driving simulator built with **Three.js** and **WebGL**, featuring ultra-realistic physics, multiple supercars, dynamic weather systems, and stunning visual effects.

![JavaScript](https://img.shields.io/badge/JavaScript-81%25-yellow)
![CSS](https://img.shields.io/badge/CSS-10.5%25-blue)
![HTML](https://img.shields.io/badge/HTML-8.5%25-orange)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Features

### 🚗 **Multiple Supercars**
- **Bugatti Chiron 2017** - Premium 3D Blender model with quad-turbo W16 engine
- **Venom GT** - Widebody muscle car with extreme acceleration
- **Cyber Rayfield** - Futuristic cyberpunk-inspired vehicle with neon underglow
- **Centenario Spider** - Exotic Italian supercar with precision handling

### 🎮 **Dynamic Gameplay**
- **Realistic Physics Engine** - Acceleration, braking, drifting, and collision detection
- **Multiple Camera Views** - Dynamic chase cam, cockpit view, and more
- **Nitro Boost System** - Speed boost with visual effects and energy management
- **Scoring System** - Track score, distance traveled, and near-miss combos
- **High Score Tracking** - Persistent best performance records

### 🌦️ **Environmental Effects**
- **Weather System** - Rain effects with dynamic visual feedback
- **Sunset Lighting** - Golden hour atmospheric rendering
- **Minimap Radar** - Real-time navigation display
- **Dynamic Particle Effects** - Smoke, sparks, and collision visuals

### 🎨 **Customization**
- **6 Custom Paint Finishes** - Cyber Cyan, Crimson Red, Emerald Green, Solar Gold, Midnight Purple, Stealth Black
- **5 Neon Underglow Colors** - Electric Cyan, Neon Magenta, Toxic Green, Amber Gold, Deep Blue
- **Vehicle Garage Modal** - Customize and preview before driving

### 📱 **Multi-Platform Support**
- **Desktop Controls** - Keyboard shortcuts (WASD, Arrow Keys, Space, Shift)
- **Mobile/Touch Controls** - On-screen buttons for steering, acceleration, braking, drifting, and nitro
- **Responsive Design** - Optimized for all screen sizes

### 🎵 **Audio**
- **Sound Toggle** - Enable/disable game audio
- **Engine Sounds** - Realistic vehicle audio feedback
- **Ambient Audio** - Immersive environmental soundscapes

### 🎯 **HUD (Heads-Up Display)**
- **Real-time Metrics**
  - Speed Display (KM/H)
  - RPM Gauge
  - Current Gear
  - Nitro Energy Bar
  - Score & High Score
  - Distance Traveled
  - Near Miss Counter

---

## 🕹️ Controls

### **Desktop**
| Key | Action |
|-----|--------|
| `W` / `↑` | Accelerate |
| `S` / `↓` | Brake / Reverse |
| `A` / `D` | Steer Left / Right |
| `Space` | Drift / E-Brake |
| `Shift` | Nitro Boost |
| `C` | Toggle Camera View |
| `T` | Change Weather |
| `G` | Open Garage |
| `M` | Toggle Sound |

### **Mobile**
- **Left Cluster** - Steering (Left/Right arrows)
- **Right Cluster** - Gas, Brake, Drift, Nitro buttons
- **Garage & Settings** - Accessible via UI buttons

---

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- Modern browser with WebGL support

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/Prateek-0310/GridShift.git
   cd GridShift
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   # or
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:8080
   ```

---

## 📁 Project Structure

```
GridShift/
├── index.html              # Main HTML entry point with HUD & modals
├── server.js              # Node.js HTTP server with MIME type handling
├── package.json           # Project dependencies & scripts
├── vercel.json            # Vercel deployment configuration
│
├── css/
│   └── style.css         # Responsive HUD styles, glass-morphism UI
│
├── js/
│   ├── game.js           # Main game loop & event handling
│   ├── car.js            # Vehicle physics & model loading
│   ├── city.js           # City environment & terrain
│   ├── traffic.js        # AI traffic & pedestrian behaviors
│   ├── weather.js        # Weather system & effects
│   ├── particles.js      # Particle effects (smoke, sparks, collision)
│   ├── audio.js          # Sound effects & engine audio
│   └── textures.js       # Texture & material management
│
├── assets/               # 3D models, textures, and audio files
└── scripts/
    └── prepare_bugatti.js # Model preprocessing script
```

---

## 🚀 Deployment

### Deploy to Vercel

The project is configured for **Vercel deployment**:

```bash
npm install -g vercel
vercel
```

The `vercel.json` file handles all routing and server configuration automatically.

---

## 🎓 Technologies Used

### **Frontend**
- **Three.js** - 3D graphics rendering engine
- **WebGL** - GPU-accelerated graphics
- **HTML5 Canvas** - For minimap rendering
- **Vanilla JavaScript** - Core game logic

### **Backend**
- **Node.js** - Server runtime
- **HTTP Module** - Lightweight server

### **3D Assets**
- **GLTF Loader** - Load modern 3D models
- **OBJ/MTL Loaders** - Load legacy 3D formats
- **Blender** - 3D modeling & asset preparation

---

## 🎮 Gameplay Tips

1. **Master Drifting** - Press Space to activate handbrake/drift for tight corners
2. **Use Nitro Wisely** - Save your boost for straightaways to maximize speed
3. **Near Miss Combos** - Drive close to traffic for bonus score multipliers
4. **Camera Awareness** - Switch cameras (C) to get better spatial awareness
5. **Weather Strategy** - Rain reduces traction; adjust driving style accordingly
6. **Customize Your Ride** - Visit the Garage (G) to personalize your supercar

---

## 🎨 Customization Guide

### Add New Car Models
1. Prepare a GLTF or OBJ model in Blender
2. Run: `npm run prepare-model`
3. Add model selector card in the Garage modal
4. Update `car.js` with new model loading logic

### Modify Vehicle Colors
Edit the color palette in the Garage modal section:
```javascript
// css/style.css or js/game.js
const carColors = {
  cyan: 0x00f0ff,
  red: 0xff0055,
  // Add new colors here
};
```

### Adjust Physics
Modify vehicle parameters in `js/car.js`:
```javascript
const vehicleConfig = {
  maxSpeed: 300,
  acceleration: 0.5,
  maxSteerAngle: 0.5,
  driftFactor: 1.2
};
```

---

## 📊 Performance Optimization

- **LOD System** - Lower model detail at distance
- **Culling** - Off-screen objects disabled
- **Efficient Physics** - Optimized collision detection
- **Texture Compression** - Reduced asset sizes
- **Lazy Loading** - Models & textures loaded on-demand

---

## 🐛 Known Limitations

- Requires modern browser with WebGL 2.0 support
- Best performance on desktop devices
- Mobile performance may vary based on device capability
- Some weather effects disabled on lower-end hardware

---

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs via [GitHub Issues](https://github.com/Prateek-0310/GridShift/issues)
- Submit feature requests
- Create pull requests with improvements

---

## 📝 License

This project is licensed under the **MIT License** - see the LICENSE file for details.

---

## 👤 Author

**Prateek Raj**
- GitHub: [@Prateek-0310](https://github.com/Prateek-0310)

---

## 🎬 Demo & Screenshots

To see HYPERDRIVE 3D in action:
1. Clone and run the project locally
2. Open `http://localhost:8080` in your browser
3. Select a supercar from the garage
4. Customize colors and underglow
5. Hit the road and start driving!

---

## 📚 Additional Resources

- [Three.js Documentation](https://threejs.org/docs/)
- [WebGL Best Practices](https://www.khronos.org/webgl/)
- [Blender 3D Modeling](https://www.blender.org/)

---

## ⭐ Support

If you enjoy HYPERDRIVE 3D, please consider:
- ⭐ Starring this repository
- 🐛 Reporting bugs or suggesting features
- 📢 Sharing the project with others
- 💡 Contributing improvements

---

**Happy Driving! 🚀**
