// ============================================================
//  RESTUDING - GitHub Version
//  Cenario: Sala de Aula
// ============================================================

const C = document.getElementById('gameCanvas');
const X = C.getContext('2d');

let GW = 480, GH = 270;

function resize() {
  const area = document.getElementById('gameArea');
  const aw = area.clientWidth, ah = area.clientHeight;
  const s = Math.min(aw / GW, ah / GH);
  C.style.width = Math.floor(GW * s) + 'px';
  C.style.height = Math.floor(GH * s) + 'px';
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 300));

// ============================================================
//  ASSETS
// ============================================================
const SP = {};
let loaded = 0;
const totalAssets = 4;

function ld(n, s) {
  const i = new Image();
  i.onload = () => { SP[n] = i; loaded++; };
  i.onerror = () => { console.warn('Failed to load:', s); loaded++; };
  i.src = s;
}

ld('teacher', 'assets/teacher.jpg');
ld('teacherWithItem', 'assets/teacherWithItem.png');
ld('room', 'assets/sala_aula.png');
ld('teachItem', 'assets/teachItem.png');

// ============================================================
//  INPUT
// ============================================================
const K = {}, JP = {};
addEventListener('keydown', e => {
  if (!K[e.code]) JP[e.code] = true;
  K[e.code] = true;
  e.preventDefault();
});
addEventListener('keyup', e => {
  K[e.code] = false;
  e.preventDefault();
});

const mob = { left: false, right: false, jump: false, interact: false };
const mobJP = { jump: false, interact: false };

function bindBtn(elId, type) {
  const el = document.getElementById(elId);
  if (!el) return;
  const on = e => {
    e.preventDefault(); e.stopPropagation();
    el.classList.add('active');
    mob[type] = true;
    if (type === 'jump' || type === 'interact') mobJP[type] = true;
  };
  const off = e => {
    e.preventDefault(); e.stopPropagation();
    el.classList.remove('active');
    mob[type] = false;
  };
  el.addEventListener('touchstart', on, { passive: false });
  el.addEventListener('touchend', off, { passive: false });
  el.addEventListener('touchcancel', off, { passive: false });
  el.addEventListener('mousedown', on);
  el.addEventListener('mouseup', off);
  el.addEventListener('mouseleave', off);
}
bindBtn('btnLeft', 'left');
bindBtn('btnRight', 'right');
bindBtn('btnJump', 'jump');
bindBtn('btnInteract', 'interact');

function iL() { return K.ArrowLeft || K.KeyA || mob.left; }
function iR() { return K.ArrowRight || K.KeyD || mob.right; }
function iJ() { return K.Space || K.ArrowUp || K.KeyW || mob.jump; }
let iCD = 0;
function iI() {
  if (iCD > 0) return false;
  if (JP.KeyE || JP.Enter || JP.KeyZ || mobJP.interact) { iCD = 15; return true; }
  return false;
}

// ============================================================
//  GAME STATE
// ============================================================
let state = 'title', fr = 0;

const GRAV = 0.4, JUMPF = -7, SPD = 1.8;
let GROUND_Y = 240;
let WALL_L = 0, WALL_R = GW;

const P = {
  x: 230, y: 200, w: 18, h: 26,
  vx: 0, vy: 0, facing: 1, wf: 0, wt: 0,
  onGround: false, hasItem: false
};

const item = { x: 360, y: 200, w: 16, h: 12, got: false };
const stu = { x: 60, y: 200, w: 14, h: 22 };

const tvArea = { x: 260, y: 35, w: 170, h: 105 };

function positionCharacters() {
  P.x = GW * 0.45;
  P.y = GROUND_Y - P.h;
  item.x = GW * 0.72;
  item.y = GROUND_Y - item.h - 2;
  stu.x = GW * 0.12;
  stu.y = GROUND_Y - stu.h;
}

const speechLines = [
  "Professor! Chegou!",
  "O mundo precisa de voce!",
  "Pegue o item ENSINAR",
  "ali perto do quadro!",
  "Depois volte e use em mim!",
  "Controles:",
  "<- -> para andar",
  "ESPACO para pular",
  "E para interagir!",
  "No celular: use os botoes!",
  "Estou te esperando!",
];
let speechIdx = 0, speechChar = 0, speechTimer = 0, speechDone = false;

const endLines = [
  "Voce usou o poder de ENSINAR!",
  "",
  "O conhecimento fluiu como luz",
  "do professor para o aluno...",
  "",
  "\"Obrigado, professor!\"",
  "\"Ensinar e o maior superpoder!\"",
  "",
  "=== FINAL 1 ALCANCADO ===",
  "「O Primeiro Ensinamento」",
  "",
  "Mas a jornada apenas comeca...",
  "O mundo ainda precisa ser salvo.",
];
let endTimer = 0;

let parts = [];
function addP(x, y, c, t, l) {
  parts.push({ x, y, c, t, l: l || 60, ml: l || 60, vy: -0.5 });
}
function addSparkle(x, y) {
  const cs = ['#f1c40f', '#fff', '#f39c12', '#ffe066'];
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.random() * 15 + 5;
    parts.push({
      x: x + Math.cos(a) * r, y: y + Math.sin(a) * r,
      c: cs[i % 4], t: '✦', l: 40 + i * 3, ml: 50,
      vy: -0.3 - Math.random() * 0.4
    });
  }
}

let pickupFlash = 0;
let endingTriggered = false;
let teachAnim = 0;

// ============================================================
//  DRAWING
// ============================================================

function drawRoom() {
  X.clearRect(0, 0, GW, GH);
  if (SP.room) {
    X.drawImage(SP.room, 0, 0, GW, GH);
  } else {
    X.fillStyle = '#e8d5b5';
    X.fillRect(0, 0, GW, GH);
    X.fillStyle = '#8B7355';
    X.fillRect(0, GROUND_Y, GW, GH - GROUND_Y);
    X.fillStyle = '#1a1a1a';
    X.fillRect(10, 20, 130, 90);
    X.fillStyle = '#5d4037';
    X.fillRect(8, 18, 134, 4);
    X.fillStyle = '#2d5016';
    X.fillRect(160, 25, 300, 100);
    X.fillStyle = '#5d4037';
    X.fillRect(158, 23, 304, 4);
    X.fillStyle = '#6d4c41';
    X.fillRect(0, GROUND_Y - 15, GW, 8);
  }
}

function drawTeacherSprite() {
  const sx = Math.floor(P.x), sy = Math.floor(P.y);
  const teacherImg = P.hasItem ? SP.teacherWithItem : SP.teacher;

  if (teacherImg) {
    const sh = 32;
    const sw = sh * (teacherImg.width / teacherImg.height);
    X.save();
    if (P.facing < 0) {
      X.translate(sx + sw, sy - 3);
      X.scale(-1, 1);
      X.drawImage(teacherImg, 0, 0, sw, sh);
    } else {
      X.drawImage(teacherImg, sx, sy - 3, sw, sh);
    }
    X.restore();
    X.fillStyle = 'rgba(0,0,0,0.2)';
    X.beginPath();
    X.ellipse(sx + sw / 2, sy + P.h + 1, sw / 2 - 1, 3, 0, 0, Math.PI * 2);
    X.fill();
  } else {
    X.fillStyle = 'rgba(0,0,0,0.15)';
    X.beginPath();
    X.ellipse(sx + P.w / 2, sy + P.h + 1, P.w / 2, 2, 0, 0, Math.PI * 2);
    X.fill();
    const lo = Math.abs(P.vx) > 0.1 ? Math.sin(P.wf * 0.5) * 2 : 0;
    X.fillStyle = '#2c3e50';
    X.fillRect(sx + 3, sy + 17, 4, 8 + lo);
    X.fillRect(sx + 10, sy + 17, 4, 8 - lo);
    X.fillStyle = '#1a1a1a';
    X.fillRect(sx + 2, sy + 24 + lo, 5, 2);
    X.fillRect(sx + 10, sy + 24 - lo, 5, 2);
    X.fillStyle = '#34495e'; X.fillRect(sx + 2, sy + 8, 13, 10);
    X.fillStyle = '#fff'; X.fillRect(sx + 7, sy + 9, 4, 7);
    X.fillStyle = '#e74c3c'; X.fillRect(sx + 8, sy + 9, 2, 6);
    X.fillStyle = '#f5cba7'; X.fillRect(sx + 3, sy + 1, 11, 8);
    X.fillStyle = '#5d4037'; X.fillRect(sx + 2, sy, 13, 4);
    X.fillStyle = '#333';
    X.fillRect(sx + 5, sy + 4, 3, 2); X.fillRect(sx + 9, sy + 4, 3, 2);
  }
}

function drawStudentSprite() {
  const sx = Math.floor(stu.x), sy = Math.floor(stu.y);
  X.fillStyle = 'rgba(0,0,0,0.2)';
  X.beginPath();
  X.ellipse(sx + 7, sy + stu.h, 8, 3, 0, 0, Math.PI * 2);
  X.fill();
  X.fillStyle = '#2c3e50';
  X.fillRect(sx + 2, sy + 15, 4, 6);
  X.fillRect(sx + 8, sy + 15, 4, 6);
  X.fillStyle = '#c0392b';
  X.fillRect(sx + 1, sy + 20, 5, 2);
  X.fillRect(sx + 8, sy + 20, 5, 2);
  X.fillStyle = '#ecf0f1';
  X.fillRect(sx + 1, sy + 7, 12, 9);
  X.fillStyle = '#2980b9';
  X.fillRect(sx + 1, sy + 7, 12, 2);
  X.fillStyle = '#f5cba7';
  X.fillRect(sx + 2, sy + 1, 10, 7);
  X.fillStyle = '#2c3e50';
  X.fillRect(sx + 1, sy - 1, 12, 4);
  X.fillRect(sx + 1, sy, 2, 3);
  X.fillRect(sx + 11, sy, 2, 3);
  X.fillStyle = '#333';
  X.fillRect(sx + 4, sy + 3, 2, 2);
  X.fillRect(sx + 8, sy + 3, 2, 2);
  X.fillStyle = '#fff';
  X.fillRect(sx + 4, sy + 3, 1, 1);
  X.fillRect(sx + 8, sy + 3, 1, 1);
  if (!speechDone) {
    X.fillStyle = '#c0392b';
    X.fillRect(sx + 5, sy + 6, 4, 1 + Math.floor(fr / 8) % 2);
  } else {
    X.fillStyle = '#e74c3c';
    X.fillRect(sx + 6, sy + 6, 2, 1);
  }
  X.fillStyle = '#f5cba7';
  X.fillRect(sx - 1, sy + 8, 2, 5);
  X.fillRect(sx + 13, sy + 8, 2, 5);
}

function drawTVDialogue() {
  if (endingTriggered) return;
  const tv = tvArea;
  X.fillStyle = 'rgba(20, 25, 50, 0.55)';
  X.fillRect(tv.x, tv.y, tv.w, tv.h);
  X.strokeStyle = 'rgba(255,255,255,0.2)';
  X.lineWidth = 1;
  X.strokeRect(tv.x + 1, tv.y + 1, tv.w - 2, tv.h - 2);

  const fontSize = Math.max(11, Math.floor(tv.w / 8));
  X.fillStyle = 'rgba(255,255,255,0.5)';
  X.font = `bold ${Math.max(7, fontSize - 4)}px Courier New`;
  X.textAlign = 'right';
  X.fillText(`${speechIdx + 1}/${speechLines.length}`, tv.x + tv.w - 6, tv.y + 12);
  X.textAlign = 'left';

  const text = speechLines[speechIdx].substring(0, speechChar);
  X.font = `bold ${fontSize}px Courier New`;
  const maxW = tv.w - 16;
  const lh = fontSize + 5;

  const words = text.split(' ');
  const lines = [];
  let line = '';
  words.forEach(w => {
    const t = line + w + ' ';
    if (X.measureText(t).width > maxW && line) {
      lines.push(line.trim());
      line = w + ' ';
    } else {
      line = t;
    }
  });
  if (line.trim()) lines.push(line.trim());

  const totalH = lines.length * lh;
  const startY = tv.y + (tv.h - totalH) / 2 + fontSize;

  X.fillStyle = 'rgba(0,0,0,0.5)';
  X.textAlign = 'center';
  lines.forEach((l, i) => {
    X.fillText(l, tv.x + tv.w / 2 + 1, startY + i * lh + 1);
  });

  X.fillStyle = '#fff';
  lines.forEach((l, i) => {
    X.fillText(l, tv.x + tv.w / 2, startY + i * lh);
  });
  X.textAlign = 'left';

  if (!speechDone) {
    const dots = '.'.repeat((Math.floor(fr / 20) % 3) + 1);
    X.fillStyle = 'rgba(100,200,255,0.6)';
    X.font = `bold ${Math.max(7, fontSize - 3)}px Courier New`;
    X.textAlign = 'center';
    X.fillText(`Felquinha ${dots}`, tv.x + tv.w / 2, tv.y + tv.h - 6);
    X.textAlign = 'left';
  }
}

function drawTeachItem() {
  if (item.got) return;
  const sx = Math.floor(item.x), sy = Math.floor(item.y);

  if (SP.teachItem) {
    const maxH = 28;
    const ratio = SP.teachItem.width / SP.teachItem.height;
    const drawH = maxH;
    const drawW = maxH * ratio;
    const bob = Math.sin(fr * 0.06) * 2;
    const iy = sy - (drawH - item.h) + bob;

    const g = Math.sin(fr * 0.08) * 0.12 + 0.12;
    X.fillStyle = `rgba(255,255,255,${g})`;
    X.fillRect(sx - 2, iy - 2, drawW + 4, drawH + 4);

    X.fillStyle = 'rgba(0,0,0,0.15)';
    X.beginPath();
    X.ellipse(sx + drawW / 2, sy + item.h + 2, drawW / 2, 3, 0, 0, Math.PI * 2);
    X.fill();

    X.drawImage(SP.teachItem, sx, iy, drawW, drawH);

    X.fillStyle = '#c9a227';
    X.font = 'bold 6px Courier New';
    const lbl = 'ENSINAR';
    const lw = X.measureText(lbl).width;
    X.fillText(lbl, sx + drawW / 2 - lw / 2, iy - 4);
  } else {
    X.fillStyle = '#8B6914';
    X.fillRect(sx, sy, item.w, item.h);
    X.fillStyle = '#c9a227';
    X.fillRect(sx + 1, sy + 1, item.w - 2, item.h - 2);
    X.fillStyle = '#fff';
    X.fillRect(sx + 3, sy + 3, 9, 1);
    X.fillRect(sx + 3, sy + 5, 7, 1);
    X.fillStyle = '#c9a227';
    X.font = 'bold 6px Courier New';
    X.fillText('ENSINAR', sx - 2, sy - 4);
  }
}

function drawParticles() {
  parts.forEach(p => {
    X.globalAlpha = p.l / p.ml;
    X.fillStyle = p.c;
    X.font = '7px Courier New';
    X.fillText(p.t, p.x, p.y);
  });
  X.globalAlpha = 1;
}

function drawHUD() {
  if (P.hasItem) {
    X.fillStyle = 'rgba(0,0,0,0.6)';
    X.fillRect(GW - 72, 4, 68, 16);
    X.strokeStyle = '#f1c40f';
    X.lineWidth = 1;
    X.strokeRect(GW - 72, 4, 68, 16);
    X.fillStyle = '#f1c40f';
    X.font = 'bold 6px Courier New';
    X.fillText('ENSINAR', GW - 68, 14);
  }

  X.fillStyle = 'rgba(0,0,0,0.5)';
  X.fillRect(4, 4, 76, 14);
  X.fillStyle = '#ecf0f1';
  X.font = '6px Courier New';
  X.fillText('Sala de Aula', 8, 13);

  if (P.hasItem && !endingTriggered) {
    const dx = Math.abs((P.x + P.w / 2) - (stu.x + stu.w / 2));
    if (dx < 40) {
      const hint = '[ E ] ENSINAR';
      X.font = 'bold 7px Courier New';
      const hw = X.measureText(hint).width + 10;
      X.fillStyle = 'rgba(0,0,0,0.7)';
      X.fillRect(stu.x + stu.w / 2 - hw / 2, stu.y - 18, hw, 14);
      X.fillStyle = '#f1c40f';
      X.textAlign = 'center';
      X.fillText(hint, stu.x + stu.w / 2, stu.y - 9);
      X.textAlign = 'left';
    }
  }

  if (!item.got) {
    const dx = Math.abs((P.x + P.w / 2) - (item.x + item.w / 2));
    const dy = Math.abs((P.y + P.h) - (item.y + item.h));
    if (dx < 28 && dy < 25) {
      const hint = '[ E ] Pegar';
      X.font = 'bold 7px Courier New';
      const hw = X.measureText(hint).width + 10;
      X.fillStyle = 'rgba(0,0,0,0.7)';
      X.fillRect(item.x + item.w / 2 - hw / 2, item.y - 20, hw, 14);
      X.fillStyle = '#f1c40f';
      X.textAlign = 'center';
      X.fillText(hint, item.x + item.w / 2, item.y - 11);
      X.textAlign = 'left';
    }
  }
}

// ============================================================
//  UPDATE
// ============================================================
function updatePlayer() {
  P.vx = 0;
  if (iL()) { P.vx = -SPD; P.facing = -1; }
  if (iR()) { P.vx = SPD; P.facing = 1; }
  if (iJ() && P.onGround) { P.vy = JUMPF; P.onGround = false; }

  P.vy += GRAV;
  if (P.vy > 10) P.vy = 10;

  P.x += P.vx;
  if (P.x < WALL_L) P.x = WALL_L;
  if (P.x + P.w > WALL_R) P.x = WALL_R - P.w;

  P.y += P.vy;
  if (P.y + P.h >= GROUND_Y) {
    P.y = GROUND_Y - P.h;
    P.vy = 0;
    P.onGround = true;
  }
  if (P.y < 10) { P.y = 10; P.vy = 0; }

  if (Math.abs(P.vx) > 0.1) {
    P.wt++;
    if (P.wt > 6) { P.wf++; P.wt = 0; }
  } else {
    P.wf = 0; P.wt = 0;
  }
}

function updateSpeech() {
  if (endingTriggered || speechDone) return;
  speechTimer++;
  const cur = speechLines[speechIdx];
  if (speechChar < cur.length) {
    if (speechTimer % 3 === 0) speechChar++;
  } else {
    if (speechTimer > cur.length * 3 + 100) {
      speechIdx++;
      speechChar = 0;
      speechTimer = 0;
      if (speechIdx >= speechLines.length) {
        speechIdx = speechLines.length - 1;
        speechDone = true;
      }
    }
  }
}

function updateItems() {
  if (!item.got) {
    const dx = Math.abs((P.x + P.w / 2) - (item.x + item.w / 2));
    const dy = Math.abs((P.y + P.h) - (item.y + item.h));
    if (dx < 25 && dy < 22 && iI()) {
      item.got = true;
      P.hasItem = true;
      pickupFlash = 25;
      addSparkle(item.x + item.w / 2, item.y);
      addP(item.x, item.y - 16, '#f1c40f', 'ENSINAR obtido!', 80);
    }
  }
  if (P.hasItem && !endingTriggered) {
    const dx = Math.abs((P.x + P.w / 2) - (stu.x + stu.w / 2));
    if (dx < 40 && iI()) {
      endingTriggered = true;
      endTimer = 0;
      teachAnim = 0;
      state = 'teaching';
    }
  }
}

function updateParticles() {
  for (let i = parts.length - 1; i >= 0; i--) {
    parts[i].y += parts[i].vy;
    parts[i].l--;
    if (parts[i].l <= 0) parts.splice(i, 1);
  }
}

// ============================================================
//  STATES
// ============================================================

C.addEventListener('touchstart', e => {
  if (state === 'title') { e.preventDefault(); state = 'classroom'; resetClassroom(); }
  if (state === 'ending' && endTimer > 80) { state = 'classroom'; resetClassroom(); }
}, { passive: false });

C.addEventListener('click', () => {
  if (state === 'title') { state = 'classroom'; resetClassroom(); }
});

function resetClassroom() {
  positionCharacters();
  P.vx = 0; P.vy = 0; P.facing = 1; P.hasItem = false;
  item.got = false; endingTriggered = false;
  speechIdx = 0; speechChar = 0; speechTimer = 0; speechDone = false;
  endTimer = 0; parts = [];
}

function updateTitle() {
  if (iI() || K.Space || K.Enter) {
    state = 'classroom';
    resetClassroom();
  }
}

function drawTitle() {
  X.fillStyle = '#0a0a1e';
  X.fillRect(0, 0, GW, GH);

  for (let i = 0; i < 50; i++) {
    const sx = (i * 97 + Math.sin(fr * 0.01 + i) * 4) % GW;
    const sy = (i * 53 + Math.cos(fr * 0.008 + i) * 3) % GH;
    X.fillStyle = `rgba(255,255,255,${0.2 + Math.sin(fr * 0.03 + i) * 0.3})`;
    X.fillRect(sx, sy, 1, 1);
  }

  X.fillStyle = 'rgba(26,26,46,0.85)';
  X.fillRect(70, 30, 340, 100);
  X.strokeStyle = '#f1c40f';
  X.lineWidth = 2;
  X.strokeRect(70, 30, 340, 100);
  X.fillStyle = '#f1c40f';
  X.font = 'bold 24px Courier New';
  X.textAlign = 'center';
  X.fillText('RESTUDING', GW / 2, 80);
  X.fillStyle = '#e74c3c';
  X.font = '9px Courier New';
  X.fillText('~ Aventura indie de multiplos finais ~', GW / 2, 118);

  if (SP.teacher) {
    const sh = 34, sw = sh * (SP.teacher.width / SP.teacher.height);
    X.drawImage(SP.teacher, GW / 2 - sw / 2, 145, sw, sh);
  }

  const blink = Math.sin(fr * 0.07) > 0;
  if (blink) {
    X.fillStyle = '#ecf0f1';
    X.font = 'bold 9px Courier New';
    X.fillText('Toque ou pressione E para comecar', GW / 2, 210);
  }
  X.fillStyle = '#7f8c8d';
  X.font = '7px Courier New';
  X.fillText('<- -> : mover | Espaco : pular | E : interagir', GW / 2, 236);
  X.fillText('BETA v0.5', GW / 2, 252);
  X.textAlign = 'left';
}

function updateClassroom() {
  updatePlayer();
  updateSpeech();
  updateItems();
  updateParticles();
  if (pickupFlash > 0) pickupFlash--;
  if (iCD > 0) iCD--;
}

function drawClassroom() {
  drawRoom();
  drawTeachItem();
  drawStudentSprite();
  drawTeacherSprite();
  drawTVDialogue();
  drawParticles();
  drawHUD();
  if (pickupFlash > 0) {
    X.fillStyle = `rgba(241,196,15,${pickupFlash / 50})`;
    X.fillRect(0, 0, GW, GH);
  }
}

function updateTeaching() {
  teachAnim++;
  updateParticles();
  if (iCD > 0) iCD--;
  if (teachAnim % 4 === 0 && teachAnim < 80) {
    const t = Math.random();
    const px = P.x + P.w + (stu.x - P.x - P.w) * t;
    const py = P.y + P.h / 2 + (stu.y + stu.h / 2 - P.y - P.h / 2) * t;
    addP(px, py, ['#f1c40f', '#fff', '#ffe066'][Math.floor(Math.random() * 3)], '✦', 30);
  }
  if (teachAnim > 100) {
    state = 'ending';
    endTimer = 0;
  }
}

function drawTeaching() {
  drawRoom();
  drawStudentSprite();
  drawTeacherSprite();

  const a = Math.sin(fr * 0.08) * 0.2 + 0.5;
  X.fillStyle = `rgba(241,196,15,${a})`;
  X.beginPath();
  X.moveTo(P.x + P.w, P.y + 4);
  X.lineTo(stu.x, stu.y + 2);
  X.lineTo(stu.x, stu.y + stu.h - 2);
  X.lineTo(P.x + P.w, P.y + P.h - 4);
  X.fill();

  for (let i = 0; i < 6; i++) {
    const t = ((fr * 0.015 + i * 0.17) % 1);
    const bx = P.x + P.w + (stu.x - P.x - P.w) * t;
    const by = P.y + P.h / 2 + Math.sin(fr * 0.1 + i) * 4;
    X.fillStyle = `rgba(241,196,15,${0.6 + Math.sin(fr * 0.1 + i) * 0.3})`;
    X.font = '6px Courier New';
    X.fillText(['✦', '★', '♦', '●', '✧', '◆'][i], bx, by);
  }
  drawParticles();
  if (teachAnim < 15) {
    X.fillStyle = `rgba(255,255,255,${1 - teachAnim / 15})`;
    X.fillRect(0, 0, GW, GH);
  }
}

function updateEnding() {
  endTimer++;
  updateParticles();
  if (iCD > 0) iCD--;
  if (endTimer % 10 === 0 && endTimer < 180) {
    const cs = ['#f1c40f', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6'];
    parts.push({
      x: Math.random() * GW, y: GH + 5,
      c: cs[Math.floor(Math.random() * 5)],
      t: ['✦', '★', '♦', '●'][Math.floor(Math.random() * 4)],
      l: 90, ml: 90, vy: -0.7 - Math.random() * 0.5
    });
  }
  if (endTimer > 80 && (iI() || K.Space)) {
    state = 'classroom';
    resetClassroom();
  }
}

function drawEnding() {
  const grad = X.createLinearGradient(0, 0, 0, GH);
  grad.addColorStop(0, '#0a0a2e');
  grad.addColorStop(0.5, '#1a1040');
  grad.addColorStop(1, '#0d0d1a');
  X.fillStyle = grad;
  X.fillRect(0, 0, GW, GH);

  for (let i = 0; i < 30; i++) {
    const px = (i * 71 + fr * 0.15 + Math.sin(fr * 0.01 + i) * 20) % GW;
    const py = (i * 43 + Math.cos(fr * 0.008 + i * 0.5) * 15) % GH;
    const a = 0.15 + Math.sin(fr * 0.02 + i) * 0.1;
    X.fillStyle = `rgba(241,196,15,${a})`;
    X.fillRect(px, py, 2, 2);
  }

  X.fillStyle = 'rgba(241,196,15,0.3)';
  X.fillRect(GW / 2 - 60, GH - 50, 12, 24);
  X.fillRect(GW / 2 - 62, GH - 54, 16, 6);
  X.fillStyle = 'rgba(100,200,255,0.3)';
  X.fillRect(GW / 2 + 48, GH - 46, 10, 20);
  X.fillRect(GW / 2 + 46, GH - 50, 14, 5);
  const ba = Math.sin(fr * 0.05) * 0.1 + 0.15;
  X.fillStyle = `rgba(241,196,15,${ba})`;
  X.fillRect(GW / 2 - 46, GH - 42, 92, 4);

  const bx = 30, by = 10, bw = GW - 60, bh = GH - 20;
  X.fillStyle = 'rgba(10,10,30,0.95)';
  X.fillRect(bx, by, bw, bh);
  X.strokeStyle = '#f1c40f';
  X.lineWidth = 2;
  X.strokeRect(bx, by, bw, bh);

  X.fillStyle = '#f1c40f';
  X.font = 'bold 14px Courier New';
  X.textAlign = 'center';
  X.fillText('=== FINAL 1 ===', GW / 2, by + 22);
  X.font = 'bold 15px Courier New';
  X.fillText('「O Primeiro Ensinamento」', GW / 2, by + 42);

  X.strokeStyle = 'rgba(241,196,15,0.3)';
  X.lineWidth = 1;
  X.beginPath();
  X.moveTo(bx + 20, by + 50);
  X.lineTo(bx + bw - 20, by + 50);
  X.stroke();

  const rev = Math.min(endLines.length, Math.floor(endTimer / 22) + 1);
  for (let i = 0; i < rev; i++) {
    const l = endLines[i];
    if (l.includes('FINAL')) { X.fillStyle = '#f1c40f'; X.font = 'bold 11px Courier New'; }
    else if (l.includes('superpoder') || l.includes('Ensinar')) { X.fillStyle = '#2ecc71'; X.font = 'bold 10px Courier New'; }
    else if (l.includes('salvo') || l.includes('journa')) { X.fillStyle = '#e74c3c'; X.font = 'bold 10px Courier New'; }
    else { X.fillStyle = '#ddd'; X.font = '10px Courier New'; }
    X.fillText(l, GW / 2, by + 66 + i * 14);
  }

  if (rev >= endLines.length) {
    const blink = Math.sin(fr * 0.1) > 0;
    if (blink) {
      X.fillStyle = '#f1c40f';
      X.font = 'bold 10px Courier New';
      X.fillText('[ Toque ou pressione E ]', GW / 2, by + bh - 12);
    }
  }
  X.textAlign = 'left';
  drawParticles();
}

// ============================================================
//  MAIN LOOP
// ============================================================
function loop() {
  fr++;
  switch (state) {
    case 'title': updateTitle(); drawTitle(); break;
    case 'classroom': updateClassroom(); drawClassroom(); break;
    case 'teaching': updateTeaching(); drawTeaching(); break;
    case 'ending': updateEnding(); drawEnding(); break;
  }
  Object.keys(JP).forEach(k => delete JP[k]);
  mobJP.jump = false;
  mobJP.interact = false;
  requestAnimationFrame(loop);
}

function waitLoad() {
  if (loaded >= totalAssets) {
    resize();
    loop();
  } else {
    X.fillStyle = '#0a0a1e';
    X.fillRect(0, 0, GW, GH);
    X.fillStyle = '#f1c40f';
    X.font = '10px Courier New';
    X.textAlign = 'center';
    X.fillText('Carregando...', GW / 2, GH / 2);
    X.textAlign = 'left';
    setTimeout(waitLoad, 50);
  }
}
waitLoad();
