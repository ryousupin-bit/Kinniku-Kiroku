(() => {
  'use strict';

  const STORAGE_KEY = 'ironlog_state_v2';
  const KG_TO_LB = 2.20462262;

  const PARTS = {
    back: { id: 'back', label: '背中', color: 'var(--back)' },
    chest: { id: 'chest', label: '胸', color: 'var(--chest)' },
    shoulders: { id: 'shoulders', label: '肩', color: 'var(--shoulders)' },
    legs: { id: 'legs', label: '脚', color: 'var(--legs)' },
    rest: { id: 'rest', label: '休み', color: 'var(--rest)' }
  };

  const WORKOUT_PARTS = ['back', 'chest', 'shoulders', 'legs'];
  const ALL_ROTATION_PARTS = ['back', 'chest', 'shoulders', 'legs', 'rest'];

  const BAR_PRESETS = [
    { id: 'none', label: 'なし (0kg)', weight: 0, unit: 'kg' },
    { id: 'olympic20', label: 'オリンピックバー (20kg)', weight: 20, unit: 'kg' },
    { id: 'olympic45lb', label: 'オリンピックバー (45lb)', weight: 45, unit: 'lb' },
    { id: 'womens15', label: '15kgバー (15kg)', weight: 15, unit: 'kg' },
    { id: 'ez10', label: 'EZバー (10kg)', weight: 10, unit: 'kg' },
    { id: 'smith12', label: 'スミスマシン (12kg)', weight: 12, unit: 'kg' },
    { id: 'custom', label: 'カスタム重量', weight: 20, unit: 'kg' }
  ];

  // ---------- Date Utilities ----------
  function toDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function parseDateStr(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function addDays(dateStr, delta) {
    const d = parseDateStr(dateStr);
    d.setDate(d.getDate() + delta);
    return toDateStr(d);
  }

  function diffDays(dateStrA, dateStrB) {
    const a = parseDateStr(dateStrA);
    const b = parseDateStr(dateStrB);
    const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((utcA - utcB) / 86400000);
  }

  function formatDateJP(dateStr) {
    const d = parseDateStr(dateStr);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 (${days[d.getDay()]})`;
  }

  function todayStr() {
    return toDateStr(new Date());
  }

  // ---------- Math Utilities ----------
  function round1(val) {
    return Math.round((Number(val) || 0) * 10) / 10;
  }

  function kgToLb(kg) {
    return round1(kg * KG_TO_LB);
  }

  function lbToKg(lb) {
    return round1(lb / KG_TO_LB);
  }

  function uid(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getGymLogo(gym) {
    if (!gym) return null;
    if (gym.id === 'gym_fitplace' || /fit\s*place/i.test(gym.name || '')) {
      return { src: './logo-fitplace.png', brand: 'fitplace' };
    }
    if (gym.id === 'gym_totalworkout' || /トータル|total\s*workout/i.test(gym.name || '')) {
      return { src: './logo-totalworkout.png', brand: 'totalworkout' };
    }
    return null;
  }

  function renderGymPillHtml(g, isActive, dataAttr) {
    const logo = getGymLogo(g);
    if (logo) {
      return `
        <button type="button" class="gym-pill has-logo brand-${logo.brand} ${isActive ? 'active' : ''}" ${dataAttr}="${g.id}" aria-label="${escapeHtml(g.name)}">
          <img class="gym-logo-img" src="${logo.src}" alt="${escapeHtml(g.name)}" />
        </button>
      `;
    }
    return `
      <button type="button" class="gym-pill ${isActive ? 'active' : ''}" ${dataAttr}="${g.id}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        ${escapeHtml(g.name)}
      </button>
    `;
  }

  // ---------- Default Data ----------
  const PRESET_VERSION = 2;

  function createPresetExercises() {
    const mk = (id, gymId, part, name, unit, barPreset = 'none', barWeight = 0, barUnit = unit, plateMode = 'total') => ({
      id,
      gymId,
      part,
      name,
      unit,
      barPreset,
      barWeight,
      barUnit,
      plateMode
    });

    return [
      // Fitplace永山 (kg)
      // 背中
      mk('ex_fp_back_1', 'gym_fitplace', 'back', 'チンニング', 'kg'),
      mk('ex_fp_back_2', 'gym_fitplace', 'back', 'ラットプル', 'kg'),
      mk('ex_fp_back_3', 'gym_fitplace', 'back', 'プーリーロウ', 'kg'),
      mk('ex_fp_back_4', 'gym_fitplace', 'back', 'マシンローイング', 'kg'),
      mk('ex_fp_back_5', 'gym_fitplace', 'back', 'ダンベルローイング', 'kg'),
      mk('ex_fp_back_6', 'gym_fitplace', 'back', 'インクラインダンベルカール', 'kg'),
      mk('ex_fp_back_7', 'gym_fitplace', 'back', 'バーベルカール', 'kg', 'ez10', 10, 'kg', 'per_side'),
      // 胸
      mk('ex_fp_chest_1', 'gym_fitplace', 'chest', 'インクラインベンチプレス', 'kg', 'olympic20', 20, 'kg', 'per_side'),
      mk('ex_fp_chest_2', 'gym_fitplace', 'chest', 'チェストプレス', 'kg'),
      mk('ex_fp_chest_3', 'gym_fitplace', 'chest', 'ディップス', 'kg'),
      mk('ex_fp_chest_4', 'gym_fitplace', 'chest', 'ケーブルクロス', 'kg'),
      mk('ex_fp_chest_5', 'gym_fitplace', 'chest', 'ペックフライ', 'kg'),
      mk('ex_fp_chest_6', 'gym_fitplace', 'chest', 'インクラインダンベルフライ', 'kg'),
      mk('ex_fp_chest_7', 'gym_fitplace', 'chest', 'インクラインダンベルプレス', 'kg'),
      mk('ex_fp_chest_8', 'gym_fitplace', 'chest', 'オーバーヘッド三頭', 'kg'),
      mk('ex_fp_chest_9', 'gym_fitplace', 'chest', 'スカルクラッシャー', 'kg', 'ez10', 10, 'kg', 'per_side'),
      mk('ex_fp_chest_10', 'gym_fitplace', 'chest', 'ケーブルプレスダウン', 'kg'),
      // 肩
      mk('ex_fp_sh_1', 'gym_fitplace', 'shoulders', 'スミスショルダープレス（後ろ）', 'kg', 'smith12', 12, 'kg', 'per_side'),
      mk('ex_fp_sh_2', 'gym_fitplace', 'shoulders', 'スミスショルダープレス（前）', 'kg', 'smith12', 12, 'kg', 'per_side'),
      mk('ex_fp_sh_3', 'gym_fitplace', 'shoulders', 'ショルダープレスマシン', 'kg'),
      mk('ex_fp_sh_4', 'gym_fitplace', 'shoulders', 'リアペックフライ', 'kg'),
      mk('ex_fp_sh_5', 'gym_fitplace', 'shoulders', 'サイドレイズ', 'kg'),
      // 脚
      mk('ex_fp_legs_1', 'gym_fitplace', 'legs', 'スクワット', 'kg', 'olympic20', 20, 'kg', 'per_side'),
      mk('ex_fp_legs_2', 'gym_fitplace', 'legs', 'ランジ', 'kg'),
      mk('ex_fp_legs_3', 'gym_fitplace', 'legs', 'レッグエクステンション', 'kg'),
      mk('ex_fp_legs_4', 'gym_fitplace', 'legs', 'レッグカール', 'kg'),

      // トータル・ワークアウト六本木 (lb)
      // 背中
      mk('ex_tw_back_1', 'gym_totalworkout', 'back', 'チンニング', 'lb'),
      mk('ex_tw_back_2', 'gym_totalworkout', 'back', 'ラットプル', 'lb'),
      mk('ex_tw_back_3', 'gym_totalworkout', 'back', 'プーリーロウ', 'lb'),
      mk('ex_tw_back_4', 'gym_totalworkout', 'back', 'マシンローイング', 'lb'),
      mk('ex_tw_back_5', 'gym_totalworkout', 'back', 'ダンベルローイング', 'lb'),
      mk('ex_tw_back_6', 'gym_totalworkout', 'back', 'インクラインダンベルカール', 'lb'),
      mk('ex_tw_back_7', 'gym_totalworkout', 'back', 'バーベルカール', 'lb', 'ez10', 10, 'kg', 'per_side'),
      // 胸
      mk('ex_tw_chest_1', 'gym_totalworkout', 'chest', 'インクラインベンチプレス', 'lb', 'olympic45lb', 45, 'lb', 'per_side'),
      mk('ex_tw_chest_2', 'gym_totalworkout', 'chest', 'チェストプレス', 'lb'),
      mk('ex_tw_chest_3', 'gym_totalworkout', 'chest', 'ディップス', 'lb'),
      mk('ex_tw_chest_4', 'gym_totalworkout', 'chest', 'ケーブルクロス', 'lb'),
      mk('ex_tw_chest_5', 'gym_totalworkout', 'chest', 'ペックフライ', 'lb'),
      mk('ex_tw_chest_6', 'gym_totalworkout', 'chest', 'インクラインダンベルフライ', 'lb'),
      mk('ex_tw_chest_7', 'gym_totalworkout', 'chest', 'インクラインダンベルプレス', 'lb'),
      mk('ex_tw_chest_8', 'gym_totalworkout', 'chest', 'オーバーヘッド三頭', 'lb'),
      mk('ex_tw_chest_9', 'gym_totalworkout', 'chest', 'スカルクラッシャー', 'lb', 'ez10', 10, 'kg', 'per_side'),
      mk('ex_tw_chest_10', 'gym_totalworkout', 'chest', 'ケーブルプレスダウン', 'lb'),
      // 肩
      mk('ex_tw_sh_1', 'gym_totalworkout', 'shoulders', 'スミスショルダープレス（後ろ）', 'lb', 'smith12', 12, 'kg', 'per_side'),
      mk('ex_tw_sh_2', 'gym_totalworkout', 'shoulders', 'スミスショルダープレス（前）', 'lb', 'smith12', 12, 'kg', 'per_side'),
      mk('ex_tw_sh_3', 'gym_totalworkout', 'shoulders', 'ショルダープレスマシン', 'lb'),
      mk('ex_tw_sh_4', 'gym_totalworkout', 'shoulders', 'リアペックフライ', 'lb'),
      mk('ex_tw_sh_5', 'gym_totalworkout', 'shoulders', 'サイドレイズ', 'lb'),
      // 脚
      mk('ex_tw_legs_1', 'gym_totalworkout', 'legs', 'スクワット', 'lb', 'olympic45lb', 45, 'lb', 'per_side'),
      mk('ex_tw_legs_2', 'gym_totalworkout', 'legs', 'レッグプレス', 'lb'),
      mk('ex_tw_legs_3', 'gym_totalworkout', 'legs', 'レッグエクステンション', 'lb'),
      mk('ex_tw_legs_4', 'gym_totalworkout', 'legs', 'ライイングレッグカール', 'lb')
    ];
  }

  function createDefaultState() {
    const today = todayStr();
    return {
      gyms: [
        { id: 'gym_fitplace', name: 'Fitplace永山', note: 'kg表記中心' },
        { id: 'gym_totalworkout', name: 'トータル・ワークアウト六本木', note: 'lb表記マシン・フリーウェイト' }
      ],
      exercises: createPresetExercises(),
      logs: {},
      exerciseRecords: {},
      settings: {
        rotationStart: today,
        rotation: ['back', 'chest', 'shoulders', 'legs'],
        darkMode: true,
        selectedGymId: 'gym_fitplace',
        presetVersion: PRESET_VERSION
      }
    };
  }

  function syncAllExerciseRecords(targetState) {
    if (!targetState) return;
    const records = {};
    const logs = targetState.logs || {};
    Object.keys(logs).forEach((dateStr) => {
      const sets = logs[dateStr]?.sets || [];
      const dayTotals = {};
      sets.forEach((s) => {
        if (!s.exerciseId) return;
        const vol = (s.totalKg || 0) * (s.reps || 0);
        dayTotals[s.exerciseId] = (dayTotals[s.exerciseId] || 0) + vol;
      });
      Object.keys(dayTotals).forEach((exId) => {
        const v = Math.round(dayTotals[exId] * 10) / 10;
        if (v <= 0) return;
        if (!records[exId] || v > records[exId].bestVolumeKg) {
          records[exId] = { bestVolumeKg: v, bestDate: dateStr };
        }
      });
    });
    targetState.exerciseRecords = records;
  }

  function recomputeExerciseRecord(exerciseId) {
    if (!state.exerciseRecords) state.exerciseRecords = {};
    let bestVol = 0;
    let bestDate = null;
    Object.keys(state.logs || {}).forEach((dateStr) => {
      const sets = state.logs[dateStr]?.sets || [];
      let dayVol = 0;
      sets.forEach((s) => {
        if (s.exerciseId === exerciseId) {
          dayVol += (s.totalKg || 0) * (s.reps || 0);
        }
      });
      dayVol = Math.round(dayVol * 10) / 10;
      if (dayVol > bestVol) {
        bestVol = dayVol;
        bestDate = dateStr;
      }
    });
    if (bestVol > 0) {
      state.exerciseRecords[exerciseId] = { bestVolumeKg: bestVol, bestDate };
    } else {
      delete state.exerciseRecords[exerciseId];
    }
    return bestVol;
  }

  // ---------- App State ----------
  let state = loadState();
  const ui = {
    activeTab: 'log',
    selectedDate: todayStr(),
    logPart: 'back',
    manageGymId: state.settings.selectedGymId || (state.gyms[0]?.id ?? ''),
    managePart: 'back',
    calYear: new Date().getFullYear(),
    calMonth: new Date().getMonth(), // 0-indexed
    calSelectedDate: todayStr(),
    progressPart: 'all',
    progressExercise: 'all',
    progressMetric: 'volume'
  };

  // Sync initial logPart with today's schedule if it's a workout part
  const initialTodaySched = getDaySchedule(ui.selectedDate);
  if (WORKOUT_PARTS.includes(initialTodaySched.part)) {
    ui.logPart = initialTodaySched.part;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createDefaultState();
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.gyms) || !Array.isArray(parsed.exercises)) {
        return createDefaultState();
      }
      if (!parsed.settings) parsed.settings = {};
      if ((parsed.settings.presetVersion || 1) < PRESET_VERSION) {
        const nextPresets = createPresetExercises();
        // Keep any user-added custom exercises not matching old default IDs
        const customExercises = parsed.exercises.filter(
          (ex) => !/^ex_(fp|tw)_\d+$/.test(ex.id) && !nextPresets.some((p) => p.gymId === ex.gymId && p.name === ex.name)
        );
        parsed.exercises = [...nextPresets, ...customExercises];
        // Re-map existing log sets to new preset IDs when gymId & name match
        Object.values(parsed.logs || {}).forEach((log) => {
          (log?.sets || []).forEach((s) => {
            const matched = parsed.exercises.find((ex) => ex.gymId === s.gymId && ex.name === s.exerciseName);
            if (matched) s.exerciseId = matched.id;
          });
        });
        parsed.settings.presetVersion = PRESET_VERSION;
        syncAllExerciseRecords(parsed);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        } catch {}
      } else if (!parsed.exerciseRecords || typeof parsed.exerciseRecords !== 'object') {
        syncAllExerciseRecords(parsed);
      }
      return parsed;
    } catch {
      return createDefaultState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      showToast('保存容量エラーが発生しました');
    }
  }

  // ---------- Schedule & Rotation Logic ----------
  function getActualMainPart(dateStr) {
    const log = state.logs[dateStr];
    if (!log || !Array.isArray(log.sets) || log.sets.length === 0) return null;
    const counts = {};
    log.sets.forEach((s) => {
      counts[s.part] = (counts[s.part] || 0) + 1;
    });
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  }

  function getPlannedPart(dateStr) {
    const rot = state.settings.rotation;
    if (!rot || rot.length === 0) return 'rest';

    // Find the most recent logged workout strictly before dateStr so future rotation adapts automatically
    const prevLoggedDates = Object.keys(state.logs)
      .filter((d) => d < dateStr && Array.isArray(state.logs[d]?.sets) && state.logs[d].sets.length > 0)
      .sort()
      .reverse();

    if (prevLoggedDates.length > 0) {
      const anchorDate = prevLoggedDates[0];
      const anchorPart = getActualMainPart(anchorDate);
      const anchorIdx = rot.indexOf(anchorPart);
      if (anchorIdx !== -1) {
        // Count non-rest-override days between anchorDate (exclusive) and dateStr (inclusive)
        const totalDiff = diffDays(dateStr, anchorDate);
        let restDaysBetween = 0;
        for (const d of Object.keys(state.logs)) {
          if (d > anchorDate && d < dateStr && state.logs[d]?.restOverride) {
            restDaysBetween++;
          }
        }
        const steps = Math.max(1, totalDiff - restDaysBetween);
        return rot[(anchorIdx + steps) % rot.length];
      }
    }

    const diff = diffDays(dateStr, state.settings.rotationStart || todayStr());
    const idx = ((diff % rot.length) + rot.length) % rot.length;
    return rot[idx];
  }

  function getDaySchedule(dateStr) {
    const log = state.logs[dateStr];
    if (log && Array.isArray(log.sets) && log.sets.length > 0) {
      const counts = {};
      log.sets.forEach((s) => {
        counts[s.part] = (counts[s.part] || 0) + 1;
      });
      const sortedParts = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
      return {
        part: sortedParts[0],
        parts: sortedParts,
        type: 'actual',
        setCount: log.sets.length
      };
    }
    if (log && log.restOverride) {
      return { part: 'rest', parts: ['rest'], type: 'actual', setCount: 0 };
    }
    const planned = getPlannedPart(dateStr);
    return { part: planned, parts: [planned], type: 'planned', setCount: 0 };
  }

  // ---------- Toast ----------
  let toastTimer = null;
  function showToast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  // ---------- Theme ----------
  function applyTheme() {
    const isDark = state.settings.darkMode !== false;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    const meta = document.getElementById('meta-theme-color');
    if (meta) meta.setAttribute('content', isDark ? '#090A0D' : '#F1F2F5');
    const toggle = document.getElementById('setting-dark-mode');
    if (toggle) toggle.checked = isDark;
  }

  // ---------- Modal Helpers ----------
  const modalBackdrop = document.getElementById('modal-backdrop');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');

  function openModal(title, htmlContent, onMount) {
    modalTitle.textContent = title;
    modalBody.innerHTML = htmlContent;
    modalBackdrop.classList.add('open');
    if (typeof onMount === 'function') onMount(modalBody);
  }

  function closeModal() {
    modalBackdrop.classList.remove('open');
  }

  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closeModal();
  });

  // ---------- Rest Timer (Center Shiba Arm-Curl Overlay) ----------
  let restInterval = null;
  let restRemaining = 0;
  let restTotal = 0;
  let restLastPreset = 90;
  let restFinished = false;
  const SHIBA_RING_CIRCUMFERENCE = 2 * Math.PI * 108;

  const shibaOverlay = document.getElementById('shiba-timer-overlay');
  const shibaCard = document.getElementById('shiba-timer-card');
  const shibaBadge = document.getElementById('shiba-timer-badge');
  const shibaRing = document.getElementById('shiba-ring-progress');
  const shibaTimeEl = document.getElementById('shiba-timer-time');
  const shibaSubEl = document.getElementById('shiba-timer-sub');
  const shibaAdjustEl = document.getElementById('shiba-timer-adjust');
  const shibaBgBtn = document.getElementById('shiba-timer-bg-btn');
  const shibaStopBtn = document.getElementById('shiba-timer-stop-btn');

  function formatTimerMMSS(sec) {
    const safe = Math.max(0, sec);
    const m = Math.floor(safe / 60);
    const s = String(safe % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function updateTimerPill() {
    const btn = document.getElementById('rest-timer-btn');
    const txt = document.getElementById('rest-timer-text');
    if (restRemaining > 0) {
      txt.textContent = formatTimerMMSS(restRemaining);
      btn.classList.add('running');
    } else {
      txt.textContent = 'タイマー';
      btn.classList.remove('running');
    }
    updateShibaOverlayUI();
  }

  function updateShibaOverlayUI() {
    if (!shibaOverlay) return;
    if (restFinished) {
      shibaCard.classList.remove('urgent');
      shibaCard.classList.add('finished');
      shibaBadge.textContent = 'TIME UP!';
      shibaTimeEl.textContent = '0:00';
      shibaSubEl.textContent = 'FINISH! 次のセットへいこう！';
      shibaRing.style.strokeDashoffset = String(SHIBA_RING_CIRCUMFERENCE);
      shibaAdjustEl.style.display = 'none';
      shibaBgBtn.textContent = `もう1回 (${restLastPreset >= 120 && restLastPreset % 60 === 0 ? `${restLastPreset / 60}分` : `${restLastPreset}秒`})`;
      shibaStopBtn.textContent = '閉じる';
      return;
    }

    shibaCard.classList.remove('finished');
    shibaCard.classList.toggle('urgent', restRemaining > 0 && restRemaining <= 10);
    shibaBadge.textContent = restRemaining <= 10 && restRemaining > 0 ? 'LAST SPURT!' : 'REST TIMER';
    shibaTimeEl.textContent = formatTimerMMSS(restRemaining);
    shibaSubEl.textContent = restRemaining <= 10 && restRemaining > 0
      ? 'まもなく次のセット'
      : '次のセットに備えよう';

    const ratio = restTotal > 0 ? Math.max(0, Math.min(1, restRemaining / restTotal)) : 0;
    shibaRing.style.strokeDashoffset = String(SHIBA_RING_CIRCUMFERENCE * (1 - ratio));
    shibaAdjustEl.style.display = 'grid';
    shibaBgBtn.textContent = '記録に戻る';
    shibaStopBtn.textContent = '停止';
  }

  function openShibaTimerOverlay() {
    if (!shibaOverlay) return;
    updateShibaOverlayUI();
    shibaOverlay.classList.add('open');
  }

  function closeShibaTimerOverlay() {
    if (!shibaOverlay) return;
    shibaOverlay.classList.remove('open');
    if (restFinished) {
      restFinished = false;
      updateTimerPill();
    }
  }

  function startRestTimer(seconds) {
    clearInterval(restInterval);
    restLastPreset = seconds;
    restTotal = seconds;
    restRemaining = seconds;
    restFinished = false;
    updateTimerPill();
    openShibaTimerOverlay();
    restInterval = setInterval(() => {
      restRemaining--;
      if (restRemaining <= 0) {
        clearInterval(restInterval);
        restInterval = null;
        restRemaining = 0;
        restFinished = true;
        updateTimerPill();
        openShibaTimerOverlay();
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        showToast('インターバル終了！次のセットへ');
      } else {
        updateTimerPill();
      }
    }, 1000);
  }

  function adjustRestTimer(delta) {
    if (restFinished || restRemaining <= 0) return;
    restRemaining = Math.max(5, restRemaining + delta);
    if (restRemaining > restTotal) restTotal = restRemaining;
    updateTimerPill();
  }

  function stopRestTimer() {
    clearInterval(restInterval);
    restInterval = null;
    restRemaining = 0;
    restTotal = 0;
    restFinished = false;
    closeShibaTimerOverlay();
    updateTimerPill();
  }

  if (shibaOverlay) {
    document.getElementById('shiba-timer-hide-btn').addEventListener('click', closeShibaTimerOverlay);
    shibaOverlay.addEventListener('click', (e) => {
      if (e.target === shibaOverlay) closeShibaTimerOverlay();
    });
    document.getElementById('shiba-timer-minus').addEventListener('click', () => adjustRestTimer(-15));
    document.getElementById('shiba-timer-plus').addEventListener('click', () => adjustRestTimer(15));
    shibaBgBtn.addEventListener('click', () => {
      if (restFinished) {
        startRestTimer(restLastPreset);
      } else {
        closeShibaTimerOverlay();
      }
    });
    shibaStopBtn.addEventListener('click', () => {
      const wasFinished = restFinished;
      stopRestTimer();
      if (!wasFinished) showToast('タイマーを停止しました');
    });
  }

  document.getElementById('rest-timer-btn').addEventListener('click', () => {
    if (restRemaining > 0 || restFinished) {
      openShibaTimerOverlay();
      return;
    }
    openModal(
      'レストタイマー',
      `
      <div style="text-align:center; margin-bottom:16px;">
        <div class="tabular" id="modal-timer-display" style="font-size:40px; font-weight:800; letter-spacing:-0.02em;">
          0:00
        </div>
        <div style="font-size:12px; color:var(--text-muted);">セット間の休憩時間を計測します</div>
      </div>
      <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px; margin-bottom:14px;">
        <button type="button" class="btn btn-secondary btn-sm" data-sec="60">60秒</button>
        <button type="button" class="btn btn-secondary btn-sm" data-sec="90">90秒</button>
        <button type="button" class="btn btn-secondary btn-sm" data-sec="120">2分</button>
        <button type="button" class="btn btn-secondary btn-sm" data-sec="180">3分</button>
      </div>
      `,
      (container) => {
        container.querySelectorAll('[data-sec]').forEach((b) => {
          b.addEventListener('click', () => {
            closeModal();
            startRestTimer(Number(b.dataset.sec));
          });
        });
      }
    );
  });

  // ---------- PR Congratulations Popup ----------
  const prOverlay = document.getElementById('shiba-pr-overlay');
  const prExEl = document.getElementById('shiba-pr-ex');
  const prVolEl = document.getElementById('shiba-pr-vol');
  const prDiffEl = document.getElementById('shiba-pr-diff');

  function openPrCongratsOverlay(exerciseName, newVolKg, prevBestKg) {
    if (!prOverlay) return;
    prExEl.textContent = exerciseName;
    prVolEl.textContent = `${Math.round(newVolKg).toLocaleString()} kg`;
    const diffKg = Math.round((newVolKg - prevBestKg) * 10) / 10;
    prDiffEl.textContent = `過去最高 ${Math.round(prevBestKg).toLocaleString()} kg を更新！（+${Math.round(diffKg).toLocaleString()} kg）`;
    prOverlay.classList.add('open');
    if (navigator.vibrate) navigator.vibrate([120, 60, 180]);
  }

  function closePrCongratsOverlay() {
    if (!prOverlay) return;
    prOverlay.classList.remove('open');
  }

  if (prOverlay) {
    document.getElementById('shiba-pr-close-btn').addEventListener('click', closePrCongratsOverlay);
    prOverlay.addEventListener('click', (e) => {
      if (e.target === prOverlay) closePrCongratsOverlay();
    });
  }

  // ---------- Previous Record Lookup ----------
  function getLatestSetForExercise(exerciseId, beforeDateStr) {
    const dates = Object.keys(state.logs)
      .filter((d) => d <= beforeDateStr)
      .sort()
      .reverse();
    for (const d of dates) {
      const sets = state.logs[d]?.sets || [];
      const matching = sets.filter((s) => s.exerciseId === exerciseId);
      if (matching.length > 0) {
        return { date: d, set: matching[matching.length - 1], allSets: matching };
      }
    }
    return null;
  }

  // ---------- Render: Log View ----------
  function renderLogView() {
    const dateStr = ui.selectedDate;
    const isToday = dateStr === todayStr();
    const sched = getDaySchedule(dateStr);
    const partInfo = PARTS[sched.part];

    document.getElementById('header-subtitle').textContent = isToday
      ? `今日・${sched.type === 'actual' ? '記録済み' : '予定'}: ${partInfo.label}`
      : `${formatDateJP(dateStr)}`;

    document.getElementById('log-date-label').textContent = formatDateJP(dateStr);
    const statusEl = document.getElementById('log-date-status');
    statusEl.innerHTML = `
      <span class="part-badge ${sched.part}">${sched.type === 'actual' ? '実績' : 'ローテ予定'}: ${partInfo.label}</span>
      ${isToday ? '<span class="meta-chip">今日</span>' : '<span class="meta-chip">タップで今日へ</span>'}
    `;

    // Gym pills
    if (!state.gyms.some((g) => g.id === state.settings.selectedGymId) && state.gyms.length > 0) {
      state.settings.selectedGymId = state.gyms[0].id;
    }
    const gymPills = document.getElementById('log-gym-pills');
    gymPills.innerHTML = state.gyms
      .map((g) => renderGymPillHtml(g, g.id === state.settings.selectedGymId, 'data-gym-id'))
      .join('');

    gymPills.querySelectorAll('.gym-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.settings.selectedGymId = btn.dataset.gymId;
        saveState();
        renderLogView();
      });
    });

    // Summary strip
    const daySets = state.logs[dateStr]?.sets || [];
    const totalVolKg = daySets.reduce((acc, s) => acc + s.totalKg * s.reps, 0);
    document.getElementById('sum-sets').textContent = `${daySets.length}`;
    document.getElementById('sum-volume').textContent = `${Math.round(totalVolKg).toLocaleString()} kg`;
    document.getElementById('sum-part').innerHTML =
      daySets.length > 0
        ? sched.parts.map((p) => `<span class="part-badge ${p}">${PARTS[p].label}</span>`).join(' ')
        : `<span class="part-badge ${sched.part}" style="opacity:0.75">${partInfo.label}</span>`;

    // Part tabs active state
    document.querySelectorAll('#log-part-tabs .part-tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.part === ui.logPart);
    });

    // Exercises for current gym & part
    const exercises = state.exercises.filter(
      (ex) => ex.gymId === state.settings.selectedGymId && ex.part === ui.logPart
    );

    const container = document.getElementById('log-exercises-container');
    if (exercises.length === 0) {
      const gymName = state.gyms.find((g) => g.id === state.settings.selectedGymId)?.name || 'このジム';
      container.innerHTML = `
        <div class="card empty-state">
          <div style="font-weight:700; color:var(--text); margin-bottom:4px;">種目がまだ登録されていません</div>
          <div>「${escapeHtml(gymName)}」の「${PARTS[ui.logPart].label}」種目を下のボタンから追加してください。</div>
        </div>
      `;
      return;
    }

    container.innerHTML = exercises
      .map((ex) => {
        const todaySets = daySets.filter((s) => s.exerciseId === ex.id);
        const prev = getLatestSetForExercise(ex.id, addDays(dateStr, -1));
        const barLabel =
          ex.barWeight > 0
            ? `バー ${ex.barWeight}${ex.barUnit}`
            : 'バーなし';
        const modeLabel = ex.plateMode === 'per_side' ? '片側入力' : '総重量入力';

        const prevHtml = prev
          ? `<div class="prev-record">
               <span>前回 (${prev.date.slice(5).replace('-', '/')})</span>
               <strong class="tabular">${prev.set.totalKg} kg (${prev.set.totalLb} lb) × ${prev.set.reps}回${prev.set.assistedReps > 0 ? ` (+補助${prev.set.assistedReps})` : ''}</strong>
             </div>`
          : '';

        const setsHtml =
          todaySets.length > 0
            ? `<div class="set-list">
                ${todaySets
                  .map(
                    (s, idx) => `
                  <div class="set-row editable" data-edit-set="${s.id}" data-ex-id="${ex.id}" title="タップして重量・回数を修正">
                    <span class="set-num tabular">${idx + 1}</span>
                    <div class="set-weight-col">
                      <div class="set-weight-main tabular">
                        ${s.inputUnit === 'lb' ? `${s.totalLb} lb` : `${s.totalKg} kg`}
                        <span style="font-size:12px; font-weight:600; color:var(--text-muted); margin-left:4px;">
                          (${s.inputUnit === 'lb' ? `${s.totalKg} kg` : `${s.totalLb} lb`})
                        </span>
                      </div>
                      <div class="set-weight-sub tabular">
                        ${
                          s.barAdded
                            ? s.plateMode === 'per_side'
                              ? `片側 ${s.inputWeight}${s.inputUnit} × 2 + バー ${round1(s.inputUnit === 'lb' ? kgToLb(s.barWeightKg) : s.barWeightKg)}${s.inputUnit}`
                              : `バー込総重量 (バー ${round1(s.inputUnit === 'lb' ? kgToLb(s.barWeightKg) : s.barWeightKg)}${s.inputUnit})`
                            : s.plateMode === 'per_side'
                            ? `片側 ${s.inputWeight}${s.inputUnit} × 2`
                            : 'プレート/マシン重量'
                        }
                      </div>
                    </div>
                    <div class="set-reps tabular" style="text-align:right;">
                      <div>${s.reps} 回</div>
                      ${s.assistedReps > 0 ? `<div style="font-size:11px; font-weight:700; color:var(--shoulders);">補助 +${s.assistedReps}</div>` : ''}
                    </div>
                    <span class="set-edit-hint" aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    </span>
                    <button type="button" class="set-delete-btn" data-del-set="${s.id}" aria-label="セット削除">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                `
                  )
                  .join('')}
              </div>`
            : '';

        return `
          <article class="exercise-card">
            <div class="exercise-card-header">
              <div>
                <h3 class="exercise-name">${escapeHtml(ex.name)}</h3>
                <div class="exercise-meta">
                  <span class="meta-chip">${ex.unit.toUpperCase()}</span>
                  <span class="meta-chip">${barLabel}</span>
                  ${ex.barWeight > 0 || ex.plateMode === 'per_side' ? `<span class="meta-chip">${modeLabel}</span>` : ''}
                </div>
              </div>
              <button type="button" class="btn btn-primary btn-sm" data-add-set="${ex.id}">+ セット</button>
            </div>
            ${prevHtml}
            ${setsHtml}
          </article>
        `;
      })
      .join('');

    container.querySelectorAll('[data-add-set]').forEach((btn) => {
      btn.addEventListener('click', () => openAddSetModal(btn.dataset.addSet, null));
    });

    container.querySelectorAll('[data-edit-set]').forEach((row) => {
      row.addEventListener('click', () => openAddSetModal(row.dataset.exId, row.dataset.editSet));
    });

    container.querySelectorAll('[data-del-set]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const setId = btn.dataset.delSet;
        const log = state.logs[ui.selectedDate];
        if (!log) return;
        const target = log.sets.find((s) => s.id === setId);
        log.sets = log.sets.filter((s) => s.id !== setId);
        if (log.sets.length === 0 && !log.restOverride) {
          delete state.logs[ui.selectedDate];
        }
        if (target?.exerciseId) {
          recomputeExerciseRecord(target.exerciseId);
        }
        saveState();
        renderLogView();
        showToast('セットを削除しました');
      });
    });
  }

  // ---------- Add / Edit Set Modal (Auto 3-Set + kg<->lb + Bar Weight + Self/Assisted Reps) ----------
  function openAddSetModal(exerciseId, editSetId = null) {
    const ex = state.exercises.find((e) => e.id === exerciseId);
    if (!ex) return;

    const daySets = state.logs[ui.selectedDate]?.sets || [];
    const existingSet = editSetId ? daySets.find((s) => s.id === editSetId) : null;
    const isEdit = !!existingSet;
    const existingCountForEx = daySets.filter((s) => s.exerciseId === ex.id).length;

    const latest = !isEdit ? getLatestSetForExercise(ex.id, ui.selectedDate) : null;
    const base = existingSet || latest?.set || null;

    let unit = base ? base.inputUnit : ex.unit;
    let plateMode = base ? base.plateMode : ex.plateMode;
    let barWeightKg = ex.barUnit === 'lb' ? lbToKg(ex.barWeight) : Number(ex.barWeight) || 0;
    let barAdded = base ? base.barAdded : barWeightKg > 0;
    let inputWeight = base ? base.inputWeight : (plateMode === 'per_side' ? (unit === 'lb' ? 25 : 10) : (unit === 'lb' ? 60 : 30));
    let reps = base ? base.reps : 10;
    let assistedReps = base ? (Number(base.assistedReps) || 0) : 0;
    let autoThree = !isEdit && existingCountForEx === 0;

    openModal(
      isEdit ? `${ex.name}（セット修正）` : ex.name,
      `
      <div class="calc-preview">
        <div class="calc-total-main tabular" id="set-calc-main">0 kg</div>
        <div class="calc-total-conv tabular" id="set-calc-conv">0 lb</div>
        <div class="calc-formula tabular" id="set-calc-formula"></div>
      </div>

      <div class="form-group">
        <label class="form-label">単位（切替で自動変換）</label>
        <div class="segmented" id="set-unit-seg">
          <button type="button" class="segmented-btn ${unit === 'kg' ? 'active' : ''}" data-unit="kg">kg（キログラム）</button>
          <button type="button" class="segmented-btn ${unit === 'lb' ? 'active' : ''}" data-unit="lb">lb（ポンド）</button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">入力方法</label>
        <div class="segmented" id="set-mode-seg">
          <button type="button" class="segmented-btn ${plateMode === 'per_side' ? 'active' : ''}" data-mode="per_side">片側プレート (×2)</button>
          <button type="button" class="segmented-btn ${plateMode === 'total' ? 'active' : ''}" data-mode="total">総重量を直接入力</button>
        </div>
      </div>

      ${
        barWeightKg > 0
          ? `<div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-title">バーの重さを自動追加</span>
                <span class="toggle-desc tabular" id="set-bar-desc"></span>
              </div>
              <label class="switch">
                <input type="checkbox" id="set-bar-toggle" ${barAdded ? 'checked' : ''} />
                <span class="slider"></span>
              </label>
            </div>`
          : ''
      }

      ${
        !isEdit
          ? `<div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-title">3セット自動でまとめて入力</span>
                <span class="toggle-desc">登録後に各セットをタップして個別に修正できます</span>
              </div>
              <label class="switch">
                <input type="checkbox" id="set-auto3-toggle" ${autoThree ? 'checked' : ''} />
                <span class="slider"></span>
              </label>
            </div>`
          : ''
      }

      <div class="form-group">
        <label class="form-label" id="set-weight-label">重量</label>
        <div class="stepper-row">
          <input type="number" step="0.5" min="0" inputmode="decimal" id="set-weight-input" class="form-input tabular" value="${inputWeight}" />
        </div>
        <div class="quick-deltas" id="set-quick-deltas"></div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px;">
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" for="set-reps-input">自力回数（グラフ反映）</label>
          <div class="stepper-row">
            <button type="button" class="icon-btn" id="reps-minus" aria-label="自力回数を減らす">−</button>
            <input type="number" step="1" min="0" inputmode="numeric" id="set-reps-input" class="form-input tabular" value="${reps}" />
            <button type="button" class="icon-btn" id="reps-plus" aria-label="自力回数を増やす">＋</button>
          </div>
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" for="set-assisted-input">補助回数（記録のみ）</label>
          <div class="stepper-row">
            <button type="button" class="icon-btn" id="assisted-minus" aria-label="補助回数を減らす">−</button>
            <input type="number" step="1" min="0" inputmode="numeric" id="set-assisted-input" class="form-input tabular" value="${assistedReps}" />
            <button type="button" class="icon-btn" id="assisted-plus" aria-label="補助回数を増やす">＋</button>
          </div>
        </div>
      </div>

      <div style="display:flex; gap:8px; margin-top:16px;">
        <button type="button" class="btn btn-primary btn-block" id="btn-save-set">
          ${isEdit ? 'このセットの変更を保存' : autoThree ? '3セットまとめて記録' : '1セットを記録'}
        </button>
      </div>
      `,
      (root) => {
        const weightInput = root.querySelector('#set-weight-input');
        const repsInput = root.querySelector('#set-reps-input');
        const assistedInput = root.querySelector('#set-assisted-input');
        const barToggle = root.querySelector('#set-bar-toggle');
        const auto3Toggle = root.querySelector('#set-auto3-toggle');
        const saveBtn = root.querySelector('#btn-save-set');
        const barDesc = root.querySelector('#set-bar-desc');
        const weightLabel = root.querySelector('#set-weight-label');
        const mainOut = root.querySelector('#set-calc-main');
        const convOut = root.querySelector('#set-calc-conv');
        const formulaOut = root.querySelector('#set-calc-formula');
        const deltasEl = root.querySelector('#set-quick-deltas');

        function computeTotals() {
          const val = Math.max(0, Number(weightInput.value) || 0);
          const barInCurrentUnit = unit === 'lb' ? kgToLb(barWeightKg) : round1(barWeightKg);
          let totalInCurrentUnit = 0;

          if (plateMode === 'per_side') {
            totalInCurrentUnit = val * 2 + (barAdded ? barInCurrentUnit : 0);
          } else {
            totalInCurrentUnit = val;
          }

          const totalKg = unit === 'kg' ? round1(totalInCurrentUnit) : lbToKg(totalInCurrentUnit);
          const totalLb = unit === 'lb' ? round1(totalInCurrentUnit) : kgToLb(totalInCurrentUnit);
          return { val, barInCurrentUnit, totalInCurrentUnit: round1(totalInCurrentUnit), totalKg, totalLb };
        }

        function renderDeltas() {
          const steps = unit === 'lb' ? [-10, -5, 5, 10] : [-5, -2.5, 2.5, 5];
          deltasEl.innerHTML = steps
            .map((d) => `<button type="button" class="quick-delta-btn tabular" data-delta="${d}">${d > 0 ? '+' : ''}${d}${unit}</button>`)
            .join('');
          deltasEl.querySelectorAll('.quick-delta-btn').forEach((b) => {
            b.addEventListener('click', () => {
              const next = Math.max(0, round1((Number(weightInput.value) || 0) + Number(b.dataset.delta)));
              weightInput.value = next;
              updatePreview();
            });
          });
        }

        function updatePreview() {
          const { val, barInCurrentUnit, totalKg, totalLb } = computeTotals();
          if (barDesc) {
            barDesc.textContent = `+ ${barInCurrentUnit} ${unit} (${round1(barWeightKg)}kg / ${kgToLb(barWeightKg)}lb)`;
          }
          weightLabel.textContent =
            plateMode === 'per_side'
              ? `片側のプレート重量 (${unit})`
              : `総重量 (${unit})`;

          if (unit === 'kg') {
            mainOut.textContent = `${totalKg} kg`;
            convOut.textContent = `= ${totalLb} lb`;
          } else {
            mainOut.textContent = `${totalLb} lb`;
            convOut.textContent = `= ${totalKg} kg`;
          }

          if (plateMode === 'per_side') {
            formulaOut.textContent = barAdded && barWeightKg > 0
              ? `片側 ${val}${unit} × 2 + バー ${barInCurrentUnit}${unit}`
              : `片側 ${val}${unit} × 2（バー加算なし）`;
          } else {
            formulaOut.textContent = barAdded && barWeightKg > 0
              ? `バー ${barInCurrentUnit}${unit} 込みの総重量`
              : '直接入力された総重量';
          }
        }

        // Unit segmented switch with auto-conversion
        root.querySelectorAll('#set-unit-seg .segmented-btn').forEach((b) => {
          b.addEventListener('click', () => {
            const nextUnit = b.dataset.unit;
            if (nextUnit === unit) return;
            const currentVal = Number(weightInput.value) || 0;
            const converted = nextUnit === 'lb' ? kgToLb(currentVal) : lbToKg(currentVal);
            unit = nextUnit;
            weightInput.value = converted;
            root.querySelectorAll('#set-unit-seg .segmented-btn').forEach((x) => x.classList.toggle('active', x.dataset.unit === unit));
            renderDeltas();
            updatePreview();
          });
        });

        // Mode segmented switch
        root.querySelectorAll('#set-mode-seg .segmented-btn').forEach((b) => {
          b.addEventListener('click', () => {
            const nextMode = b.dataset.mode;
            if (nextMode === plateMode) return;
            const { totalInCurrentUnit, barInCurrentUnit } = computeTotals();
            plateMode = nextMode;
            if (plateMode === 'total') {
              weightInput.value = totalInCurrentUnit;
            } else {
              const side = Math.max(0, round1((totalInCurrentUnit - (barAdded ? barInCurrentUnit : 0)) / 2));
              weightInput.value = side;
            }
            root.querySelectorAll('#set-mode-seg .segmented-btn').forEach((x) => x.classList.toggle('active', x.dataset.mode === plateMode));
            updatePreview();
          });
        });

        if (barToggle) {
          barToggle.addEventListener('change', () => {
            barAdded = barToggle.checked;
            updatePreview();
          });
        }

        if (auto3Toggle) {
          auto3Toggle.addEventListener('change', () => {
            autoThree = auto3Toggle.checked;
            saveBtn.textContent = autoThree ? '3セットまとめて記録' : '1セットを記録';
          });
        }

        weightInput.addEventListener('input', updatePreview);

        root.querySelector('#reps-minus').addEventListener('click', () => {
          repsInput.value = Math.max(0, (Number(repsInput.value) || 0) - 1);
        });
        root.querySelector('#reps-plus').addEventListener('click', () => {
          repsInput.value = (Number(repsInput.value) || 0) + 1;
        });

        root.querySelector('#assisted-minus').addEventListener('click', () => {
          assistedInput.value = Math.max(0, (Number(assistedInput.value) || 0) - 1);
        });
        root.querySelector('#assisted-plus').addEventListener('click', () => {
          assistedInput.value = (Number(assistedInput.value) || 0) + 1;
        });

        saveBtn.addEventListener('click', () => {
          const { val, totalKg, totalLb } = computeTotals();
          const finalReps = Math.max(0, parseInt(repsInput.value, 10) || 0);
          const finalAssisted = Math.max(0, parseInt(assistedInput.value, 10) || 0);
          if (finalReps === 0 && finalAssisted === 0) {
            showToast('自力または補助の回数を1回以上入力してください');
            return;
          }

          if (!state.logs[ui.selectedDate]) {
            state.logs[ui.selectedDate] = { sets: [] };
          }
          delete state.logs[ui.selectedDate].restOverride;

          const prevBestKg = state.exerciseRecords?.[ex.id]?.bestVolumeKg || 0;
          const repsLabel = finalAssisted > 0 ? `${finalReps}回(+補助${finalAssisted})` : `${finalReps}回`;

          if (isEdit) {
            Object.assign(existingSet, {
              inputWeight: val,
              inputUnit: unit,
              barAdded: barAdded && barWeightKg > 0,
              barWeightKg: barWeightKg,
              plateMode,
              totalKg,
              totalLb,
              reps: finalReps,
              assistedReps: finalAssisted
            });
            const newBestKg = recomputeExerciseRecord(ex.id);
            saveState();
            closeModal();
            renderLogView();
            if (prevBestKg > 0 && newBestKg > prevBestKg) {
              openPrCongratsOverlay(ex.name, newBestKg, prevBestKg);
            } else {
              showToast(`セットを修正しました (${unit === 'lb' ? `${totalLb}lb` : `${totalKg}kg`} × ${repsLabel})`);
            }
            return;
          }

          const count = autoThree ? 3 : 1;
          for (let i = 0; i < count; i++) {
            state.logs[ui.selectedDate].sets.push({
              id: uid('set'),
              gymId: ex.gymId,
              exerciseId: ex.id,
              exerciseName: ex.name,
              part: ex.part,
              inputWeight: val,
              inputUnit: unit,
              barAdded: barAdded && barWeightKg > 0,
              barWeightKg: barWeightKg,
              plateMode,
              totalKg,
              totalLb,
              reps: finalReps,
              assistedReps: finalAssisted,
              createdAt: Date.now() + i
            });
          }

          const newBestKg = recomputeExerciseRecord(ex.id);
          saveState();
          closeModal();
          renderLogView();
          if (prevBestKg > 0 && newBestKg > prevBestKg) {
            openPrCongratsOverlay(ex.name, newBestKg, prevBestKg);
          } else {
            const wLabel = unit === 'lb' ? `${totalLb}lb` : `${totalKg}kg`;
            showToast(
              count === 3
                ? `${ex.name} ${wLabel} × ${repsLabel}を3セット自動入力しました`
                : `${ex.name} ${wLabel} × ${repsLabel}を記録`
            );
          }
        });

        renderDeltas();
        updatePreview();
      }
    );
  }

  // ---------- Render: Calendar View ----------
  function renderCalendarView() {
    const year = ui.calYear;
    const month = ui.calMonth;
    document.getElementById('cal-month-label').textContent = `${year}年 ${month + 1}月`;

    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells = [];
    // Leading days from previous month
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      cells.push({ dateStr: toDateStr(d), day: d.getDate(), outside: true });
    }
    // Current month
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      cells.push({ dateStr: toDateStr(d), day, outside: false });
    }
    // Trailing days to complete 6 rows (or 5 rows)
    const remainder = cells.length % 7;
    if (remainder !== 0) {
      for (let i = 1; i <= 7 - remainder; i++) {
        const d = new Date(year, month + 1, i);
        cells.push({ dateStr: toDateStr(d), day: d.getDate(), outside: true });
      }
    }

    const today = todayStr();
    const grid = document.getElementById('cal-grid');
    grid.innerHTML = cells
      .map((c) => {
        const sched = getDaySchedule(c.dateStr);
        const partInfo = PARTS[sched.part];
        const classes = ['cal-cell'];
        if (c.outside) classes.push('outside');
        if (c.dateStr === today) classes.push('today');
        if (c.dateStr === ui.calSelectedDate) classes.push('selected');

        return `
          <button type="button" class="${classes.join(' ')}" data-cal-date="${c.dateStr}">
            <span class="cal-day-num tabular">${c.day}</span>
            <span class="cal-part-tag ${sched.type} ${sched.part}">${partInfo.label}</span>
          </button>
        `;
      })
      .join('');

    grid.querySelectorAll('.cal-cell').forEach((cell) => {
      cell.addEventListener('click', () => {
        const dateStr = cell.dataset.calDate;
        ui.calSelectedDate = dateStr;
        ui.selectedDate = dateStr;
        const sched = getDaySchedule(dateStr);
        if (WORKOUT_PARTS.includes(sched.part)) {
          ui.logPart = sched.part;
        }
        const daySets = state.logs[dateStr]?.sets || [];
        if (daySets.length > 0 && state.gyms.some((g) => g.id === daySets[0].gymId)) {
          state.settings.selectedGymId = daySets[0].gymId;
          saveState();
        }
        switchTab('log');
      });
    });

    renderCalendarDetail();
  }

  function renderCalendarDetail() {
    const dateStr = ui.calSelectedDate;
    const sched = getDaySchedule(dateStr);
    const log = state.logs[dateStr];
    const sets = log?.sets || [];
    const detail = document.getElementById('cal-day-detail');

    const grouped = {};
    sets.forEach((s) => {
      if (!grouped[s.exerciseName]) grouped[s.exerciseName] = { part: s.part, sets: [] };
      grouped[s.exerciseName].sets.push(s);
    });

    const summaryHtml =
      sets.length > 0
        ? Object.entries(grouped)
            .map(
              ([exName, info]) => `
            <div class="list-item">
              <div class="list-item-main">
                <div class="list-item-title">
                  ${escapeHtml(exName)}
                  <span class="part-badge ${info.part}" style="margin-left:6px;">${PARTS[info.part].label}</span>
                </div>
                <div class="list-item-sub tabular">
                  ${info.sets.map((s) => `${s.inputUnit === 'lb' ? `${s.totalLb}lb` : `${s.totalKg}kg`}×${s.reps}${s.assistedReps > 0 ? `(+補助${s.assistedReps})` : ''}`).join(' / ')}
                </div>
              </div>
            </div>
          `
            )
            .join('')
        : `<div style="font-size:13px; color:var(--text-muted); padding: 8px 0 12px;">
             ${
               sched.part === 'rest'
                 ? 'この日は休養日に設定されています。'
                 : `ローテーション予定は「${PARTS[sched.part].label}」です。記録を追加すると実績としてカレンダーが更新されます。`
             }
           </div>`;

    detail.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:10px;">
        <div>
          <div style="font-size:16px; font-weight:800;" class="tabular">${formatDateJP(dateStr)}</div>
          <div style="margin-top:3px; display:flex; gap:6px; align-items:center;">
            <span class="part-badge ${sched.part}">${sched.type === 'actual' ? '実績' : '自動予定'}: ${PARTS[sched.part].label}</span>
          </div>
        </div>
        <button type="button" class="btn btn-primary btn-sm" id="btn-cal-open-log">記録を開く</button>
      </div>
      ${summaryHtml}
      ${
        sets.length === 0
          ? `<button type="button" class="btn btn-secondary btn-sm btn-block" id="btn-cal-toggle-rest">
               ${log?.restOverride ? '休養日マークを解除（ローテ予定に戻す）' : 'この日は「休み」として確定する'}
             </button>`
          : ''
      }
    `;

    detail.querySelector('#btn-cal-open-log').addEventListener('click', () => {
      ui.selectedDate = dateStr;
      if (WORKOUT_PARTS.includes(sched.part)) {
        ui.logPart = sched.part;
      }
      switchTab('log');
    });

    const restBtn = detail.querySelector('#btn-cal-toggle-rest');
    if (restBtn) {
      restBtn.addEventListener('click', () => {
        if (state.logs[dateStr]?.restOverride) {
          delete state.logs[dateStr];
          showToast('ローテーション予定に戻しました');
        } else {
          state.logs[dateStr] = { sets: [], restOverride: true };
          showToast('休養日として確定しました');
        }
        saveState();
        renderCalendarView();
      });
    }
  }

  // ---------- Render: Gyms & Exercises View ----------
  function renderGymsView() {
    if (!state.gyms.some((g) => g.id === ui.manageGymId) && state.gyms.length > 0) {
      ui.manageGymId = state.gyms[0].id;
    }

    const gymsContainer = document.getElementById('gyms-list-container');
    gymsContainer.innerHTML = state.gyms
      .map((g) => {
        const count = state.exercises.filter((e) => e.gymId === g.id).length;
        const logo = getGymLogo(g);
        const titleHtml = logo
          ? `<div class="gym-list-logo-wrap brand-${logo.brand}"><img class="gym-logo-list" src="${logo.src}" alt="${escapeHtml(g.name)}" /></div>`
          : `<div class="list-item-title">${escapeHtml(g.name)}</div>`;
        return `
          <div class="list-item">
            <div class="list-item-main">
              ${titleHtml}
              <div class="list-item-sub">${escapeHtml(g.note || 'メモなし')} ・ 登録種目 ${count}件</div>
            </div>
            <div style="display:flex; gap:6px;">
              <button type="button" class="icon-btn" data-edit-gym="${g.id}" aria-label="ジム編集">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </button>
              ${
                state.gyms.length > 1
                  ? `<button type="button" class="icon-btn danger" data-del-gym="${g.id}" aria-label="ジム削除">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                    </button>`
                  : ''
              }
            </div>
          </div>
        `;
      })
      .join('');

    gymsContainer.querySelectorAll('[data-edit-gym]').forEach((b) => {
      b.addEventListener('click', () => openGymModal(b.dataset.editGym));
    });
    gymsContainer.querySelectorAll('[data-del-gym]').forEach((b) => {
      b.addEventListener('click', () => {
        const id = b.dataset.delGym;
        const gym = state.gyms.find((g) => g.id === id);
        if (!gym || !confirm(`「${gym.name}」と紐づく種目を削除しますか？`)) return;
        state.gyms = state.gyms.filter((g) => g.id !== id);
        state.exercises = state.exercises.filter((e) => e.gymId !== id);
        if (state.settings.selectedGymId === id) state.settings.selectedGymId = state.gyms[0]?.id || '';
        if (ui.manageGymId === id) ui.manageGymId = state.gyms[0]?.id || '';
        saveState();
        renderGymsView();
        showToast('ジムを削除しました');
      });
    });

    // Manage gym pills
    const pills = document.getElementById('manage-gym-pills');
    pills.innerHTML = state.gyms
      .map((g) => renderGymPillHtml(g, g.id === ui.manageGymId, 'data-mgym'))
      .join('');
    pills.querySelectorAll('.gym-pill').forEach((b) => {
      b.addEventListener('click', () => {
        ui.manageGymId = b.dataset.mgym;
        renderGymsView();
      });
    });

    document.querySelectorAll('#manage-part-tabs .part-tab').forEach((t) => {
      t.classList.toggle('active', t.dataset.part === ui.managePart);
    });

    const currentGym = state.gyms.find((g) => g.id === ui.manageGymId);
    document.getElementById('manage-ex-heading').textContent = `${currentGym?.name || ''} の種目`;

    const exList = state.exercises.filter((e) => e.gymId === ui.manageGymId && e.part === ui.managePart);
    const exContainer = document.getElementById('manage-exercises-container');

    if (exList.length === 0) {
      exContainer.innerHTML = `<div class="empty-state">この部位の種目はまだありません。「+ 種目追加」から登録してください。</div>`;
      return;
    }

    exContainer.innerHTML = exList
      .map(
        (ex) => `
      <div class="list-item">
        <div class="list-item-main">
          <div class="list-item-title">${escapeHtml(ex.name)}</div>
          <div class="list-item-sub">
            単位: ${ex.unit.toUpperCase()} ・ バー: ${ex.barWeight > 0 ? `${ex.barWeight}${ex.barUnit}` : 'なし'} ・ ${ex.plateMode === 'per_side' ? '片側プレート入力' : '総重量入力'}
          </div>
        </div>
        <div style="display:flex; gap:6px;">
          <button type="button" class="icon-btn" data-edit-ex="${ex.id}" aria-label="種目編集">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <button type="button" class="icon-btn danger" data-del-ex="${ex.id}" aria-label="種目削除">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>
      </div>
    `
      )
      .join('');

    exContainer.querySelectorAll('[data-edit-ex]').forEach((b) => {
      b.addEventListener('click', () => openExerciseModal({ editId: b.dataset.editEx }));
    });
    exContainer.querySelectorAll('[data-del-ex]').forEach((b) => {
      b.addEventListener('click', () => {
        const ex = state.exercises.find((e) => e.id === b.dataset.delEx);
        if (!ex || !confirm(`「${ex.name}」を削除しますか？`)) return;
        state.exercises = state.exercises.filter((e) => e.id !== ex.id);
        saveState();
        renderGymsView();
        showToast('種目を削除しました');
      });
    });
  }

  // ---------- Gym Add/Edit Modal ----------
  function openGymModal(editId = null) {
    const existing = editId ? state.gyms.find((g) => g.id === editId) : null;
    openModal(
      existing ? 'ジムを編集' : 'ジムを追加',
      `
      <div class="form-group">
        <label class="form-label" for="gym-name-input">ジム名</label>
        <input type="text" id="gym-name-input" class="form-input" placeholder="例：エニタイム渋谷店" value="${escapeHtml(existing?.name || '')}" />
      </div>
      <div class="form-group">
        <label class="form-label" for="gym-note-input">メモ（任意）</label>
        <input type="text" id="gym-note-input" class="form-input" placeholder="例：パワーラック3台・lbマシンあり" value="${escapeHtml(existing?.note || '')}" />
      </div>
      <button type="button" class="btn btn-primary btn-block" id="btn-save-gym">保存する</button>
      `,
      (root) => {
        const nameInput = root.querySelector('#gym-name-input');
        const noteInput = root.querySelector('#gym-note-input');
        root.querySelector('#btn-save-gym').addEventListener('click', () => {
          const name = nameInput.value.trim();
          if (!name) {
            showToast('ジム名を入力してください');
            return;
          }
          if (existing) {
            existing.name = name;
            existing.note = noteInput.value.trim();
          } else {
            const newGym = { id: uid('gym'), name, note: noteInput.value.trim() };
            state.gyms.push(newGym);
            ui.manageGymId = newGym.id;
          }
          saveState();
          closeModal();
          renderGymsView();
          showToast(existing ? 'ジムを更新しました' : 'ジムを追加しました');
        });
      }
    );
  }

  // ---------- Exercise Add/Edit Modal ----------
  function openExerciseModal({ editId = null, defaultGymId = null, defaultPart = null } = {}) {
    const existing = editId ? state.exercises.find((e) => e.id === editId) : null;
    const gymId = existing?.gymId || defaultGymId || ui.manageGymId || state.gyms[0]?.id;
    const part = existing?.part || defaultPart || ui.managePart;
    const unit = existing?.unit || 'kg';
    const barPreset = existing?.barPreset || 'none';
    const barWeight = existing?.barWeight ?? 0;
    const barUnit = existing?.barUnit || 'kg';
    const plateMode = existing?.plateMode || 'total';

    openModal(
      existing ? '種目を編集' : '種目を登録',
      `
      <div class="form-group">
        <label class="form-label" for="ex-gym-select">ジム</label>
        <select id="ex-gym-select" class="form-select">
          ${state.gyms.map((g) => `<option value="${g.id}" ${g.id === gymId ? 'selected' : ''}>${escapeHtml(g.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="ex-part-select">部位</label>
        <select id="ex-part-select" class="form-select">
          ${WORKOUT_PARTS.map((p) => `<option value="${p}" ${p === part ? 'selected' : ''}>${PARTS[p].label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="ex-name-input">種目名</label>
        <input type="text" id="ex-name-input" class="form-input" placeholder="例：ベンチプレス、ラットプルダウン" value="${escapeHtml(existing?.name || '')}" />
      </div>
      <div class="form-group">
        <label class="form-label">デフォルト単位</label>
        <div class="segmented" id="ex-unit-seg">
          <button type="button" class="segmented-btn ${unit === 'kg' ? 'active' : ''}" data-unit="kg">kg</button>
          <button type="button" class="segmented-btn ${unit === 'lb' ? 'active' : ''}" data-unit="lb">lb（ポンド）</button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="ex-bar-preset">バーの重さ（自動加算）</label>
        <select id="ex-bar-preset" class="form-select">
          ${BAR_PRESETS.map((b) => `<option value="${b.id}" ${b.id === barPreset ? 'selected' : ''}>${b.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group" id="ex-custom-bar-wrap" style="display:${barPreset === 'custom' ? 'block' : 'none'};">
        <label class="form-label">カスタムバー重量</label>
        <div style="display:flex; gap:8px;">
          <input type="number" step="0.5" min="0" inputmode="decimal" id="ex-bar-custom-val" class="form-input tabular" value="${barWeight}" style="flex:1;" />
          <select id="ex-bar-custom-unit" class="form-select" style="width:90px;">
            <option value="kg" ${barUnit === 'kg' ? 'selected' : ''}>kg</option>
            <option value="lb" ${barUnit === 'lb' ? 'selected' : ''}>lb</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">初期入力モード</label>
        <div class="segmented" id="ex-mode-seg">
          <button type="button" class="segmented-btn ${plateMode === 'per_side' ? 'active' : ''}" data-mode="per_side">片側プレート (×2+バー)</button>
          <button type="button" class="segmented-btn ${plateMode === 'total' ? 'active' : ''}" data-mode="total">総重量を直接入力</button>
        </div>
      </div>
      <button type="button" class="btn btn-primary btn-block" id="btn-save-ex">保存する</button>
      `,
      (root) => {
        let selUnit = unit;
        let selMode = plateMode;
        const barSelect = root.querySelector('#ex-bar-preset');
        const customWrap = root.querySelector('#ex-custom-bar-wrap');

        root.querySelectorAll('#ex-unit-seg .segmented-btn').forEach((b) => {
          b.addEventListener('click', () => {
            selUnit = b.dataset.unit;
            root.querySelectorAll('#ex-unit-seg .segmented-btn').forEach((x) => x.classList.toggle('active', x.dataset.unit === selUnit));
          });
        });

        root.querySelectorAll('#ex-mode-seg .segmented-btn').forEach((b) => {
          b.addEventListener('click', () => {
            selMode = b.dataset.mode;
            root.querySelectorAll('#ex-mode-seg .segmented-btn').forEach((x) => x.classList.toggle('active', x.dataset.mode === selMode));
          });
        });

        barSelect.addEventListener('change', () => {
          const val = barSelect.value;
          customWrap.style.display = val === 'custom' ? 'block' : 'none';
          // Auto-suggest per_side mode when bar is selected
          if (val !== 'none' && !existing) {
            selMode = 'per_side';
            root.querySelectorAll('#ex-mode-seg .segmented-btn').forEach((x) => x.classList.toggle('active', x.dataset.mode === selMode));
          }
        });

        root.querySelector('#btn-save-ex').addEventListener('click', () => {
          const name = root.querySelector('#ex-name-input').value.trim();
          if (!name) {
            showToast('種目名を入力してください');
            return;
          }
          const targetGym = root.querySelector('#ex-gym-select').value;
          const targetPart = root.querySelector('#ex-part-select').value;
          const presetId = barSelect.value;
          const presetObj = BAR_PRESETS.find((b) => b.id === presetId);

          let finalBarWeight = presetObj ? presetObj.weight : 0;
          let finalBarUnit = presetObj ? presetObj.unit : 'kg';
          if (presetId === 'custom') {
            finalBarWeight = Math.max(0, Number(root.querySelector('#ex-bar-custom-val').value) || 0);
            finalBarUnit = root.querySelector('#ex-bar-custom-unit').value;
          }

          if (existing) {
            Object.assign(existing, {
              gymId: targetGym,
              part: targetPart,
              name,
              unit: selUnit,
              barPreset: presetId,
              barWeight: finalBarWeight,
              barUnit: finalBarUnit,
              plateMode: selMode
            });
          } else {
            state.exercises.push({
              id: uid('ex'),
              gymId: targetGym,
              part: targetPart,
              name,
              unit: selUnit,
              barPreset: presetId,
              barWeight: finalBarWeight,
              barUnit: finalBarUnit,
              plateMode: selMode
            });
          }

          saveState();
          closeModal();
          if (ui.activeTab === 'log') renderLogView();
          else renderGymsView();
          showToast(existing ? '種目を更新しました' : '種目を登録しました');
        });
      }
    );
  }

  // ---------- Render: Settings View ----------
  function renderSettingsView() {
    document.getElementById('setting-rot-start').value = state.settings.rotationStart || todayStr();
    const chips = document.getElementById('rotation-chips');
    chips.innerHTML = state.settings.rotation
      .map(
        (p, idx) => `
      <button type="button" class="rotation-chip part-badge ${p}" data-rot-idx="${idx}" title="タップで次の部位に切替">
        <span>${idx + 1}日目: ${PARTS[p].label}</span>
        ${state.settings.rotation.length > 2 ? `<span data-rot-del="${idx}" style="opacity:0.65; margin-left:2px;">×</span>` : ''}
      </button>
    `
      )
      .join('');

    chips.querySelectorAll('.rotation-chip').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        const delAttr = e.target.getAttribute('data-rot-del');
        const idx = Number(chip.dataset.rotIdx);
        if (delAttr !== null) {
          e.stopPropagation();
          state.settings.rotation.splice(idx, 1);
          saveState();
          renderSettingsView();
          return;
        }
        const cur = state.settings.rotation[idx];
        const nextIdx = (ALL_ROTATION_PARTS.indexOf(cur) + 1) % ALL_ROTATION_PARTS.length;
        state.settings.rotation[idx] = ALL_ROTATION_PARTS[nextIdx];
        saveState();
        renderSettingsView();
      });
    });
  }

  // ---------- Render: Progress Graph View (1-Month Comparison) ----------
  function calcE1RM(weightKg, reps) {
    if (!weightKg) return 0;
    if (reps <= 1) return round1(weightKg);
    return round1(weightKg * (1 + reps / 30));
  }

  function computeMetricForSets(sets, metric) {
    const selfSets = (sets || []).filter((s) => (Number(s.reps) || 0) > 0);
    if (selfSets.length === 0) return 0;
    if (metric === 'volume') {
      return Math.round(selfSets.reduce((sum, s) => sum + s.totalKg * s.reps, 0));
    }
    if (metric === 'maxWeight') {
      return round1(Math.max(...selfSets.map((s) => s.totalKg)));
    }
    return round1(Math.max(...selfSets.map((s) => calcE1RM(s.totalKg, s.reps))));
  }

  function renderProgressView() {
    const today = todayStr();
    const cutRecentStart = addDays(today, -29); // 直近30日: [today-29 .. today]
    const cutPrevStart = addDays(today, -59);   // 1ヶ月前30日: [today-59 .. today-30]
    const cutPrevEnd = addDays(today, -30);

    // Part pills active state
    document.querySelectorAll('#progress-part-pills .progress-pill').forEach((p) => {
      p.classList.toggle('active', p.dataset.ppart === ui.progressPart);
    });

    // Populate exercise dropdown based on selected part
    const allExNames = new Set();
    state.exercises
      .filter((e) => ui.progressPart === 'all' || e.part === ui.progressPart)
      .forEach((e) => allExNames.add(e.name));
    Object.values(state.logs).forEach((log) => {
      (log.sets || []).forEach((s) => {
        if (ui.progressPart === 'all' || s.part === ui.progressPart) {
          allExNames.add(s.exerciseName);
        }
      });
    });

    const exSelect = document.getElementById('progress-ex-select');
    const exList = Array.from(allExNames);
    if (ui.progressExercise !== 'all' && !allExNames.has(ui.progressExercise)) {
      ui.progressExercise = 'all';
    }
    exSelect.innerHTML =
      `<option value="all">すべての種目（${ui.progressPart === 'all' ? '全部位' : PARTS[ui.progressPart].label}）</option>` +
      exList
        .map(
          (name) =>
            `<option value="${escapeHtml(name)}" ${ui.progressExercise === name ? 'selected' : ''}>${escapeHtml(name)}</option>`
        )
        .join('');

    // Metric segmented active state
    document.querySelectorAll('#progress-metric-seg .segmented-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.metric === ui.progressMetric);
    });

    // Collect daily points over the past 60 days matching filters (self-performed reps only)
    const filterSet = (s) => {
      if ((Number(s.reps) || 0) <= 0) return false;
      if (ui.progressPart !== 'all' && s.part !== ui.progressPart) return false;
      if (ui.progressExercise !== 'all' && s.exerciseName !== ui.progressExercise) return false;
      return true;
    };

    const dailyPoints = [];
    const sortedDates = Object.keys(state.logs).sort();
    for (const d of sortedDates) {
      if (d < cutPrevStart || d > today) continue;
      const sets = (state.logs[d]?.sets || []).filter(filterSet);
      if (sets.length === 0) continue;
      dailyPoints.push({
        date: d,
        val: computeMetricForSets(sets, ui.progressMetric),
        sets
      });
    }

    const recentPoints = dailyPoints.filter((p) => p.date >= cutRecentStart);
    const prevPoints = dailyPoints.filter((p) => p.date >= cutPrevStart && p.date <= cutPrevEnd);

    const aggPeriod = (pts) => {
      if (pts.length === 0) return 0;
      if (ui.progressMetric === 'volume') {
        return Math.round(pts.reduce((sum, p) => sum + p.val, 0) / pts.length);
      }
      return round1(Math.max(...pts.map((p) => p.val)));
    };

    const recentVal = aggPeriod(recentPoints);
    const prevVal = aggPeriod(prevPoints);
    const recentTotalVol = Math.round(
      recentPoints.reduce((sum, p) => sum + computeMetricForSets(p.sets, 'volume'), 0)
    );
    const prevTotalVol = Math.round(
      prevPoints.reduce((sum, p) => sum + computeMetricForSets(p.sets, 'volume'), 0)
    );

    const metricLabel =
      ui.progressMetric === 'volume'
        ? '1回あたりの平均負荷量'
        : ui.progressMetric === 'maxWeight'
        ? '期間内の最大重量'
        : '期間内の推定1RM';

    let deltaBadgeHtml = `<span class="delta-badge flat">比較データ待ち</span>`;
    if (recentVal > 0 && prevVal > 0) {
      const diff = round1(recentVal - prevVal);
      const pct = round1(((recentVal - prevVal) / prevVal) * 100);
      if (diff > 0) {
        deltaBadgeHtml = `<span class="delta-badge up tabular">▲ +${pct}% (+${diff.toLocaleString()} kg)</span>`;
      } else if (diff < 0) {
        deltaBadgeHtml = `<span class="delta-badge down tabular">▼ ${pct}% (${diff.toLocaleString()} kg)</span>`;
      } else {
        deltaBadgeHtml = `<span class="delta-badge flat tabular">±0% (横ばい)</span>`;
      }
    } else if (recentVal > 0 && prevVal === 0) {
      deltaBadgeHtml = `<span class="delta-badge up">直近で記録開始</span>`;
    }

    // 1. Compare Summary Card
    document.getElementById('progress-compare-card').innerHTML = `
      <div class="compare-hero">
        <div>
          <div style="font-size:12px; font-weight:700; color:var(--text-muted); margin-bottom:2px;">${metricLabel}（直近30日）</div>
          <div class="compare-value tabular">${recentVal > 0 ? `${recentVal.toLocaleString()} kg` : '-'}</div>
          <div class="compare-sub tabular">1ヶ月前（31〜60日前）: ${prevVal > 0 ? `${prevVal.toLocaleString()} kg` : '記録なし'}</div>
        </div>
        ${deltaBadgeHtml}
      </div>
      <div class="compare-grid">
        <div class="compare-mini">
          <div class="compare-mini-lbl">直近30日の総負荷量</div>
          <div class="compare-mini-val tabular">${recentTotalVol.toLocaleString()} kg</div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">実施 ${recentPoints.length}日</div>
        </div>
        <div class="compare-mini">
          <div class="compare-mini-lbl">1ヶ月前の総負荷量</div>
          <div class="compare-mini-val tabular">${prevTotalVol.toLocaleString()} kg</div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">実施 ${prevPoints.length}日</div>
        </div>
      </div>
    `;

    // 2. SVG Line & Area Chart (60-day timeline)
    const chartCard = document.getElementById('progress-chart-card');
    if (dailyPoints.length === 0) {
      chartCard.innerHTML = `
        <div class="empty-state" style="padding:20px 10px;">
          <div style="font-weight:700; color:var(--text); margin-bottom:4px;">まだグラフ用の記録がありません</div>
          <div>「記録」タブからトレーニングを登録すると、1ヶ月前との負荷推移グラフが自動で表示されます。</div>
        </div>
      `;
    } else {
      const W = 340;
      const H = 185;
      const padL = 42;
      const padR = 14;
      const padT = 18;
      const padB = 28;
      const plotW = W - padL - padR;
      const plotH = H - padT - padB;

      const vals = dailyPoints.map((p) => p.val);
      if (prevVal > 0) vals.push(prevVal);
      const maxV = Math.max(...vals, 10);
      const minV = Math.min(...vals, 0);
      const spanV = Math.max(maxV - minV, 1);
      const yMax = maxV + spanV * 0.12;
      const yMin = Math.max(0, minV - spanV * 0.1);

      const xForDate = (dStr) => {
        const dayOffset = diffDays(dStr, cutPrevStart); // 0 .. 59
        return padL + (Math.max(0, Math.min(59, dayOffset)) / 59) * plotW;
      };
      const yForVal = (v) => padT + plotH - ((v - yMin) / Math.max(yMax - yMin, 1)) * plotH;

      const coords = dailyPoints.map((p) => ({
        x: xForDate(p.date),
        y: yForVal(p.val),
        date: p.date,
        val: p.val
      }));

      const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
      const areaPath =
        coords.length > 1
          ? `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${(padT + plotH).toFixed(1)} L${coords[0].x.toFixed(1)},${(padT + plotH).toFixed(1)} Z`
          : '';

      const oneMonthX = xForDate(cutRecentStart);
      const prevBaselineY = prevVal > 0 ? yForVal(prevVal) : null;
      const strokeColor =
        ui.progressPart === 'all' ? 'var(--back)' : PARTS[ui.progressPart].color;

      // Y-axis ticks (3 levels)
      const yTicks = [yMin, (yMin + yMax) / 2, yMax].map((v) => ({
        y: yForVal(v),
        label: v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`
      }));

      chartCard.innerHTML = `
        <div class="chart-wrap">
          <svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="負荷推移グラフ">
            <defs>
              <linearGradient id="progAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="${strokeColor}" stop-opacity="0.26"/>
                <stop offset="100%" stop-color="${strokeColor}" stop-opacity="0.01"/>
              </linearGradient>
            </defs>
            ${yTicks
              .map(
                (t) => `
              <line x1="${padL}" y1="${t.y.toFixed(1)}" x2="${W - padR}" y2="${t.y.toFixed(1)}" stroke="var(--border)" stroke-width="1"/>
              <text x="${padL - 6}" y="${(t.y + 3.5).toFixed(1)}" text-anchor="end" fill="var(--text-muted)" font-size="10" class="tabular">${t.label}</text>
            `
              )
              .join('')}
            <!-- 1 Month Ago Divider -->
            <line x1="${oneMonthX.toFixed(1)}" y1="${padT}" x2="${oneMonthX.toFixed(1)}" y2="${padT + plotH}" stroke="var(--border-strong)" stroke-width="1.2" stroke-dasharray="3 3"/>
            <text x="${oneMonthX.toFixed(1)}" y="${padT - 5}" text-anchor="middle" fill="var(--text-muted)" font-size="9.5" font-weight="700">1ヶ月前</text>
            ${
              prevBaselineY !== null
                ? `<line x1="${padL}" y1="${prevBaselineY.toFixed(1)}" x2="${W - padR}" y2="${prevBaselineY.toFixed(1)}" stroke="var(--shoulders)" stroke-width="1.4" stroke-dasharray="4 3"/>`
                : ''
            }
            ${areaPath ? `<path d="${areaPath}" fill="url(#progAreaGrad)"/>` : ''}
            ${coords.length > 1 ? `<path d="${linePath}" fill="none" stroke="${strokeColor}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
            ${coords
              .map(
                (c) => `
              <circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="4.2" fill="var(--surface)" stroke="${strokeColor}" stroke-width="2.4">
                <title>${c.date}: ${c.val} kg</title>
              </circle>
            `
              )
              .join('')}
            <text x="${padL}" y="${H - 6}" text-anchor="start" fill="var(--text-muted)" font-size="10" class="tabular">${cutPrevStart.slice(5).replace('-', '/')}</text>
            <text x="${oneMonthX.toFixed(1)}" y="${H - 6}" text-anchor="middle" fill="var(--text-muted)" font-size="10" class="tabular">${cutRecentStart.slice(5).replace('-', '/')}</text>
            <text x="${W - padR}" y="${H - 6}" text-anchor="end" fill="var(--text-muted)" font-size="10" class="tabular">今日</text>
          </svg>
        </div>
        <div class="chart-legend">
          <span>● 実線: 自力回数のみの負荷推移（補助は除外）</span>
          ${prevBaselineY !== null ? `<span style="color:var(--shoulders); font-weight:700;">-- 1ヶ月前基準 (${prevVal.toLocaleString()} kg)</span>` : '<span>※ 1ヶ月前の記録が溜まると基準線が表示されます</span>'}
        </div>
      `;
    }

    // 3. Per-exercise 1-month comparison list (self-performed reps only)
    const exMap = {};
    for (const d of sortedDates) {
      if (d < cutPrevStart || d > today) continue;
      const isRecent = d >= cutRecentStart;
      (state.logs[d]?.sets || []).forEach((s) => {
        if ((Number(s.reps) || 0) <= 0) return;
        if (ui.progressPart !== 'all' && s.part !== ui.progressPart) return;
        if (!exMap[s.exerciseName]) {
          exMap[s.exerciseName] = { name: s.exerciseName, part: s.part, recentSets: [], prevSets: [] };
        }
        if (isRecent) exMap[s.exerciseName].recentSets.push(s);
        else exMap[s.exerciseName].prevSets.push(s);
      });
    }

    const exEntries = Object.values(exMap);
    const listEl = document.getElementById('progress-exercise-list');
    if (exEntries.length === 0) {
      listEl.innerHTML = `<div class="empty-state" style="padding:16px 8px;">対象期間の種目記録がありません。</div>`;
      return;
    }

    listEl.innerHTML = exEntries
      .map((item) => {
        const recMax = item.recentSets.length ? computeMetricForSets(item.recentSets, 'maxWeight') : 0;
        const prevMax = item.prevSets.length ? computeMetricForSets(item.prevSets, 'maxWeight') : 0;
        let badge = `<span class="meta-chip">直近のみ</span>`;
        if (recMax > 0 && prevMax > 0) {
          const diff = round1(recMax - prevMax);
          if (diff > 0) badge = `<span class="delta-badge up tabular" style="padding:3px 8px; font-size:12px;">+${diff} kg</span>`;
          else if (diff < 0) badge = `<span class="delta-badge down tabular" style="padding:3px 8px; font-size:12px;">${diff} kg</span>`;
          else badge = `<span class="delta-badge flat tabular" style="padding:3px 8px; font-size:12px;">±0 kg</span>`;
        } else if (recMax === 0 && prevMax > 0) {
          badge = `<span class="meta-chip">直近未実施</span>`;
        }

        return `
          <div class="list-item">
            <div class="list-item-main">
              <div class="list-item-title">
                ${escapeHtml(item.name)}
                <span class="part-badge ${item.part}" style="margin-left:6px;">${PARTS[item.part].label}</span>
              </div>
              <div class="list-item-sub tabular">
                最大重量: 1ヶ月前 ${prevMax > 0 ? `${prevMax}kg` : '-'} → 直近 ${recMax > 0 ? `${recMax}kg` : '-'}
              </div>
            </div>
            ${badge}
          </div>
        `;
      })
      .join('');
  }

  // ---------- Navigation ----------
  function switchTab(tabName) {
    ui.activeTab = tabName;
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    document.getElementById(`view-${tabName}`).classList.add('active');

    document.querySelectorAll('.tab-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === tabName);
    });

    if (tabName === 'log') renderLogView();
    if (tabName === 'progress') renderProgressView();
    if (tabName === 'calendar') renderCalendarView();
    if (tabName === 'gyms') renderGymsView();
    if (tabName === 'settings') renderSettingsView();
  }

  // Progress Graph filter events
  document.querySelectorAll('#progress-part-pills .progress-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.progressPart = btn.dataset.ppart;
      ui.progressExercise = 'all';
      renderProgressView();
    });
  });

  document.getElementById('progress-ex-select').addEventListener('change', (e) => {
    ui.progressExercise = e.target.value;
    renderProgressView();
  });

  document.querySelectorAll('#progress-metric-seg .segmented-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.progressMetric = btn.dataset.metric;
      renderProgressView();
    });
  });

  // ---------- Event Bindings ----------
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Log date nav
  document.getElementById('btn-prev-day').addEventListener('click', () => {
    ui.selectedDate = addDays(ui.selectedDate, -1);
    const sched = getDaySchedule(ui.selectedDate);
    if (WORKOUT_PARTS.includes(sched.part)) ui.logPart = sched.part;
    renderLogView();
  });
  document.getElementById('btn-next-day').addEventListener('click', () => {
    ui.selectedDate = addDays(ui.selectedDate, 1);
    const sched = getDaySchedule(ui.selectedDate);
    if (WORKOUT_PARTS.includes(sched.part)) ui.logPart = sched.part;
    renderLogView();
  });
  document.getElementById('btn-jump-today').addEventListener('click', () => {
    ui.selectedDate = todayStr();
    const sched = getDaySchedule(ui.selectedDate);
    if (WORKOUT_PARTS.includes(sched.part)) ui.logPart = sched.part;
    renderLogView();
    showToast('今日に戻りました');
  });

  // Log part tabs
  document.querySelectorAll('#log-part-tabs .part-tab').forEach((t) => {
    t.addEventListener('click', () => {
      ui.logPart = t.dataset.part;
      renderLogView();
    });
  });

  document.getElementById('btn-quick-add-exercise').addEventListener('click', () => {
    openExerciseModal({ defaultGymId: state.settings.selectedGymId, defaultPart: ui.logPart });
  });

  // Calendar nav
  document.getElementById('btn-cal-prev').addEventListener('click', () => {
    ui.calMonth--;
    if (ui.calMonth < 0) {
      ui.calMonth = 11;
      ui.calYear--;
    }
    renderCalendarView();
  });
  document.getElementById('btn-cal-next').addEventListener('click', () => {
    ui.calMonth++;
    if (ui.calMonth > 11) {
      ui.calMonth = 0;
      ui.calYear++;
    }
    renderCalendarView();
  });

  // Gyms & Exercises buttons
  document.getElementById('btn-add-gym').addEventListener('click', () => openGymModal());
  document.getElementById('btn-add-exercise').addEventListener('click', () =>
    openExerciseModal({ defaultGymId: ui.manageGymId, defaultPart: ui.managePart })
  );
  document.querySelectorAll('#manage-part-tabs .part-tab').forEach((t) => {
    t.addEventListener('click', () => {
      ui.managePart = t.dataset.part;
      renderGymsView();
    });
  });

  // Settings events
  document.getElementById('setting-rot-start').addEventListener('change', (e) => {
    if (e.target.value) {
      state.settings.rotationStart = e.target.value;
      saveState();
      showToast('ローテーション基準日を更新しました');
    }
  });
  document.getElementById('btn-rot-add').addEventListener('click', () => {
    state.settings.rotation.push('rest');
    saveState();
    renderSettingsView();
  });
  document.getElementById('btn-rot-reset').addEventListener('click', () => {
    state.settings.rotation = ['back', 'chest', 'shoulders', 'legs'];
    saveState();
    renderSettingsView();
    showToast('デフォルト（背中→胸→肩→脚）に戻しました');
  });
  document.getElementById('setting-dark-mode').addEventListener('change', (e) => {
    state.settings.darkMode = e.target.checked;
    saveState();
    applyTheme();
  });

  // Backup Export / Import
  document.getElementById('btn-export-data').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kinniku-kiroku-backup-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('バックアップを書き出しました');
  });

  document.getElementById('btn-import-data').addEventListener('click', () => {
    document.getElementById('import-file-input').click();
  });

  document.getElementById('import-file-input').addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed.gyms) || !Array.isArray(parsed.exercises)) {
          throw new Error('invalid');
        }
        state = parsed;
        syncAllExerciseRecords(state);
        saveState();
        applyTheme();
        switchTab('log');
        showToast('データを復元しました');
      } catch {
        showToast('ファイルの読み込みに失敗しました');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  document.getElementById('btn-reset-demo').addEventListener('click', () => {
    if (!confirm('すべての記録と設定を初期データに戻しますか？')) return;
    state = createDefaultState();
    saveState();
    applyTheme();
    ui.selectedDate = todayStr();
    switchTab('log');
    showToast('初期データにリセットしました');
  });

  // Register Service Worker for Offline PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  // Initial Render
  applyTheme();
  renderLogView();
})();
