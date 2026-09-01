/**
 * Procedural PBR-grade Canvas Textures Generator
 * Generates high-res asphalt, pavement, skyscrapers, neon signs, and carbon fiber.
 */

const TextureGenerator = {
  // 1. Realistic Asphalt with Lanes and Road Studs
  createRoadTexture: function() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Base dark tarmac
    ctx.fillStyle = '#181b22';
    ctx.fillRect(0, 0, 1024, 1024);

    // Fine asphalt grain noise
    const imgData = ctx.getImageData(0, 0, 1024, 1024);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 22;
      data[i] = Math.max(10, Math.min(45, data[i] + noise));
      data[i+1] = Math.max(10, Math.min(48, data[i+1] + noise));
      data[i+2] = Math.max(15, Math.min(55, data[i+2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // Subtle tar streaks & wear marks
    for (let s = 0; s < 25; s++) {
      ctx.strokeStyle = 'rgba(10, 12, 18, 0.4)';
      ctx.lineWidth = 2 + Math.random() * 6;
      ctx.beginPath();
      const x = Math.random() * 1024;
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (Math.random() - 0.5) * 40, 1024);
      ctx.stroke();
    }

    // Outer Solid White Road Shoulder Lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(60, 0);
    ctx.lineTo(60, 1024);
    ctx.moveTo(964, 0);
    ctx.lineTo(964, 1024);
    ctx.stroke();

    // Center Double Solid/Dashed Yellow Lines
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(504, 0);
    ctx.lineTo(504, 1024);
    ctx.moveTo(520, 0);
    ctx.lineTo(520, 1024);
    ctx.stroke();

    // Multilane Dashed White Lines (Lanes at x = 280, x = 744)
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 8;
    ctx.setLineDash([64, 50]);
    ctx.beginPath();
    ctx.moveTo(285, 0);
    ctx.lineTo(285, 1024);
    ctx.moveTo(739, 0);
    ctx.lineTo(739, 1024);
    ctx.stroke();
    ctx.setLineDash([]); // reset

    // Glowing Cat's Eyes / Road Studs (Reflective markers along lanes)
    for (let y = 30; y < 1024; y += 128) {
      [285, 512, 739].forEach(x => {
        ctx.fillStyle = '#ffbe0b';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 4);
    return texture;
  },

  // 2. Concrete Sidewalk & Curb
  createSidewalkTexture: function() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Concrete base
    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, 0, 512, 512);

    // Concrete noise
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 20;
      data[i] += n;
      data[i+1] += n;
      data[i+2] += n;
    }
    ctx.putImageData(imgData, 0, 0);

    // Slab Grid Seams
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    for (let x = 0; x <= 512; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    for (let y = 0; y <= 512; y += 128) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // Curb edge highlight
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, 20, 512);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(20, 0, 4, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 8);
    return texture;
  },

  // 3. Skyscraper Windows & Architectural Facade
  createBuildingTexture: function(variant = 0) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    const baseColors = ['#0f172a', '#1e1b4b', '#111827', '#090d16'];
    ctx.fillStyle = baseColors[variant % baseColors.length];
    ctx.fillRect(0, 0, 512, 1024);

    // Floor and column structure
    const cols = 8;
    const rows = 28;
    const colW = 512 / cols;
    const rowH = 1024 / rows;

    const litPalette = [
      '#fef08a', '#fde047', '#bae6fd', '#7dd3fc', '#e0e7ff', '#f43f5e', '#22d3ee'
    ];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isLit = Math.random() > 0.45;
        const x = c * colW + 8;
        const y = r * rowH + 6;
        const w = colW - 16;
        const h = rowH - 12;

        if (isLit) {
          ctx.fillStyle = litPalette[Math.floor(Math.random() * litPalette.length)];
          ctx.fillRect(x, y, w, h);
          // Inner window glow
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.fillRect(x + 2, y + 2, w - 4, h / 2);
        } else {
          ctx.fillStyle = '#050811';
          ctx.fillRect(x, y, w, h);
        }
      }
    }

    // Architectural mullions & vertical decorative lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 3;
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * colW, 0);
      ctx.lineTo(c * colW, 1024);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 2);
    return texture;
  },

  // 4. Cyberpunk Neon Billboards
  createNeonBillboardTexture: function(title, subtitle, glowColor, bgDark) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Dark high-contrast background
    ctx.fillStyle = bgDark || '#050811';
    ctx.fillRect(0, 0, 512, 256);

    // Glowing border frame
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 8;
    ctx.strokeRect(12, 12, 488, 232);

    // Grid graphic accents
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 20; i < 500; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 20);
      ctx.lineTo(i, 236);
      ctx.stroke();
    }

    // Main Neon Text
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, 256, 120);

    // Subtitle Text
    ctx.fillStyle = glowColor;
    ctx.font = '700 22px sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillText(subtitle, 256, 175);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  },

  // 5. Sportscar Carbon Fiber Weave
  createCarbonFiberTexture: function() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, 32, 32);

    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillRect(16, 16, 16, 16);

    ctx.fillStyle = '#374151';
    ctx.fillRect(4, 4, 8, 8);
    ctx.fillRect(20, 20, 8, 8);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(16, 16);
    return texture;
  }
};
