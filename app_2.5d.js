// 2.5D Visualization Module for Weather Sandbox
// Add this file and include it in index.html after app.js

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
    this.cellSize = 1.0;
    this.cloudHeightMult = 10.0;
    this.minDensity = 0.15;
  }

  init() {
    if (this.enabled) return;
    
    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.002);
    this.scene.background = new THREE.Color(0x87CEEB);
    
    // Camera
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000);
    this.camera.position.set(30, 20, 30);
    this.camera.lookAt(0, 10, 0);
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas3d'), alpha: true, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Controls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI/2 - 0.1;
    
    // Lights
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    this.sun = new THREE.DirectionalLight(0xffffff, 1.0);
    this.sun.position.set(20, 30, 10);
    this.scene.add(this.sun);
    
    // Ground
    const groundGeo = new THREE.PlaneGeometry(100, 100, 50, 50);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x3d8c40, roughness: 0.8 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI/2;
    ground.position.y = -0.5;
    this.scene.add(ground);
    
    this.createClouds();
    this.animate();
    this.enabled = true;
    console.log('✅ 2.5D mode activated!');
  }

  createClouds() {
    if (!this.sim || !this.sim.sim_res_x) return;
    
    const GRID_X = Math.min(this.sim.sim_res_x, 60);
    const GRID_Y = Math.min(this.sim.sim_res_y, 60);
    const count = GRID_X * GRID_Y;
    
    const geometry = new THREE.BoxGeometry(this.cellSize, this.cellSize, this.cellSize);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      roughness: 0.9,
      metalness: 0.1
    });
    
    this.cloudMesh = new THREE.InstancedMesh(geometry, material, count);
    this.cloudMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.cloudMesh);
    this.colors = new Float32Array(count * 3);
    this.gridSize = { x: GRID_X, y: GRID_Y };
  }

  updateClouds() {
    if (!this.cloudMesh || !this.sim) return;
    
    const { x: GRID_X, y: GRID_Y } = this.gridSize;
    let colorIndex = 0;
    
    for (let gx = 0; gx < GRID_X; gx++) {
      for (let gy = 0; gy < GRID_Y; gy++) {
        const idx = gx + gy * GRID_X;
        const simX = Math.floor(gx * this.sim.sim_res_x / GRID_X);
        const simY = Math.floor(gy * this.sim.sim_res_y / GRID_Y);
        
        // Get cloud density (simplified - adapt to your actual data structure)
        const density = Math.random() * 0.8; // Replace with actual data reading
        
        if (density > this.minDensity) {
          this.dummy.position.set(
            (gx - GRID_X/2) * this.cellSize,
            density * this.cloudHeightMult + 2,
            (gy - GRID_Y/2) * this.cellSize
          );
          
          const scale = 0.3 + density * 1.2;
          this.dummy.scale.set(scale, scale * 1.5, scale);
          this.dummy.updateMatrix();
          this.cloudMesh.setMatrixAt(idx, this.dummy.matrix);
          
          const gray = 1.0 - density * 0.7;
          this.colors[colorIndex++] = Math.max(0.3, gray);
          this.colors[colorIndex++] = Math.max(0.3, gray);
          this.colors[colorIndex++] = Math.max(0.4, gray + 0.1);
        } else {
          this.dummy.scale.set(0, 0, 0);
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
    if (this.enabled) {
      this.enabled = false;
      this.renderer.domElement.style.display = 'none';
      document.getElementById('canvas3d').classList.remove('active');
    } else {
      if (!this.scene) this.init();
      this.enabled = true;
      this.renderer.domElement.style.display = 'block';
      document.getElementById('canvas3d').classList.add('active');
    }
    const btn = document.getElementById('toggle2_5d');
    btn.textContent = `🔄 2.5D: ${this.enabled ? 'ON' : 'OFF'}`;
    btn.classList.toggle('active', this.enabled);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('toggle2_5d');
  let weather2_5d = null;
  
  btn.addEventListener('click', () => {
    if (!weather2_5d) {
      // Wait for sim to be available
      const checkSim = setInterval(() => {
        if (window.sim) {
          weather2_5d = new Weather2_5D(window.sim);
          clearInterval(checkSim);
          weather2_5d.toggle();
        }
      }, 100);
    } else {
      weather2_5d.toggle();
    }
  });
});