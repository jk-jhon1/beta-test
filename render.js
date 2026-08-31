// ============ RENDER.JS ============
// Todas as funções de desenho + efeitos visuais (shake, poeira, squash)
// Depende de variáveis globais definidas em game.js (GW, GH, C, X, P, item,
// stu, tvArea, particles, fr, state, speechLines, speechIdx, speechChar,
// speechDone, teachTimer, endChar, ignoreTimer, IGNORE_THRESHOLD, isMob,
// GROUND_Y). Por serem "let/const" no escopo global do documento, essas
// funções só são CHAMADAS depois que game.js já as inicializou.

// ============ SCREEN SHAKE ============
let shakeAmt = 0;

function triggerShake(amount) {
  shakeAmt = Math.max(shakeAmt, amount);
}

function updateShake() {
  if (shakeAmt > 0) {
    shakeAmt *= 0.85;
    if (shakeAmt < 0.3) shakeAmt = 0;
  }
}

function applyShake() {
  if (shakeAmt <= 0) return { x: 0, y: 0 };
  return {
    x: (Math.random() - 0.5) * shakeAmt,
    y: (Math.random() - 0.5) * shakeAmt
  };
}

// ============ POEIRA (dust particles) ============
function triggerDust(x, y, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 22,
      y: y - Math.random() * 6,
      vx: (Math.random() - 0.5) * 1.4,
      vy: -Math.random() * 1.1,
      life: 18 + Math.random() * 12,
      cor: '200,190,170',
      type: 'dust',
      size: 2 + Math.random() * 2
    });
  }
}

// ============ CENÁRIO ============
function drawRoom() {
  let g = X.createLinearGradient(0, 0, 0, GROUND_Y);
  g.addColorStop(0, '#e8d8b8'); g.addColorStop(1, '#d4bf98');
  X.fillStyle = g; X.fillRect(0, 0, GW, GROUND_Y);
  X.fillStyle = '#8a5a30'; X.fillRect(0, GROUND_Y, GW, GH - GROUND_Y);
  X.fillStyle = '#7a4e28';
  for (let i = 0; i < 12; i++) X.fillRect(0, GROUND_Y + 8 + i * 7, GW, 2);
  X.fillStyle = '#5a3a1e'; X.fillRect(0, GROUND_Y - 8, GW, 8);

  // Quadro negro
  X.fillStyle = '#6b4a2a'; X.fillRect(GW * 0.60, GH * 0.14, GW * 0.30, GH * 0.30);
  X.fillStyle = '#2a4a3a'; X.fillRect(GW * 0.615, GH * 0.155, GW * 0.27, GH * 0.26);
  X.strokeStyle = 'rgba(255,255,255,.35)'; X.lineWidth = 3;
  X.strokeRect(GW * 0.615, GH * 0.155, GW * 0.27, GH * 0.26);
  X.fillStyle = 'rgba(255,255,255,.75)';
  X.font = `bold ${Math.floor(GH * 0.05)}px Courier New`;
  X.textAlign = 'center';
  X.fillText('RESTUDING', GW * 0.75, GH * 0.24);
  X.font = `${Math.floor(GH * 0.03)}px Courier New`;
  X.fillText('conhecimento = poder', GW * 0.75, GH * 0.30);

  // TV (área do diálogo)
  X.fillStyle = '#222'; X.fillRect(tvArea.x - 6, tvArea.y - 6, tvArea.w + 12, tvArea.h + 12);
  X.fillStyle = '#334'; X.fillRect(tvArea.x, tvArea.y, tvArea.w, tvArea.h);

  // Janela com parallax sutil de "nuvens"
  X.fillStyle = '#6b4a2a'; X.fillRect(GW * 0.36, GH * 0.12, GW * 0.16, GH * 0.24);
  X.save();
  X.beginPath(); X.rect(GW * 0.37, GH * 0.13, GW * 0.14, GH * 0.22); X.clip();
  X.fillStyle = '#9ecfff'; X.fillRect(GW * 0.37, GH * 0.13, GW * 0.14, GH * 0.22);
  X.fillStyle = 'rgba(255,255,255,.6)';
  const cloudOffset = (fr * 0.15) % (GW * 0.3);
  X.beginPath(); X.ellipse(GW * 0.37 + cloudOffset - GW * 0.1, GH * 0.18, GW * 0.03, GH * 0.015, 0, 0, 7); X.fill();
  X.beginPath(); X.ellipse(GW * 0.37 + cloudOffset + GW * 0.05, GH * 0.28, GW * 0.025, GH * 0.012, 0, 0, 7); X.fill();
  X.restore();
  X.strokeStyle = '#6b4a2a'; X.lineWidth = 4;
  X.beginPath();
  X.moveTo(GW * 0.44, GH * 0.13); X.lineTo(GW * 0.44, GH * 0.35);
  X.moveTo(GW * 0.37, GH * 0.24); X.lineTo(GW * 0.51, GH * 0.24); X.stroke();

  // Mesa do aluno
  X.fillStyle = '#7a5230';
  X.fillRect(stu.x - GW * 0.02, GROUND_Y - GH * 0.06, stu.w + GW * 0.05, GH * 0.02);
  X.fillRect(stu.x - GW * 0.015, GROUND_Y - GH * 0.04, GW * 0.015, GH * 0.06);
  X.fillRect(stu.x + stu.w + GW * 0.02, GROUND_Y - GH * 0.04, GW * 0.015, GH * 0.06);
}

// ============ PROFESSOR (com walk cycle, idle e pose de pulo) ============
function drawTeacher() {
  const sw = P.w, sh = P.h;
  const moving = Math.abs(P.vx) > 0.1;
  const airborne = !P.onGround;

  // Idle bob (respiração sutil quando parado)
  const idleBob = (!moving && !airborne) ? Math.sin(fr * 0.05) * (sh * 0.01) : 0;
  // Squash & stretch ao aterrissar
  const squashY = 1 - (P.squash || 0) * 0.28;
  const squashX = 1 + (P.squash || 0) * 0.20;

  X.save();
  const baseX = P.x, baseY = P.y + idleBob;
  if (P.facing < 0) {
    X.translate(baseX + sw, baseY + sh);
    X.scale(-1, 1);
  } else {
    X.translate(baseX, baseY + sh);
  }
  // Ancora o squash na base (pés), não no topo
  X.scale(squashX, squashY);
  X.translate(0, -sh);

  const u = sw / 13;

  // ---- PERNAS ----
  X.fillStyle = '#2a2a3a';
  if (airborne) {
    // Pose de pulo: pernas tucked (encolhidas)
    X.fillRect(2.5 * u, 14 * u, 3.5 * u, 6 * u);
    X.fillRect(7 * u, 14 * u, 3.5 * u, 6 * u);
  } else if (moving) {
    // Walk cycle real com sine wave
    P.animT = (P.animT || 0) + 1;
    const legLiftL = Math.max(0, Math.sin(P.animT * 0.35)) * u * 1.6;
    const legLiftR = Math.max(0, Math.sin(P.animT * 0.35 + Math.PI)) * u * 1.6;
    X.fillRect(2 * u, 13 * u - legLiftL, 4 * u, 8 * u);
    X.fillRect(7 * u, 13 * u - legLiftR, 4 * u, 8 * u);
  } else {
    P.animT = 0;
    X.fillRect(2 * u, 13 * u, 4 * u, 8 * u);
    X.fillRect(7 * u, 13 * u, 4 * u, 8 * u);
  }
  // Sapatos
  X.fillStyle = '#1a1a1a';
  X.fillRect(1.5 * u, 20 * u, 5 * u, 2 * u);
  X.fillRect(6.5 * u, 20 * u, 5 * u, 2 * u);

  // ---- TRONCO ----
  X.fillStyle = '#f0f0e8'; X.fillRect(1 * u, 7 * u, 11 * u, 7 * u);
  X.fillStyle = '#3a5a8a'; X.fillRect(5.5 * u, 7 * u, 2 * u, 7 * u); // gravata

  // ---- CABEÇA ----
  X.fillStyle = '#f0c8a0'; X.fillRect(2.5 * u, 1 * u, 8 * u, 6 * u);
  X.fillStyle = '#4a3a2a'; X.fillRect(2 * u, 0, 9 * u, 2.2 * u);

  // ---- ÓCULOS ----
  X.fillStyle = '#222';
  X.fillRect(3 * u, 3 * u, 3 * u, 2 * u); X.fillRect(7.5 * u, 3 * u, 3 * u, 2 * u);
  X.fillRect(6 * u, 3.6 * u, 1.5 * u, 0.8 * u);
  X.fillStyle = 'rgba(180,220,255,.7)';
  X.fillRect(3.3 * u, 3.3 * u, 2.4 * u, 1.4 * u); X.fillRect(7.8 * u, 3.3 * u, 2.4 * u, 1.4 * u);

  // ---- BRAÇOS + ITEM ----
  if (P.hasItem) {
    X.fillStyle = '#f0c8a0'; X.fillRect(11 * u, 8 * u, 2.5 * u, 4 * u);
    const gl = 0.6 + Math.sin(fr * 0.15) * 0.4;
    X.fillStyle = `rgba(255,215,80,${gl})`;
    X.fillRect(10.5 * u, 5 * u, 3.5 * u, 3.5 * u);
    X.fillStyle = '#c8960a'; X.fillRect(11 * u, 5.5 * u, 2.5 * u, 2.5 * u);
    X.fillStyle = '#fff'; X.fillRect(11.4 * u, 5.9 * u, 1.7 * u, 1.7 * u);
  } else {
    X.fillStyle = '#f0c8a0';
    const armSwing = moving ? Math.sin((P.animT || 0) * 0.35) * u * 0.4 : 0;
    X.fillRect(0.2 * u, 8 * u + armSwing, 2 * u, 5 * u);
    X.fillRect(10.8 * u, 8 * u - armSwing, 2 * u, 5 * u);
  }

  X.restore();

  // Sombra no chão (encolhe um pouco durante o pulo, dando noção de altura)
  const shadowScale = airborne ? Math.max(0.5, 1 - Math.abs(P.vy) * 0.03) : 1;
  X.fillStyle = 'rgba(0,0,0,.25)';
  X.beginPath();
  X.ellipse(P.x + P.w / 2, GROUND_Y + 4, P.w * 0.55 * shadowScale, 6 * shadowScale, 0, 0, 7);
  X.fill();
}

// ============ ALUNO (Felquinha) ============
function drawStudent() {
  const bob = Math.sin(fr * 0.05) * 2;
  const sx = stu.x, sy = stu.y + bob, u = stu.w / 11;
  X.fillStyle = '#4a6a9a'; X.fillRect(sx + 2 * u, sy + 7 * u, 7 * u, 8 * u);
  X.fillStyle = '#e8b890'; X.fillRect(sx + 2 * u, sy + 1 * u, 7 * u, 6 * u);
  X.fillStyle = '#2a1a1a'; X.fillRect(sx + 1.5 * u, sy, 8 * u, 2.5 * u);
  X.fillStyle = (fr % 140 < 8) ? '#e8b890' : '#222';
  X.fillRect(sx + 3.2 * u, sy + 3.5 * u, 1.2 * u, 1.5 * u);
  X.fillRect(sx + 6.4 * u, sy + 3.5 * u, 1.2 * u, 1.5 * u);
  X.fillStyle = '#a06050'; X.fillRect(sx + 4 * u, sy + 5.5 * u, 3 * u, 0.8 * u);
  X.fillStyle = '#e8b890';
  const wave = Math.sin(fr * 0.1) * u;
  X.fillRect(sx + 8.5 * u, sy + 4 * u + wave, 2 * u, 5 * u);
  X.fillStyle = 'rgba(0,0,0,.25)';
  X.beginPath(); X.ellipse(stu.x + stu.w / 2, GROUND_Y + 4, stu.w * 0.55, 5, 0, 0, 7); X.fill();
}

// ============ ITEM ENSINAR ============
function drawItem() {
  if (item.taken) return;
  const bob = Math.sin(fr * 0.06) * 4;
  const ix = item.x, iy = item.y - 12 + bob;
  const gl = 0.10 + Math.sin(fr * 0.08) * 0.06;
  X.fillStyle = `rgba(255,255,255,${gl})`;
  X.fillRect(ix - 8, iy - 8, item.w + 16, item.h + 16);
  X.fillStyle = '#c8960a'; X.fillRect(ix, iy, item.w, item.h * 0.75);
  X.fillStyle = '#f0c040'; X.fillRect(ix + 3, iy + 3, item.w - 6, item.h * 0.75 - 6);
  X.fillStyle = '#fff8e0'; X.fillRect(ix + 7, iy + 7, item.w - 14, item.h * 0.75 - 14);
  X.strokeStyle = '#c8960a'; X.lineWidth = 2;
  X.beginPath();
  X.moveTo(ix + item.w / 2, iy + 7); X.lineTo(ix + item.w / 2, iy + item.h * 0.75 - 7); X.stroke();
  X.fillStyle = `rgba(255,220,100,${0.7 + Math.sin(fr * 0.12) * 0.3})`;
  X.font = `${Math.floor(item.w * 0.6)}px Courier New`; X.textAlign = 'center';
  X.fillText('★', ix + item.w / 2, iy - 2);
  X.fillStyle = 'rgba(0,0,0,.2)';
  X.beginPath(); X.ellipse(ix + item.w / 2, GROUND_Y + 4, item.w * 0.5, 5, 0, 0, 7); X.fill();
  X.fillStyle = '#7a5a10'; X.font = `bold ${Math.floor(GH * 0.028)}px Courier New`;
  X.fillText('ENSINAR', ix + item.w / 2, iy - 14);
}

// ============ DIÁLOGO NA TV ============
function drawTV() {
  const tv = tvArea;
  const fontSize = Math.max(16, Math.floor(tv.w / 14));
  X.fillStyle = 'rgba(20, 25, 50, 0.55)';
  X.fillRect(tv.x, tv.y, tv.w, tv.h);
  X.strokeStyle = 'rgba(255,255,255,0.2)'; X.lineWidth = 2;
  X.strokeRect(tv.x + 1, tv.y + 1, tv.w - 2, tv.h - 2);

  // Aviso sutil (foreshadowing do Final 2) — borda pisca em vermelho
  if (typeof ignoreTimer !== 'undefined' && ignoreTimer > IGNORE_THRESHOLD * 0.7) {
    const warn = Math.sin(fr * 0.3) * 0.5 + 0.5;
    X.strokeStyle = `rgba(255,60,60,${warn * 0.5})`;
    X.lineWidth = 3;
    X.strokeRect(tv.x, tv.y, tv.w, tv.h);
  }

  X.font = `${Math.floor(fontSize * 0.6)}px Courier New`;
  X.fillStyle = 'rgba(255,255,255,.6)'; X.textAlign = 'right';
  X.fillText(`${Math.min(speechIdx + 1, speechLines.length)}/${speechLines.length}`,
    tv.x + tv.w - 8, tv.y + fontSize * 0.8);

  const txt = speechLines[Math.min(speechIdx, speechLines.length - 1)].substring(0, speechChar);
  X.font = `bold ${fontSize}px Courier New`; X.textAlign = 'center';
  const cx = tv.x + tv.w / 2, cy = tv.y + tv.h / 2 + fontSize * 0.35;
  X.fillStyle = 'rgba(0,0,0,.5)'; X.fillText(txt, cx + 2, cy + 2);
  X.fillStyle = '#fff'; X.fillText(txt, cx, cy);

  const dots = '.'.repeat(1 + Math.floor(fr / 20) % 3);
  X.font = `${Math.floor(fontSize * 0.65)}px Courier New`; X.textAlign = 'left';
  X.fillStyle = '#ffd050';
  X.fillText(`Felquinha ${speechDone ? '' : dots}`, tv.x + 8, tv.y + tv.h - 8);
}

// ============ PARTÍCULAS (spark + dust + confetti) ============
function drawParticles() {
  for (const p of particles) {
    const alpha = Math.min(1, p.life / 30);
    if (p.type === 'dust') {
      X.fillStyle = `rgba(${p.cor},${alpha * 0.6})`;
      X.beginPath();
      X.arc(p.x, p.y, p.size || 2, 0, 7);
      X.fill();
    } else {
      X.fillStyle = `rgba(${p.cor},${alpha})`;
      X.fillRect(p.x - 2, p.y - 2, 5, 5);
    }
  }
}

// ============ HUD ============
function fmtTime(s) {
  if (s === null || s === undefined) return '--:--';
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(2).padStart(5, '0');
  return `${m}:${sec}`;
}

function drawHUD() {
  X.textAlign = 'center';
  if (state === 'classroom') {
    if (!item.taken && near(P, item, GW * 0.09)) {
      X.font = `bold ${Math.floor(GH * 0.035)}px Courier New`;
      X.fillStyle = 'rgba(0,0,0,.6)';
      X.fillRect(GW / 2 - 140, GH * 0.05 - 24, 280, 40);
      X.fillStyle = '#ffd050'; X.fillText('[ E ] PEGAR', GW / 2, GH * 0.05 + 4);
    }
    if (P.hasItem && near(P, stu, GW * 0.11)) {
      X.font = `bold ${Math.floor(GH * 0.035)}px Courier New`;
      X.fillStyle = 'rgba(0,0,0,.6)';
      X.fillRect(GW / 2 - 150, GH * 0.05 - 24, 300, 40);
      X.fillStyle = '#ffd050'; X.fillText('[ E ] ENSINAR', GW / 2, GH * 0.05 + 4);
    }
  }

  if (P.hasItem) {
    X.textAlign = 'left';
    X.font = `bold ${Math.floor(GH * 0.028)}px Courier New`;
    X.fillStyle = '#ffd050';
    X.fillText('★ ENSINAR', 14, 30);
  }

  // Timer + contador de finais (canto superior esquerdo)
  if (state === 'classroom' || state === 'teaching') {
    X.textAlign = 'left';
    X.font = `${Math.floor(GH * 0.022)}px Courier New`;
    X.fillStyle = 'rgba(255,255,255,.55)';
    X.fillText(`⏱ ${fmtTime(getElapsedSeconds())}`, 14, GH - 14);
    X.textAlign = 'right';
    X.fillText(`🏆 ${SaveSystem.getEndings().length}/${TOTAL_ENDINGS}`, GW - 14, GH - 14);
  }
}

// ============ TELA DE TÍTULO ============
function drawTitle() {
  X.fillStyle = '#0d0d2a'; X.fillRect(0, 0, GW, GH);
  for (const s of stars) {
    const tw = 0.4 + Math.sin(fr * 0.05 + s.p) * 0.6;
    X.fillStyle = `rgba(255,255,255,${tw})`;
    X.fillRect(s.x * GW, s.y * GH, s.s, s.s);
  }
  X.textAlign = 'center';
  X.font = `bold ${Math.floor(GH * 0.14)}px Courier New`;
  X.fillStyle = 'rgba(0,0,0,.6)'; X.fillText('RESTUDING', GW / 2 + 5, GH * 0.38 + 5);
  X.fillStyle = '#ffd000'; X.fillText('RESTUDING', GW / 2, GH * 0.38);
  X.font = `${Math.floor(GH * 0.032)}px Courier New`;
  X.fillStyle = '#aab'; X.fillText('Jogo Indie de Plataforma 2D — Beta v0.7', GW / 2, GH * 0.46);
  X.fillStyle = '#e88'; X.fillText('Múltiplos Finais', GW / 2, GH * 0.51);

  // Progresso de finais + melhor tempo na tela de título
  X.font = `${Math.floor(GH * 0.024)}px Courier New`;
  X.fillStyle = '#8f9';
  X.fillText(`Finais descobertos: ${SaveSystem.getEndings().length}/${TOTAL_ENDINGS}`, GW / 2, GH * 0.58);
  const best = SaveSystem.getBestTime();
  if (best !== null) {
    X.fillStyle = '#9cf';
    X.fillText(`Melhor tempo: ${fmtTime(best)}`, GW / 2, GH * 0.63);
  }

  if (fr % 60 < 35) {
    X.font = `bold ${Math.floor(GH * 0.038)}px Courier New`;
    X.fillStyle = '#fff';
    X.fillText(isMob ? 'Toque para começar' : 'Pressione E para começar', GW / 2, GH * 0.75);
  }
}

// ============ ANIMAÇÃO DE ENSINAR ============
function drawTeaching() {
  drawRoom(); drawItem(); drawStudent(); drawTeacher();
  const x1 = P.x + P.w / 2, y1 = P.y + P.h * 0.4;
  const x2 = stu.x + stu.w / 2, y2 = stu.y + stu.h * 0.4;
  const t = teachTimer / 100;
  const bx = x1 + (x2 - x1) * Math.min(1, t * 2), by = y1 + (y2 - y1) * Math.min(1, t * 2);
  X.strokeStyle = 'rgba(255,215,80,.85)'; X.lineWidth = 12; X.lineCap = 'round';
  X.beginPath(); X.moveTo(x1, y1); X.lineTo(bx, by); X.stroke();
  X.strokeStyle = 'rgba(255,255,220,.9)'; X.lineWidth = 5;
  X.beginPath(); X.moveTo(x1, y1); X.lineTo(bx, by); X.stroke();
  if (teachTimer % 3 === 0) particles.push({
    x: x1 + (x2 - x1) * Math.random(), y: y1 + (y2 - y1) * Math.random(),
    vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 2 - 0.5,
    life: 45, cor: '255,230,120'
  });
  if (t > 0.5) {
    X.fillStyle = `rgba(255,240,180,${(t - 0.5) * 0.7})`;
    X.fillRect(stu.x - 10, stu.y - 10, stu.w + 20, stu.h + 20);
  }
}

// ============ FINAL 1 — "O Primeiro Ensinamento" ============
function drawEnding() {
  let g = X.createLinearGradient(0, 0, 0, GH);
  g.addColorStop(0, '#1a1030'); g.addColorStop(1, '#3a2a10');
  X.fillStyle = g; X.fillRect(0, 0, GW, GH);
  if (fr % 5 === 0) particles.push({
    x: Math.random() * GW, y: GH + 10, vx: (Math.random() - 0.5),
    vy: -Math.random() * 2 - 1, life: 120, cor: '255,215,100'
  });
  X.textAlign = 'center';
  X.font = `bold ${Math.floor(GH * 0.09)}px Courier New`;
  X.fillStyle = '#ffd000'; X.fillText('FINAL 1', GW / 2, GH * 0.18);
  X.font = `bold ${Math.floor(GH * 0.05)}px Courier New`;
  X.fillStyle = '#fff'; X.fillText('O Primeiro Ensinamento', GW / 2, GH * 0.27);

  const full = "Você pegou o item ENSINAR e transmitiu|conhecimento para Felquinha.||A sala se encheu de luz dourada.|O primeiro passo para salvar o mundo|foi dado: ENSINAR.||O conhecimento é a maior arma contra o caos.";
  endChar = Math.min(endChar + 0.5, full.length);
  const shown = full.substring(0, Math.floor(endChar)).split('|');
  X.font = `${Math.floor(GH * 0.03)}px Courier New`;
  X.fillStyle = '#e8d8b0';
  shown.forEach((ln, i) => X.fillText(ln, GW / 2, GH * 0.38 + i * GH * 0.05));

  drawEndingFooter();
}

// ============ FINAL 2 SECRETO — "O Silêncio da Sala" ============
function drawEnding2() {
  let g = X.createLinearGradient(0, 0, 0, GH);
  g.addColorStop(0, '#141420'); g.addColorStop(1, '#2a2030');
  X.fillStyle = g; X.fillRect(0, 0, GW, GH);
  // Partículas de poeira caindo, sem brilho — clima melancólico
  if (fr % 8 === 0) particles.push({
    x: Math.random() * GW, y: -10, vx: (Math.random() - 0.5) * 0.5,
    vy: Math.random() * 0.8 + 0.3, life: 200, cor: '150,150,170', type: 'dust', size: 1.5
  });
  X.textAlign = 'center';
  X.font = `bold ${Math.floor(GH * 0.08)}px Courier New`;
  X.fillStyle = '#8899aa'; X.fillText('FINAL SECRETO', GW / 2, GH * 0.18);
  X.font = `bold ${Math.floor(GH * 0.048)}px Courier New`;
  X.fillStyle = '#ccd'; X.fillText('O Silêncio da Sala', GW / 2, GH * 0.27);

  const full = "Felquinha esperou. E esperou.||Você nunca pegou o item.|Nunca aprendeu, nunca ensinou.||Ela apagou a apresentação|e saiu da sala em silêncio.||Algumas oportunidades não voltam.";
  endChar = Math.min(endChar + 0.4, full.length);
  const shown = full.substring(0, Math.floor(endChar)).split('|');
  X.font = `${Math.floor(GH * 0.03)}px Courier New`;
  X.fillStyle = '#a0a0b0';
  shown.forEach((ln, i) => X.fillText(ln, GW / 2, GH * 0.38 + i * GH * 0.05));

  drawEndingFooter();
}

// Rodapé comum: tempo, recorde, contador de finais, prompt de reinício
function drawEndingFooter() {
  X.textAlign = 'center';
  const isTextDone = endChar >= 40;
  if (isTextDone) {
    X.font = `${Math.floor(GH * 0.026)}px Courier New`;
    X.fillStyle = '#fff';
    X.fillText(`Tempo: ${fmtTime(finalElapsed)}`, GW / 2, GH * 0.82);
    if (lastEndingIsRecord) {
      X.fillStyle = '#ffd000';
      X.fillText('🏆 NOVO RECORDE!', GW / 2, GH * 0.86);
    }
    if (lastEndingIsNew) {
      X.fillStyle = '#8f9';
      X.fillText('✨ NOVO FINAL DESBLOQUEADO!', GW / 2, GH * 0.90);
    }
    if (fr % 60 < 35) {
      X.font = `bold ${Math.floor(GH * 0.03)}px Courier New`;
      X.fillStyle = '#fff';
      X.fillText(isMob ? 'Toque para jogar de novo' : 'Pressione E para jogar novamente', GW / 2, GH * 0.95);
    }
  }
  X.fillStyle = '#ffd000';
  X.font = `${Math.floor(GH * 0.024)}px Courier New`;
  X.fillText(`Finais: ${SaveSystem.getEndings().length}/${TOTAL_ENDINGS} descobertos`, GW / 2, GH * 0.99);
}
