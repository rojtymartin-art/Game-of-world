window.GTA = window.GTA || {};

window.GTA.Audio = (function () {
  let ctx = null;
  let enabled = true;
  let unlocked = false;

  // Kontinuálne oscilátory (motor + siréna)
  let engOsc = null, engGain = null;
  let sirOsc = null, sirGain = null;
  let sirenPhase = 0;

  function unlock() {
    if (unlocked) {
      if (ctx && ctx.state === 'suspended') ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();

      // Motor
      engOsc = ctx.createOscillator();
      engGain = ctx.createGain();
      engOsc.type = 'sawtooth';
      engOsc.frequency.value = 55;
      engGain.gain.value = 0;

      const engFilter = ctx.createBiquadFilter();
      engFilter.type = 'lowpass';
      engFilter.frequency.value = 260;

      engOsc.connect(engFilter);
      engFilter.connect(engGain);
      engGain.connect(ctx.destination);
      engOsc.start();

      // Policajná siréna
      sirOsc = ctx.createOscillator();
      sirGain = ctx.createGain();
      sirOsc.type = 'triangle';
      sirOsc.frequency.value = 650;
      sirGain.gain.value = 0;
      sirOsc.connect(sirGain);
      sirGain.connect(ctx.destination);
      sirOsc.start();

      unlocked = true;
    } catch (e) {}
  }

  function setEnabled(val) {
    enabled = !!val;
    if (!enabled && ctx && engGain && sirGain) {
      engGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      sirGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
    }
  }

  function isEnabled() { return enabled; }

  function updateEngine(speedRatio, isDriving, isAircraft, nitro) {
    if (!unlocked || !ctx || !enabled) return;
    const now = ctx.currentTime;
    if (!isDriving) {
      engGain.gain.setTargetAtTime(0, now, 0.08);
      return;
    }
    const baseFreq = isAircraft ? 120 : 48;
    const maxFreq = isAircraft ? 420 : (nitro ? 210 : 155);
    const freq = baseFreq + Math.min(1.2, speedRatio) * (maxFreq - baseFreq);
    const vol = (isAircraft ? 0.045 : 0.035) + Math.min(1, speedRatio) * 0.035;
    engOsc.type = isAircraft ? 'triangle' : 'sawtooth';
    engOsc.frequency.setTargetAtTime(freq, now, 0.06);
    engGain.gain.setTargetAtTime(vol, now, 0.08);
  }

  function updateSiren(active, dt) {
    if (!unlocked || !ctx || !enabled) return;
    const now = ctx.currentTime;
    if (!active) {
      sirGain.gain.setTargetAtTime(0, now, 0.08);
      return;
    }
    sirenPhase += dt * 0.09;
    const freq = 640 + Math.sin(sirenPhase) * 240;
    sirOsc.frequency.setTargetAtTime(freq, now, 0.04);
    sirGain.gain.setTargetAtTime(0.032, now, 0.06);
  }

  function beep(freq, dur, type, vol, slideTo) {
    if (!unlocked || !ctx || !enabled) return;
    try {
      const now = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, now);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, now + dur);
      g.gain.setValueAtTime(vol || 0.08, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(now);
      o.stop(now + dur);
    } catch (e) {}
  }

  function playCash() {
    beep(880, 0.09, 'sine', 0.09);
    setTimeout(() => beep(1320, 0.16, 'sine', 0.09), 75);
  }

  function playSuccess() {
    beep(523, 0.1, 'triangle', 0.09);
    setTimeout(() => beep(659, 0.1, 'triangle', 0.09), 90);
    setTimeout(() => beep(1046, 0.24, 'triangle', 0.1), 180);
  }

  function playCrash(power) {
    const vol = Math.min(0.14, 0.04 + power * 0.015);
    beep(130, 0.16, 'sawtooth', vol, 38);
  }

  function playJump() {
    beep(240, 0.26, 'sine', 0.08, 680);
  }

  function playAlert() {
    beep(420, 0.12, 'square', 0.06);
    setTimeout(() => beep(310, 0.16, 'square', 0.06), 110);
  }

  return {
    unlock, setEnabled, isEnabled,
    updateEngine, updateSiren,
    playCash, playSuccess, playCrash, playJump, playAlert
  };
})();
