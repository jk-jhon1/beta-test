// ============ GAME.JS — RESTUDING Beta v0.7 ============

// ============ SETUP ============
const C = document.getElementById('gameCanvas');
const X = C.getContext('2d');
let GW = 960, GH = 540;
const TOTAL_ENDINGS = 2; // Final 1 + Final secreto (aumente ao adicionar mais)

function resize() {
  const area = document.getElementById('gameArea');
  const aw = area.clientWidth, ah = area.clientHeight;
  const ratio = 16 / 9;
  let w = aw, h = aw / ratio;
  if (h > ah) { h = ah; w = ah * ratio; }
  GW = Math.floor(w); GH = Math.floor(h);
  C.width = GW; C.height = GH;
  positionAll();
}

// ============ FÍSICA ============
let GRAV, JUMPF, SPD, GROUND_Y, WALL_L, WALL_R;
const COYOTE_FRAMES = 6;
const JUMPBUFFER_FRAMES = 8;

function positionAll() {
  GRAV = GH * 0.0008; JUMPF = -GH * 0.017; SPD = GW * 0.003;
  GROUND_Y = GH * 0.86;
  WALL_L = GW * 0.02; WALL_R = GW * 0.98;
  P.w = GW * 0.055; P.h = GH * 0.17;
  item.w = GW * 0.05; item.h = GH * 0.08;
  stu.w = GW * 0.05; stu.h = GH * 0.14;
  if (state === 'title' || !P.x) {
    P.x = GW * 0.5; P.y = GROUND_Y - P.h;
    item.x = GW * 0.72; item.y = GROUND_Y - item.h;
    stu.x = GW * 0.13; stu.y = GROUND_Y - stu.h;
  }
  tvArea.x = GW * 0.00; tvArea.y = GH * 0.62;
  tvArea.w = GW * 0.32; tvArea.h = GH * 0.19;
}

// ============ DETECÇÃO MOBILE ============
const isMob = (() => {
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) return true;
  if ("ontouchstart" in window && navigator.maxTouchPoints > 0) return true;
  if (window.matchMedia("(pointer:coarse)").matches) return true;
  if (innerWidth < 900 && innerHeight < 900) return true;
  return false;
})();
if (isMob) document.getElementById('mCtrl').style.display = 'flex';

function vibrate(ms) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

// ============ ESTADO ============
let state = 'title'; // title | classroom | teaching | ending | ending2
let fr = 0, iCD = 0;
const stars = [];
for (let i = 0; i < 60; i++)
  stars.push({ x: Math.random(), y: Math.random(), s: Math.random() * 2 + 1, p: Math.random() * 6 });

const P = {
  x: 0, y: 0, w: 52, h: 88, vx: 0, vy: 0, facing: 1,
  onGround: true, hasItem: false, wt: 0, wf: 0,
  animT: 0, squash: 0, lastVy: 0
};
const item = { x: 0, y: 0, w: 46, h: 46, taken: false };
const stu = { x: 0, y: 0, w: 46, h: 72 };
const tvArea = { x: 0, y: 0, w: 0, h: 0 };

const speechLines = [
  "Professor! Chegou!",
  "O mundo precisa de você!",
  "Pegue o item ENSINAR",
  "ali perto do quadro!",
  "Depois volte e use em mim!",
  "Controles:",
  "← → para andar",
  "ESPAÇO para pular",
  "E para interagir!",
  "No celular: use os botões!",
  "Estou te esperando!"
];
let speechIdx = 0, speechChar = 0, speechTimer = 0, speechDone = false;
let teachTimer = 0, endChar = 0;
let particles = [];
let lastStepFrame = 0;
let wasOnGround = true;

// ---- Final secreto (ignorar a Felquinha) ----
let ignoreTimer = 0;
const IGNORE_THRESHOLD = 2700; // ~45s a 60fps

// ---- Timer / recorde ----
let classroomStartFrame = 0;
let finalElapsed = null;
let lastEndingIsNew = false;
let lastEndingIsRecord = false;

function getElapsedSeconds() {
  if (finalElapsed !== null) return finalElapsed;
  return (fr - classroomStartFrame) / 60;
}

function resetGame() {
  P.x = GW * 0.5; P.y = GROUND_Y - P.h; P.vx = 0; P.vy = 0;
  P.hasItem = false; P.facing = 1; P.onGround = true;
  P.animT = 0; P.squash = 0;
  item.x = GW * 0.72; item.y = GROUND_Y - item.h; item.taken = false;
  stu.x = GW * 0.13; stu.y = GROUND_Y - stu.h;
  speechIdx = 0; speechChar = 0; speechTimer = 0; speechDone = false;
  teachTimer = 0; endChar = 0; particles = [];
  ignoreTimer = 0;
  finalElapsed = null;
  classroomStartFrame = fr;
  wasOnGround = true;
}

// ============ TRANSIÇÕES COM FADE ============
let fadeAlpha = 0;
let fadeDir = 0; // 1 = escurecendo, -1 = clareando, 0 = parado
let pendingAction = null;

function transitionTo(callback) {
  if (fadeDir !== 0) return; // evita disparo duplo
  fadeDir = 1;
  pendingAction = callback;
}

function updateFade() {
  if (fadeDir === 1) {
    fadeAlpha += 0.06;
    if (fadeAlpha >= 1) {
      fadeAlpha = 1;
      if (pendingAction) { pendingAction(); pendingAction = null; }
      fadeDir = -1;
    }
  } else if (fadeDir === -1) {
    fadeAlpha -= 0.06;
    if (fadeAlpha <= 0) { fadeAlpha = 0; fadeDir = 0; }
  }
}

function drawFade() {
  if (fadeAlpha > 0) {
    X.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
    X.fillRect(0, 0, GW, GH);
  }
}

// ============ INPUT ============
const K = {}, JP = {}, mob = { left: false, right: false, jump: false }, mobJP = {};
addEventListener('keydown', e => {
  if (!K[e.code]) JP[e.code] = true;
  K[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', e => K[e.code] = false);

function bindBtn(id, on, off) {
  const el = document.getElementById(id);
  const s = e => { e.preventDefault(); on(); };
  const en = e => { e.preventDefault(); off(); };
  el.addEventListener('touchstart', s, { passive: false });
  el.addEventListener('touchend', en, { passive: false });
  el.addEventListener('touchcancel', en, { passive: false });
  el.addEventListener('mousedown', s);
  el.addEventListener('mouseup', en);
  el.addEventListener('mouseleave', en);
}
bindBtn('btnLeft', () => { mob.left = true; vibrate(10); }, () => mob.left = false);
bindBtn('btnRight', () => { mob.right = true; vibrate(10); }, () => mob.right = false);
bindBtn('btnJump', () => { mob.jump = true; mobJP.jump = true; vibrate(15); }, () => mob.jump = false);
bindBtn('btnInteract', () => { mobJP.interact = true; vibrate(15); }, () => {});

C.addEventListener('touchstart', () => {
  if (state === 'title' || state === 'ending' || state === 'ending2') mobJP.interact = true;
}, { passive: true });
C.addEventListener('click', () => {
  if (state === 'title' || state === 'ending' || state === 'ending2') mobJP.interact = true;
});

function iL() { return K.ArrowLeft || K.KeyA || mob.left; }
function iR() { return K.ArrowRight || K.KeyD || mob.right; }
function iJ() { return K.Space || K.ArrowUp || K.KeyW || mob.jump; }
function iI() {
  if (iCD > 0) return false;
  if (JP.KeyE || JP.Enter || JP.KeyZ || mobJP.interact) {
    iCD = 15; mobJP.interact = false; return true;
  }
  return false;
}
const near = (a, b, d) => Math.abs((a.x + a.w / 2) - (b.x + b.w / 2)) < d;

// ============ UPDATE — FÍSICA COM COYOTE TIME + JUMP BUFFER ============
let coyoteTimer = 0, jumpBufferTimer = 0;

function updatePlayer() {
  P.vx = 0;
  if (iL()) { P.vx = -SPD; P.facing = -1; }
  if (iR()) { P.vx = SPD; P.facing = 1; }

  // Coyote time: ainda pode pular por N frames após sair da borda
  if (P.onGround) coyoteTimer = COYOTE_FRAMES;
  else if (coyoteTimer > 0) coyoteTimer--;

  // Jump buffer: registra o pulo antes de tocar o chão
  const jumpPressed = JP.Space || JP.ArrowUp || JP.KeyW || mobJP.jump;
  if (jumpPressed) jumpBufferTimer = JUMPBUFFER_FRAMES;
  else if (jumpBufferTimer > 0) jumpBufferTimer--;

  if (jumpBufferTimer > 0 && coyoteTimer > 0) {
    P.vy = JUMPF;
    P.onGround = false;
    coyoteTimer = 0;
    jumpBufferTimer = 0;
    SoundSys.sfxJump();
    triggerDust(P.x + P.w / 2, GROUND_Y, 6);
  }

  // Pulo variável: soltar o botão cedo corta a subida
  if (!iJ() && P.vy < JUMPF * 0.4) {
    P.vy = JUMPF * 0.4;
  }

  P.vy += GRAV;
  if (P.vy > GH * 0.02) P.vy = GH * 0.02;

  P.x += P.vx;
  if (P.x < WALL_L) P.x = WALL_L;
  if (P.x + P.w > WALL_R) P.x = WALL_R - P.w;

  P.y += P.vy;
  if (P.y + P.h >= GROUND_Y) {
    P.lastVy = P.vy;
    P.y = GROUND_Y - P.h; P.vy = 0; P.onGround = true;
  }
  if (P.y < 10) { P.y = 10; P.vy = 0; }

  // Detecção de aterrissagem (squash + shake + poeira)
  if (!wasOnGround && P.onGround) {
    const fallSpeed = Math.abs(P.lastVy || 0);
    if (fallSpeed > GH * 0.008) {
      triggerShake(Math.min(6, fallSpeed * 90));
      triggerDust(P.x + P.w / 2, GROUND_Y, 10);
      P.squash = Math.min(1, fallSpeed * 0.08);
      SoundSys.sfxLand();
    }
  }
  wasOnGround = P.onGround;

  // Decaimento do squash
  if (P.squash > 0) {
    P.squash -= 0.09;
    if (P.squash < 0) P.squash = 0;
  }

  // Som de passos + poeira ao caminhar
  if (Math.abs(P.vx) > 0.1) {
    P.wt++;
    if (P.wt > 6) { P.wf++; P.wt = 0; }
    if (fr - lastStepFrame > 14 && P.onGround) {
      SoundSys.sfxStep();
      triggerDust(P.x + P.w / 2, GROUND_Y - 2, 2);
      lastStepFrame = fr;
    }
  } else { P.wf = 0; P.wt = 0; }

  updateShake();
}

function updateSpeech() {
  if (speechDone) return;
  speechTimer++;
  const cur = speechLines[speechIdx];
  if (speechChar < cur.length) {
    if (speechTimer % 3 === 0) speechChar++;
  } else if (speechTimer > cur.length * 3 + 100) {
    speechIdx++; speechChar = 0; speechTimer = 0;
    if (speechIdx >= speechLines.length) speechDone = true;
  }
}

function updateItems() {
  if (!item.taken && near(P, item, GW * 0.09) && iI()) {
    item.taken = true; P.hasItem = true;
    SoundSys.sfxPickup();
    triggerShake(4);
    for (let i = 0; i < 28; i++) particles.push({
      x: P.x + P.w / 2, y: P.y + P.h / 2,
      vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
      life: 45, cor: '255,215,80'
    });
  }
  if (P.hasItem && near(P, stu, GW * 0.11) && iI()) {
    SoundSys.sfxTeach();
    triggerShake(5);
    state = 'teaching'; teachTimer = 0;
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

// ============ FINAL SECRETO — trigger ============
function updateIgnoreTimer() {
  if (speechDone && !item.taken) {
    ignoreTimer++;
    if (ignoreTimer >= IGNORE_THRESHOLD) {
      triggerEnding2();
    }
  } else {
    ignoreTimer = 0;
  }
}

function finalizeEnding(id) {
  finalElapsed = (fr - classroomStartFrame) / 60;
  lastEndingIsNew = SaveSystem.unlockEnding(id);
  lastEndingIsRecord = SaveSystem.setBestTime(finalElapsed);
}

function triggerEnding1() {
  transitionTo(() => {
    finalizeEnding('final1');
    SoundSys.sfxEnding();
    state = 'ending';
    endChar = 0;
    particles = [];
  });
}

function triggerEnding2() {
  if (state !== 'classroom') return;
  transitionTo(() => {
    finalizeEnding('final2');
    SoundSys.sfxEndingSad();
    state = 'ending2';
    endChar = 0;
    particles = [];
  });
}

// ============ LOOP PRINCIPAL ============
function loop() {
  fr++;
  if (iCD > 0) iCD--;

  if (state === 'title') {
    drawTitle();
    if (iI() || JP.Space) {
      transitionTo(() => {
        SoundSys.init();
        SoundSys.startBGM();
        resetGame();
        state = 'classroom';
      });
    }
  } else if (state === 'classroom') {
    updatePlayer(); updateSpeech(); updateItems(); updateParticles(); updateIgnoreTimer();

    const shake = applyShake();
    X.save();
    X.translate(shake.x, shake.y);
    drawRoom(); drawItem(); drawStudent(); drawTeacher(); drawParticles();
    X.restore();
    drawTV();
    drawHUD();

    // Verifica se a transição para "teaching" acabou de disparar (via updateItems -> state direto)
    if (state === 'teaching') { /* nada extra, próximo frame já desenha teaching */ }

  } else if (state === 'teaching') {
    teachTimer++;
    const shake = applyShake();
    X.save();
    X.translate(shake.x, shake.y);
    drawTeaching();
    updateParticles(); drawParticles();
    X.restore();
    if (teachTimer >= 100) {
      triggerEnding1();
    }
  } else if (state === 'ending') {
    updateParticles();
    drawEnding();
    drawParticles();
    if (endChar >= 50 && iI()) {
      transitionTo(() => { resetGame(); state = 'classroom'; });
    }
  } else if (state === 'ending2') {
    updateParticles();
    drawEnding2();
    drawParticles();
    if (endChar >= 40 && iI()) {
      transitionTo(() => { resetGame(); state = 'classroom'; });
    }
  }

  updateFade();
  drawFade();

  for (const k in JP) JP[k] = false;
  for (const k in mobJP) mobJP[k] = false;
  requestAnimationFrame(loop);
}

// ============ CONTROLE DE ÁUDIO (com ícone persistido) ============
const btnMute = document.getElementById('btnMute');
btnMute.textContent = SoundSys.isMuted() ? '🔇' : '🔊';
btnMute.addEventListener('click', () => {
  const m = SoundSys.toggleMute();
  btnMute.textContent = m ? '🔇' : '🔊';
});
addEventListener('keydown', e => {
  if (e.code === 'KeyM') {
    const m = SoundSys.toggleMute();
    btnMute.textContent = m ? '🔇' : '🔊';
  }
});

// ============ INICIALIZAÇÃO ============
addEventListener('resize', resize);
resize();
resetGame();
loop();
