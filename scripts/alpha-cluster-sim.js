/**
 * Interactive 3D Nuclear Structure & Alpha-Clustering Visualizer
 * Grounded in research by Dr. Suraj Prasad et al.:
 * - Phys. Lett. B 860, 139145 (2025)
 * - Phys. Rev. D 108, 054022 (2023)
 * - J. Subatomic Part. Cosmol. 5, 100290 (2026)
 */

(function initAlphaClusterSim() {
  const canvas = document.getElementById('alpha-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Controls
  const btnCluster = document.getElementById('alpha-mode-cluster');
  const btnWS = document.getElementById('alpha-mode-ws');
  const btnRotate = document.getElementById('alpha-auto-rotate');
  const btnOrient = document.getElementById('alpha-rand-orient');
  const eps2Label = document.getElementById('alpha-eps2-val');
  const eps3Label = document.getElementById('alpha-eps3-val');
  const geomLabel = document.getElementById('alpha-geom-desc');
  const orientLabel = document.getElementById('alpha-orient-val');

  let mode = 'cluster'; // 'cluster' or 'ws'
  let autoRotate = true;
  let angleX = 0.35;
  let angleY = 0.55;
  let angleZ = 0.15;
  let isDragging = false;
  let lastMouseX = 0;
  let lastMouseY = 0;
  let animId = null;

  // Tetrahedral geometry for 16O: 4 alpha particles at vertices of a regular tetrahedron
  const tetraVertices = [
    { x: 1, y: 1, z: 1 },
    { x: 1, y: -1, z: -1 },
    { x: -1, y: 1, z: -1 },
    { x: -1, y: -1, z: 1 }
  ];

  // Each alpha particle has 4 nucleons (2 protons, 2 neutrons) with relative offsets
  const alphaNucleonOffsets = [
    { x: 0.38, y: 0.38, z: 0.38, type: 'p' },
    { x: 0.38, y: -0.38, z: -0.38, type: 'p' },
    { x: -0.38, y: 0.38, z: -0.38, type: 'n' },
    { x: -0.38, y: -0.38, z: 0.38, type: 'n' }
  ];

  // Pre-generate smooth Woods-Saxon nucleons (8 protons, 8 neutrons)
  let wsNucleons = [];
  function generateWSNucleons() {
    wsNucleons = [];
    for (let i = 0; i < 16; i++) {
      while (true) {
        const u = (Math.random() - 0.5) * 6.0;
        const v = (Math.random() - 0.5) * 6.0;
        const w = (Math.random() - 0.5) * 6.0;
        const r = Math.sqrt(u * u + v * v + w * w);
        const rho = 1.0 / (1.0 + Math.exp((r - 2.4) / 0.52));
        if (Math.random() < rho && r < 3.8) {
          wsNucleons.push({
            x: u,
            y: v,
            z: w,
            type: i < 8 ? 'p' : 'n'
          });
          break;
        }
      }
    }
  }
  generateWSNucleons();

  // 3D rotation math
  function rotate3D(point, rx, ry, rz) {
    const cosX = Math.cos(rx), sinX = Math.sin(rx);
    const y1 = point.y * cosX - point.z * sinX;
    const z1 = point.y * sinX + point.z * cosX;

    const cosY = Math.cos(ry), sinY = Math.sin(ry);
    const x2 = point.x * cosY + z1 * sinY;
    const z2 = -point.x * sinY + z1 * cosY;

    const cosZ = Math.cos(rz), sinZ = Math.sin(rz);
    const x3 = x2 * cosZ - y1 * sinZ;
    const y3 = x2 * sinZ + y1 * cosZ;

    return { x: x3, y: y3, z: z2 };
  }

  // Calculate projected transverse eccentricities epsilon_2 and epsilon_3 in the XY plane
  function calculateEccentricities(nucleons) {
    if (!nucleons.length) return { eps2: 0, eps3: 0 };

    let cmX = 0, cmY = 0;
    nucleons.forEach(n => {
      cmX += n.rotX;
      cmY += n.rotY;
    });
    cmX /= nucleons.length;
    cmY /= nucleons.length;

    let sumR2 = 0;
    let sumCos2 = 0, sumSin2 = 0;
    let sumCos3 = 0, sumSin3 = 0;
    let sumR3 = 0;

    nucleons.forEach(n => {
      const dx = n.rotX - cmX;
      const dy = n.rotY - cmY;
      const r = Math.sqrt(dx * dx + dy * dy);
      const r2 = r * r;
      const r3 = r * r * r;
      const phi = Math.atan2(dy, dx);

      sumR2 += r2;
      sumR3 += r3;
      sumCos2 += r2 * Math.cos(2 * phi);
      sumSin2 += r2 * Math.sin(2 * phi);
      sumCos3 += r3 * Math.cos(3 * phi);
      sumSin3 += r3 * Math.sin(3 * phi);
    });

    const eps2 = sumR2 > 0 ? Math.sqrt(sumCos2 * sumCos2 + sumSin2 * sumSin2) / sumR2 : 0;
    const eps3 = sumR3 > 0 ? Math.sqrt(sumCos3 * sumCos3 + sumSin3 * sumSin3) / sumR3 : 0;

    return {
      eps2: Math.min(0.99, eps2).toFixed(3),
      eps3: Math.min(0.99, eps3).toFixed(3)
    };
  }

  function setupCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
  }
  window.addEventListener('resize', setupCanvas);

  function render() {
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = Math.min(width, height) / 9.5;

    ctx.clearRect(0, 0, width, height);

    // Coordinate grid in transverse plane
    ctx.save();
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.7)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3.8 * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centerX - 4.2 * scale, centerY);
    ctx.lineTo(centerX + 4.2 * scale, centerY);
    ctx.moveTo(centerX, centerY - 4.2 * scale);
    ctx.lineTo(centerX, centerY + 4.2 * scale);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px var(--font-mono, monospace)';
    ctx.fillText('Projected Transverse Plane (x-y) | Beam Axis \u2299 z', 16, 22);

    let allNucleons = [];
    let rotatedClusters = [];

    if (mode === 'cluster') {
      const clusterDist = 1.85;
      
      tetraVertices.forEach((v, idx) => {
        const p = { x: v.x * clusterDist, y: v.y * clusterDist, z: v.z * clusterDist };
        const rot = rotate3D(p, angleX, angleY, angleZ);
        rotatedClusters.push({ ...rot, id: idx });

        alphaNucleonOffsets.forEach(off => {
          const np = { x: p.x + off.x, y: p.y + off.y, z: p.z + off.z };
          const rotN = rotate3D(np, angleX, angleY, angleZ);
          allNucleons.push({
            rotX: rotN.x,
            rotY: rotN.y,
            rotZ: rotN.z,
            type: off.type,
            clusterId: idx
          });
        });
      });

      // Tetrahedral bond lines
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.35)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      for (let i = 0; i < rotatedClusters.length; i++) {
        for (let j = i + 1; j < rotatedClusters.length; j++) {
          const p1 = rotatedClusters[i];
          const p2 = rotatedClusters[j];
          ctx.beginPath();
          ctx.moveTo(centerX + p1.x * scale, centerY + p1.y * scale);
          ctx.lineTo(centerX + p2.x * scale, centerY + p2.y * scale);
          ctx.stroke();
        }
      }
      ctx.setLineDash([]);

      // Translucent alpha cluster envelopes
      rotatedClusters.sort((a, b) => a.z - b.z);
      rotatedClusters.forEach(c => {
        const px = centerX + c.x * scale;
        const py = centerY + c.y * scale;
        const rAlpha = 1.15 * scale;
        const grad = ctx.createRadialGradient(px, py, rAlpha * 0.2, px, py, rAlpha);
        grad.addColorStop(0, 'rgba(34, 197, 94, 0.25)');
        grad.addColorStop(0.8, 'rgba(34, 197, 94, 0.12)');
        grad.addColorStop(1, 'rgba(34, 197, 94, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, rAlpha, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(34, 197, 94, 0.45)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

    } else {
      // Woods-Saxon mode
      wsNucleons.forEach(n => {
        const rotN = rotate3D(n, angleX, angleY, angleZ);
        allNucleons.push({
          rotX: rotN.x,
          rotY: rotN.y,
          rotZ: rotN.z,
          type: n.type
        });
      });

      const gradWS = ctx.createRadialGradient(centerX, centerY, scale * 1.0, centerX, centerY, scale * 3.4);
      gradWS.addColorStop(0, 'rgba(148, 163, 184, 0.2)');
      gradWS.addColorStop(0.7, 'rgba(148, 163, 184, 0.08)');
      gradWS.addColorStop(1, 'rgba(148, 163, 184, 0)');
      ctx.fillStyle = gradWS;
      ctx.beginPath();
      ctx.arc(centerX, centerY, scale * 3.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Depth sort
    allNucleons.sort((a, b) => a.rotZ - b.rotZ);

    allNucleons.forEach(n => {
      const nx = centerX + n.rotX * scale;
      const ny = centerY + n.rotY * scale;
      const zFactor = 1 + n.rotZ * 0.09;
      const radius = Math.max(3.5, 6.2 * zFactor);

      const gradN = ctx.createRadialGradient(
        nx - radius * 0.35, ny - radius * 0.35, radius * 0.1,
        nx, ny, radius
      );

      if (n.type === 'p') {
        gradN.addColorStop(0, '#fca5a5');
        gradN.addColorStop(0.6, '#ef4444');
        gradN.addColorStop(1, '#991b1b');
      } else {
        gradN.addColorStop(0, '#93c5fd');
        gradN.addColorStop(0.6, '#3b82f6');
        gradN.addColorStop(1, '#1e3a8a');
      }

      ctx.fillStyle = gradN;
      ctx.beginPath();
      ctx.arc(nx, ny, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    });

    const { eps2, eps3 } = calculateEccentricities(allNucleons);
    if (eps2Label) eps2Label.textContent = `\u03B5\u2082 = ${eps2}`;
    if (eps3Label) eps3Label.textContent = `\u03B5\u2083 = ${eps3}`;

    if (orientLabel) {
      const degX = Math.round(((angleX % (Math.PI * 2)) * 180) / Math.PI);
      const degY = Math.round(((angleY % (Math.PI * 2)) * 180) / Math.PI);
      orientLabel.textContent = `\u03B8x: ${degX}\u00B0, \u03B8y: ${degY}\u00B0`;
    }

    if (geomLabel) {
      if (mode === 'cluster') {
        geomLabel.innerHTML = `<strong>Tetrahedral \u03B1-Clustered \u00B9\u2076O:</strong> 4 compact \u2074He sub-clusters form a rigid geometric tetrahedron. As orientation fluctuates event-by-event, projected triangularity \u03B5\u2083 varies strongly, producing enhanced triangular flow v\u2083 and distinct flow fluctuations F(v\u2082) in central O\u2013O collisions (<em>Phys. Lett. B 860, 139145</em>).`;
      } else {
        geomLabel.innerHTML = `<strong>Woods-Saxon Spherical \u00B9\u2076O:</strong> 16 nucleons distributed smoothly as an isotropic liquid drop. Spatial triangularity \u03B5\u2083 is small and driven purely by random statistical nucleon position fluctuations without intrinsic geometric deformation.`;
      }
    }
  }

  function loop() {
    if (autoRotate) {
      angleX += 0.008;
      angleY += 0.012;
    }
    render();
    animId = requestAnimationFrame(loop);
  }

  canvas.addEventListener('mousedown', e => {
    isDragging = true;
    autoRotate = false;
    if (btnRotate) btnRotate.classList.remove('active');
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;

    angleY += dx * 0.01;
    angleX += dy * 0.01;
    render();
  });

  canvas.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      isDragging = true;
      autoRotate = false;
      if (btnRotate) btnRotate.classList.remove('active');
      lastMouseX = e.touches[0].clientX;
      lastMouseY = e.touches[0].clientY;
    }
  }, { passive: true });

  window.addEventListener('touchend', () => {
    isDragging = false;
  });

  window.addEventListener('touchmove', e => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - lastMouseX;
    const dy = e.touches[0].clientY - lastMouseY;
    lastMouseX = e.touches[0].clientX;
    lastMouseY = e.touches[0].clientY;

    angleY += dx * 0.01;
    angleX += dy * 0.01;
    render();
  }, { passive: true });

  if (btnCluster) {
    btnCluster.addEventListener('click', () => {
      mode = 'cluster';
      btnCluster.classList.add('active');
      if (btnWS) btnWS.classList.remove('active');
      render();
    });
  }

  if (btnWS) {
    btnWS.addEventListener('click', () => {
      mode = 'ws';
      btnWS.classList.add('active');
      if (btnCluster) btnCluster.classList.remove('active');
      generateWSNucleons();
      render();
    });
  }

  if (btnRotate) {
    btnRotate.addEventListener('click', () => {
      autoRotate = !autoRotate;
      btnRotate.classList.toggle('active', autoRotate);
    });
  }

  if (btnOrient) {
    btnOrient.addEventListener('click', () => {
      angleX = Math.random() * Math.PI * 2;
      angleY = Math.random() * Math.PI * 2;
      angleZ = Math.random() * Math.PI * 2;
      if (mode === 'ws') generateWSNucleons();
      render();
    });
  }

  setupCanvas();
  loop();
})();
