/**
 * Interactive Collision Geometry & Anisotropic Flow Visualizer
 * Designed for Dr. Suraj Prasad's Academic Research Page.
 * Accessible to physics undergraduate students and researchers from other disciplines.
 */

(function initCollisionSimulator() {
  const canvas = document.getElementById('collision-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Controls
  const modeSelectPbPb = document.getElementById('sim-mode-pbpb');
  const modeSelectPP = document.getElementById('sim-mode-pp');
  const bSlider = document.getElementById('sim-b-slider');
  const bValueLabel = document.getElementById('sim-b-val');
  const eccValueLabel = document.getElementById('sim-ecc-val');
  const v2ValueLabel = document.getElementById('sim-v2-val');
  const centralityLabel = document.getElementById('sim-cent-val');
  const fireBtn = document.getElementById('sim-fire-btn');
  const ppToggleGroup = document.getElementById('sim-pp-toggles');
  const pbpbControls = document.getElementById('sim-pbpb-controls');
  const ppBtnJetty = document.getElementById('sim-pp-jetty');
  const ppBtnIso = document.getElementById('sim-pp-iso');
  const simExplanation = document.getElementById('sim-explanation');

  let currentMode = 'pbpb'; // 'pbpb' or 'pp'
  let ppShape = 'jetty'; // 'jetty' or 'isotropic'
  let impactParam = 6.0; // fm
  let particles = [];
  let animProgress = 1.0;
  let animId = null;

  // Set canvas resolution
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    render();
  }
  window.addEventListener('resize', resizeCanvas);

  function getNuclearParams(b) {
    // Nuclear radius of Lead-208 ~ 6.62 fm
    const R = 6.62;
    // Approximated spatial eccentricity epsilon_2 for wood-saxon overlap
    // For b=0, eps2 ~ 0; for b ~ 2R, overlap vanishes.
    const bNorm = Math.min(b / (2 * R), 0.95);
    const eps2 = b === 0 ? 0.04 : Math.min(0.58, (b / (2 * R)) * 0.75 * Math.sqrt(1 - bNorm * bNorm) * 1.5 + 0.05);
    const v2 = Math.min(0.12, eps2 * 0.22);
    
    let centrality = '0–5% (Central)';
    if (b > 3.4 && b <= 5.0) centrality = '10–20% (Mid-Central)';
    else if (b > 5.0 && b <= 7.2) centrality = '20–40% (Mid-Central)';
    else if (b > 7.2 && b <= 9.5) centrality = '40–60% (Peripheral)';
    else if (b > 9.5) centrality = '60–80%+ (Ultra-Peripheral)';

    return { eps2: eps2.toFixed(3), v2: v2.toFixed(3), centrality };
  }

  function generateParticles() {
    particles = [];
    const count = currentMode === 'pbpb' ? 70 : 36;
    
    if (currentMode === 'pbpb') {
      const b = parseFloat(bSlider.value);
      const { v2 } = getNuclearParams(b);
      const v2Num = parseFloat(v2);

      // Distribute particles with probability P(phi) ~ 1 + 2*v2*cos(2*phi)
      for (let i = 0; i < count; i++) {
        let phi = 0;
        // Rejection sampling
        while (true) {
          const testPhi = Math.random() * Math.PI * 2;
          const prob = 1 + 2 * v2Num * Math.cos(2 * testPhi);
          if (Math.random() * (1 + 2 * v2Num) < prob) {
            phi = testPhi;
            break;
          }
        }
        const speed = 1.2 + Math.random() * 2.2;
        const color = Math.random() > 0.4 ? '#0284c7' : (Math.random() > 0.5 ? '#10b981' : '#f59e0b');
        particles.push({
          x: 0,
          y: 0,
          vx: Math.cos(phi) * speed,
          vy: Math.sin(phi) * speed,
          color,
          size: 2.5 + Math.random() * 1.5
        });
      }
    } else {
      // PP mode: jetty or isotropic
      if (ppShape === 'jetty') {
        // Two back-to-back narrow jet sprays at angle theta and theta + pi
        const jetAngle = Math.random() * Math.PI;
        for (let i = 0; i < count; i++) {
          const isAway = Math.random() > 0.5;
          const baseAngle = isAway ? jetAngle + Math.PI : jetAngle;
          // Gaussian-like narrow cone around jet axis
          const spread = (Math.random() - 0.5) * 0.28;
          const phi = baseAngle + spread;
          const speed = 1.8 + Math.random() * 2.5;
          particles.push({
            x: 0,
            y: 0,
            vx: Math.cos(phi) * speed,
            vy: Math.sin(phi) * speed,
            color: isAway ? '#ef4444' : '#0284c7',
            size: 3
          });
        }
      } else {
        // Isotropic: completely uniform azimuthal emission
        for (let i = 0; i < count; i++) {
          const phi = Math.random() * Math.PI * 2;
          const speed = 1.0 + Math.random() * 1.6;
          particles.push({
            x: 0,
            y: 0,
            vx: Math.cos(phi) * speed,
            vy: Math.sin(phi) * speed,
            color: '#10b981',
            size: 2.6
          });
        }
      }
    }
  }

  function startAnimation() {
    generateParticles();
    animProgress = 0;
    if (animId) cancelAnimationFrame(animId);

    function step() {
      animProgress += 0.02;
      render();
      if (animProgress < 1.0) {
        animId = requestAnimationFrame(step);
      }
    }
    step();
  }

  function render() {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    // Subtle coordinate grid
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, 15);
    ctx.lineTo(cx, h - 15);
    ctx.moveTo(15, cy);
    ctx.lineTo(w - 15, cy);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('x (in-plane / reaction plane)', w - 15, cy - 8);
    ctx.textAlign = 'left';
    ctx.fillText('y (out-of-plane)', cx + 8, 25);

    if (currentMode === 'pbpb') {
      const b = parseFloat(bSlider.value);
      const scale = Math.min(w, h) / 36;
      const R = 6.62 * scale;
      const shiftX = (b / 2) * scale;

      // Draw colliding nuclei (transverse projection)
      ctx.save();
      // Nucleus 1 (traveling toward us)
      ctx.fillStyle = 'rgba(14, 165, 233, 0.22)';
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx - shiftX, cy, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Nucleus 2 (traveling away)
      ctx.fillStyle = 'rgba(99, 102, 241, 0.22)';
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.7)';
      ctx.beginPath();
      ctx.arc(cx + shiftX, cy, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Overlap almond (spatial eccentricity zone)
      if (b < 13.2) {
        ctx.beginPath();
        ctx.arc(cx - shiftX, cy, R, 0, Math.PI * 2);
        ctx.clip();
        ctx.beginPath();
        ctx.arc(cx + shiftX, cy, R, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, R);
        grad.addColorStop(0, 'rgba(245, 158, 11, 0.75)');
        grad.addColorStop(0.6, 'rgba(239, 68, 68, 0.55)');
        grad.addColorStop(1, 'rgba(239, 68, 68, 0.1)');
        ctx.fillStyle = grad;
        ctx.fill();
      }
      ctx.restore();

      // Draw Pressure Gradient arrows indicating in-plane push
      if (b > 1.5 && b < 12.0 && animProgress >= 0.95) {
        ctx.save();
        ctx.strokeStyle = '#ea580c';
        ctx.fillStyle = '#ea580c';
        ctx.lineWidth = 2;
        // Arrows along x (short axis of almond -> steep pressure gradient)
        const arrLen = 22;
        // Right arrow
        ctx.beginPath();
        ctx.moveTo(cx + 25, cy);
        ctx.lineTo(cx + 25 + arrLen, cy);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 25 + arrLen, cy);
        ctx.lineTo(cx + 25 + arrLen - 6, cy - 4);
        ctx.lineTo(cx + 25 + arrLen - 6, cy + 4);
        ctx.fill();

        // Left arrow
        ctx.beginPath();
        ctx.moveTo(cx - 25, cy);
        ctx.lineTo(cx - 25 - arrLen, cy);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - 25 - arrLen, cy);
        ctx.lineTo(cx - 25 - arrLen + 6, cy - 4);
        ctx.lineTo(cx - 25 - arrLen + 6, cy + 4);
        ctx.fill();

        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#c2410c';
        ctx.textAlign = 'center';
        ctx.fillText('Steep pressure gradient (drives v₂)', cx, cy + R + 20);
        ctx.restore();
      }

    } else {
      // PP Mode display
      ctx.save();
      ctx.fillStyle = ppShape === 'jetty' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)';
      ctx.strokeStyle = ppShape === 'jetty' ? '#ef4444' : '#10b981';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ppShape === 'jetty' ? 'Jetty Hard Scattering (S₀ → 0)' : 'Isotropic Soft Event (S₀ → 1)', cx, cy + 50);
      ctx.restore();
    }

    // Draw animated particles escaping
    if (particles.length > 0) {
      const expansionDistance = (Math.min(w, h) / 2.3) * animProgress;
      for (const p of particles) {
        const px = cx + p.vx * expansionDistance;
        const py = cy + p.vy * expansionDistance;

        // Particle trail
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = Math.max(0.2, animProgress);
        ctx.beginPath();
        ctx.moveTo(cx + p.vx * (expansionDistance * 0.7), cy + p.vy * (expansionDistance * 0.7));
        ctx.lineTo(px, py);
        ctx.stroke();

        // Particle dot
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
    }
  }

  // Update slider metrics
  function updateSlider() {
    const b = parseFloat(bSlider.value);
    bValueLabel.textContent = b.toFixed(1) + ' fm';
    const { eps2, v2, centrality } = getNuclearParams(b);
    eccValueLabel.textContent = 'ε₂ = ' + eps2;
    v2ValueLabel.textContent = 'v₂ ≈ ' + v2;
    centralityLabel.textContent = centrality;
    render();
  }

  if (bSlider) {
    bSlider.addEventListener('input', () => {
      updateSlider();
    });
  }

  if (fireBtn) {
    fireBtn.addEventListener('click', () => {
      startAnimation();
    });
  }

  if (modeSelectPbPb && modeSelectPP) {
    modeSelectPbPb.addEventListener('click', () => {
      currentMode = 'pbpb';
      modeSelectPbPb.classList.add('active');
      modeSelectPP.classList.remove('active');
      pbpbControls.style.display = 'block';
      ppToggleGroup.style.display = 'none';
      simExplanation.innerHTML = `
        <strong>Heavy-Ion Collisions (Pb–Pb):</strong> Adjusting the impact parameter $b$ alters the geometric overlap almond from circular ($b=0$) to highly eccentric ($b=6\\text{ fm}$). The resulting asymmetric pressure gradients drive hydrodynamic fluid expansion, converting spatial coordinate eccentricity $\\varepsilon_2$ directly into momentum-space elliptic flow $v_2$.
      `;
      if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([simExplanation]);
      }
      updateSlider();
      startAnimation();
    });

    modeSelectPP.addEventListener('click', () => {
      currentMode = 'pp';
      modeSelectPP.classList.add('active');
      modeSelectPbPb.classList.remove('active');
      pbpbControls.style.display = 'none';
      ppToggleGroup.style.display = 'flex';
      simExplanation.innerHTML = `
        <strong>Proton-Proton ($pp$) Event Shapes:</strong> Collisions can be classified topologically. <em>Jetty events</em> ($S_0 \\to 0$) produce high-$p_{\\mathrm{T}}$ collimated back-to-back dijets. In contrast, <em>Isotropic events</em> ($S_0 \\to 1$) feature azimuthally uniform, soft multi-particle emission mimicking the collective fireball behavior of heavy-ion collisions.
      `;
      if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([simExplanation]);
      }
      startAnimation();
    });
  }

  if (ppBtnJetty && ppBtnIso) {
    ppBtnJetty.addEventListener('click', () => {
      ppShape = 'jetty';
      ppBtnJetty.classList.add('active');
      ppBtnIso.classList.remove('active');
      startAnimation();
    });
    ppBtnIso.addEventListener('click', () => {
      ppShape = 'isotropic';
      ppBtnIso.classList.add('active');
      ppBtnJetty.classList.remove('active');
      startAnimation();
    });
  }

  // Initial setup
  resizeCanvas();
  updateSlider();
  startAnimation();
})();
