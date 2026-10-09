/* =========================================================
   HOLLOW HILL — Halloween Bash
   GSAP 3.15 · ScrollTrigger · ScrollToPlugin · SplitText
   Photography: Unsplash · Icons: game-icons.net (CC BY 3.0), inlined by `npm run icons`
   ========================================================= */
(() => {
  "use strict";

  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, SplitText);

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const PARTY = new Date(2026, 9, 31, 20, 0, 0); // 31 Oct 2026, 8pm local time
  const STORAGE_KEY = "hollow-hill-rsvp";
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const dur = (d) => (prefersReduced ? 0 : d);

  // Where the zoom lands in the hero photo: the lit upper window above the front door,
  // as fractions of the image (the photo is 3:2).
  const HERO_FOCUS = { aspect: 1.5, u: 0.556, v: 0.52 };

  // Seeded PRNG so the bat flock flies the same paths on every load
  function mulberry32(a) {
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function buildBats() {
    const bat = (className) => {
      const el = document.createElement("div");
      el.className = className;
      el.innerHTML = '<svg class="icon"><use href="#i-bat"/></svg>';
      return el;
    };
    const heroBats = $(".hero-bats");
    for (let i = 0; i < 6; i++) heroBats.appendChild(bat("hero-bat"));
    const flock = $(".bat-flock");
    for (let i = 0; i < 16; i++) flock.appendChild(bat("flock-bat"));
  }

  /* =========================================================
     INTERACTIONS (no scroll dependency)
     ========================================================= */
  function initCountdown() {
    const nums = Object.fromEntries($$(".cd-num").map((n) => [n.dataset.unit, n]));
    const last = {};
    let timer = 0;

    function tick() {
      const diff = PARTY.getTime() - Date.now();
      if (diff <= 0) {
        $(".countdown-grid").hidden = true;
        $(".countdown-label").hidden = true;
        $(".countdown-done").hidden = false;
        clearInterval(timer);
        return;
      }
      const s = Math.floor(diff / 1000);
      const values = {
        days: Math.floor(s / 86400),
        hours: Math.floor((s % 86400) / 3600),
        minutes: Math.floor((s % 3600) / 60),
        seconds: s % 60,
      };
      for (const unit in values) {
        const v = String(values[unit]).padStart(2, "0");
        if (last[unit] === v) continue;
        nums[unit].textContent = v;
        if (last[unit] !== undefined && !prefersReduced) {
          gsap.fromTo(nums[unit], { yPercent: -45, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.35, ease: "power2.out" });
        }
        last[unit] = v;
      }
    }
    tick();
    timer = setInterval(tick, 1000);
  }

  function smoothScrollTo(target, offsetY = 0) {
    gsap.to(window, {
      scrollTo: { y: target, offsetY, autoKill: false },
      duration: dur(1.5),
      ease: "power3.inOut",
    });
  }

  function initNavLinks() {
    $$("[data-scroll]").forEach((link) => {
      link.addEventListener("click", (e) => {
        const hash = link.getAttribute("href");
        if (!hash || !hash.startsWith("#")) return;
        e.preventDefault();
        if (hash === "#top") return smoothScrollTo(0);
        const el = $(hash);
        if (!el) return;
        // a pinned section is wrapped in a pin-spacer; that wrapper holds its real scroll position
        const target = el.parentElement.classList.contains("pin-spacer") ? el.parentElement : el;
        smoothScrollTo(target);
      });
    });
  }

  function initMobileNav() {
    const toggle = $("#navToggle");
    const drawer = $("#mobileNavDrawer");
    const closeBtn = $("#mobileNavClose");
    const backdrop = $("#mobileNavBackdrop");

    if (!toggle || !drawer) return;

    function openDrawer() {
      drawer.classList.add("is-open");
      toggle.classList.add("is-active");
      toggle.setAttribute("aria-expanded", "true");
      drawer.setAttribute("aria-hidden", "false");
      document.body.classList.add("is-drawer-open");
      document.documentElement.classList.add("is-drawer-open");
    }

    function closeDrawer() {
      drawer.classList.remove("is-open");
      toggle.classList.remove("is-active");
      toggle.setAttribute("aria-expanded", "false");
      drawer.setAttribute("aria-hidden", "true");
      document.body.classList.remove("is-drawer-open");
      document.documentElement.classList.remove("is-drawer-open");
    }

    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = drawer.classList.contains("is-open");
      if (isOpen) closeDrawer();
      else openDrawer();
    });

    if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
    if (backdrop) backdrop.addEventListener("click", closeDrawer);

    // Close on any link click inside drawer
    $$("a[data-scroll]", drawer).forEach((link) => {
      link.addEventListener("click", () => {
        closeDrawer();
      });
    });

    // Close on Escape key
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && drawer.classList.contains("is-open")) {
        closeDrawer();
      }
    });
  }

  function initMobilePassBar() {
    const passBar = $("#mobilePassBar");
    const passesSection = $("#passes");
    if (!passBar || !passesSection) return;

    ScrollTrigger.create({
      trigger: passesSection,
      start: "top 80%",
      end: "bottom 20%",
      onEnter: () => passBar.classList.add("is-hidden"),
      onLeave: () => passBar.classList.remove("is-hidden"),
      onEnterBack: () => passBar.classList.add("is-hidden"),
      onLeaveBack: () => passBar.classList.remove("is-hidden"),
    });
  }



  function saveRsvp(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (_) { /* storage blocked: ticket still shows */ }
  }
  function loadRsvp() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch (_) { return null; }
  }
  function clearRsvp() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* nothing to clear */ }
  }

  const TIERS = {
    male_stag: {
      name: "Male Stag",
      price: 1999,
      type: "single",
      min: 1,
      max: 20,
      badge: "STAG ENTRY",
      rateLabel: "RATE PER PERSON",
      unitSingular: "SOUL",
      unitPlural: "SOULS",
    },
    female_stag: {
      name: "Female Stag",
      price: 1799,
      type: "single",
      min: 1,
      max: 20,
      badge: "STAG ENTRY",
      rateLabel: "RATE PER PERSON",
      unitSingular: "SOUL",
      unitPlural: "SOULS",
    },
    couple: {
      name: "Couple",
      price: 3599,
      type: "couple",
      min: 1,
      max: 10,
      badge: "MOST POPULAR",
      rateLabel: "RATE PER COUPLE",
      unitSingular: "COUPLE (2 SOULS)",
      unitPlural: "COUPLES",
    },
  };

  const bookingState = {
    tierId: "couple",
    qty: 1,
  };

  function formatRupees(num) {
    return "₹" + Number(num).toLocaleString("en-IN");
  }

  function showTicket(data, animate) {
    const wrap = $("#ticketWrap");
    if (!wrap) return;

    $$(".t-name").forEach((el) => (el.textContent = data.name));
    $$(".t-guests").forEach((el) => (el.textContent = data.souls || `${data.guests} Souls`));
    $$(".t-tier").forEach((el) => (el.textContent = data.tier));
    $$(".t-amount").forEach((el) => (el.textContent = data.amount || "Paid"));
    $$(".t-no").forEach((el) => (el.textContent = data.no || "Nº HH-2026-8842"));

    wrap.hidden = false;
    ScrollTrigger.refresh();

    const stamp = $(".ticket-stamp");
    if (!animate || prefersReduced) {
      if (stamp) gsap.set(stamp, { rotation: -12 });
      return;
    }

    smoothScrollTo(wrap, 120);
    gsap.timeline({ delay: 0.4 })
      .fromTo(".ticket", { y: 70, scale: 0.94, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.85, ease: "back.out(1.5)" })
      .fromTo(stamp, { scale: 3, rotation: -40, autoAlpha: 0 }, { scale: 1, rotation: -12, autoAlpha: 0.9, duration: 0.35, ease: "power4.in" }, "+=0.2")
      .fromTo(".ticket", { x: -6 }, { x: 0, duration: 0.4, ease: "elastic.out(1, 0.2)" });
  }

  function initPasses() {
    const tierCards = $$(".pass-card");
    const nameInput = $("#guestName");
    const phoneInput = $("#guestPhone");
    const emailInput = $("#guestEmail");
    const instaInput = $("#guestInsta");
    const costumeInput = $("#guestCostume");
    const form = $("#bookingForm");
    const formError = $("#formError");

    const tierNameEl = $("#calcTierName");
    const tierBadgeEl = $("#calcTierBadge");
    const qtyEl = $("#calcQty");
    const unitEl = $("#calcUnit");
    const decBtn = $("#calcDec");
    const incBtn = $("#calcInc");
    const rateTypeLabel = $("#rateTypeLabel");
    const rateEachEl = $("#calcRateEach");
    const formulaEl = $("#calcBreakdownFormula");
    const totalEl = $("#calcTotalAmount");
    const discountAlert = $("#calcDiscountAlert");
    const discountText = $("#calcDiscountText");

    function renderCalc() {
      const tier = TIERS[bookingState.tierId];
      if (!tier) return;

      if (bookingState.qty < tier.min) bookingState.qty = tier.min;
      if (bookingState.qty > tier.max) bookingState.qty = tier.max;

      if (tierNameEl) tierNameEl.textContent = tier.name;
      if (tierBadgeEl) tierBadgeEl.textContent = tier.badge;
      if (qtyEl) qtyEl.textContent = bookingState.qty;

      if (unitEl) {
        if (tier.type === "couple") {
          unitEl.textContent = bookingState.qty === 1 ? "1 COUPLE = 2 SOULS" : `${bookingState.qty} COUPLES = ${bookingState.qty * 2} SOULS`;
        } else {
          unitEl.textContent = bookingState.qty === 1 ? tier.unitSingular : `${bookingState.qty} ${tier.unitPlural}`;
        }
      }

      if (decBtn) decBtn.disabled = bookingState.qty <= tier.min;
      if (incBtn) incBtn.disabled = bookingState.qty >= tier.max;

      if (rateTypeLabel) rateTypeLabel.textContent = tier.rateLabel;
      if (rateEachEl) rateEachEl.textContent = formatRupees(tier.price);

      const total = tier.price * bookingState.qty;
      if (totalEl) totalEl.textContent = formatRupees(total);

      if (formulaEl) {
        if (tier.type === "couple") {
          formulaEl.textContent = `${bookingState.qty} couple${bookingState.qty > 1 ? "s" : ""} (${bookingState.qty * 2} souls) × ${formatRupees(tier.price)}`;
        } else {
          formulaEl.textContent = `${bookingState.qty} soul${bookingState.qty > 1 ? "s" : ""} × ${formatRupees(tier.price)}`;
        }
      }

      if (discountAlert && discountText) {
        if (tier.type === "group") {
          discountAlert.hidden = false;
          const saved = (1199 - 999) * bookingState.qty;
          discountText.textContent = `GROUP RATE APPLIED — YOU SAVE ${formatRupees(saved)} TODAY!`;
        } else if (tier.type === "single" && bookingState.qty >= 4 && bookingState.tierId === "mortal") {
          discountAlert.hidden = false;
          discountText.textContent = `HINT: SWITCH TO "SPOOKY SQUAD" TO SAVE ₹200 ON EVERY SOUL!`;
        } else {
          discountAlert.hidden = true;
        }
      }

      tierCards.forEach((c) => {
        const isThis = c.dataset.tierId === bookingState.tierId;
        c.classList.toggle("is-active", isThis);
      });
    }

    tierCards.forEach((card) => {
      card.addEventListener("click", () => {
        const tid = card.dataset.tierId;
        if (!tid || !TIERS[tid]) return;
        bookingState.tierId = tid;
        const tier = TIERS[tid];
        if (bookingState.qty < tier.min) bookingState.qty = tier.min;
        renderCalc();
      });

      const selBtn = card.querySelector(".pass-select-btn");
      if (selBtn) {
        selBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const tid = card.dataset.tierId;
          if (!tid || !TIERS[tid]) return;
          bookingState.tierId = tid;
          const tier = TIERS[tid];
          if (bookingState.qty < tier.min) bookingState.qty = tier.min;
          renderCalc();
          const matrix = $("#bookingMatrix");
          if (matrix) smoothScrollTo(matrix, 90);
        });
      }
    });

    if (decBtn) {
      decBtn.addEventListener("click", () => {
        const tier = TIERS[bookingState.tierId];
        if (bookingState.qty > tier.min) {
          bookingState.qty--;
          renderCalc();
        }
      });
    }

    if (incBtn) {
      incBtn.addEventListener("click", () => {
        const tier = TIERS[bookingState.tierId];
        if (bookingState.qty < tier.max) {
          bookingState.qty++;
          renderCalc();
        }
      });
    }

    renderCalc();



    const waBtn = $("#whatsappPayBtn");
    if (waBtn) {
      waBtn.addEventListener("click", () => {
        const name = (nameInput?.value || "").trim();
        const phone = (phoneInput?.value || "").trim();
        const insta = (instaInput?.value || "").trim();

        if (!name || !phone || !insta) {
          if (formError) {
            formError.hidden = false;
            formError.textContent = "Please provide your Name, WhatsApp number, and Instagram Handle.";
          }
          if (!name) nameInput?.focus();
          else if (!phone) phoneInput?.focus();
          else instaInput?.focus();
          return;
        }
        if (formError) formError.hidden = true;

        const tier = TIERS[bookingState.tierId];
        const souls = tier.type === "couple" ? bookingState.qty * 2 : bookingState.qty;
        const total = formatRupees(tier.price * bookingState.qty);

        const msg = encodeURIComponent(
          `Hi Hollow Hill Manor! 🎃\nI want to book passes for Halloween 2026.\n✦ Pass: ${tier.name}\n✦ Attendees: ${souls} Souls\n✦ Total Amount: ${total}\n✦ Name: ${name}\n✦ Phone: ${phone}\n✦ Insta: ${insta}\nPlease share UPI / payment instructions to confirm!`
        );
        window.open(`https://wa.me/919999999999?text=${msg}`, "_blank");
      });
    }

    const upiModal = $("#upiModal");
    const upiOpenBtn = $("#upiModalBtn");
    const upiCloseBtn = $("#upiModalCloseBtn");
    const upiBackdrop = $("#upiModalBackdrop");
    const copyUpiBtn = $("#copyUpiBtn");
    const upiCopyMsg = $("#upiCopyMsg");

    function openUpi() { if (upiModal) upiModal.hidden = false; }
    function closeUpi() { if (upiModal) upiModal.hidden = true; }

    if (upiOpenBtn) upiOpenBtn.addEventListener("click", openUpi);
    if (upiCloseBtn) upiCloseBtn.addEventListener("click", closeUpi);
    if (upiBackdrop) upiBackdrop.addEventListener("click", closeUpi);

    if (copyUpiBtn) {
      copyUpiBtn.addEventListener("click", () => {
        navigator.clipboard?.writeText("hollowhill@upi").then(() => {
          if (upiCopyMsg) {
            upiCopyMsg.hidden = false;
            setTimeout(() => (upiCopyMsg.hidden = true), 2500);
          }
        });
      });
    }


    const downloadBtn = $("#downloadPassBtn");
    if (downloadBtn) {
      downloadBtn.addEventListener("click", () => {
        window.print();
      });
    }

    const resetBtn = $(".ticket-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        clearRsvp();
        const wrap = $("#ticketWrap");
        if (wrap) wrap.hidden = true;
        ScrollTrigger.refresh();
      });
    }

    const saved = loadRsvp();
    if (saved && saved.name) showTicket(saved, false);
  }

  /* =========================================================
     FERAL AMBIENT WEB AUDIO DRONE & TITLE TRICK
     ========================================================= */
  let audioCtx = null;
  let audioNodes = null;
  let isSoundPlaying = false;

  function initSoundToggle() {
    const btn = $("#soundToggle");
    const label = $("#soundLabel");
    if (!btn) return;

    function createNoiseBuffer(ctx) {
      const bufferSize = ctx.sampleRate * 5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      return buffer;
    }

    function startDrone() {
      if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        audioCtx = new AudioContextClass();
      }

      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }

      if (audioNodes) {
        audioNodes.gain.gain.setTargetAtTime(0.18, audioCtx.currentTime, 0.5);
        isSoundPlaying = true;
        btn.classList.add("is-active");
        if (label) label.textContent = "SOUND ON";
        return;
      }

      const now = audioCtx.currentTime;
      const noiseBuffer = createNoiseBuffer(audioCtx);

      // 1. Howling Wind Resonant Whistle
      const noiseSource1 = audioCtx.createBufferSource();
      noiseSource1.buffer = noiseBuffer;
      noiseSource1.loop = true;

      const windFilter = audioCtx.createBiquadFilter();
      windFilter.type = "bandpass";
      windFilter.frequency.setValueAtTime(450, now);
      windFilter.Q.setValueAtTime(8, now);

      const windLfo = audioCtx.createOscillator();
      windLfo.type = "sine";
      windLfo.frequency.setValueAtTime(0.12, now);

      const windLfoGain = audioCtx.createGain();
      windLfoGain.gain.setValueAtTime(320, now);
      windLfo.connect(windLfoGain);
      windLfoGain.connect(windFilter.frequency);

      // 2. Ghostly Whisper Formant Resonance
      const noiseSource2 = audioCtx.createBufferSource();
      noiseSource2.buffer = noiseBuffer;
      noiseSource2.loop = true;

      const whisperFilter = audioCtx.createBiquadFilter();
      whisperFilter.type = "bandpass";
      whisperFilter.frequency.setValueAtTime(1100, now);
      whisperFilter.Q.setValueAtTime(14, now);

      const whisperLfo = audioCtx.createOscillator();
      whisperLfo.type = "triangle";
      whisperLfo.frequency.setValueAtTime(0.22, now);

      const whisperLfoGain = audioCtx.createGain();
      whisperLfoGain.gain.setValueAtTime(450, now);
      whisperLfo.connect(whisperLfoGain);
      whisperLfoGain.connect(whisperFilter.frequency);

      const whisperGain = audioCtx.createGain();
      whisperGain.gain.setValueAtTime(0.4, now);

      // 3. Sub Pressure & Howling Pressure Wave
      const subOsc = audioCtx.createOscillator();
      subOsc.type = "sine";
      subOsc.frequency.setValueAtTime(38, now);

      const subLfo = audioCtx.createOscillator();
      subLfo.type = "sine";
      subLfo.frequency.setValueAtTime(0.07, now);
      const subLfoGain = audioCtx.createGain();
      subLfoGain.gain.setValueAtTime(8, now);
      subLfo.connect(subLfoGain);
      subLfoGain.connect(subOsc.frequency);

      const subGain = audioCtx.createGain();
      subGain.gain.setValueAtTime(0.6, now);

      // Master Output Node
      const masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.001, now);
      masterGain.gain.exponentialRampToValueAtTime(0.18, now + 1.2);

      // Connect Nodes
      noiseSource1.connect(windFilter);
      windFilter.connect(masterGain);

      noiseSource2.connect(whisperFilter);
      whisperFilter.connect(whisperGain);
      whisperGain.connect(masterGain);

      subOsc.connect(subGain);
      subGain.connect(masterGain);

      masterGain.connect(audioCtx.destination);

      // Start Sources & LFOs
      noiseSource1.start(now);
      noiseSource2.start(now);
      subOsc.start(now);
      windLfo.start(now);
      whisperLfo.start(now);
      subLfo.start(now);

      audioNodes = {
        noiseSource1,
        noiseSource2,
        subOsc,
        windLfo,
        whisperLfo,
        subLfo,
        gain: masterGain,
      };
      isSoundPlaying = true;
      btn.classList.add("is-active");
      if (label) label.textContent = "SOUND ON";
    }

    function stopDrone() {
      if (audioNodes && audioCtx) {
        audioNodes.gain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.4);
      }
      isSoundPlaying = false;
      btn.classList.remove("is-active");
      if (label) label.textContent = "SOUND OFF";
    }

    function unlockAudioContext() {
      if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          audioCtx = new AudioContextClass();
        }
      }
      if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume();
      }
    }

    function toggleSound(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      unlockAudioContext();
      if (isSoundPlaying) stopDrone();
      else startDrone();
    }

    // Bind both touch and click events for maximum mobile browser compatibility
    btn.addEventListener("touchstart", toggleSound, { passive: false });
    btn.addEventListener("click", toggleSound);

    // Global first-touch unlock for mobile devices
    const unlockHandler = () => {
      unlockAudioContext();
      window.removeEventListener("touchstart", unlockHandler);
      window.removeEventListener("touchend", unlockHandler);
      window.removeEventListener("click", unlockHandler);
    };
    window.addEventListener("touchstart", unlockHandler, { once: true, passive: true });
    window.addEventListener("touchend", unlockHandler, { once: true, passive: true });
    window.addEventListener("click", unlockHandler, { once: true, passive: true });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && isSoundPlaying && audioCtx) {
        audioCtx.suspend();
      } else if (!document.hidden && isSoundPlaying && audioCtx) {
        audioCtx.resume();
      }
    });
  }

  function initTabTitle() {
    const originalTitle = document.title;
    document.addEventListener("visibilitychange", () => {
      document.title = document.hidden ? "COME BACK IF YOU DARE..." : originalTitle;
    });
  }

  function initFaq() {
    $$(".faq-q").forEach((btn, i) => {
      const panel = btn.nextElementSibling;
      panel.id = `faq-panel-${i}`;
      btn.setAttribute("aria-controls", panel.id);
      btn.addEventListener("click", () => {
        const open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!open));
        gsap.to(panel, { height: open ? 0 : "auto", duration: dur(0.45), ease: "power2.inOut", onComplete: () => ScrollTrigger.refresh() });
        gsap.to($("span", btn), { rotation: open ? 0 : 45, duration: dur(0.3) });
      });
    });
  }

  function initGhostCursor() {
    if (!finePointer || prefersReduced) return;
    const ghost = $(".ghost-cursor");
    gsap.set(ghost, { xPercent: -50, yPercent: -50 });
    const xTo = gsap.quickTo(ghost, "x", { duration: 0.7, ease: "power3" });
    const yTo = gsap.quickTo(ghost, "y", { duration: 0.7, ease: "power3" });
    let visible = false;
    window.addEventListener("pointermove", (e) => {
      if (!visible) {
        visible = true;
        gsap.set(ghost, { x: e.clientX + 22, y: e.clientY + 26 });
        gsap.to(ghost, { autoAlpha: 0.85, duration: 0.4 });
      }
      xTo(e.clientX + 22);
      yTo(e.clientY + 26);
    });
    document.documentElement.addEventListener("pointerleave", () => {
      visible = false;
      gsap.to(ghost, { autoAlpha: 0, duration: 0.3 });
    });
    gsap.to($(".icon", ghost), { y: -5, rotation: 6, duration: 1.1, repeat: -1, yoyo: true, ease: "sine.inOut" });
  }

  /* =========================================================
     SCROLL CHOREOGRAPHY (created strictly top-to-bottom)
     ========================================================= */
  function revealTitle(selector) {
    const title = $(selector);
    const split = SplitText.create(title, { type: "words,chars" });
    gsap.from(split.chars, {
      yPercent: 110,
      rotation: () => gsap.utils.random(-25, 25),
      autoAlpha: 0,
      stagger: 0.03,
      duration: 0.7,
      ease: "back.out(1.7)",
      scrollTrigger: { trigger: title, start: "top 86%", toggleActions: "play none none reverse" },
    });
  }

  function fadeUp(targets, trigger, start = "top 85%") {
    gsap.from(targets, {
      y: 30,
      autoAlpha: 0,
      duration: 0.8,
      stagger: 0.12,
      ease: "power3.out",
      scrollTrigger: { trigger, start, toggleActions: "play none none reverse" },
    });
  }

  // Slow parallax drift for a full-bleed background photo (its img is 120% tall)
  function parallaxBg(section) {
    gsap.fromTo(`${section} .section-bg img`, { yPercent: -15 }, {
      yPercent: 0,
      ease: "none",
      scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: true },
    });
  }

  // Screen position of the lit window, derived from object-fit: cover math rather than by measuring
  // the (scaled) photo, so it stays correct on refresh no matter how far the zoom has progressed.
  function heroFocusPoint() {
    const box = $(".hero-photo");
    const img = $("img", box);
    const W = box.clientWidth;
    const H = box.clientHeight;
    const [px, py] = getComputedStyle(img).objectPosition.split(" ").map((v) => parseFloat(v) / 100);
    const ih = 1000;
    const iw = ih * HERO_FOCUS.aspect;
    const s = Math.max(W / iw, H / ih);
    const rw = iw * s;
    const rh = ih * s;
    return { x: (W - rw) * px + HERO_FOCUS.u * rw, y: (H - rh) * py + HERO_FOCUS.v * rh };
  }

  function placeHeroFocus() {
    const p = heroFocusPoint();
    gsap.set(".hero-photo", { transformOrigin: `${p.x}px ${p.y}px` });
    gsap.set(".window-glow", { x: p.x, y: p.y });
  }

  // 1. HERO — parallax layers lift away, then the camera pushes into the lit window
  function heroScroll() {
    gsap.set(".window-glow", { xPercent: -50, yPercent: -50 });
    placeHeroFocus();

    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        id: "hero",
        trigger: ".hero",
        start: "top top",
        end: "+=300%",
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        onRefresh: placeHeroFocus,
        onLeave: () => heroAmbient.forEach((t) => t.pause()),
        onEnterBack: () => heroAmbient.forEach((t) => t.resume()),
      },
    });

    tl.to(".scroll-cue", { autoAlpha: 0, duration: 0.5 }, 0)
      .to(".hero-title", { yPercent: -45, autoAlpha: 0, duration: 2.5, ease: "power1.in" }, 0)
      // blended layers leave before the heavy zoom so they never re-composite over a scaling photo
      .to(".hero-moon", { yPercent: -70, autoAlpha: 0, duration: 3 }, 0)
      .to(".hero-fog--back", { yPercent: 30, autoAlpha: 0, duration: 2.6 }, 0)
      .to(".hero-fog--front", { yPercent: 45, autoAlpha: 0, duration: 2.8 }, 0.2)
      .to(".hero-bats", { autoAlpha: 0, duration: 2 }, 1)
      .to(".hero-photo", { scale: 1.18, duration: 3 }, 0)
      .to(".hero-photo", { scale: 3.4, duration: 5, ease: "power2.in" }, 3)
      .to(".hero-tint", { autoAlpha: 0.35, duration: 3 }, 3)
      .fromTo(".window-glow", { autoAlpha: 0, scale: 0.2 }, { autoAlpha: 1, scale: 1.6, duration: 3, ease: "power2.in" }, 4.8)
      .to(".window-glow", { scale: 7, duration: 1.4, ease: "power2.in" }, 7.8)
      .to(".hero-flash", { autoAlpha: 1, duration: 0.7 }, 8.5)
      .to(".hero-dark", { autoAlpha: 1, duration: 0.8 }, 9.2);
  }

  // 2. INVITATION — words light up as you read; "Booooo" stretches
  function inviteScroll() {
    gsap.fromTo(".invite-bg", { yPercent: -6 }, {
      yPercent: 6,
      ease: "none",
      scrollTrigger: { trigger: ".invite", start: "top bottom", end: "bottom top", scrub: true },
    });

    fadeUp(".invite .kicker", ".invite", "top 70%");

    const split = SplitText.create(".invite-text", { type: "words" });
    gsap.fromTo(split.words, { opacity: 0.14 }, {
      opacity: 1,
      stagger: 0.1,
      ease: "none",
      scrollTrigger: { trigger: ".invite-text", start: "top 78%", end: "bottom 50%", scrub: true },
    });

    fadeUp(".invite-sign", ".invite-sign", "top 90%");

    const letters = $$(".boo span");
    const firstO = letters[1];
    const bang = letters[letters.length - 1];
    // collapse every "o" onto the first one, keep the word centred, then let scroll stretch it out
    const shrink = () => bang.offsetLeft - (firstO.offsetLeft + firstO.offsetWidth);
    gsap.from(letters, {
      x: (i, el) => {
        const half = shrink() / 2;
        if (i === 0) return half;
        if (el === bang) return -half;
        return -(el.offsetLeft - firstO.offsetLeft) + half;
      },
      // the extra o's fade in as they slide out, so stacked glyphs never smear together
      opacity: (i, el) => (i <= 1 || el === bang ? 1 : 0),
      ease: "none",
      scrollTrigger: { trigger: ".boo", start: "top 92%", end: "top 40%", scrub: 1, invalidateOnRefresh: true },
    });
  }

  // 3. DETAILS — headstone cards rise out of the ground
  function detailsScroll() {
    parallaxBg(".details");
    fadeUp(".details .kicker", ".details .section-head");
    revealTitle(".details .section-title");
    fadeUp(".details .lede", ".details .section-head", "top 75%");

    const settle = [-1.5, 1, -1];
    $$(".plot").forEach((plot, i) => {
      gsap.fromTo($(".stone", plot),
        { yPercent: 105, rotation: i % 2 ? 7 : -7, transformOrigin: "50% 100%" },
        {
          yPercent: 0,
          rotation: settle[i],
          ease: "power2.out",
          scrollTrigger: { trigger: plot, start: "top 95%", end: "bottom 78%", scrub: 1 },
        });
    });

    gsap.from(".cd-unit", {
      y: 50,
      autoAlpha: 0,
      rotation: (i) => (i % 2 ? 6 : -6),
      stagger: 0.1,
      duration: 0.8,
      ease: "back.out(1.8)",
      scrollTrigger: { trigger: ".countdown", start: "top 85%", toggleActions: "play none none reverse" },
    });
  }

  // 4. PROGRAM — a spider lowers itself on a thread drawn by the scrollbar
  function programScroll(isMobile) {
    fadeUp(".program .kicker", ".program .section-head");
    revealTitle(".program .section-title");
    fadeUp(".program .lede", ".program .section-head", "top 75%");

    const track = $(".program-track");
    gsap.timeline({
      scrollTrigger: { trigger: track, start: "top 55%", end: "bottom 55%", scrub: 0.6, invalidateOnRefresh: true },
    })
      .fromTo(".thread", { scaleY: 0 }, { scaleY: 1, ease: "none" }, 0)
      .fromTo(".spider", { y: 0 }, { y: () => track.offsetHeight, ease: "none" }, 0);

    gsap.to(".spider .icon", { rotation: 7, transformOrigin: "50% 0%", duration: 1.6, repeat: -1, yoyo: true, ease: "sine.inOut" });

    $$(".event").forEach((ev, i) => {
      ScrollTrigger.create({
        trigger: ev,
        start: "top 56%",
        onEnter: () => ev.classList.add("is-lit"),
        onLeaveBack: () => ev.classList.remove("is-lit"),
      });
      gsap.from($(".event-card", ev), {
        x: isMobile ? 40 : i % 2 === 0 ? -70 : 70,
        rotation: isMobile ? 0 : i % 2 === 0 ? -3 : 3,
        autoAlpha: 0,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: ev, start: "top 82%", toggleActions: "play none none reverse" },
      });
    });
  }

  // 5. ROOMS — vertical scroll drives a horizontal hallway (containerAnimation)
  function roomsScroll() {
    const section = $(".rooms");
    const track = $(".rooms-track");
    const bgText = $(".rooms-bgtext");
    const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const bgDist = () => Math.max(0, bgText.scrollWidth - window.innerWidth) * 0.6;
    const setBgX = gsap.quickSetter(bgText, "x", "px");

    revealTitle(".rooms .section-title");
    fadeUp(".rooms-intro .kicker, .rooms-intro .lede", ".rooms", "top 70%");

    const hallway = gsap.to(track, {
      x: () => -dist(),
      ease: "none",
      onUpdate() { setBgX(-this.progress() * bgDist()); },
      scrollTrigger: {
        id: "rooms",
        trigger: section,
        start: "top top",
        end: () => "+=" + dist(),
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    gsap.to(".rooms-arrow", { x: 14, duration: 0.7, repeat: -1, yoyo: true, ease: "sine.inOut" });

    $$(".room, .rules", track).forEach((card) => {
      gsap.fromTo(card,
        { rotation: 6, yPercent: 10, scale: 0.92, autoAlpha: 0.25 },
        {
          rotation: 0,
          yPercent: 0,
          scale: 1,
          autoAlpha: 1,
          ease: "power1.out",
          scrollTrigger: { trigger: card, containerAnimation: hallway, start: "left 98%", end: "left 58%", scrub: true },
        });

      const media = $(".room-media", card);
      if (media) {
        // the photo drifts against the card's travel, like looking through a window
        gsap.fromTo(media, { xPercent: 8 }, {
          xPercent: -8,
          ease: "none",
          scrollTrigger: { trigger: card, containerAnimation: hallway, start: "left right", end: "right left", scrub: true },
        });
        gsap.from([$(".room-icon", card), ...$$(".room-body > :not(.room-icon)", card)], {
          y: 24,
          autoAlpha: 0,
          stagger: 0.06,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: { trigger: card, containerAnimation: hallway, start: "left 70%", toggleActions: "play none none reverse" },
        });
      }
    });
  }

  // 6. INTERLUDE — a flock of bats crosses with the scroll; lightning reveals who's behind you
  function lightning() {
    gsap.timeline()
      .to(".lightning-flash", { autoAlpha: 0.65, duration: 0.05 })
      .fromTo(".peek", { autoAlpha: 0, scale: 1.08 }, { autoAlpha: 0.95, scale: 1, duration: 0.05 }, "<")
      .to(".lightning-flash", { autoAlpha: 0, duration: 0.12 })
      .to(".lightning-flash", { autoAlpha: 0.35, duration: 0.05 }, "+=0.12")
      .to(".lightning-flash", { autoAlpha: 0, duration: 0.7, ease: "power2.out" })
      .to(".peek", { autoAlpha: 0, duration: 1.4, ease: "power2.in" }, "-=0.3")
      .fromTo(".whisper", { x: -10 }, { x: 0, duration: 0.6, ease: "elastic.out(1, 0.2)" }, 0.05);
  }

  function interludeScroll() {
    parallaxBg(".interlude");

    const section = $(".interlude");
    const flight = gsap.timeline({
      scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: 1, invalidateOnRefresh: true },
    });
    $$(".flock-bat").forEach((bat, i) => {
      const r = mulberry32(400 + i);
      const y0 = 0.45 + r() * 0.5;
      const y1 = r() * 0.35;
      const s = 0.4 + r() * 0.8;
      const lag = r() * 0.5;
      const lead = 150 + r() * 200;
      flight.fromTo(bat,
        { x: () => -lead, y: () => section.offsetHeight * y0, scale: s, rotation: 12 },
        { x: () => window.innerWidth + 150, y: () => section.offsetHeight * y1, rotation: -14, ease: "sine.inOut", duration: 1 },
        lag);
    });

    const split = SplitText.create(".whisper", { type: "words,chars" });
    gsap.from(split.chars, {
      autoAlpha: 0,
      yPercent: 60,
      rotation: () => gsap.utils.random(-35, 35),
      stagger: 0.04,
      ease: "back.out(2)",
      scrollTrigger: { trigger: ".whisper", start: "top 80%", end: "top 40%", scrub: 1 },
    });

    ScrollTrigger.create({ trigger: section, start: "top 25%", onEnter: lightning, onEnterBack: lightning });
  }

  // 7. RSVP
  function rsvpScroll() {
    parallaxBg(".rsvp");
    fadeUp(".rsvp .kicker", ".rsvp .section-head");
    revealTitle(".rsvp .section-title");
    fadeUp(".rsvp .lede", ".rsvp .section-head", "top 75%");

    gsap.set(".rsvp .panel", { autoAlpha: 0, y: 60 });
    ScrollTrigger.batch(".rsvp .panel", {
      start: "top 88%",
      onEnter: (els) => gsap.to(els, { autoAlpha: 1, y: 0, stagger: 0.15, duration: 0.9, ease: "power3.out", overwrite: true }),
    });
    revealTitle(".faq-title");
    gsap.set(".faq-item", { autoAlpha: 0, x: -30 });
    ScrollTrigger.batch(".faq-item", {
      start: "top 92%",
      onEnter: (els) => gsap.to(els, { autoAlpha: 1, x: 0, stagger: 0.1, duration: 0.6, ease: "power2.out", overwrite: true }),
    });
  }

  // 8. FINALE — the moon sinks behind the trees; the dark stares back
  function finaleScroll() {
    gsap.fromTo(".finale-bg img", { yPercent: -20 }, {
      yPercent: 0,
      ease: "none",
      scrollTrigger: { trigger: ".finale", start: "top bottom", end: "bottom bottom", scrub: true },
    });
    gsap.from(".finale-content > *", {
      y: 40,
      autoAlpha: 0,
      stagger: 0.12,
      duration: 0.9,
      ease: "power3.out",
      scrollTrigger: { trigger: ".finale-content", start: "top 80%", toggleActions: "play none none reverse" },
    });
    gsap.from(".eye-pair", {
      autoAlpha: 0,
      stagger: { each: 0.25, from: "random" },
      duration: 0.4,
      scrollTrigger: { trigger: ".finale", start: "top 40%", toggleActions: "play none none reverse" },
    });
  }

  // Candle burns down with page progress; nav hides on the way down
  function globalScroll() {
    gsap.timeline({
      scrollTrigger: { trigger: document.documentElement, start: "top top", end: "bottom bottom", scrub: 0.3 },
    })
      .to(".candle-wax", { scaleY: 0.12, ease: "none" }, 0)
      .to(".candle-flame-wrap", { y: 90 * 0.88, ease: "none" }, 0);

    const nav = $(".nav");
    let hidden = false;
    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate(self) {
        const y = self.scroll();
        nav.classList.toggle("is-solid", y > 60);
        const shouldHide = self.direction === 1 && y > 400;
        if (shouldHide !== hidden) {
          hidden = shouldHide;
          gsap.to(nav, { yPercent: hidden ? -110 : 0, duration: 0.35, ease: "power2.out", overwrite: true });
        }
      },
    });
  }

  /* =========================================================
     AMBIENT LOOPS
     ========================================================= */
  const heroAmbient = [];

  function ambient() {
    const rnd = gsap.utils.random;
    const keep = (t) => (heroAmbient.push(t), t);

    // fog photos drift sideways (the scroll timeline moves their containers, these move the images)
    keep(gsap.to(".hero-fog--back img", { xPercent: -18, duration: 26, repeat: -1, yoyo: true, ease: "sine.inOut" }));
    keep(gsap.fromTo(".hero-fog--front img", { xPercent: -18 }, { xPercent: 0, duration: 18, repeat: -1, yoyo: true, ease: "sine.inOut" }));

    // bats wander through the sky on the right of the house
    $$(".hero-bat").forEach((bat) => {
      gsap.set(bat, { x: rnd(0.45, 0.9) * window.innerWidth, y: rnd(0.08, 0.38) * window.innerHeight, scale: rnd(0.55, 1) });
      keep(gsap.to(bat, {
        x: () => rnd(0.4, 0.95) * window.innerWidth,
        y: () => rnd(0.06, 0.42) * window.innerHeight,
        rotation: "random(-12, 12)",
        duration: rnd(4, 7),
        repeat: -1,
        repeatRefresh: true,
        ease: "sine.inOut",
      }));
    });

    // gentle wing beat: the icon is one silhouette, so keep the squash subtle
    $$(".hero-bat .icon, .flock-bat .icon").forEach((icon) => {
      gsap.to(icon, { scaleY: 0.6, transformOrigin: "50% 45%", duration: rnd(0.12, 0.18), repeat: -1, yoyo: true, ease: "sine.inOut" });
    });

    gsap.to(".candle-flame", { scaleY: "random(0.8, 1.1)", scaleX: "random(0.9, 1.1)", rotation: "random(-6, 6)", duration: 0.14, repeat: -1, repeatRefresh: true, ease: "sine.inOut" });

    // finale eyes blink at their own rhythm
    $$(".eye-pair").forEach((pair, i) => {
      gsap.timeline({ repeat: -1, repeatDelay: 2 + ((i * 1.37) % 3.2), delay: i * 0.6 })
        .to($$(".eye", pair), { scaleY: 0.08, duration: 0.08, ease: "power2.in" })
        .to($$(".eye", pair), { scaleY: 1, duration: 0.14, ease: "power2.out" });
    });
  }

  function pupilsFollowPointer() {
    if (!finePointer) return;
    const pupils = $$(".eye i");
    const xs = pupils.map((p) => gsap.quickTo(p, "x", { duration: 0.4, ease: "power3" }));
    const ys = pupils.map((p) => gsap.quickTo(p, "y", { duration: 0.4, ease: "power3" }));
    window.addEventListener("pointermove", (e) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      xs.forEach((fn) => fn(nx * 6));
      ys.forEach((fn) => fn(ny * 1.5));
    });
  }

  /* =========================================================
     REDUCED MOTION — everything visible, no pins or scrub
     ========================================================= */
  function reducedFallback() {
    const rooms = $(".rooms");
    rooms.classList.add("rooms--static");
    $$(".event").forEach((ev) => ev.classList.add("is-lit"));
    $$(".hero-bat").forEach((bat, i) => gsap.set(bat, { x: (0.5 + i * 0.07) * window.innerWidth, y: (0.1 + (i % 3) * 0.08) * window.innerHeight }));
    $$(".flock-bat").forEach((bat, i) => gsap.set(bat, { x: ((i * 0.137) % 1) * window.innerWidth, y: (0.1 + ((i * 0.29) % 0.8)) * window.innerHeight }));
    return () => {
      rooms.classList.remove("rooms--static");
      $$(".event").forEach((ev) => ev.classList.remove("is-lit"));
    };
  }

  function initScroll() {
    const mm = gsap.matchMedia();
    mm.add(
      {
        motion: "(prefers-reduced-motion: no-preference)",
        reduce: "(prefers-reduced-motion: reduce)",
        mobile: "(max-width: 760px)",
      },
      (ctx) => {
        const { motion, mobile } = ctx.conditions;
        heroAmbient.length = 0;
        let cleanup;
        if (motion) {
          heroScroll();
          inviteScroll();
          detailsScroll();
          programScroll(mobile);
          roomsScroll();
          interludeScroll();
          rsvpScroll();
          finaleScroll();
          ambient();
        } else {
          cleanup = reducedFallback();
        }
        globalScroll();
        return cleanup;
      }
    );
  }

  /* =========================================================
     PRELOADER → HERO INTRO
     ========================================================= */
  // The intro only touches child elements / properties the scroll timeline never animates,
  // so the scrubbed timeline always records clean start values.
  function heroIntro() {
    if (prefersReduced) return gsap.timeline();
    const split = SplitText.create(".title", { type: "words,chars" });
    return gsap.timeline({ paused: true, defaults: { ease: "power3.out" } })
      .from(".hero-photo img", { scale: 1.12, duration: 2.4, ease: "power2.out" }, 0)
      .from(".hero-moon img", { scale: 0.7, autoAlpha: 0, duration: 1.8, ease: "power2.out" }, 0.2)
      .from(".eyebrow", { y: 20, autoAlpha: 0, duration: 0.8 }, 0.5)
      .from(split.chars, {
        yPercent: -160,
        rotation: () => gsap.utils.random(-30, 30),
        autoAlpha: 0,
        stagger: 0.06,
        duration: 1.1,
        ease: "bounce.out",
      }, 0.6)
      .from(".tagline", { y: 20, autoAlpha: 0, duration: 0.8 }, 1.4)
      .from(".scroll-cue > span", { autoAlpha: 0, y: -10, stagger: 0.15, duration: 0.8 }, 1.7);
  }

  function boot() {
    buildBats();
    initCountdown();
    initNavLinks();
    initMobileNav();
    initMobilePassBar();

    initPasses();
    initSoundToggle();
    initTabTitle();
    initFaq();
    initGhostCursor();
    pupilsFollowPointer();

    // preloader counter + flickering pumpkin
    const count = $(".preloader-count");
    const counter = { v: 0 };
    const flicker = gsap.to(".preloader-icon", { opacity: 0.55, duration: 0.09, repeat: -1, yoyo: true, repeatDelay: 0.15, ease: "steps(1)" });
    const counting = new Promise((resolve) => {
      gsap.to(counter, {
        v: 100,
        duration: prefersReduced ? 0.2 : 1.8,
        ease: "power2.inOut",
        onUpdate: () => (count.textContent = Math.round(counter.v)),
        onComplete: resolve,
      });
    });
    const fonts = Promise.all([
      document.fonts.load('1em "Anton"'),
      document.fonts.load('600 1em "Cormorant Garamond"'),
      document.fonts.load('1em "Inter"'),
    ]).catch(() => { });
    const heroImg = $(".hero-photo img");
    const heroPhoto = (heroImg.decode ? heroImg.decode() : Promise.resolve()).catch(() => { });
    const timeout = new Promise((r) => setTimeout(r, 6000));

    Promise.all([counting, Promise.race([Promise.all([fonts, heroPhoto]), timeout])]).then(() => {
      initScroll();
      const intro = heroIntro();
      document.documentElement.classList.remove("is-locked");
      ScrollTrigger.refresh();

      gsap.timeline({ onComplete: () => { flicker.kill(); gsap.set(".preloader", { display: "none" }); } })
        .to(".preloader-inner", { autoAlpha: 0, scale: 0.9, duration: dur(0.4), ease: "power2.in" })
        .to(".preloader-top", { yPercent: -100, duration: dur(1.1), ease: "power4.inOut" })
        .to(".preloader-bottom", { yPercent: 100, duration: dur(1.1), ease: "power4.inOut" }, "<")
        .add(() => intro.play(), "<0.25");
    });

    // photos are hotlinked; once they've all arrived, re-measure every trigger once
    window.addEventListener("load", () => ScrollTrigger.refresh());
  }

  boot();
})();
