(function () {
  "use strict";

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // ——— Scroll reveals + progress + parallax ———
  const reveals = document.querySelectorAll(".reveal");
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const progressEl = document.getElementById("scrollProgress");
  const portraitEl = document.getElementById("heroPortrait");
  const letterCanvasEl = document.getElementById("letterField");
  const heroEarly = document.querySelector(".hero");
  let scrollY = 0;

  if (reveals.length && !prefersReduced) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            entry.target.querySelectorAll(".reveal-child").forEach(function (child, i) {
              child.style.transitionDelay = (0.05 + i * 0.1).toFixed(2) + "s";
            });
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -10% 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  function onScroll() {
    scrollY = window.scrollY || 0;
    if (progressEl) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, scrollY / max) : 0;
      progressEl.style.width = (p * 100).toFixed(2) + "%";
    }
    if (prefersReduced) return;
    const h = heroEarly ? heroEarly.offsetHeight : window.innerHeight;
    const t = Math.min(1, scrollY / (h * 0.85));
    if (portraitEl) {
      const narrow = window.innerWidth <= 820;
      const base = narrow ? "translateX(50%) " : "";
      portraitEl.style.transform =
        base +
        "translate3d(0," +
        (t * 48).toFixed(1) +
        "px,0) scale(" +
        (1 - t * 0.08).toFixed(3) +
        ")";
      portraitEl.style.opacity = String(Math.max(0, 1 - t * 1.15));
    }
    if (letterCanvasEl) {
      letterCanvasEl.style.opacity = String(Math.max(0, 1 - t * 0.95));
      letterCanvasEl.style.transform = "translate3d(0," + (t * 36).toFixed(1) + "px,0)";
    }
    const pixelEl = document.getElementById("pixelPortrait");
    if (pixelEl) {
      pixelEl.style.opacity = String(Math.max(0, 1 - t * 0.95));
      pixelEl.style.transform = "translate3d(0," + (t * 36).toFixed(1) + "px,0)";
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const hero = heroEarly;
  if (!hero) return;

  // ——— Background letter field (repel) ———
  const letterCanvas = document.getElementById("letterField");
  const letterCtx = letterCanvas && letterCanvas.getContext("2d", { alpha: true });

  const GLYPHS = (
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789{}[]<>/|*=+-_.;:" +
    "TSJSPYGOALILLMRAGMCPAPISSEASTCLIUIUXCICD" +
    "NODEREACTNEXTHONOFLUTTERDOCKERGITSQL"
  ).split("");

  const letters = [];
  let lw = 0;
  let lh = 0;
  let ldpr = 1;
  let mx = -9999;
  let my = -9999;
  let clearX = 0;
  let clearY = 0;
  let clearR = 0;

  function updateClearZone() {
    const portrait = document.getElementById("heroPortrait");
    if (!portrait) return;
    const hr = hero.getBoundingClientRect();
    const pr = portrait.getBoundingClientRect();
    clearX = pr.left - hr.left + pr.width / 2;
    clearY = pr.top - hr.top + pr.height / 2;
    clearR = Math.max(pr.width, pr.height) * 0.58;
  }

  function seedLetters() {
    letters.length = 0;
    const n = Math.max(240, Math.min(1000, Math.floor((lw * lh) / 2600)));
    const clearSq = clearR * clearR;
    let tries = 0;
    while (letters.length < n && tries < n * 10) {
      tries++;
      const x = Math.random() * lw;
      const y = Math.random() * lh;
      const dx = x - clearX;
      const dy = y - clearY;
      if (dx * dx + dy * dy < clearSq) continue;
      letters.push({
        ch: GLYPHS[(Math.random() * GLYPHS.length) | 0],
        hx: x,
        hy: y,
        x: x,
        y: y,
        vx: 0,
        vy: 0,
        size: 10 + Math.random() * 8,
        alpha: 0.28 + Math.random() * 0.48,
        phase: Math.random() * Math.PI * 2,
        drift: 0.15 + Math.random() * 0.35,
      });
    }
  }

  function fitLetterCanvas() {
    if (!letterCanvas || !letterCtx) return;
    const rect = hero.getBoundingClientRect();
    ldpr = Math.min(2, window.devicePixelRatio || 1);
    lw = Math.max(1, Math.floor(rect.width));
    lh = Math.max(1, Math.floor(rect.height));
    letterCanvas.width = Math.floor(lw * ldpr);
    letterCanvas.height = Math.floor(lh * ldpr);
    letterCanvas.style.width = lw + "px";
    letterCanvas.style.height = lh + "px";
    letterCtx.setTransform(ldpr, 0, 0, ldpr, 0, 0);
    updateClearZone();
    seedLetters();
  }

  function drawLetters(t) {
    if (!letterCtx) return;
    letterCtx.clearRect(0, 0, lw, lh);
    letterCtx.textAlign = "center";
    letterCtx.textBaseline = "middle";

    const time = t * 0.001;
    const repelR = Math.min(lw, lh) * 0.34;
    const repelSq = repelR * repelR;
    const enable = finePointer && !prefersReduced && mx > -1000;

    for (let i = 0; i < letters.length; i++) {
      const p = letters[i];
      if (prefersReduced) {
        p.x = p.hx;
        p.y = p.hy;
      } else {
        const idleX = Math.sin(time * p.drift + p.phase) * 4;
        const idleY = Math.cos(time * p.drift * 0.85 + p.phase) * 3;
        let tx = p.hx + idleX;
        let ty = p.hy + idleY;

        if (enable) {
          const dx = p.x - mx;
          const dy = p.y - my;
          const dsq = dx * dx + dy * dy;
          if (dsq < repelSq && dsq > 0.01) {
            const dist = Math.sqrt(dsq);
            const force = 1 - dist / repelR;
            // Stronger near-cursor blast + wider falloff
            const push = force * force * (85 + force * 40);
            tx += (dx / dist) * push;
            ty += (dy / dist) * push;
            p.vx += (dx / dist) * force * 1.8;
            p.vy += (dy / dist) * force * 1.8;
          }
        }

        p.vx += (tx - p.x) * 0.11;
        p.vy += (ty - p.y) * 0.11;
        p.vx *= 0.72;
        p.vy *= 0.72;
        p.x += p.vx;
        p.y += p.vy;
      }

      letterCtx.globalAlpha = p.alpha;
      letterCtx.fillStyle = i % 9 === 0 ? "#7ec8c3" : "#d4d4d0";
      letterCtx.font = "500 " + p.size + "px \"IBM Plex Mono\", monospace";
      letterCtx.fillText(p.ch, p.x, p.y);
    }
    letterCtx.globalAlpha = 1;
  }

  // ——— Pixel portrait: fly in from across the hero → circular photo ———
  const pixelCanvas = document.getElementById("pixelPortrait");
  const pixelCtx = pixelCanvas && pixelCanvas.getContext("2d", { alpha: true });
  const pixels = [];
  let grid = 32;
  let assembleT = 0;
  let assembled = false;
  let pixelReady = false;
  let sourceImg = null;
  let portraitBox = { x: 0, y: 0, s: 200 };

  function fitPixelCanvas() {
    if (!pixelCanvas || !pixelCtx) return;
    const rect = hero.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    pixelCanvas.width = Math.floor(w * dpr);
    pixelCanvas.height = Math.floor(h * dpr);
    pixelCanvas.style.width = w + "px";
    pixelCanvas.style.height = h + "px";
    pixelCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function buildPixels() {
    if (!pixelCtx || !sourceImg || !sourceImg.naturalWidth) return;
    fitPixelCanvas();
    updateClearZone();

    const portrait = document.getElementById("heroPortrait");
    const hr = hero.getBoundingClientRect();
    const pr = portrait.getBoundingClientRect();
    const px = pr.left - hr.left;
    const py = pr.top - hr.top;
    const ps = Math.min(pr.width, pr.height);
    portraitBox = { x: px, y: py, s: ps };

    const heroW = hr.width;
    const heroH = hr.height;
    grid = ps < 180 ? 26 : 34;

    const off = document.createElement("canvas");
    off.width = grid;
    off.height = grid;
    const octx = off.getContext("2d");
    const scale = Math.max(grid / sourceImg.naturalWidth, grid / sourceImg.naturalHeight);
    const dw = sourceImg.naturalWidth * scale;
    const dh = sourceImg.naturalHeight * scale;
    octx.drawImage(sourceImg, (grid - dw) / 2, (grid - dh) / 2, dw, dh);
    const data = octx.getImageData(0, 0, grid, grid).data;

    const cell = ps / grid;
    pixels.length = 0;
    assembleT = 0;
    assembled = false;
    if (portrait) portrait.classList.remove("is-built");

    for (let y = 0; y < grid; y++) {
      for (let x = 0; x < grid; x++) {
        const nx = (x + 0.5) / grid - 0.5;
        const ny = (y + 0.5) / grid - 0.5;
        // Circular home mask
        if (nx * nx + ny * ny > 0.25) continue;

        const i = (y * grid + x) * 4;
        const hx = px + (x + 0.5) * cell;
        const hy = py + (y + 0.5) * cell;

        // Spawn from all over the hero (and slightly beyond edges)
        const edge = Math.random();
        let sx;
        let sy;
        if (edge < 0.25) {
          sx = -40 - Math.random() * heroW * 0.35;
          sy = Math.random() * heroH;
        } else if (edge < 0.5) {
          sx = heroW + 40 + Math.random() * heroW * 0.35;
          sy = Math.random() * heroH;
        } else if (edge < 0.75) {
          sx = Math.random() * heroW;
          sy = -40 - Math.random() * heroH * 0.35;
        } else {
          sx = Math.random() * heroW;
          sy = heroH + 40 + Math.random() * heroH * 0.35;
        }

        pixels.push({
          r: data[i],
          g: data[i + 1],
          b: data[i + 2],
          hx: hx,
          hy: hy,
          sx: sx,
          sy: sy,
          x: sx,
          y: sy,
          sz: 0.2 + Math.random() * 0.5,
          z: 0.2 + Math.random() * 0.5,
          hz: 1,
          cell: cell,
        });
      }
    }
    pixelReady = true;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function drawSharpCircle() {
    const { x, y, s } = portraitBox;
    pixelCtx.save();
    pixelCtx.beginPath();
    pixelCtx.arc(x + s / 2, y + s / 2, s / 2, 0, Math.PI * 2);
    pixelCtx.clip();
    const scale = Math.max(s / sourceImg.naturalWidth, s / sourceImg.naturalHeight);
    const dw = sourceImg.naturalWidth * scale;
    const dh = sourceImg.naturalHeight * scale;
    pixelCtx.drawImage(sourceImg, x + (s - dw) / 2, y + (s - dh) / 2, dw, dh);
    pixelCtx.restore();
  }

  function finishAssemble() {
    assembled = true;
    const portrait = document.getElementById("heroPortrait");
    if (portrait) portrait.classList.add("is-built");
  }

  function drawPixels(dt) {
    if (!pixelCtx || !pixelReady) return;
    const w = hero.getBoundingClientRect().width;
    const h = hero.getBoundingClientRect().height;
    pixelCtx.clearRect(0, 0, w, h);

    if (prefersReduced) {
      finishAssemble();
      drawSharpCircle();
      return;
    }

    if (assembled) {
      drawSharpCircle();
      return;
    }

    // Shared clock — every block finishes together, then final image is instant
    assembleT += dt;
    const FLIGHT = 1.25;
    const t = Math.min(1, assembleT / FLIGHT);
    const e = easeOutCubic(t);

    for (let i = 0; i < pixels.length; i++) {
      const p = pixels[i];
      p.x = p.sx + (p.hx - p.sx) * e;
      p.y = p.sy + (p.hy - p.sy) * e;
      p.z = p.sz + (p.hz - p.sz) * e;
      const s = p.cell * p.z;
      pixelCtx.fillStyle = "rgb(" + p.r + "," + p.g + "," + p.b + ")";
      pixelCtx.fillRect(p.x - s / 2, p.y - s / 2, s * 0.92, s * 0.92);
    }

    if (t >= 1) {
      finishAssemble();
      drawSharpCircle();
    }
  }

  // ——— Main loop ———
  let last = performance.now();
  let raf = 0;
  let running = true;

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    drawLetters(now);
    drawPixels(dt);
    raf = requestAnimationFrame(frame);
  }

  function onPointerMove(e) {
    if (!finePointer || prefersReduced) return;
    const rect = hero.getBoundingClientRect();
    mx = e.clientX - rect.left;
    my = e.clientY - rect.top;
  }

  function onPointerLeave() {
    mx = -9999;
    my = -9999;
  }

  const bootImg = new Image();
  bootImg.src = "assets/avatar.png?v=" + Date.now();
  bootImg.onload = function () {
    sourceImg = bootImg;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        fitLetterCanvas();
        buildPixels();
        last = performance.now();
        raf = requestAnimationFrame(frame);
      });
    });
  };

  window.addEventListener("mousemove", onPointerMove, { passive: true });
  hero.addEventListener("mouseleave", onPointerLeave);

  let resizeTimer = 0;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      fitLetterCanvas();
      if (sourceImg) buildPixels();
    }, 140);
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      running = false;
      cancelAnimationFrame(raf);
    } else {
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  });
})();
