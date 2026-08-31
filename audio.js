// ============ SISTEMA DE ÁUDIO (Web Audio API) ============
// Música procedural gerada em tempo real — sem arquivos externos!
//
// ⚠️ v0.6 tinha um bug: usava "const Audio = ..." que conflita com
// o construtor nativo window.Audio(). Corrigido para "SoundSys".

const SoundSys = (() => {
  let ctx = null;
  let bgmGain = null;
  let sfxGain = null;
  let bgmInterval = null;

  // Lê preferência salva ANTES de qualquer interação do usuário
  let muted = SaveSystem.getMuted();

  const NOTES = {
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00
  };

  const MELODY = [
    { note: 'E4', dur: 0.5 }, { note: 'G4', dur: 0.5 }, { note: 'A4', dur: 1.0 },
    { note: 'G4', dur: 0.5 }, { note: 'E4', dur: 0.5 }, { note: 'D4', dur: 1.0 },
    { note: 'C4', dur: 0.5 }, { note: 'D4', dur: 0.5 }, { note: 'E4', dur: 1.0 },
    { note: 'D4', dur: 0.5 }, { note: 'C4', dur: 0.5 }, { note: 'D4', dur: 1.0 },
    { note: 'E4', dur: 0.5 }, { note: 'G4', dur: 0.5 }, { note: 'A4', dur: 0.5 },
    { note: 'G4', dur: 0.5 }, { note: 'F4', dur: 0.5 }, { note: 'E4', dur: 0.5 },
    { note: 'D4', dur: 1.0 }, { note: 'C4', dur: 1.0 }
  ];

  const BASS = [
    { note: 'C3', dur: 2.0 }, { note: 'G3', dur: 2.0 },
    { note: 'A3', dur: 2.0 }, { note: 'E3', dur: 2.0 },
    { note: 'F3', dur: 2.0 }, { note: 'C3', dur: 2.0 },
    { note: 'G3', dur: 2.0 }, { note: 'C3', dur: 2.0 }
  ];

  function init() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      bgmGain = ctx.createGain();
      bgmGain.gain.value = muted ? 0 : 0.15;
      bgmGain.connect(ctx.destination);
      sfxGain = ctx.createGain();
      sfxGain.gain.value = muted ? 0 : 0.3;
      sfxGain.connect(ctx.destination);
    } catch (e) {
      console.warn('Web Audio API não suportado.', e);
    }
  }

  function playTone(freq, duration, type = 'sine', gainNode = sfxGain, volume = 1) {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(gainNode);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  function playNote(freq, duration, time, type = 'sine', gainNode = bgmGain, volume = 0.5) {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.05);
    gain.gain.setValueAtTime(volume, time + duration - 0.1);
    gain.gain.linearRampToValueAtTime(0.01, time + duration);
    osc.connect(gain);
    gain.connect(gainNode);
    osc.start(time);
    osc.stop(time + duration);
  }

  function startBGM() {
    if (!ctx || bgmInterval) return;
    let melodyIdx = 0, bassIdx = 0;
    let melodyTime = ctx.currentTime;
    let bassTime = ctx.currentTime;

    function scheduleNotes() {
      if (muted) return;
      const m = MELODY[melodyIdx % MELODY.length];
      playNote(NOTES[m.note], m.dur, melodyTime, 'triangle', bgmGain, 0.3);
      melodyTime += m.dur;
      melodyIdx++;
      const b = BASS[bassIdx % BASS.length];
      if (bassTime <= melodyTime) {
        playNote(NOTES[b.note], b.dur * 0.9, bassTime, 'sine', bgmGain, 0.2);
        bassTime += b.dur;
        bassIdx++;
      }
    }
    scheduleNotes();
    bgmInterval = setInterval(scheduleNotes, 100);
  }

  function stopBGM() {
    if (bgmInterval) { clearInterval(bgmInterval); bgmInterval = null; }
  }

  // ============ SFX ============
  function sfxJump() {
    if (!ctx) return;
    playTone(300, 0.1, 'square', sfxGain, 0.4);
    setTimeout(() => playTone(450, 0.15, 'square', sfxGain, 0.3), 50);
  }

  function sfxLand() {
    if (!ctx) return;
    playTone(150, 0.08, 'square', sfxGain, 0.25);
  }

  function sfxPickup() {
    if (!ctx) return;
    [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.2, 'sine', sfxGain, 0.5), i * 80);
    });
  }

  function sfxTeach() {
    if (!ctx) return;
    [261.63, 329.63, 392.00, 523.25, 659.25, 783.99].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.3, 'triangle', sfxGain, 0.4), i * 100);
    });
  }

  function sfxInteract() {
    if (!ctx) return;
    playTone(440, 0.08, 'sine', sfxGain, 0.3);
  }

  function sfxEnding() {
    if (!ctx) return;
    [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.4, 'triangle', sfxGain, 0.5), i * 200);
    });
  }

  // Final secreto — tom melancólico descendente
  function sfxEndingSad() {
    if (!ctx) return;
    [392.00, 349.23, 293.66, 261.63, 220.00].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.5, 'sine', sfxGain, 0.35), i * 260);
    });
  }

  function sfxStep() {
    if (!ctx) return;
    playTone(80 + Math.random() * 40, 0.05, 'square', sfxGain, 0.12);
  }

  function toggleMute() {
    muted = !muted;
    if (bgmGain) bgmGain.gain.value = muted ? 0 : 0.15;
    if (sfxGain) sfxGain.gain.value = muted ? 0 : 0.3;
    SaveSystem.setMuted(muted);
    return muted;
  }

  function isMuted() { return muted; }

  return {
    init, startBGM, stopBGM,
    sfxJump, sfxLand, sfxPickup, sfxTeach, sfxInteract, sfxEnding, sfxEndingSad, sfxStep,
    toggleMute, isMuted
  };
})();
