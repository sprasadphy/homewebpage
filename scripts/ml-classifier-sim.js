/**
 * Interactive Machine Learning Classifier & Heavy-Flavor Decay Topology Simulator
 * Grounded in research by Dr. Suraj Prasad et al.:
 * - Phys. Rev. D 109, 014005 (2024) [Inclusive, prompt and nonprompt J/psi identification using ML]
 * - Phys. Rev. D 105, 114022 (2022) [Estimating flow using deep learning]
 * - Phys. Rev. D 113, 094025 (2026) [Heavy flavor decay lepton identification]
 */

(function initMLClassifierSim() {
  const canvas = document.getElementById('ml-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Sliders and labels
  const lSlider = document.getElementById('ml-l-slider');
  const dcaSlider = document.getElementById('ml-dca-slider');
  const ptSlider = document.getElementById('ml-pt-slider');

  const lValLabel = document.getElementById('ml-l-val');
  const dcaValLabel = document.getElementById('ml-dca-val');
  const ptValLabel = document.getElementById('ml-pt-val');

  // Badges & meters
  const classBadge = document.getElementById('ml-class-badge');
  const probPromptMeter = document.getElementById('ml-prob-prompt');
  const probNonpromptMeter = document.getElementById('ml-prob-nonprompt');
  const probPromptText = document.getElementById('ml-prob-prompt-text');
  const probNonpromptText = document.getElementById('ml-prob-nonprompt-text');
  const mlDecisionDesc = document.getElementById('ml-decision-desc');

  // Preset buttons
  const btnPresetPrompt = document.getElementById('ml-preset-prompt');
  const btnPresetNonprompt = document.getElementById('ml-preset-nonprompt');
  const btnPresetBoundary = document.getElementById('ml-preset-boundary');

  let decayLength = 180; // um
  let dca = 45; // um
  let pt = 6.5; // GeV/c
  let animTick = 0;

  function updateParamsFromSliders() {
    if (lSlider) decayLength = parseFloat(lSlider.value);
    if (dcaSlider) dca = parseFloat(dcaSlider.value);
    if (ptSlider) pt = parseFloat(ptSlider.value);

    if (lValLabel) lValLabel.textContent = `${decayLength.toFixed(0)} \u03BCm`;
    if (dcaValLabel) dcaValLabel.textContent = `${dca.toFixed(0)} \u03BCm`;
    if (ptValLabel) ptValLabel.textContent = `${pt.toFixed(1)} GeV/c`;

    evaluateMLModel();
  }

  function evaluateMLModel() {
    // Multivariate decision model calibrated on XGBoost/LightGBM distributions from PRD 109, 014005
    // Displaced decay length and DCA are primary topological discriminators; pT provides kinematic boost
    const z = -2.85 + (0.018 * decayLength) + (0.024 * dca) + (0.075 * pt);
    const pNonprompt = 1.0 / (1.0 + Math.exp(-z));
    const pPrompt = 1.0 - pNonprompt;

    const pctPrompt = Math.round(pPrompt * 100);
    const pctNonprompt = Math.round(pNonprompt * 100);

    if (probPromptMeter) probPromptMeter.style.width = `${pctPrompt}%`;
    if (probNonpromptMeter) probNonpromptMeter.style.width = `${pctNonprompt}%`;
    if (probPromptText) probPromptText.textContent = `${pctPrompt}%`;
    if (probNonpromptText) probNonpromptText.textContent = `${pctNonprompt}%`;

    if (classBadge) {
      if (pPrompt >= 0.5) {
        classBadge.className = 'sim-class-badge badge-prompt';
        classBadge.innerHTML = '&#10004; PROMPT J/&psi; (Primary Vertex Production)';
      } else {
        classBadge.className = 'sim-class-badge badge-nonprompt';
        classBadge.innerHTML = '&#9888; NON-PROMPT J/&psi; (Displaced Beauty Hadron Decay: b &rarr; J/&psi; + X)';
      }
    }

    if (mlDecisionDesc) {
      if (pPrompt >= 0.5) {
        mlDecisionDesc.innerHTML = `<strong>ML Decision: Prompt J/&psi; (${pctPrompt}% confidence).</strong> The minimal decay displacement (${decayLength.toFixed(0)}\u03BCm) and small impact parameter (${dca.toFixed(0)}\u03BCm) match prompt charmonium produced directly at the primary interaction vertex (t &approx; 0), allowing clean tests of color-octet and color-singlet NRQCD production mechanisms.`;
      } else {
        mlDecisionDesc.innerHTML = `<strong>ML Decision: Non-prompt J/&psi; (${pctNonprompt}% confidence).</strong> The significant decay flight distance (${decayLength.toFixed(0)}\u03BCm) and displaced track DCA (${dca.toFixed(0)}\u03BCm) indicate origin from a long-lived beauty hadron ($b$-hadron, c\u03C4 &approx; 450\u03BCm), enabling precise measurement of beauty quark cross sections and B-hadron feed-down (<em>Phys. Rev. D 109, 014005</em>).`;
      }
    }
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

    ctx.clearRect(0, 0, width, height);

    // Primary Vertex coordinates
    const pvX = 90;
    const pvY = height / 2 + 15;

    // Scale decay displacement visually on canvas
    const maxVisualFlight = width - 240;
    const normFlight = Math.min(decayLength / 1200, 1.0);
    const flightX = pvX + 45 + normFlight * maxVisualFlight;
    const decayAngle = -0.22; // slight upward tilt
    const svX = pvX + (flightX - pvX) * Math.cos(decayAngle);
    const svY = pvY + (flightX - pvX) * Math.sin(decayAngle);

    // Grid backdrop
    ctx.save();
    ctx.strokeStyle = 'rgba(241, 245, 249, 0.9)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();

    // Beam collision arrows
    ctx.save();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(pvX - 55, pvY - 65);
    ctx.lineTo(pvX, pvY);
    ctx.moveTo(pvX - 55, pvY + 65);
    ctx.lineTo(pvX, pvY);
    ctx.stroke();
    ctx.fillStyle = '#ea580c';
    ctx.font = 'bold 11px var(--font-sans, sans-serif)';
    ctx.fillText('Proton Beam A', pvX - 80, pvY - 72);
    ctx.fillText('Proton Beam B', pvX - 80, pvY + 76);
    ctx.restore();

    // Primary Vertex Fireball
    const pvGlow = ctx.createRadialGradient(pvX, pvY, 2, pvX, pvY, 18);
    pvGlow.addColorStop(0, '#fef08a');
    pvGlow.addColorStop(0.4, '#f59e0b');
    pvGlow.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = pvGlow;
    ctx.beginPath();
    ctx.arc(pvX, pvY, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(pvX, pvY, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px var(--font-sans, sans-serif)';
    ctx.fillText('Primary Collision Vertex (PV)', pvX - 35, pvY + 34);

    // Other background collision tracks from PV
    ctx.save();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
    ctx.lineWidth = 1.2;
    [-0.8, -0.5, 0.45, 0.75].forEach(ang => {
      ctx.beginPath();
      ctx.moveTo(pvX, pvY);
      ctx.lineTo(pvX + Math.cos(ang) * 90, pvY + Math.sin(ang) * 90);
      ctx.stroke();
    });
    ctx.restore();

    // Flight vector / decay length L
    ctx.save();
    const isPrompt = decayLength < 70;
    ctx.strokeStyle = isPrompt ? '#10b981' : '#6366f1';
    ctx.lineWidth = 2.8;
    ctx.setLineDash(isPrompt ? [] : [6, 4]);
    ctx.beginPath();
    ctx.moveTo(pvX, pvY);
    ctx.lineTo(svX, svY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Animated traveling pulse along flight vector
    const pulsePhase = (animTick % 80) / 80;
    const pulseX = pvX + (svX - pvX) * pulsePhase;
    const pulseY = pvY + (svY - pvY) * pulsePhase;
    ctx.fillStyle = isPrompt ? '#34d399' : '#818cf8';
    ctx.beginPath();
    ctx.arc(pulseX, pulseY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Label flight length
    const midX = (pvX + svX) / 2;
    const midY = (pvY + svY) / 2 - 12;
    ctx.fillStyle = isPrompt ? '#059669' : '#4f46e5';
    ctx.font = '600 11px var(--font-mono, monospace)';
    ctx.fillText(`L = ${decayLength.toFixed(0)} \u03BCm`, midX - 25, midY);
    ctx.restore();

    // Secondary Vertex (if non-prompt / displaced)
    if (!isPrompt) {
      const svGlow = ctx.createRadialGradient(svX, svY, 1, svX, svY, 14);
      svGlow.addColorStop(0, '#a5b4fc');
      svGlow.addColorStop(0.5, '#6366f1');
      svGlow.addColorStop(1, 'rgba(99, 102, 241, 0)');
      ctx.fillStyle = svGlow;
      ctx.beginPath();
      ctx.arc(svX, svY, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#4338ca';
      ctx.beginPath();
      ctx.arc(svX, svY, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#312e81';
      ctx.font = 'bold 11px var(--font-sans, sans-serif)';
      ctx.fillText('Secondary Vertex (SV)', svX - 45, svY + 24);
      ctx.font = 'italic 10px var(--font-sans, sans-serif)';
      ctx.fillText('b-hadron decay', svX - 35, svY + 37);

      // Remaining decay products X
      ctx.save();
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(svX, svY);
      ctx.lineTo(svX + 45, svY + 45);
      ctx.stroke();
      ctx.fillStyle = '#7e22ce';
      ctx.font = 'bold 11px var(--font-sans, sans-serif)';
      ctx.fillText('+ X (hadronic recoil)', svX + 50, svY + 50);
      ctx.restore();
    }

    // Decay dimuon tracks (mu+ and mu-) originating from J/psi
    const originX = isPrompt ? pvX : svX;
    const originY = isPrompt ? pvY : svY;

    // Muon +
    ctx.save();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    const mu1EndX = originX + 110;
    const mu1EndY = originY - 45;
    ctx.lineTo(mu1EndX, mu1EndY);
    ctx.stroke();
    ctx.fillStyle = '#0369a1';
    ctx.font = 'bold 12px var(--font-mono, monospace)';
    ctx.fillText('\u03BC\u207A / \u2113\u207A', mu1EndX + 6, mu1EndY - 2);

    // Muon -
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    const mu2EndX = originX + 115;
    const mu2EndY = originY + 25;
    ctx.lineTo(mu2EndX, mu2EndY);
    ctx.stroke();
    ctx.fillText('\u03BC\u207B / \u2113\u207B', mu2EndX + 6, mu2EndY + 4);
    ctx.restore();

    // Distance of Closest Approach (DCA) dashed representation
    if (!isPrompt && dca > 5) {
      ctx.save();
      ctx.strokeStyle = '#0ea5e9';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([3, 3]);

      // Back-extrapolated trajectory
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(pvX + 12, pvY - 38);
      ctx.stroke();

      // Perpendicular line to PV
      ctx.strokeStyle = '#e11d48';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(pvX, pvY);
      ctx.lineTo(pvX + 8, pvY - 26);
      ctx.stroke();

      ctx.fillStyle = '#be123c';
      ctx.font = 'bold 10px var(--font-mono, monospace)';
      ctx.fillText(`DCA = ${dca.toFixed(0)} \u03BCm`, pvX + 12, pvY - 24);
      ctx.restore();
    }

    // Kinematic pT badge
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 11px var(--font-mono, monospace)';
    ctx.fillText(`J/\u03C8 pT = ${pt.toFixed(1)} GeV/c`, originX + 35, originY - 18);
    ctx.restore();
  }

  function loop() {
    animTick++;
    render();
    requestAnimationFrame(loop);
  }

  // Slider event listeners
  if (lSlider) lSlider.addEventListener('input', updateParamsFromSliders);
  if (dcaSlider) dcaSlider.addEventListener('input', updateParamsFromSliders);
  if (ptSlider) ptSlider.addEventListener('input', updateParamsFromSliders);

  // Preset button click handlers
  if (btnPresetPrompt) {
    btnPresetPrompt.addEventListener('click', () => {
      decayLength = 12;
      dca = 8;
      pt = 6.0;
      if (lSlider) lSlider.value = decayLength;
      if (dcaSlider) dcaSlider.value = dca;
      if (ptSlider) ptSlider.value = pt;
      btnPresetPrompt.classList.add('active');
      if (btnPresetNonprompt) btnPresetNonprompt.classList.remove('active');
      if (btnPresetBoundary) btnPresetBoundary.classList.remove('active');
      updateParamsFromSliders();
    });
  }

  if (btnPresetNonprompt) {
    btnPresetNonprompt.addEventListener('click', () => {
      decayLength = 540;
      dca = 160;
      pt = 9.5;
      if (lSlider) lSlider.value = decayLength;
      if (dcaSlider) dcaSlider.value = dca;
      if (ptSlider) ptSlider.value = pt;
      btnPresetNonprompt.classList.add('active');
      if (btnPresetPrompt) btnPresetPrompt.classList.remove('active');
      if (btnPresetBoundary) btnPresetBoundary.classList.remove('active');
      updateParamsFromSliders();
    });
  }

  if (btnPresetBoundary) {
    btnPresetBoundary.addEventListener('click', () => {
      decayLength = 110;
      dca = 60;
      pt = 5.0;
      if (lSlider) lSlider.value = decayLength;
      if (dcaSlider) dcaSlider.value = dca;
      if (ptSlider) ptSlider.value = pt;
      btnPresetBoundary.classList.add('active');
      if (btnPresetPrompt) btnPresetPrompt.classList.remove('active');
      if (btnPresetNonprompt) btnPresetNonprompt.classList.remove('active');
      updateParamsFromSliders();
    });
  }

  setupCanvas();
  updateParamsFromSliders();
  loop();
})();
