// Cinematic hero — particle text "Mellie F." with mouse scatter,
// drifting background orbs, and Debussy-style ambient melody on hover.
(function () {
  const heroEl = document.querySelector('.hero--cinematic');
  if (!heroEl) return;

  const TEXT = heroEl.dataset.text || 'Mellie F.';
  const particleCanvas = heroEl.querySelector('.hero-canvas-particles');
  const bgCanvas = heroEl.querySelector('.hero-canvas-bg');
  if (!particleCanvas || !bgCanvas) return;

  const pCtx = particleCanvas.getContext('2d');
  const bCtx = bgCanvas.getContext('2d');

  // Tunables ---------------------------------------------------------------
  const PARTICLE_SPACING = 3.0;     // sample resolution (lower = more particles)
  const PARTICLE_RADIUS = 1.6;
  const REPULSION_RADIUS = 96;
  const REPULSION_STRENGTH = 1.6;
  const RETURN_SPRING = 0.022;
  const FRICTION = 0.93;
  const DRIFT_AMPLITUDE = 0.06;
  const FONT_FAMILY = '"New York", "Tiempos Headline", "Source Serif 4", "Iowan Old Style", "Georgia", serif';

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0;
  let particles = [];
  let orbs = [];
  let mouseX = -9999, mouseY = -9999;
  let firstFrame = true;
  let prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const PARTICLE_COLOR = 'rgba(20, 20, 26, 0.95)';

  function resize() {
    const rect = heroEl.getBoundingClientRect();
    W = rect.width;
    H = rect.height;

    [particleCanvas, bgCanvas].forEach(c => {
      c.width = Math.floor(W * dpr);
      c.height = Math.floor(H * dpr);
      c.style.width = W + 'px';
      c.style.height = H + 'px';
    });
    pCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    initParticles();
    initOrbs();
  }

  function initParticles() {
    const off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    const oCtx = off.getContext('2d');

    // Responsive font size
    const fontSize = Math.max(64, Math.min(W * 0.13, 160));
    oCtx.font = `700 ${fontSize}px ${FONT_FAMILY}`;
    oCtx.fillStyle = '#000';
    oCtx.textBaseline = 'middle';
    oCtx.textAlign = 'center';

    // Center horizontally; vertically slightly above center to leave room for lede below
    const x = W / 2;
    const y = H * 0.42;
    oCtx.fillText(TEXT, x, y);

    const data = oCtx.getImageData(0, 0, W, H).data;
    const newParticles = [];
    for (let py = 0; py < H; py += PARTICLE_SPACING) {
      for (let px = 0; px < W; px += PARTICLE_SPACING) {
        const idx = (py * W + px) * 4;
        if (data[idx + 3] > 128) {
          newParticles.push({
            hx: px,
            hy: py,
            x: px,
            y: py,
            vx: 0,
            vy: 0,
            phase: Math.random() * Math.PI * 2,
            phaseSpeed: 0.003 + Math.random() * 0.004,
          });
        }
      }
    }
    particles = newParticles;
    firstFrame = false;
  }

  function initOrbs() {
    orbs = [
      { x: W * 0.2, y: H * 0.3, vx: 0.08, vy: 0.05, r: Math.min(W, H) * 0.55, alpha: 0.045 },
      { x: W * 0.75, y: H * 0.65, vx: -0.06, vy: -0.04, r: Math.min(W, H) * 0.45, alpha: 0.035 },
      { x: W * 0.5, y: H * 0.5, vx: 0.04, vy: 0.07, r: Math.min(W, H) * 0.35, alpha: 0.025 },
    ];
  }

  function drawBg() {
    bCtx.clearRect(0, 0, W, H);
    for (const orb of orbs) {
      orb.x += orb.vx;
      orb.y += orb.vy;
      const margin = orb.r * 0.5;
      if (orb.x < -margin) orb.x = W + margin;
      if (orb.x > W + margin) orb.x = -margin;
      if (orb.y < -margin) orb.y = H + margin;
      if (orb.y > H + margin) orb.y = -margin;

      const g = bCtx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
      g.addColorStop(0, `rgba(20, 20, 26, ${orb.alpha})`);
      g.addColorStop(0.55, `rgba(20, 20, 26, ${orb.alpha * 0.25})`);
      g.addColorStop(1, 'rgba(20, 20, 26, 0)');
      bCtx.fillStyle = g;
      bCtx.fillRect(0, 0, W, H);
    }
  }

  function drawParticles() {
    pCtx.clearRect(0, 0, W, H);
    pCtx.fillStyle = PARTICLE_COLOR;

    let maxRepelForce = 0;
    let repelPosX = 0;

    for (const p of particles) {
      // Spring back home
      const dxH = p.hx - p.x;
      const dyH = p.hy - p.y;
      p.vx += dxH * RETURN_SPRING;
      p.vy += dyH * RETURN_SPRING;

      // Repulsion
      if (!prefersReducedMotion) {
        const dxM = p.x - mouseX;
        const dyM = p.y - mouseY;
        const distSq = dxM * dxM + dyM * dyM;
        if (distSq < REPULSION_RADIUS * REPULSION_RADIUS) {
          const dist = Math.sqrt(distSq) || 0.001;
          const force = (1 - dist / REPULSION_RADIUS) * REPULSION_STRENGTH;
          p.vx += (dxM / dist) * force;
          p.vy += (dyM / dist) * force;
          if (force > maxRepelForce) {
            maxRepelForce = force;
            repelPosX = p.hx;
          }
        }

        // Ambient drift
        p.phase += p.phaseSpeed;
        p.vx += Math.sin(p.phase) * DRIFT_AMPLITUDE * 0.04;
        p.vy += Math.cos(p.phase * 0.7) * DRIFT_AMPLITUDE * 0.04;
      }

      p.vx *= FRICTION;
      p.vy *= FRICTION;
      p.x += p.vx;
      p.y += p.vy;

      pCtx.beginPath();
      pCtx.arc(p.x, p.y, PARTICLE_RADIUS, 0, Math.PI * 2);
      pCtx.fill();
    }

    if (maxRepelForce > 0.45 && audioEnabled) {
      triggerAudio(maxRepelForce, repelPosX / W);
    }
  }

  let running = true;
  function tick() {
    if (running) {
      drawBg();
      drawParticles();
    }
    requestAnimationFrame(tick);
  }

  // Pause when tab hidden
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
  });

  // ===== AUDIO — Debussy-style soft pentatonic chime ===================
  let audioCtx = null;
  let masterGain = null;
  let audioEnabled = false;
  let lastNoteTime = 0;
  const NOTE_COOLDOWN = 240;
  // Pentatonic blocks of C major + F# (Debussy whole-tone color)
  const SCALE = [
    261.63, 293.66, 329.63, 369.99, 440.00, 523.25, 587.33, 659.25, 739.99, 880.00,
  ];

  function ensureAudio() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = new Ctx();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.55;
      masterGain.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function playNote(freq) {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;

    const o1 = audioCtx.createOscillator();
    const o2 = audioCtx.createOscillator();
    o1.type = 'sine';
    o2.type = 'triangle';
    o1.frequency.value = freq;
    o2.frequency.value = freq * 2.001;       // octave for shimmer
    const o2Gain = audioCtx.createGain();
    o2Gain.gain.value = 0.18;
    o2.connect(o2Gain);

    const env = audioCtx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.04, t + 0.05);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);

    // Soft delay tail
    const delay = audioCtx.createDelay();
    delay.delayTime.value = 0.22;
    const fb = audioCtx.createGain();
    fb.gain.value = 0.32;
    delay.connect(fb);
    fb.connect(delay);

    o1.connect(env);
    o2Gain.connect(env);
    env.connect(masterGain);
    env.connect(delay);
    delay.connect(masterGain);

    o1.start(t);
    o2.start(t);
    o1.stop(t + 1.7);
    o2.stop(t + 1.7);
  }

  function triggerAudio(velocity, posRatio) {
    const now = performance.now();
    if (now - lastNoteTime < NOTE_COOLDOWN) return;
    ensureAudio();
    if (!audioCtx) return;
    const idx = Math.floor(posRatio * SCALE.length);
    const note = SCALE[Math.min(SCALE.length - 1, Math.max(0, idx))];
    playNote(note);
    lastNoteTime = now;
  }

  // ===== Interaction ===================================================
  heroEl.addEventListener('mousemove', (e) => {
    const rect = heroEl.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });
  heroEl.addEventListener('mouseleave', () => {
    mouseX = -9999;
    mouseY = -9999;
  });

  // Audio toggle
  const audioToggle = heroEl.querySelector('.audio-toggle');
  if (audioToggle) {
    audioToggle.addEventListener('click', () => {
      audioEnabled = !audioEnabled;
      audioToggle.classList.toggle('is-on', audioEnabled);
      const lbl = audioToggle.querySelector('.audio-toggle__label');
      if (lbl) lbl.textContent = audioEnabled ? 'Sound · on' : 'Sound · off';
      if (audioEnabled) ensureAudio();
    });
  }

  // Boot
  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(resize);
  });

  // Wait for fonts so the text shape is correct
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(resize);
  } else {
    resize();
  }
  requestAnimationFrame(tick);
})();
