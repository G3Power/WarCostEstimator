// ===== GLOBAL CONFLICT COST TRACKER ENGINE =====
// Based on publicly available data as of March 14, 2026.
// Supports multiple conflicts with tab-based switching.

(function () {
  'use strict';

  // ===================================================================
  // CONFLICT SELECTOR LOGIC
  // ===================================================================
  let activeConflict = 'iran';

  const tabs = document.querySelectorAll('.conflict-tab');
  const views = document.querySelectorAll('.conflict-view');

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      const conflict = tab.dataset.conflict;
      if (conflict === activeConflict) return;

      activeConflict = conflict;

      tabs.forEach(function (t) {
        t.classList.toggle('active', t.dataset.conflict === conflict);
        t.setAttribute('aria-pressed', t.dataset.conflict === conflict ? 'true' : 'false');
      });

      views.forEach(function (v) {
        v.classList.toggle('active', v.id === 'conflict-' + conflict);
      });
    });
  });

  // ===================================================================
  // IRAN CONFLICT MODEL
  // ===================================================================
  const IRAN_WAR_START = new Date('2026-02-28T00:00:00Z');
  const HORMUZ_CLOSURE = new Date('2026-03-01T00:00:00Z');

  // --- UNITED STATES ---
  const US_PHASE1_END_MS = 6 * 24 * 60 * 60 * 1000;
  const US_PHASE1_TOTAL = 11.3e9;
  const US_PHASE1_RATE_PER_MS = US_PHASE1_TOTAL / US_PHASE1_END_MS;
  const US_PHASE2_DAILY = 800e6;
  const US_PHASE2_RATE_PER_MS = US_PHASE2_DAILY / (24 * 60 * 60 * 1000);

  function getUSCost(elapsedMs) {
    if (elapsedMs <= 0) return 0;
    if (elapsedMs <= US_PHASE1_END_MS) {
      return elapsedMs * US_PHASE1_RATE_PER_MS;
    }
    return US_PHASE1_TOTAL + (elapsedMs - US_PHASE1_END_MS) * US_PHASE2_RATE_PER_MS;
  }

  // --- ISRAEL ---
  const ISRAEL_DAILY = 313e6;
  const ISRAEL_RATE_PER_MS = ISRAEL_DAILY / (24 * 60 * 60 * 1000);

  function getIsraelCost(elapsedMs) {
    if (elapsedMs <= 0) return 0;
    return elapsedMs * ISRAEL_RATE_PER_MS;
  }

  // --- IRAN ---
  const IRAN_INITIAL = 391e6;
  const IRAN_DAILY = 180e6;
  const IRAN_RATE_PER_MS = IRAN_DAILY / (24 * 60 * 60 * 1000);
  const IRAN_INITIAL_PERIOD_MS = 3 * 24 * 60 * 60 * 1000;
  const IRAN_INITIAL_RATE_PER_MS = IRAN_INITIAL / IRAN_INITIAL_PERIOD_MS;

  function getIranCost(elapsedMs) {
    if (elapsedMs <= 0) return 0;
    if (elapsedMs <= IRAN_INITIAL_PERIOD_MS) {
      return elapsedMs * (IRAN_INITIAL_RATE_PER_MS + IRAN_RATE_PER_MS);
    }
    var initialCost = IRAN_INITIAL + IRAN_INITIAL_PERIOD_MS * IRAN_RATE_PER_MS;
    return initialCost + (elapsedMs - IRAN_INITIAL_PERIOD_MS) * IRAN_RATE_PER_MS;
  }

  // --- GULF STATES ---
  const GULF_RAMP_DAYS = 4;
  const GULF_RAMP_MS = GULF_RAMP_DAYS * 24 * 60 * 60 * 1000;
  const GULF_DAILY_FULL = 1e9;
  const GULF_RATE_PER_MS = GULF_DAILY_FULL / (24 * 60 * 60 * 1000);

  function getGulfCost(elapsedMs) {
    if (elapsedMs <= 0) return 0;
    if (elapsedMs <= GULF_RAMP_MS) {
      var fraction = elapsedMs / GULF_RAMP_MS;
      return 0.5 * fraction * elapsedMs * GULF_RATE_PER_MS;
    }
    var rampCost = 0.5 * GULF_RAMP_MS * GULF_RATE_PER_MS;
    return rampCost + (elapsedMs - GULF_RAMP_MS) * GULF_RATE_PER_MS;
  }

  // --- U.S. AID TO ISRAEL ---
  const AID_DAILY = 35e6;
  const AID_RATE_PER_MS = AID_DAILY / (24 * 60 * 60 * 1000);

  function getUSAidToIsrael(elapsedMs) {
    if (elapsedMs <= 0) return 0;
    return elapsedMs * AID_RATE_PER_MS;
  }

  // ===================================================================
  // UKRAINE CONFLICT MODEL
  // ===================================================================
  const UKRAINE_WAR_START = new Date('2022-02-24T04:00:00Z'); // Dawn, Feb 24 2022

  // --- RUSSIA ---
  // IISS Military Balance 2025: $186B defense budget for 2025
  // Direct war costs ~$110B/year (5.1% GDP). Rising from $67B in 2022 to $186B in 2025.
  // We model a phased approach:
  // Phase 1 (2022): ~$67B/year → ~$183.6M/day
  // Phase 2 (2023): ~$100B/year → ~$274M/day
  // Phase 3 (2024): ~$140B/year → ~$383.6M/day
  // Phase 4 (2025+): ~$186B/year → ~$509.6M/day
  const RU_PHASE1_END = new Date('2023-01-01T00:00:00Z');
  const RU_PHASE2_END = new Date('2024-01-01T00:00:00Z');
  const RU_PHASE3_END = new Date('2025-01-01T00:00:00Z');

  const RU_DAILY_2022 = 183.6e6;  // $67B/year
  const RU_DAILY_2023 = 274e6;    // $100B/year
  const RU_DAILY_2024 = 383.6e6;  // $140B/year
  const RU_DAILY_2025 = 509.6e6;  // $186B/year

  var DAY_MS = 24 * 60 * 60 * 1000;

  function getRussiaCost(now) {
    var elapsed = now.getTime() - UKRAINE_WAR_START.getTime();
    if (elapsed <= 0) return 0;

    var total = 0;
    var cursor = UKRAINE_WAR_START.getTime();

    // Phase 1: 2022
    var p1End = Math.min(now.getTime(), RU_PHASE1_END.getTime());
    if (p1End > cursor) {
      total += ((p1End - cursor) / DAY_MS) * RU_DAILY_2022;
      cursor = p1End;
    }

    // Phase 2: 2023
    var p2End = Math.min(now.getTime(), RU_PHASE2_END.getTime());
    if (p2End > cursor) {
      total += ((p2End - cursor) / DAY_MS) * RU_DAILY_2023;
      cursor = p2End;
    }

    // Phase 3: 2024
    var p3End = Math.min(now.getTime(), RU_PHASE3_END.getTime());
    if (p3End > cursor) {
      total += ((p3End - cursor) / DAY_MS) * RU_DAILY_2024;
      cursor = p3End;
    }

    // Phase 4: 2025+
    if (now.getTime() > cursor) {
      total += ((now.getTime() - cursor) / DAY_MS) * RU_DAILY_2025;
    }

    return total;
  }

  // --- UKRAINE ---
  // IISS: $44.4B in 2025, ~21% of GDP
  // Pre-2025 defense spending was lower:
  // 2022: ~$9.5B (own budget, supplemented by aid)
  // 2023: ~$27B
  // 2024: ~$35B
  // 2025+: ~$44.4B
  const UA_DAILY_2022 = 26e6;     // $9.5B/year
  const UA_DAILY_2023 = 74e6;     // $27B/year
  const UA_DAILY_2024 = 95.9e6;   // $35B/year
  const UA_DAILY_2025 = 121.6e6;  // $44.4B/year

  function getUkraineCost(now) {
    var elapsed = now.getTime() - UKRAINE_WAR_START.getTime();
    if (elapsed <= 0) return 0;

    var total = 0;
    var cursor = UKRAINE_WAR_START.getTime();

    var p1End = Math.min(now.getTime(), RU_PHASE1_END.getTime());
    if (p1End > cursor) {
      total += ((p1End - cursor) / DAY_MS) * UA_DAILY_2022;
      cursor = p1End;
    }

    var p2End = Math.min(now.getTime(), RU_PHASE2_END.getTime());
    if (p2End > cursor) {
      total += ((p2End - cursor) / DAY_MS) * UA_DAILY_2023;
      cursor = p2End;
    }

    var p3End = Math.min(now.getTime(), RU_PHASE3_END.getTime());
    if (p3End > cursor) {
      total += ((p3End - cursor) / DAY_MS) * UA_DAILY_2024;
      cursor = p3End;
    }

    if (now.getTime() > cursor) {
      total += ((now.getTime() - cursor) / DAY_MS) * UA_DAILY_2025;
    }

    return total;
  }

  // Western aid: €267B committed over ~3 years (Feb 2022 – Mar 2026)
  // We model this as a cumulative flow: ~€89B/year → ~€243.8M/day → ~$265M/day
  const WESTERN_AID_TOTAL_EUR = 267e9; // €267B
  const WESTERN_AID_TOTAL_USD = 290e9; // ~$290B at current rates
  // Aid has ramped up over time. Simplified linear model for the ticking counter.
  const WESTERN_AID_DAILY_USD = 195e6; // ~$195M/day average over ~4 years
  const WESTERN_AID_RATE_PER_MS = WESTERN_AID_DAILY_USD / DAY_MS;

  function getWesternAidToUkraine(now) {
    var elapsed = now.getTime() - UKRAINE_WAR_START.getTime();
    if (elapsed <= 0) return 0;
    // Cap at the known total
    return Math.min(elapsed * WESTERN_AID_RATE_PER_MS, WESTERN_AID_TOTAL_USD);
  }

  // ===================================================================
  // FORMATTING HELPERS
  // ===================================================================
  function formatCurrency(amount) {
    if (amount >= 1e12) {
      return '$' + (amount / 1e12).toFixed(2) + 'T';
    }
    if (amount >= 1e9) {
      return '$' + (amount / 1e9).toFixed(2) + 'B';
    }
    if (amount >= 1e6) {
      return '$' + (amount / 1e6).toFixed(1) + 'M';
    }
    return '$' + Math.floor(amount).toLocaleString();
  }

  function formatCurrencyPrecise(amount) {
    if (amount >= 1e12) {
      return '$' + (amount / 1e12).toFixed(3) + 'T';
    }
    if (amount >= 1e9) {
      return '$' + (amount / 1e9).toFixed(3) + 'B';
    }
    return '$' + Math.floor(amount).toLocaleString();
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  // ===================================================================
  // DOM REFERENCES
  // ===================================================================

  // Iran conflict elements
  var iranEls = {
    clockDays: document.getElementById('clockDays'),
    clockHours: document.getElementById('clockHours'),
    clockMinutes: document.getElementById('clockMinutes'),
    clockSeconds: document.getElementById('clockSeconds'),
    globalTotal: document.getElementById('globalTotal'),
    usCost: document.getElementById('usCost'),
    israelCost: document.getElementById('israelCost'),
    iranCost: document.getElementById('iranCost'),
    gulfCost: document.getElementById('gulfCost'),
    hormuzDays: document.getElementById('hormuzDaysClosed'),
    usAidToIsrael: document.getElementById('usAidToIsrael'),
    usAidPct: document.getElementById('usAidPct'),
    usAidBar: document.getElementById('usAidBar'),
  };

  // Ukraine conflict elements
  var ukraineEls = {
    clockDays: document.getElementById('uaClockDays'),
    clockHours: document.getElementById('uaClockHours'),
    clockMinutes: document.getElementById('uaClockMinutes'),
    clockSeconds: document.getElementById('uaClockSeconds'),
    globalTotal: document.getElementById('uaGlobalTotal'),
    russiaCost: document.getElementById('uaRussiaCost'),
    ukraineCost: document.getElementById('uaUkraineCost'),
    westernAid: document.getElementById('uaWesternAid'),
    aidPct: document.getElementById('uaAidPct'),
    aidBar: document.getElementById('uaAidBar'),
  };

  // ===================================================================
  // ANIMATION LOOP
  // ===================================================================
  function update() {
    var now = new Date();

    // --- IRAN CONFLICT UPDATE ---
    var iranElapsedMs = now.getTime() - IRAN_WAR_START.getTime();

    if (iranElapsedMs > 0) {
      // War clock
      var totalSeconds = Math.floor(iranElapsedMs / 1000);
      var days = Math.floor(totalSeconds / 86400);
      var hours = Math.floor((totalSeconds % 86400) / 3600);
      var minutes = Math.floor((totalSeconds % 3600) / 60);
      var seconds = totalSeconds % 60;

      iranEls.clockDays.textContent = pad(days);
      iranEls.clockHours.textContent = pad(hours);
      iranEls.clockMinutes.textContent = pad(minutes);
      iranEls.clockSeconds.textContent = pad(seconds);

      // Hormuz days closed
      var hormuzElapsed = now.getTime() - HORMUZ_CLOSURE.getTime();
      if (hormuzElapsed > 0 && iranEls.hormuzDays) {
        iranEls.hormuzDays.textContent = Math.floor(hormuzElapsed / DAY_MS);
      }

      // Cost calculations
      var usCost = getUSCost(iranElapsedMs);
      var israelCost = getIsraelCost(iranElapsedMs);
      var iranCost = getIranCost(iranElapsedMs);
      var gulfCost = getGulfCost(iranElapsedMs);
      var iranTotal = usCost + israelCost + iranCost + gulfCost;

      // U.S. aid calculation
      var usAid = getUSAidToIsrael(iranElapsedMs);
      var aidPct = israelCost > 0 ? (usAid / israelCost) * 100 : 0;

      // Update displays
      iranEls.globalTotal.textContent = formatCurrencyPrecise(iranTotal);
      iranEls.usCost.textContent = formatCurrencyPrecise(usCost);
      iranEls.israelCost.textContent = formatCurrencyPrecise(israelCost);
      iranEls.iranCost.textContent = formatCurrencyPrecise(iranCost);
      iranEls.gulfCost.textContent = formatCurrencyPrecise(gulfCost);

      if (iranEls.usAidToIsrael) {
        iranEls.usAidToIsrael.textContent = formatCurrencyPrecise(usAid);
      }
      if (iranEls.usAidPct) {
        iranEls.usAidPct.textContent = aidPct.toFixed(1) + '%';
      }
      if (iranEls.usAidBar) {
        iranEls.usAidBar.style.width = Math.min(aidPct, 100).toFixed(1) + '%';
      }
    }

    // --- UKRAINE CONFLICT UPDATE ---
    var uaElapsedMs = now.getTime() - UKRAINE_WAR_START.getTime();

    if (uaElapsedMs > 0) {
      // War clock
      var uaTotalSeconds = Math.floor(uaElapsedMs / 1000);
      var uaDays = Math.floor(uaTotalSeconds / 86400);
      var uaHours = Math.floor((uaTotalSeconds % 86400) / 3600);
      var uaMinutes = Math.floor((uaTotalSeconds % 3600) / 60);
      var uaSeconds = uaTotalSeconds % 60;

      ukraineEls.clockDays.textContent = pad(uaDays);
      ukraineEls.clockHours.textContent = pad(uaHours);
      ukraineEls.clockMinutes.textContent = pad(uaMinutes);
      ukraineEls.clockSeconds.textContent = pad(uaSeconds);

      // Cost calculations
      var russiaCost = getRussiaCost(now);
      var ukraineCost = getUkraineCost(now);
      var uaTotal = russiaCost + ukraineCost;

      // Western aid
      var westernAid = getWesternAidToUkraine(now);
      var uaAidPct = ukraineCost > 0 ? (westernAid / ukraineCost) * 100 : 0;

      // Update displays
      ukraineEls.globalTotal.textContent = formatCurrencyPrecise(uaTotal);
      ukraineEls.russiaCost.textContent = formatCurrencyPrecise(russiaCost);
      ukraineEls.ukraineCost.textContent = formatCurrencyPrecise(ukraineCost);

      if (ukraineEls.westernAid) {
        // Show as €XXX.XXXB format since Kiel tracks in EUR
        var aidEur = westernAid * (267 / 290); // Convert back to EUR
        if (aidEur >= 1e9) {
          ukraineEls.westernAid.textContent = '€' + (aidEur / 1e9).toFixed(1) + 'B';
        } else {
          ukraineEls.westernAid.textContent = '€' + (aidEur / 1e6).toFixed(0) + 'M';
        }
      }
      if (ukraineEls.aidPct) {
        // Aid as % of total war cost (Russia + Ukraine combined)
        var aidOfTotal = uaTotal > 0 ? (westernAid / uaTotal) * 100 : 0;
        ukraineEls.aidPct.textContent = aidOfTotal.toFixed(1) + '%';
      }
      if (ukraineEls.aidBar) {
        var aidBarPct = uaTotal > 0 ? (westernAid / uaTotal) * 100 : 0;
        ukraineEls.aidBar.style.width = Math.min(aidBarPct, 100).toFixed(1) + '%';
      }
    }

    requestAnimationFrame(update);
  }

  // Start the loop
  requestAnimationFrame(update);

  // ===================================================================
  // THEME TOGGLE
  // ===================================================================
  (function () {
    var toggle = document.querySelector('[data-theme-toggle]');
    var root = document.documentElement;
    var theme = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    root.setAttribute('data-theme', theme);

    if (toggle) {
      toggle.addEventListener('click', function () {
        theme = theme === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', theme);
        toggle.setAttribute('aria-label', 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode');
        toggle.innerHTML = theme === 'dark'
          ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
          : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
      });
    }
  })();

})();