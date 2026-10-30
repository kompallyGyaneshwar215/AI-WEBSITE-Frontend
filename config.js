/**
 * NOCTIS — Site Configuration
 * All tuneable values live here. Edit freely.
 */

const CONFIG = {

  /* ── Frame sequences ──────────────────────────────────────────────────── */
  frames: {
    hero: {
      count:      550,          // UPDATE after conversion script reports the real number
      path:       'assets/frames/hero/frame_{n}.webp',
      mobilePath: 'assets/frames/hero-mobile/frame_{n}.webp',
      preloadEager: 40,         // frames loaded before page reveal
    },
    dismantle: {
      count:      200,          // UPDATE after conversion script reports the real number
      path:       'assets/frames/dismantle/frame_{n}.webp',
      mobilePath: 'assets/frames/dismantle-mobile/frame_{n}.webp',
      preloadEager: 20,
    },
  },

  /* ── Section scroll heights (vh units) ───────────────────────────────── */
  sectionHeights: {
    hero:      600,   // vh — total scroll distance for hero pin
    dismantle: 350,   // vh — total scroll distance for dismantle pin
  },

  /* ── Hero text chapters ───────────────────────────────────────────────── */
  // [progressStart, progressEnd] — both 0–1
  heroChapters: [
    { id: 'ch0', start: 0.00, end: 0.12 },
    { id: 'ch1', start: 0.22, end: 0.40 },
    { id: 'ch2', start: 0.50, end: 0.68 },
    { id: 'ch3', start: 0.80, end: 1.00 },
  ],

  /* ── Hero canvas fade-to-black ────────────────────────────────────────── */
  heroFadeStart: 0.95,   // progress at which fade begins
  heroFadeEnd:   1.00,   // progress at which canvas is fully black

  /* ── Dismantle callout positions ──────────────────────────────────────── */
  // pct coordinates are percentages of the canvas (x from left, y from top)
  // These appear after dismantleCalloutThreshold progress
  dismantleCalloutThreshold: 0.70,
  dismantleCallouts: [
    {
      id: 'body',
      label: 'BODY',
      detail: 'Carbon composite monocoque',
      dotX: 38,  // % of canvas width
      dotY: 28,  // % of canvas height
    },
    {
      id: 'battery',
      label: 'BATTERY',
      detail: '110 kWh structural pack',
      dotX: 52,
      dotY: 62,
    },
    {
      id: 'drive',
      label: 'DRIVE',
      detail: 'Dual axial-flux motors, 680 kW',
      dotX: 72,
      dotY: 58,
    },
    {
      id: 'light',
      label: 'LIGHT',
      detail: 'Single-line LED signature',
      dotX: 18,
      dotY: 44,
    },
  ],

  /* ── Lineup models ────────────────────────────────────────────────────── */
  lineup: [
    {
      id:       'gt-e',
      num:      '01',
      name:     'GT-E',
      tagline:  'The grand tourer.',
      range:    '640 km',
      accel:    '3.1 s',
      power:    '680 kW',
      img:      'assets/cars/gt-e.webp',
      imgPos:   '60% center',   // object-position — tune to show car
      alt:      'NOCTIS GT-E — matte graphite grand tourer coupe, side profile facing right',
      colors:   ['#2C2E30', '#EDEAE4', '#1A2A3A', '#1C0B0A'],
    },
    {
      id:       's',
      num:      '02',
      name:     'S',
      tagline:  'Four doors, no compromise.',
      range:    '600 km',
      accel:    '3.6 s',
      power:    '520 kW',
      img:      'assets/cars/s.webp',
      imgPos:   '40% center',
      alt:      'NOCTIS S — sport sedan in the night city, rear-side view',
      colors:   ['#EDEAE4', '#2C2E30', '#8A8F98', '#1C0B0A'],
    },
    {
      id:       'x',
      num:      '03',
      name:     'X',
      tagline:  'Higher, never heavier.',
      range:    '560 km',
      accel:    '4.2 s',
      power:    '480 kW',
      img:      'assets/cars/x.webp',
      imgPos:   '50% center',
      alt:      'NOCTIS X — dark SUV with a single white front light bar',
      colors:   ['#0D1B2A', '#2C2E30', '#EDEAE4', '#1C0B0A'],
    },
    {
      id:       'r',
      num:      '04',
      name:     'R',
      tagline:  'Built for the track.',
      range:    '420 km',
      accel:    '2.4 s',
      power:    '900 kW',
      img:      'assets/cars/r.webp',
      imgPos:   '25% center',   // left car in the dual-car studio shot
      alt:      'NOCTIS R — two sport cars in dark studio, left car side profile',
      colors:   ['#121418', '#E1251B', '#2C2E30', '#EDEAE4'],
    },
    {
      id:       'one',
      num:      '05',
      name:     'ONE',
      tagline:  'The future, early.',
      range:    'Concept',
      accel:    '—',
      power:    '—',
      img:      'assets/cars/one.webp',
      imgPos:   '50% 40%',
      alt:      'NOCTIS ONE — concept hypercar in night city, rear view with red tail light bar',
      colors:   ['#C0C4C8', '#EDEAE4', '#121418', '#8A8F98'],
    },
  ],

  /* ── Grain overlay ────────────────────────────────────────────────────── */
  grain: {
    tileSize:     200,   // px — offscreen noise tile
    opacity:      0.035, // 3.5 %
    fps:          8,     // shifts per second
  },

  /* ── Cursor lerp ──────────────────────────────────────────────────────── */
  cursorLerp: 0.18,

  /* ── Animation easing ─────────────────────────────────────────────────── */
  easing: 'cubic-bezier(0.16,1,0.3,1)',

};

export default CONFIG;
