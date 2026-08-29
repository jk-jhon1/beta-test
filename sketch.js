// Variáveis de estado do jogo
let estadoJogo = "MENU"; 

// Variáveis para as imagens
let imgMenu, imgPersonagem, imgCenarioSala, imgCenarioPantano;

// Objeto do Tonhão (Personagem Principal)
let jogador = {
  x: 100, 
  y: 300, 
  largura: 60, 
  altura: 60,
  velX: 0, 
  velY: 0, 
  velocidade: 5, 
  forcaPulo: -12, 
  gravidade: 0.6,
  noChao: false
};

// Carrega as imagens antes do jogo iniciar
function preload() {
  imgMenu = loadImage('Gemini_Generated_Image_uwyfimuwyfimuwyf.jpg');
  imgPersonagem = loadImage('indio.png');
  imgCenarioSala = loadImage('primeira,sala.png');
  imgCenarioPantano = loadImage('pantanog.png');
}

function setup() {
  // Cria uma tela com as proporções da imagem do menu
  createCanvas(800, 600);
}

function draw() {
  if (estadoJogo === "MENU") {
    desenharMenu();
  } else if (estadoJogo === "JOGANDO") {
    desenharJogo();
  }
}

function desenharMenu() {
  // Desenha a imagem do menu de fundo
  image(imgMenu, 0, 0, width, height);
  
  // Como os botões já estão desenhados na imagem, 
  // a lógica de clique será baseada nas coordenadas do mouse (veja mousePressed abaixo)
}

function desenharJogo() {
  // Desenha o cenário (usando o pântano como exemplo)
  image(imgCenarioPantano, 0, 0, width, height);

  // --- FÍSICA E MOVIMENTAÇÃO ---
  jogador.velY += jogador.gravidade; // Aplica gravidade
  jogador.y += jogador.velY;
  jogador.x += jogador.velX;

  // Colisão simples com o "chão" da tela
  let nivelDoChao = height - 100;
  if (jogador.y + jogador.altura >= nivelDoChao) {
    jogador.y = nivelDoChao - jogador.altura;
    jogador.velY = 0;
    jogador.noChao = true;
  } else {
    jogador.noChao = false;
  }

  // Controles de Esquerda/Direita (Setas ou A/D)
  if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) {
    jogador.velX = -jogador.velocidade;
  } else if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) {
    jogador.velX = jogador.velocidade;
  } else {
    jogador.velX = 0; // Para de andar se soltar o botão
  }

  // Desenha o personagem na tela
  image(imgPersonagem, jogador.x, jogador.y, jogador.largura, jogador.altura);

  // Instruções na tela
  fill(255);
  textSize(16);
  text("A/D ou Setas: Mover | ESPAÇO: Pular | E: Interagir", 20, 30);
}

// Verifica cliques do mouse (Para os botões do Menu)
function mousePressed() {
  if (estadoJogo === "MENU") {
    // Coordenadas aproximadas do botão "START" na sua imagem
    // Se o mouse estiver dentro dessa área quadrada e clicar, o jogo inicia
    if (mouseX > 310 && mouseX < 490 && mouseY > 400 && mouseY < 460) {
      estadoJogo = "JOGANDO";
    }
  }
}

// Verifica teclas pressionadas (Para Pular e Interagir)
function keyPressed() {
  if (estadoJogo === "JOGANDO") {
    
    // PULAR: Tecla Espaço (32), Seta pra Cima ou W (87)
    if ((keyCode === UP_ARROW || keyCode === 32 || keyCode === 87) && jogador.noChao) {
      jogador.velY = jogador.forcaPulo;
    }
    
    // INTERAGIR: Tecla E (69)
    if (keyCode === 69) {
      console.log("O Tonhão interagiu com o ambiente!");
      // Aqui você pode colocar a lógica para abrir portas, ler placas, etc.
    }
  }
}
