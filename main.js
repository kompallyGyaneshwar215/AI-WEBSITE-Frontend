/**
 * NOCTIS — main.js
 * Entry point. Imports and wires up all modules.
 * All scroll-scrubbing, cursor, grain, preloader, lineup, and reveal logic.
 */

import CONFIG from './config.js';

/* ── Helpers ──────────────────────────────────────────────────────────── */

/** Pad a frame number to 4 digits: 1 → "0001" */
function padFrame(n) {
  return String(n).padStart(4, '0');
}

/** Build frame URL from a path template (config uses {n} placeholder) */
function frameURL(template, n) {
  return template.replace('{n}', padFrame(n));
}

/** Clamp a value between min and max */
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/** Linear interpolation */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Is the viewport width < 768px? */
function isMobile() {
  return window.innerWidth < 768;
}

/** Does the user prefer reduced motion? */
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Does the device have a fine pointer (mouse)? */
function hasFinePointer() {
  return window.matchMedia('(pointer: fine)').matches;
}


/* ═══════════════════════════════════════════════════════════════════════════
   MODULE: Frame Loader
   Preloads WebP frames as Image objects with decode().
═══════════════════════════════════════════════════════════════════════════ */
class FrameLoader {
  /**
   * @param {string} template  - URL template with {n} placeholder
   * @param {number} count     - Total number of frames
   */
  constructor(template, count) {
    this.template = template;
    this.count    = count;
    this.frames   = new Array(count).fill(null); // null = not loaded yet
    this.loaded   = 0;
  }

  /** Load a single frame by 1-based index. Returns a Promise. */
  loadFrame(index) {
    if (this.frames[index - 1]) return Promise.resolve(this.frames[index - 1]);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        img.decode().then(() => {
          this.frames[index - 1] = img;
          this.loaded++;
          resolve(img);
        }).catch(() => {
          this.frames[index - 1] = img;
          this.loaded++;
          resolve(img);
        });
      };
      img.onerror = () => resolve(null);
      img.src = frameURL(this.template, index);
    });
  }

  /** Load frames from `from` to `to` (1-based, inclusive) in order. */
  async loadRange(from, to, onProgress) {
    const total = to - from + 1;
    let done = 0;
    for (let i = from; i <= to; i++) {
      await this.loadFrame(i);
      done++;
      if (onProgress) onProgress(done / total);
    }
  }

  /** Return the nearest loaded frame to `index` (1-based). */
  nearestLoaded(index) {
    const i = clamp(index, 1, this.count) - 1;
    if (this.frames[i]) return this.frames[i];
    // Search outward
    for (let d = 1; d < this.count; d++) {
      if (i - d >= 0 && this.frames[i - d]) return this.frames[i - d];
      if (i + d < this.count && this.frames[i + d]) return this.frames[i + d];
    }
    return null;
  }
}


/* ═══════════════════════════════════════════════════════════════════════════
   MODULE: Canvas Sequence Player
   Draws frame sequences on a canvas with cover/contain fit.
═══════════════════════════════════════════════════════════════════════════ */
class CanvasPlayer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {FrameLoader} loader
   */
  constructor(canvas, loader) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this.loader  = loader;

    this.currentFrame    = 0;   // float, for lerp
    this.targetFrame     = 0;   // integer target from scroll
    this.lastDrawnFrame  = -1;
    this.fadeAlpha       = 0;   // 0 = transparent overlay, 1 = black
    this.lastDrawnFadeAlpha = -1;

    this._dpr = Math.min(window.devicePixelRatio || 1, 2);
    this._resize();
  }

  _resize() {
    this._dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.canvas.width  = Math.round(w * this._dpr);
    this.canvas.height = Math.round(h * this._dpr);
    this.ctx.scale(this._dpr, this._dpr);
    this.lastDrawnFrame = -1; // force redraw
    this.lastDrawnFadeAlpha = -1;
  }

  /** Draw cover-fit (landscape) or contain-fit (portrait). */
  _drawImage(img) {
    const ctx = this.ctx;
    const cw  = this.canvas.clientWidth;
    const ch  = this.canvas.clientHeight;

    ctx.clearRect(0, 0, cw, ch);

    // Background fill
    ctx.fillStyle = '#07080A';
    ctx.fillRect(0, 0, cw, ch);

    if (!img) return;

    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;

    const portrait = ch > cw;

    let dw, dh, dx, dy;

    if (portrait) {
      // Contain-fit: full image visible, centred, black bars if needed
      const scale = Math.min(cw / iw, ch / ih);
      dw = iw * scale;
      dh = ih * scale;
      dx = (cw - dw) / 2;
      dy = (ch - dh) / 2;
    } else {
      // Cover-fit: fill the canvas, crop if needed
      const scale = Math.max(cw / iw, ch / ih);
      dw = iw * scale;
      dh = ih * scale;
      dx = (cw - dw) / 2;
      dy = (ch - dh) / 2;
    }

    ctx.drawImage(img, dx, dy, dw, dh);

    // Black overlay for hero fade-to-black
    if (this.fadeAlpha > 0) {
      ctx.globalAlpha = this.fadeAlpha;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, cw, ch);
      ctx.globalAlpha = 1;
    }
  }

  /** Tick — call every rAF. Returns true if a redraw happened. */
  tick() {
    // Lerp current toward target
    const target = this.targetFrame;
    this.currentFrame += (target - this.currentFrame) * 0.15;
    const frameIndex = Math.round(this.currentFrame);

    if (frameIndex === this.lastDrawnFrame && this.fadeAlpha === this.lastDrawnFadeAlpha) return false;
    this.lastDrawnFrame = frameIndex;
    this.lastDrawnFadeAlpha = this.fadeAlpha;

    const img = this.loader.nearestLoaded(frameIndex + 1); // 1-based
    this._drawImage(img);
    return true;
  }

  /** Set target frame from a progress value (0–1). */
  setProgress(progress) {
    this.targetFrame = Math.round(
      clamp(progress, 0, 1) * (this.loader.count - 1)
    );
  }

  /** Force a specific frame (for static/reduced-motion mode). */
  showFrame(index) {
    this.targetFrame  = index;
    this.currentFrame = index;
    this.lastDrawnFrame = -1;
    this.tick();
  }

  /** Resize canvas to current element size. */
  resize() { this._resize(); }
}


/* ═══════════════════════════════════════════════════════════════════════════
   MODULE: Film Grain
═══════════════════════════════════════════════════════════════════════════ */
function initGrain() {
  const cfg    = CONFIG.grain;
  const canvas = document.getElementById('grainCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Build a noise tile once
  const tileSize = cfg.tileSize;
  const offscreen = document.createElement('canvas');
  offscreen.width  = tileSize;
  offscreen.height = tileSize;
  const offCtx = offscreen.getContext('2d');
  const imageData = offCtx.createImageData(tileSize, tileSize);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const v = Math.random() * 255;
    data[i]     = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }
  offCtx.putImageData(imageData, 0, 0);

  let lastShift = 0;
  const interval = 1000 / cfg.fps;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function draw(now) {
    if (now - lastShift > interval) {
      lastShift = now;
      // Random offset into the tile
      const ox = Math.random() * tileSize;
      const oy = Math.random() * tileSize;
      const pattern = ctx.createPattern(offscreen, 'repeat');

      // Shift the pattern
      const mat = new DOMMatrix();
      mat.translateSelf(-ox, -oy);

      pattern.setTransform(mat);

      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
}


/* ═══════════════════════════════════════════════════════════════════════════
   MODULE: Custom Cursor
═══════════════════════════════════════════════════════════════════════════ */
function initCursor() {
  if (!hasFinePointer() || prefersReducedMotion()) return;

  document.body.classList.add('has-cursor');

  const cursor    = document.getElementById('cursor');
  const cursorBar = document.getElementById('cursorBar');
  const cursorLabel = document.getElementById('cursorLabel');

  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let cx = mx;
  let cy = my;
  const lerpFactor = CONFIG.cursorLerp;

  // Set cursor state on link/button hover
  function setCursorState(state, label = '') {
    cursor.className = state ? `state-${state}` : '';
    cursorLabel.textContent = label;
  }

  function updateCursorAt(target) {
    if (!target) {
      setCursorState(null);
      return;
    }
    const slide = target.closest('.lineup-slide');
    if (slide) {
      const expanded = slide.getAttribute('aria-expanded') === 'true';
      setCursorState('link', expanded ? 'CONFIGURE' : 'OPEN');
      return;
    }
    const el = target.closest('[data-cursor-label], button, a, [role="button"]');
    if (el) {
      const label = el.dataset.cursorLabel || (el.tagName === 'A' ? 'VIEW' : '');
      setCursorState('link', label);
      return;
    }
    setCursorState(null);
  }

  window._updateCursorState = () => {
    const el = document.elementFromPoint(mx, my);
    updateCursorAt(el);
  };

  // Track mouse position & element
  window.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    updateCursorAt(e.target);
  });

  document.addEventListener('mouseover', (e) => {
    updateCursorAt(e.target);
  });

  document.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget) setCursorState(null);
  });

  // Mousedown flash
  document.addEventListener('mousedown', () => {
    cursor.classList.add('state-down');
    setTimeout(() => cursor.classList.remove('state-down'), 120);
  });

  // rAF loop for lerp
  function loop() {
    cx = lerp(cx, mx, lerpFactor);
    cy = lerp(cy, my, lerpFactor);
    cursor.style.transform = `translate(${cx}px, ${cy}px)`;
    requestAnimationFrame(loop);
  }
  loop();
}


/* ═══════════════════════════════════════════════════════════════════════════
   MODULE: Nav hide/show on scroll
═══════════════════════════════════════════════════════════════════════════ */
function initNav() {
  const nav = document.getElementById('siteNav');
  let lastY = 0;

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y > lastY && y > 100) {
      nav.classList.add('hidden');
    } else {
      nav.classList.remove('hidden');
    }
    lastY = y;
  }, { passive: true });
}


/* ═══════════════════════════════════════════════════════════════════════════
   MODULE: Line Reveal (IntersectionObserver based, for non-pinned sections)
═══════════════════════════════════════════════════════════════════════════ */
function wrapForReveal(el) {
  if (el.querySelector('.reveal-line')) return;
  const rawHtml = el.innerHTML;
  const lines = rawHtml.split(/<br\s*\/?>/i);
  el.innerHTML = '';

  lines.forEach((lineHtml, i) => {
    if (!lineHtml.trim()) return;
    const line = document.createElement('span');
    line.className = 'reveal-line';
    const inner = document.createElement('span');
    inner.className = 'reveal-inner';
    inner.style.setProperty('--stagger', i);
    inner.innerHTML = lineHtml.trim();
    line.appendChild(inner);
    el.appendChild(line);
  });
}

function initReveal() {
  const reduceMotion = prefersReducedMotion();

  // Wrap all [data-reveal] elements so their line masks and staggers are structured
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    if (reduceMotion) return;
    wrapForReveal(el);
  });

  if (reduceMotion) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.setAttribute('data-revealed', '');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('[data-reveal]').forEach((el) => {
    if (el.closest('.pin-stage')) return; // Pinned stages are driven by scroll progress
    observer.observe(el);
  });
}


/* ═══════════════════════════════════════════════════════════════════════════
   MODULE: Statement per-word reveal
═══════════════════════════════════════════════════════════════════════════ */
function initStatement() {
  const headline = document.getElementById('statementWords');
  if (!headline) return;

  const text = headline.textContent.trim();
  const words = text.split(/\s+/);
  headline.innerHTML = words
    .map((w) => `<span class="word">${w}&nbsp;</span>`)
    .join('');

  const wordEls = Array.from(headline.querySelectorAll('.word'));
  const total   = wordEls.length;

  function update() {
    const rect = headline.getBoundingClientRect();
    const vh   = window.innerHeight;
    // Reveal word by word as the headline scrolls through the centre (0.85vh -> 0.25vh)
    const startY = vh * 0.85;
    const endY   = vh * 0.25;
    const progress = clamp((startY - rect.top) / (startY - endY), 0, 1);
    const litCount = Math.round(progress * total);
    wordEls.forEach((w, i) => {
      w.classList.toggle('lit', i < litCount);
    });
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
}


/* ═══════════════════════════════════════════════════════════════════════════
   MODULE: Hero Scroll Sequence
═══════════════════════════════════════════════════════════════════════════ */
function initHero(heroLoader) {
  const wrapper  = document.getElementById('heroWrapper');
  const canvas   = document.getElementById('heroCanvas');
  const progLine = document.getElementById('heroProgressLine');
  if (!wrapper || !canvas) return null;

  // Set wrapper height from config
  wrapper.style.height = `${CONFIG.sectionHeights.hero}vh`;

  const player = new CanvasPlayer(canvas, heroLoader);

  // Chapters
  const chapters = CONFIG.heroChapters;
  const chapterEls = chapters.map((ch) => document.getElementById(`chapterCh${ch.id.slice(-1)}`));

  // HUD elements
  const hudChapter = document.getElementById('hudChapter');
  const hudSpeed   = document.getElementById('hudSpeed');
  const hudDist    = document.getElementById('hudDist');

  function getProgress() {
    const top    = wrapper.getBoundingClientRect().top;
    const height = wrapper.offsetHeight - window.innerHeight;
    return clamp(-top / height, 0, 1);
  }

  function updateChapters(p) {
    chapters.forEach((ch, i) => {
      const el = chapterEls[i];
      if (!el) return;
      const active = p >= ch.start && p <= ch.end;
      el.classList.toggle('active', active);
    });

    // HUD chapter number
    const activeIndex = chapters.findIndex((ch) => p >= ch.start && p <= ch.end);
    const num = activeIndex >= 0 ? activeIndex + 1 : Math.ceil(p * 4);
    if (hudChapter) hudChapter.textContent = `0${clamp(num,1,4)} / 04`;

    // HUD counters: speed 0→118, dist 0.0→4.2
    if (hudSpeed) hudSpeed.textContent = String(Math.round(p * 118)).padStart(3, '0');
    if (hudDist)  hudDist.textContent  = (p * 4.2).toFixed(1);

    // Progress line
    if (progLine) progLine.style.width = `${p * 100}%`;

    // Fade-to-black
    const fadeStart = CONFIG.heroFadeStart;
    const fadeEnd   = CONFIG.heroFadeEnd;
    player.fadeAlpha = clamp((p - fadeStart) / (fadeEnd - fadeStart), 0, 1);
  }

  function tick() {
    const p = getProgress();
    player.setProgress(p);
    updateChapters(p);
    player.tick();
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);

  // Resize
  window.addEventListener('resize', () => player.resize());

  return player;
}


/* ═══════════════════════════════════════════════════════════════════════════
   MODULE: Dismantle Scroll Sequence
═══════════════════════════════════════════════════════════════════════════ */
function initDismantle(dismantleLoader) {
  const wrapper  = document.getElementById('dismantleWrapper');
  const canvas   = document.getElementById('dismantleCanvas');
  const progLine = document.getElementById('dismantleProgressLine');
  const calloutLayer = document.getElementById('calloutLayer');
  if (!wrapper || !canvas) return;

  wrapper.style.height = `${CONFIG.sectionHeights.dismantle}vh`;

  const player = new CanvasPlayer(canvas, dismantleLoader);

  // Build callout DOM elements
  const calloutEls = CONFIG.dismantleCallouts.map((c, i) => {
    const div = document.createElement('div');
    div.className = 'callout';
    div.style.setProperty('--callout-i', i);
    div.setAttribute('aria-label', `${c.label}: ${c.detail}`);
    // Position is set relative to canvas size
    div.style.left = `${c.dotX}%`;
    div.style.top  = `${c.dotY}%`;

    div.innerHTML = `
      <div class="callout-dot"></div>
      <div class="callout-line"></div>
      <div class="callout-text">
        <span class="hud callout-label">${c.label}</span>
        <span class="callout-detail">${c.detail}</span>
      </div>
    `;
    calloutLayer.appendChild(div);
    return div;
  });

  const titleEl = document.querySelector('.dismantle-title');

  function getProgress() {
    const top    = wrapper.getBoundingClientRect().top;
    const height = wrapper.offsetHeight - window.innerHeight;
    return clamp(-top / height, 0, 1);
  }

  function tick() {
    const p = getProgress();
    player.setProgress(p);
    player.tick();

    if (progLine) progLine.style.width = `${p * 100}%`;
    if (titleEl) titleEl.classList.toggle('revealed', p > 0.02);

    // Callouts fade in after threshold
    const threshold = CONFIG.dismantleCalloutThreshold;
    const calloutP  = clamp((p - threshold) / (1 - threshold), 0, 1);
    calloutEls.forEach((el, i) => {
      el.classList.toggle('visible', calloutP > i * 0.22);
    });

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
  window.addEventListener('resize', () => player.resize());
  return player;
}


/* ═══════════════════════════════════════════════════════════════════════════
   MODULE: Lineup Accordion
═══════════════════════════════════════════════════════════════════════════ */
function initLineup() {
  const track = document.getElementById('lineupTrack');
  if (!track) return;

  const models = CONFIG.lineup;
  let openIndex = 0;
  let hoverTimer = null;

  // Build slides
  models.forEach((model, i) => {
    const slide = document.createElement('article');
    slide.className  = 'lineup-slide';
    slide.setAttribute('role', 'tab');
    slide.setAttribute('aria-expanded', i === openIndex ? 'true' : 'false');
    slide.setAttribute('aria-label', `Model ${model.num}: ${model.name}`);
    slide.tabIndex   = 0;
    slide.style.setProperty('--slide-i', i);

    const colorSwatches = model.colors.map((color, ci) => `
      <div
        class="slide-swatch${ci === 0 ? ' active' : ''}"
        style="background:${color}"
        role="radio"
        aria-checked="${ci === 0}"
        aria-label="Colour option ${ci + 1}"
        tabindex="-1"
      ></div>
    `).join('');

    const isOnePowerSpec = model.power === '—' ? 'Concept' : model.power;

    slide.innerHTML = `
      <div class="slide-floor" aria-hidden="true"></div>

      <!-- Car image -->
      <img
        class="slide-img"
        src="${model.img}"
        alt="${model.alt}"
        loading="lazy"
        style="object-position: ${model.imgPos || '50% center'}"
        onerror="this.style.opacity='0.1'"
      />

      <!-- Closed state labels -->
      <span class="slide-num hud" aria-hidden="true">${model.num}</span>
      <span class="slide-name-rotated hud" aria-hidden="true">${model.name}</span>

      <!-- Open state: Top-left Model Name -->
      <div class="slide-top" aria-hidden="${i === openIndex ? 'false' : 'true'}">
        <p class="display slide-model-name">${model.name}</p>
      </div>

      <!-- Open state: Under the car content -->
      <div class="slide-bottom" aria-hidden="${i === openIndex ? 'false' : 'true'}">
        <p class="body slide-tagline" style="--stagger: 0">${model.tagline}</p>
        <div class="slide-specs-row" role="list" aria-label="Specifications" style="--stagger: 1">
          <div class="slide-spec" role="listitem">
            <span class="hud slide-spec-label">RANGE</span>
            <span class="hud slide-spec-val">${model.range}</span>
          </div>
          <div class="slide-spec" role="listitem">
            <span class="hud slide-spec-label">0–100 KM/H</span>
            <span class="hud slide-spec-val">${model.accel}</span>
          </div>
          <div class="slide-spec" role="listitem">
            <span class="hud slide-spec-label">POWER</span>
            <span class="hud slide-spec-val">${isOnePowerSpec}</span>
          </div>
        </div>
        <div class="slide-swatches" role="radiogroup" aria-label="Colour options" style="--stagger: 2">
          ${colorSwatches}
        </div>
        <a href="#reserve" class="slide-cta body" data-cursor-label="CONFIGURE" style="--stagger: 3">Configure →</a>
      </div>
    `;

    // Hover (desktop) — debounced 80ms
    slide.addEventListener('mouseenter', () => {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => openSlide(i), 80);
    });

    slide.addEventListener('mouseleave', () => {
      clearTimeout(hoverTimer);
    });

    // Touch / click
    slide.addEventListener('click', () => openSlide(i));

    // Keyboard
    slide.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openSlide(i);
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIdx = Math.min(i + 1, models.length - 1);
        const next = track.querySelectorAll('.lineup-slide');
        next[nextIdx]?.focus();
        openSlide(nextIdx);
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIdx = Math.max(i - 1, 0);
        const prev = track.querySelectorAll('.lineup-slide');
        prev[prevIdx]?.focus();
        openSlide(prevIdx);
      }
    });

    // Swatch clicks
    slide.querySelectorAll('.slide-swatch').forEach((swatch, ci) => {
      swatch.addEventListener('click', (e) => {
        e.stopPropagation();
        slide.querySelectorAll('.slide-swatch').forEach((s, si) => {
          s.classList.toggle('active', si === ci);
          s.setAttribute('aria-checked', si === ci);
        });
      });
    });

    track.appendChild(slide);
  });

  function openSlide(index) {
    openIndex = index;
    const slides = track.querySelectorAll('.lineup-slide');
    slides.forEach((slide, i) => {
      const isOpen = i === index;
      slide.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      const topContent = slide.querySelector('.slide-top');
      if (topContent) topContent.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
      const bottomContent = slide.querySelector('.slide-bottom');
      if (bottomContent) bottomContent.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    });

    // Notify cursor if currently hovering
    const hovered = document.querySelector('.lineup-slide:hover');
    if (hovered && window._updateCursorState) {
      window._updateCursorState();
    }
  }

  // Initial open state
  openSlide(0);

  // Entrance animation: slides rise in staggered
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const slides = track.querySelectorAll('.lineup-slide');
      slides.forEach((slide, i) => {
        setTimeout(() => slide.classList.add('entered'), i * 80);
      });
      observer.disconnect();
    });
  }, { threshold: 0.2 });

  observer.observe(track);
}


/* ═══════════════════════════════════════════════════════════════════════════
   MODULE: Reduced Motion — Static Frames
═══════════════════════════════════════════════════════════════════════════ */
function initStaticMode(heroLoader, dismantleLoader) {
  // Hero: show 4 static frames at chapters 0%, 35%, 65%, 100%
  const heroCanvas     = document.getElementById('heroCanvas');
  const dismantleCanvas = document.getElementById('dismantleCanvas');

  if (heroCanvas) {
    const heroPlayer = new CanvasPlayer(heroCanvas, heroLoader);
    const stages = [0, 0.35, 0.65, 1.0];
    // Show frames based on scroll proximity — simplified
    const heroWrapper = document.getElementById('heroWrapper');
    heroWrapper.style.height = 'auto';

    // Show 4 static "chapters" stacked
    const chapters = CONFIG.heroChapters;
    const chEls = chapters.map((ch) => document.getElementById(`chapterCh${ch.id.slice(-1)}`));
    chEls.forEach((el) => {
      if (el) el.classList.add('active');
    });

    // Just draw frame 1 on the canvas
    heroLoader.loadFrame(1).then(() => heroPlayer.showFrame(0));
  }

  if (dismantleCanvas) {
    const dismantlePlayer = new CanvasPlayer(dismantleCanvas, dismantleLoader);
    dismantleLoader.loadFrame(1).then(() => dismantlePlayer.showFrame(0));
  }
}


/* ═══════════════════════════════════════════════════════════════════════════
   MODULE: Preloader
═══════════════════════════════════════════════════════════════════════════ */
function runPreloader(heroLoader, onReveal) {
  const preloader = document.getElementById('preloader');
  const barFill   = document.getElementById('preloaderBarFill');
  const counter   = document.getElementById('preloaderCounter');
  if (!preloader) { onReveal(); return; }

  const eagerCount = CONFIG.frames.hero.preloadEager;

  function setProgress(pct) {
    const p = clamp(pct, 0, 1);
    if (barFill) barFill.style.transform = `scaleX(${p})`;
    if (counter) counter.textContent = String(Math.round(p * 100)).padStart(3, '0');
  }

  heroLoader.loadRange(1, eagerCount, (p) => {
    setProgress(p);
  }).then(() => {
    // Flash and fade out
    setProgress(1);
    if (barFill) barFill.classList.add('flash');

    setTimeout(() => {
      if (preloader) {
        preloader.classList.add('fade-out');
        setTimeout(() => {
          preloader.classList.add('hidden');
        }, 900);
      }
      onReveal();
    }, 280);
  });
}


/* ═══════════════════════════════════════════════════════════════════════════
   MAIN — Boot
═══════════════════════════════════════════════════════════════════════════ */
(function boot() {
  // Determine which frame set to use
  const mobile      = isMobile();
  const heroTpl     = mobile ? CONFIG.frames.hero.mobilePath : CONFIG.frames.hero.path;
  const dismantleTpl = mobile ? CONFIG.frames.dismantle.mobilePath : CONFIG.frames.dismantle.path;

  const heroLoader      = new FrameLoader(heroTpl,      CONFIG.frames.hero.count);
  const dismantleLoader = new FrameLoader(dismantleTpl, CONFIG.frames.dismantle.count);

  // Non-visual modules can start immediately
  initNav();
  initCursor();
  initGrain();
  initStatement();
  initLineup();
  initReveal();

  const reduceMotion = prefersReducedMotion();

  if (reduceMotion) {
    // Skip preloader, show static frames
    const preloader = document.getElementById('preloader');
    if (preloader) preloader.classList.add('hidden');
    initStaticMode(heroLoader, dismantleLoader);
    return;
  }

  // Initialize canvas players right away so the stage and first frame are ready behind preloader
  initHero(heroLoader);
  initDismantle(dismantleLoader);

  // Preloader: loads first 40 hero frames, then reveals page
  runPreloader(heroLoader, () => {
    // Continue loading remaining hero frames in background
    const eagerCount = CONFIG.frames.hero.preloadEager;
    heroLoader.loadRange(eagerCount + 1, CONFIG.frames.hero.count);

    // Then load dismantle frames
    dismantleLoader.loadRange(1, CONFIG.frames.dismantle.count);
  });
})();
