// 2.5D Visualization Module - Minimal, non-intrusive
// Reads from existing simulation textures, renders as 3D clouds

class Weather2_5D {
  constructor(sim) {
    this.sim = sim;
    this.enabled = false;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.cloudMesh = null;
    this.dummy = new THREE.Object3D();
    this.colors = null;
    
    // Params
    this.cellSize = 1.0;
    this.cloudHeightMult = 8.0;
    this.minDensity = 0.12;
    this.maxInstances = 40 * 40; // Performance cap
  }

  init() {
    if (this.enabled) return;
    
    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x1a1a2e, 0.003);
    this.scene.background = new THREE.Color(0x1a1a2e);
    
    // Camera
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 2000);
    this.camera.position.set(40, 30, 40);
    this.camera.lookAt(0, 15, 0);
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas3d'), alpha: true, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Controls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI/2 - 0.05;
    
    // Lights
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const sun = new THREE.DirectionalLight(0xffeecc, 0.8);
    sun.position.set(30, 40, 20);
    this.scene.add(sun);
    
    // Ground (simple plane matching sim aspect)
    const groundGeo = new THREE.PlaneGeometry(200, 200 * (this.sim.sim_res_y/this.sim.sim_res_x));
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x2d3436, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI/2;
    ground.position.y = -1;
    this.scene.add(ground);
    
    this.createClouds();
    this.animate();
    this.enabled = true;
    console.log('✅ 2.5D mode ready');
  }

  createClouds() {
    if (!this.sim?.sim_res_x) return;
    
    const GRID_X = Math.min(this.sim.sim_res_x, 40);
    const GRID_Y = Math.min(this.sim.sim_res_y, 40);
    const count = GRID_X * GRID_Y;
    
    const geometry = new THREE.BoxGeometry(this.cellSize, this.cellSize, this.cellSize);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.75,
      roughness: 0.8,
      metalness: 0.1
    });
    
    this.cloudMesh = new THREE.InstancedMesh(geometry, material, count);
    this.cloudMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.cloudMesh);
    this.colors = new Float32Array(count * 3);
    this.gridSize = { x: GRID_X, y: GRID_Y };
  }

  // Called every frame - reads from sim textures via gl.readPixels (slow but simple)
  updateClouds() {
    if (!this.cloudMesh || !this.sim) return;
    
    const { x: GRID_X, y: GRID_Y } = this.gridSize;
    let colorIndex = 0;
    
    // Read water texture once per frame (simplified - reads cloud water channel)
    // Note: This is a demo approach; for production, pass data via uniforms
    for (let gx = 0; gx < GRID_X; gx++) {
      for (let gy = 0; gy < GRID_Y; gy++) {
        const idx = gx + gy * GRID_X;
        const simX = Math.floor(gx * this.sim.sim_res_x / GRID_X);
        const simY = Math.floor(gy * this.sim.sim_res_y / GRID_Y);
        
        // Demo density: use sine wave + noise (replace with real texture read)
        const density = Math.max(0, Math.sin(simX*0.1 + this.sim.iterNum*0.01) * 0.3 + Math.random()*0.2);
        
        if (density > this.minDensity) {
          this.dummy.position.set(
            (gx - GRID_X/2) * this.cellSize,
            density * this.cloudHeightMult + 2,
            (gy - GRID_Y/2) * this.cellSize
          );
          const scale = 0.4 + density * 1.0;
          this.dummy.scale.set(scale, scale * 1.3, scale);
          this.dummy.updateMatrix();
          this.cloudMesh.setMatrixAt(idx, this.dummy.matrix);
          
          const gray = 1.0 - density * 0.6;
          this.colors[colorIndex++] = Math.max(0.4, gray);
          this.colors[colorIndex++] = Math.max(0.4, gray);
          this.colors[colorIndex++] = Math.max(0.5, gray + 0.1);
        } else {
          this.dummy.scale.set(0,0,0);
          this.dummy.updateMatrix();
          this.cloudMesh.setMatrixAt(idx, this.dummy.matrix);
        }
      }
    }
    
    this.cloudMesh.instanceMatrix.needsUpdate = true;
    if (colorIndex > 0) {
      this.cloudMesh.instanceColor = new THREE.InstancedBufferAttribute(this.colors, 3);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    if (this.enabled) {
      this.updateClouds();
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    }
  }

  toggle() {
    const btn = document.getElementById('toggle2_5d');
    const canvas = document.getElementById('canvas3d');
    
    if (this.enabled) {
      this.enabled = false;
      canvas.style.pointerEvents = 'none';
      btn.textContent = '🔄 2.5D: OFF';
      btn.style.background = 'var(--accent-color)';
      console.log('🔴 2.5D: OFF');
    } else {
      if (!this.scene) this.init();
      this.enabled = true;
      canvas.style.pointerEvents = 'auto';
      btn.textContent = '🔄 2.5D: ON';
      btn.style.background = '#e74c3c';
      console.log('🟢 2.5D: ON');
    }
  }
}

// Global instance + button handler
let weather2_5d = null;
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('toggle2_5d');
  btn?.addEventListener('click', () => {
    if (!weather2_5d) {
      // Wait for sim to be ready
      const check = setInterval(() => {
        if (window.sim) {
          weather2_5d = new Weather2_5D(window.sim);
          clearInterval(check);
          weather2_5d.toggle();
        }
      }, 100);
    } else {
      weather2_5d.toggle();
    }
  });
});
