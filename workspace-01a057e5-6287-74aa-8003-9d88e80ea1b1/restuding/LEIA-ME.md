# RESTUDING — Beta v0.6

**Platformer 2D indie · Você é um professor e salva o mundo ensinando · Múltiplos finais**

Desenvolvido em **HTML5 + Canvas + JavaScript puro** — arquivo único standalone (sprites
embutidos em base64), sem dependências e sem servidor obrigatório. Inspirado no estilo
*Reventure*: exploração livre, finais secretos e visual pixel art.

---

## ▶ Como jogar

### PC
| Tecla | Ação |
|---|---|
| `←` / `→` (ou `A` / `D`) | Mover |
| `Espaço` / `W` / `↑` | Pular |
| `E` / `Enter` / `Z` | Interagir |
| `M` | Ligamos/desligamos som |
| `T` | Mostrar/ocultar controles touch |

### Android / Mobile (botões na tela)
| Botão | Ação |
|---|---|
| `◀` / `▶` (D-pad branco) | Mover |
| `PULAR` (botão azul) | Pular |
| `INTERAGIR` (botão amarelo) | Interagir |

Os controles touch aparecem automaticamente em dispositivos com tela sensível ao toque
(também toques na tela do jogo servem para começar/avançar telas).

---

## 📖 História & objetivos

Você acorda na **Sala 3** com a missão de **salvar o mundo**. A aluna **Felquinha**
inicia uma **apresentação de slides** (na TV) ensinando os controles do jogo.
Pegue o item **ENSINAR** (brilhando à direita da sala) e devolva o conhecimento
à sua aluna — ou descubra o que mais a sala esconde.

## 🏁 Os 3 finais da beta

| # | Final | Como desbloquear |
|---|---|---|
| 1 | **O PRIMEIRO ENSINAMENTO** (bom) | Pegue o item `ENSINAR` e `INTERAGIR` com a Felquinha |
| 2 | **O NOVO DOUTOR CAOS** (sombrio) | `INTERAGIR` na fenda roxa da parede direita e **aceite** o poder |
| 3 | **O SOBREVIVENTE** (neutro) | Suba na **estante** (esquerda, atrás do quadro — pule) e `INTERAGIR` na portinhola |

Finais descobertos ficam **salvos no dispositivo** (localStorage) e aparecem como
`★` nas telas de título e de final. Recusar o portal sela a fenda (e rende karma) —
a sala continua aberta para os outros destinos.

### Detalhes escondidos
- **2 orbes de conhecimento** (✦ no HUD): um no topo da **mesa**, outro no topo da
  **estante**. Coleccionar os 2 dá um bônus de texto no Final 1.
- O **cartaz** ("SALVE O MUNDO — a diretoria") pode ser lido com `INTERAGIR`.
- A Felquinha responde se você tentar ensiná-la sem o item.

---

## 🚀 Executar

**Opção 1 — abrir direto:** dê dois cliques em `Restuding.html` (funciona em qualquer
navegador moderno, inclusive Android via Chrome).

**Opção 2 — servidor local (recomendado para PWA/offline no Android):**
```bash
cd restuding
python3 -m http.server 8000
# abra http://localhost:8000/Restuding.html
```
No Android: abra a página no Chrome → menu → **"Instalar app"** → o jogo vira um app
tela cheia com funcionamento offline (manifest.json + sw.js).

---

## 🗂 Arquivos

| Arquivo | Descrição |
|---|---|
| `Restuding.html` | **Jogo completo standalone** (sprites base64 embutidos) |
| `manifest.json` / `sw.js` / `icon-192.png` / `icon-512.png` | PWA (instalar como app, offline) |
| `index.html` | Redireciona para o jogo |
| `template.html` | Fonte do HTML (placeholders para os assets) |
| `build.py` | Re-gera `Restuding.html` + ícones a partir dos sprites de `uploads/` |
| `test.js` | Smoke test (Node): simula frame a frame os 3 finais — 15 verificações |
| `render-test.js` | Renderiza frames do jogo em software para inspeção visual |

## ⚙️ Arquitetura (resumo)

- **Resolução interna 480×270**, escalada com `image-rendering: pixelated`.
- **Física**: `GRAV=0.4`, `JUMP=-7`, `SPD=1.8`, chão em `y=248` (colisão AABB com
  resolução mínima; pousar no topo quando caindo de cima).
- **Estados**: `title → class → teach → ending` (máquina de estados).
- **Input unificado** teclado + touch (`iL/iR/iJ/iI`), com fila de pulo/interação.
- **SFX** via Web Audio API (osciladores, sem arquivos); mute com `M`.
- **Diálogo** estilo RPG com efeito máquina-de-escrever; slides desenhados na TV.
- **Save**: `localStorage` registra finais descobertos.
