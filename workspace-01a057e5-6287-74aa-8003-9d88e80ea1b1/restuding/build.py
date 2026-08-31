#!/usr/bin/env python3
"""Build do RESTUDING Beta: embute os sprites (base64) no HTML standalone
e gera os ícones PWA a partir do sprite do professor."""
import base64
import os

from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
UP = os.path.join(os.path.dirname(ROOT), 'uploads')

def b64(path):
    with open(path, 'rb') as f:
        return base64.b64encode(f.read()).decode()

teacher = b64(os.path.join(UP, '1788138912130.png'))  # professor (touca + óculos)
student = b64(os.path.join(UP, '1788138546835.png'))  # aluno (loiro)
bg      = b64(os.path.join(UP, 'sala_aula.png'))      # sala de aula

html = open(os.path.join(ROOT, 'template.html'), encoding='utf-8').read()
html = (html
        .replace('__B64_T__', teacher)
        .replace('__B64_S__', student)
        .replace('__B64_BG__', bg))
out = os.path.join(ROOT, 'Restuding.html')
with open(out, 'w', encoding='utf-8') as f:
    f.write(html)
print(f'OK {out}  ({os.path.getsize(out)/1024:.1f} KB)')

# Ícones PWA (sprite do professor sobre fundo escuro, escala inteira)
im = Image.open(os.path.join(UP, '1788138912130.png')).convert('RGBA')
for sz in (192, 512):
    canvas = Image.new('RGBA', (sz, sz), (10, 10, 18, 255))
    k = max(1, (sz // 32) // 2)          # múltiplo inteiro de 32px
    sprite = im.resize((32 * k, 32 * k), Image.NEAREST)
    off = (sz - sprite.width) // 2
    canvas.paste(sprite, (off, off), sprite)
    canvas.save(os.path.join(ROOT, f'icon-{sz}.png'))
    print(f'OK icon-{sz}.png')
