/* Smoke test do RESTUDING: roda o JS do jogo com stubs de DOM/canvas
   e simula frame a frame os 3 caminhos de final. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, 'Restuding.html'), 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) throw new Error('script não encontrado no HTML');
let gameJS = m[1];
// assets minúsculos (1x1 png) para o teste — o HTML real tem os sprites reais
const tiny = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
gameJS = gameJS.replace(/data:image\/png;base64,[A-Za-z0-9+\/=]+/g, () => 'data:image/png;base64,' + tiny);

// ---------- stubs ----------
const handlers = {};
const ctxTarget = {};
const ctx = new Proxy(ctxTarget, {
  get(t, p) {
    if (p in t) return t[p];
    if (p === 'measureText') return s => ({ width: (s || '').length * 4.2 });
    if (p === 'createLinearGradient' || p === 'createRadialGradient')
      return () => ({ addColorStop() {} });
    return () => {};
  },
  set(t, p, v) { t[p] = v; return true; }
});
const elements = {};
function makeEl(id) {
  return {
    id, style: {}, width: 480, height: 270,
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); }, contains(c) { return this._s.has(c); } },
    addEventListener() {}, getContext: () => ctx, clientWidth: 800, clientHeight: 450
  };
}
let rafCb = null;
const sandbox = {
  console, setTimeout, clearTimeout,
  document: {
    getElementById: id => elements[id] || (elements[id] = makeEl(id)),
    addEventListener() {}
  },
  navigator: { maxTouchPoints: 0 },
  matchMedia: () => ({ matches: false }),
  localStorage: { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = String(v); } },
  Image: class { set src(v) { this._src = v; setTimeout(() => this.onload && this.onload(), 0); } },
  requestAnimationFrame: f => { rafCb = f; },
  addEventListener(t, f) { (handlers[t] = handlers[t] || []).push(f); }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(gameJS, sandbox);

const key = (code, down = true) =>
  (handlers[down ? 'keydown' : 'keyup'] || []).forEach(f => f({ code, repeat: false, preventDefault() {} }));

let frame = 0;
function tick(n = 1) {
  for (let i = 0; i < n; i++) { const f = rafCb; rafCb = null; if (!f) throw new Error('rAF zerado'); f(frame++); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

function hold(dir, n) {
  if (dir === 'l') key('ArrowLeft'); else key('ArrowRight');
  tick(n);
  key(dir === 'l' ? 'ArrowLeft' : 'ArrowRight', false);
}
function jump() { key('Space'); tick(1); key('Space', false); }
function pressE() { key('KeyE'); tick(1); key('KeyE', false); }

let fails = 0;
function check(name, cond, extra = '') {
  console.log((cond ? '  PASS ' : '  FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!cond) fails++;
}
const R = () => sandbox.__R;

// caminha até a mesa e pula por cima dela (segurando a direção durante o pulo)
async function crossDesk() {
  key('ArrowRight');
  tick(40);                            // até quase encostar na face esquerda da mesa
  key('Space'); tick(1); key('Space', false); // pulo com movimento
  tick(95);                            // voo + pouso no topo + descer do outro lado
  key('ArrowRight', false);
}
// pula por cima da Felquinha (sólida) para alcançar a parede/item/portal
async function passStudent() {
  key('ArrowRight');
  tick(20);
  key('Space'); tick(1); key('Space', false);
  tick(50);
  key('ArrowRight', false);
}

(async () => {
  await sleep(60); // imagens "carregam"

  console.log('\n== TELA DE TÍTULO ==');
  check('estado inicial = title', R().state === 'title');
  for (let i = 0; i < 20 && R().state !== 'class'; i++) { pressE(); tick(10); }
  check('E inicia o jogo (state=class)', R().state === 'class');
  check('P spawn (x≈210, pés 248)', R().P && Math.abs(R().P.x - 210) < 2 && R().P.y + R().P.h === 248);

  console.log('\n== APRESENTAÇÃO DE SLIDES (tutorial) ==');
  let guard = 0;
  while (R().pres.idx < 4 && guard++ < 2000) { pressE(); tick(30); }
  check('4 slides avançaram', R().pres.idx === 4, 'idx=' + R().pres.idx);

  console.log('\n== FIM 1 — O PRIMEIRO ENSINAMENTO ==');
  await crossDesk();
  await passStudent(); // pula a Felquinha (item auto-pickup no ar, em x≈426)
  check('item ENSINAR pegado', R().P.hasItem === true, 'x=' + R().P.x.toFixed(0));
  hold('l', 25);  // volta até a Felquinha (encosta nela pela direita)
  pressE();       // ensinar
  check('interagir com aluno inicia "teach"', R().state === 'teach', 'x=' + R().P.x.toFixed(0));
  tick(140);
  check('teach termina em ending e1', R().state === 'ending' && R().found.includes('e1'), 'state=' + R().state + ' found=' + R().found);
  tick(400);      // texto revela
  pressE();       // voltar ao título
  tick(5);
  check('ending volta ao title', R().state === 'title');

  console.log('\n== FIM 2 — O NOVO DOUTOR CAOS (portal) ==');
  for (let i = 0; i < 10 && R().state !== 'class'; i++) { pressE(); tick(5); }
  guard = 0;
  while (R().pres.idx < 4 && guard++ < 2000) { pressE(); tick(5); }
  await crossDesk();
  await passStudent(); // pula a Felquinha até a parede
  check('chegou perto do portal (x>440)', R().P.x > 440, 'x=' + R().P.x.toFixed(0));
  pressE();       // tocar no portal → menu de escolha
  pressE();       // confirmar "ACEITAR PODER" (opção 0)
  tick(5);
  check('aceitar o poder → ending e2', R().state === 'ending' && R().found.includes('e2'), 'state=' + R().state + ' found=' + R().found);
  tick(400);
  pressE(); tick(5);
  check('ending e2 volta ao title', R().state === 'title');

  console.log('\n== FIM 3 — O SOBREVIVENTE (portinhola na estante) ==');
  for (let i = 0; i < 10 && R().state !== 'class'; i++) { pressE(); tick(5); }
  guard = 0;
  while (R().pres.idx < 4 && guard++ < 2000) { pressE(); tick(5); }
  key('ArrowLeft');
  tick(40);  // até encostar na face direita da estante
  key('Space'); tick(1); key('Space', false); // pulo com movimento para a esquerda
  tick(26);
  key('ArrowLeft', false);
  let onShelf = R().P.y + R().P.h <= 202;
  if (!onShelf) { key('ArrowLeft'); tick(10); key('Space'); tick(1); key('Space', false); tick(30); key('ArrowLeft', false); onShelf = R().P.y + R().P.h <= 202; }
  check('pousou no topo da estante', onShelf, 'pés=' + (R().P.y + R().P.h).toFixed(1) + ' x=' + R().P.x.toFixed(0));
  pressE();       // entrar na portinhola
  tick(5);
  check('entrar na portinhola → ending e3', R().state === 'ending' && R().found.includes('e3'), 'state=' + R().state + ' found=' + R().found);
  tick(400);
  pressE(); tick(5);
  check('ending e3 volta ao title', R().state === 'title');

  console.log('\n== PERSISTÊNCIA ==');
  check('3 finais persistidos', R().found.length === 3, 'found=' + R().found.join(','));

  console.log(fails === 0 ? '\nTODOS OS TESTES PASSARAM ✔' : `\n${fails} TESTE(S) FALHARAM ✘`);
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('ERRO NO TESTE:', e); process.exit(2); });
