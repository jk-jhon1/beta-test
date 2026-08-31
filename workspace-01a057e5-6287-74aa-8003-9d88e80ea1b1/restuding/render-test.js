/* Render test: stub de canvas com buffer real 480x270 + decodificador PNG
   puro + export BMP, para inspeção visual dos frames do jogo. */
'use strict';
const fs = require('fs');
const zlib = require('zlib');
const vm = require('vm');

const W = 480, H = 270;
const buf = Buffer.alloc(W * H * 4);
function clearBuf() { buf.fill(0); for (let i = 3; i < buf.length; i += 4) buf[i] = 255; }
clearBuf();

function parseColor(str) {
  if (typeof str !== 'string') return [0, 0, 0, 1];
  let m;
  if ((m = str.match(/^#([0-9a-f]{6})$/i))) {
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  if ((m = str.match(/^rgba?\(([^)]+)\)$/))) {
    const p = m[1].split(',').map(s => parseFloat(s));
    return [p[0] | 0, p[1] | 0, p[2] | 0, p.length > 3 ? p[3] : 1];
  }
  return [255, 0, 255, 1];
}
function setPixel(x, y, r, g, b, a) {
  if (a <= 0) return;
  x = x | 0; y = y | 0;
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  if (a >= 1) { buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255; return; }
  const af = a, bf = 1 - af;
  buf[i] = r * af + buf[i] * bf;
  buf[i + 1] = g * af + buf[i + 1] * bf;
  buf[i + 2] = b * af + buf[i + 2] * bf;
  buf[i + 3] = 255;
}
function fillRect(x, y, w, h) {
  const [r, g, b, a] = cur.fillStyleRaw;
  const A = a * cur._ga;
  const x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y));
  const x1 = Math.min(W, Math.round(x + w)), y1 = Math.min(H, Math.round(y + h));
  for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) setPixel(xx, yy, r, g, b, A);
}
function strokeRect(x, y, w, h) {
  const [r, g, b, a] = cur.fillStyleRaw;
  const A = a * cur._ga;
  const x0 = Math.round(x), y0 = Math.round(y), x1 = Math.round(x + w), y1 = Math.round(y + h);
  for (let xx = x0; xx < x1; xx++) { setPixel(xx, y0, r, g, b, A); setPixel(xx, y1 - 1, r, g, b, A); }
  for (let yy = y0; yy < y1; yy++) { setPixel(x0, yy, r, g, b, A); setPixel(x1 - 1, yy, r, g, b, A); }
}
// decode PNG (8-bit, RGB/RGBA/gray, sem interlace)
function decodePNG(file) {
  const d = fs.readFileSync(file);
  let pos = 8;
  let width = 0, height = 0, colorType = 0;
  const idat = [];
  while (pos < d.length) {
    const len = d.readUInt32BE(pos);
    const type = d.toString('ascii', pos + 4, pos + 8);
    const data = d.slice(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); colorType = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const ch = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : 2;
  const stride = width * ch;
  const out = Buffer.alloc(width * height * 4);
  let prev = Buffer.alloc(stride);
  let p = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[p++];
    const line = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? line[x - ch] : 0;
      const b = prev[x];
      const c = x >= ch ? prev[x - ch] : 0;
      let v = raw[p + x];
      if (filter === 1) v = (v + a) & 255;
      else if (filter === 2) v = (v + b) & 255;
      else if (filter === 3) v = (v + ((a + b) >> 1)) & 255;
      else if (filter === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
      line[x] = v;
    }
    p += stride;
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      if (colorType === 6) { out[o] = line[x * 4]; out[o + 1] = line[x * 4 + 1]; out[o + 2] = line[x * 4 + 2]; out[o + 3] = line[x * 4 + 3]; }
      else if (colorType === 2) { out[o] = line[x * 3]; out[o + 1] = line[x * 3 + 1]; out[o + 2] = line[x * 3 + 2]; out[o + 3] = 255; }
      else if (colorType === 0) { out[o] = out[o + 1] = out[o + 2] = line[x]; out[o + 3] = 255; }
      else { out[o] = line[x * 2]; out[o + 1] = line[x * 2]; out[o + 2] = line[x * 2]; out[o + 3] = line[x * 2 + 1]; }
    }
    prev = line;
  }
  return { width, height, data: out };
}
function saveBMP(path) {
  const rowSize = Math.ceil(W * 3 / 4) * 4;
  const dataSize = rowSize * H;
  const out = Buffer.alloc(54 + dataSize);
  out.write('BM', 0);
  out.writeUInt32LE(54 + dataSize, 2);
  out.writeUInt32LE(54, 10);
  out.writeUInt32LE(40, 14);
  out.writeInt32LE(W, 18);
  out.writeInt32LE(H, 22);
  out.writeUInt16LE(1, 26);
  out.writeUInt16LE(24, 28);
  out.writeUInt32LE(dataSize, 34);
  for (let y = 0; y < H; y++) {
    const src = (H - 1 - y) * W * 4, dst = 54 + y * rowSize;
    for (let x = 0; x < W; x++) {
      out[dst + x * 3] = buf[src + x * 4 + 2];
      out[dst + x * 3 + 1] = buf[src + x * 4 + 1];
      out[dst + x * 3 + 2] = buf[src + x * 4];
    }
  }
  fs.writeFileSync(path, out);
  console.log('saved', path);
}

// ---------- ctx stub com render ----------
const UP = require('path').join(__dirname, '..', 'uploads') + '/';
const realImgs = {
  t: decodePNG(UP + '1788138912130.png'),
  s: decodePNG(UP + '1788138546835.png'),
  bg: decodePNG(UP + 'sala_aula.png')
};
const imgInstances = [];
class FakeImage {
  set src(v) { this._src = v; imgInstances.push(this); setTimeout(() => this.onload && this.onload(), 0); }
}
function makeImage() { return new FakeImage(); }

const cur = {
  fillStyleRaw: [255, 255, 255, 1],
  strokeStyleRaw: [255, 255, 255, 1],
  lineWidth: 1,
  _ga: 1,
  font: 'bold 8px monospace',
  textAlign: 'start',
  textBaseline: 'alphabetic',
  imageSmoothingEnabled: true,
  _tx: 0, _sx: 1,
  _path: null
};
function fontPx() { const m = cur.font.match(/([\d.]+)px/); return m ? parseFloat(m[1]) : 8; }
function drawImage(img, dx, dy, dw, dh) {
  const real = realImgs[img._kind] || realImgs.bg;
  const tx = cur._tx, sx = cur._sx;
  const X = tx + sx * dx, Y = dy, WW = Math.abs(sx) * dw, HH = dh;
  for (let yy = 0; yy < HH; yy++) {
    const sy = Math.min(real.height - 1, (yy / HH * real.height) | 0);
    for (let xx = 0; xx < WW; xx++) {
      const sxx = Math.min(real.width - 1, ((sx > 0 ? xx : WW - 1 - xx) / WW * real.width) | 0);
      const si = (sy * real.width + sxx) * 4;
      const a = real.data[si + 3] / 255;
      if (a > 0) setPixel(X + xx, Y + yy, real.data[si], real.data[si + 1], real.data[si + 2], a * cur._ga);
    }
  }
}
function fillText(str, x, y) {
  const size = fontPx();
  const cw = Math.max(2, size * 0.6);
  const n = str.length;
  let x0 = x;
  if (cur.textAlign === 'center') x0 = x - n * cw / 2;
  else if (cur.textAlign === 'right') x0 = x - n * cw;
  const [r, g, b, a] = cur.fillStyleRaw;
  for (let i = 0; i < n; i++) {
    if (str[i] === ' ') continue;
    const px = Math.round(x0 + i * cw);
    const py = Math.round(y);
    for (let yy = 0; yy < Math.max(1, size - 2); yy++)
      for (let xx = 0; xx < Math.max(1, cw - 1); xx++)
        setPixel(px + xx, py + yy, r, g, b, a * cur._ga * 0.95);
  }
}
function arcFill(x, y, r) {
  const [rc, g, b, a] = cur.fillStyleRaw;
  const R = Math.max(1, r | 0);
  for (let yy = -R; yy <= R; yy++)
    for (let xx = -R; xx <= R; xx++)
      if (xx * xx + yy * yy <= R * R) setPixel(x + xx, y + yy, rc, g, b, a * cur._ga);
}
function line(x0, y0, x1, y1, w) {
  const [r, g, b, a] = cur.strokeStyleRaw;
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) {
    const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
    for (let d = 0; d < (w | 0); d++) setPixel((x + d) | 0, (y + d * 0.4) | 0, r, g, b, a * cur._ga);
  }
}
function polyFill(pts) {
  const [r, g, b, a] = cur.fillStyleRaw;
  let miny = 1e9, maxy = -1e9;
  for (const p of pts) { miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]); }
  for (let y = Math.floor(miny); y <= Math.ceil(maxy); y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const p0 = pts[i], p1 = pts[(i + 1) % pts.length];
      if ((p0[1] <= y && p1[1] > y) || (p1[1] <= y && p0[1] > y))
        xs.push(p0[0] + (y - p0[1]) / (p1[1] - p0[1]) * (p1[0] - p0[0]));
    }
    xs.sort((a2, b2) => a2 - b2);
    for (let i = 0; i + 1 < xs.length; i += 2)
      for (let x = Math.floor(xs[i]); x <= Math.ceil(xs[i + 1]); x++) setPixel(x, y, r, g, b, a * cur._ga);
  }
}
const ctxAPI = {
  get fillStyle() { return cur._fs; },
  set fillStyle(v) { cur._fs = v; cur.fillStyleRaw = parseColor(v); },
  get strokeStyle() { return cur._ss; },
  set strokeStyle(v) { cur._ss = v; cur.strokeStyleRaw = parseColor(v); },
  get lineWidth() { return cur.lineWidth; }, set lineWidth(v) { cur.lineWidth = v; },
  get globalAlpha() { return cur._ga; }, set globalAlpha(v) { cur._ga = v; },
  get font() { return cur.font; }, set font(v) { cur.font = v; },
  get textAlign() { return cur.textAlign; }, set textAlign(v) { cur.textAlign = v; },
  get textBaseline() { return cur.textBaseline; }, set textBaseline(v) { cur.textBaseline = v; },
  imageSmoothingEnabled: true,
  clearRect() { clearBuf(); },
  fillRect, strokeRect,
  drawImage, fillText,
  measureText: s => ({ width: s.length * Math.max(2, fontPx() * 0.6) }),
  save() { this._stk = [cur._tx, cur._sx]; },
  restore() { if (this._stk) { cur._tx = this._stk[0]; cur._sx = this._stk[1]; } },
  translate(x) { cur._tx += x; },
  scale(sx) { cur._sx *= sx; },
  beginPath() { cur._path = []; },
  moveTo(x, y) { cur._path && cur._path.push([x, y]); },
  lineTo(x, y) { cur._path && cur._path.push([x, y]); },
  arcTo(x1, y1) { if (cur._path) cur._path.push([x1, y1]); },
  closePath() { },
  arc(x, y, r) { arcFill(x, y, r); },
  fill() { cur._path && polyFill(cur._path); cur._path = null; },
  stroke() {
    if (!cur._path) return;
    for (let i = 0; i < cur._path.length - 1; i++)
      line(cur._path[i][0], cur._path[i][1], cur._path[i + 1][0], cur._path[i + 1][1], cur.lineWidth);
    cur._path = null;
  }
};

// ---------- sandbox ----------
const html = fs.readFileSync('Restuding.html', 'utf8');
let gameJS = html.match(/<script>([\s\S]*?)<\/script>/)[1];
gameJS = gameJS.replace(/data:image\/png;base64,[A-Za-z0-9+\/=]+/g, () => 'data:image/png;base64,AAA');
const handlers = {};
const els = {};
function mk(id) {
  return { id, style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, getContext: () => ctxAPI, clientWidth: 960, clientHeight: 540, width: 480, height: 270 };
}
let raf = null;
const sb = {
  console, setTimeout, clearTimeout,
  document: { getElementById: id => els[id] || (els[id] = mk(id)), addEventListener() {} },
  navigator: { maxTouchPoints: 0 },
  matchMedia: () => ({ matches: false }),
  localStorage: { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = String(v); } },
  Image: makeImage,
  requestAnimationFrame: f => { raf = f; },
  addEventListener: (t, f) => { (handlers[t] = handlers[t] || []).push(f); }
};
sb.window = sb; sb.globalThis = sb;
vm.createContext(sb);
vm.runInContext(gameJS, sb);
const key = (c, d = true) => (handlers[d ? 'keydown' : 'keyup'] || []).forEach(f => f({ code: c, repeat: false, preventDefault() {} }));
let fr = 0;
const tick = n => { for (let i = 0; i < n; i++) { const f = raf; raf = null; f(fr++); } };
const R = () => sb.__R;

// o jogo cria na ordem: imgs.t, imgs.s, imgs.bg — mapeia _kind por ordem
function mapKinds() { ['t', 's', 'bg'].forEach((k, i) => { if (imgInstances[i]) imgInstances[i]._kind = k; }); }

// mapeia _kind via closure: drawImage recebe o objeto Image criado
// (os objetos reais estão em madeImgs; drawImage usa img._kind)
// como makeImage devolve objetos distintos, precisamos ligá-los:
// imgs.t = new Image() → madeImgs[0]; imgs.s → [1]; imgs.bg → [2]
// e _kind é usado no drawImage: realImgs[img._kind]
// então precisamos definir _kind nesses objetos:

(async () => {
  await new Promise(r => setTimeout(r, 50));
  mapKinds();
  const shot = name => { tick(1); saveBMP('/tmp/shot_' + name + '.bmp'); };

  // 1. título
  tick(40);
  saveBMP('/tmp/shot_1_title.bmp');

  // 2. classroom, slide 0 (digitando)
  key('KeyE'); tick(5);
  let g = 0; while (R().pres.idx < 1 && g++ < 50) { key('KeyE'); tick(1); key('KeyE', false); }
  tick(25);
  saveBMP('/tmp/shot_2_slide0.bmp');

  // 3. slide 2 (pular)
  g = 0; while (R().pres.idx < 2 && g++ < 50) { key('KeyE'); tick(1); key('KeyE', false); }
  key('KeyE'); tick(1); key('KeyE', false);
  tick(30);
  saveBMP('/tmp/shot_3_slide2.bmp');

  // 4. slide 4 livre (missão) + jogador perto do aluno com item
  g = 0; while (R().pres.idx < 4 && g++ < 200) { key('KeyE'); tick(1); key('KeyE', false); }
  key('ArrowRight'); tick(40); key('Space'); tick(1); key('Space', false); tick(95); // mesa
  key('ArrowRight'); tick(20); key('Space'); tick(1); key('Space', false); tick(50); key('ArrowRight', false); // pula a Felquinha
  key('ArrowLeft'); tick(25); key('ArrowLeft', false);
  tick(20);
  saveBMP('/tmp/shot_4_mission.bmp');

  // 5. painel de escolha do portal
  key('ArrowRight'); tick(30); key('ArrowRight', false);
  key('KeyE'); tick(1); key('KeyE', false);
  tick(10);
  saveBMP('/tmp/shot_5_choice.bmp');
  // recusar
  key('ArrowLeft'); tick(1); key('ArrowLeft', false); // muda sel? (esquerda também alterna)
  key('KeyE'); tick(1); key('KeyE', false);
  tick(10);

  // 6. ensino (voltar até o aluno e ensinar)
  key('ArrowLeft'); tick(30); key('ArrowLeft', false);
  key('KeyE'); tick(1); key('KeyE', false);
  tick(60);
  saveBMP('/tmp/shot_6_teach.bmp');
  tick(80); // → ending e1

  // 7. ending e1 completo
  tick(400);
  saveBMP('/tmp/shot_7_end1.bmp');
  key('KeyE'); tick(5);

  // 8. estante + portinhola visível
  for (let i = 0; i < 10 && R().state !== 'class'; i++) { key('KeyE'); tick(5); }
  g = 0; while (R().pres.idx < 4 && g++ < 200) { key('KeyE'); tick(1); key('KeyE', false); }
  key('ArrowLeft'); tick(40); key('Space'); tick(1); key('Space', false); tick(26); key('ArrowLeft', false);
  tick(5);
  saveBMP('/tmp/shot_8_shelf.bmp');
  // não interagir: pular de volta
  key('Space'); tick(1); key('Space', false); tick(40);

  // 9. ending e2 (novo jogo, portal, aceitar)
  for (let i = 0; i < 10 && R().state !== 'class'; i++) { key('KeyE'); tick(5); }
  g = 0; while (R().pres.idx < 4 && g++ < 200) { key('KeyE'); tick(1); key('KeyE', false); }
  key('ArrowRight'); tick(40); key('Space'); tick(1); key('Space', false); tick(95); key('ArrowRight', false); // mesa
  key('ArrowRight'); tick(20); key('Space'); tick(1); key('Space', false); tick(50); key('ArrowRight', false); // pula a Felquinha
  key('KeyE'); tick(1); key('KeyE', false); // abre escolha
  key('KeyE'); tick(1); key('KeyE', false); // aceitar
  tick(500);
  saveBMP('/tmp/shot_9_end2.bmp');

  console.log('done');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
