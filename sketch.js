let estadoJogo = "MENU"; 
let imgMenu, imgPersonagem, imgCenarioSala, imgCenarioPantano;

// Classe do Personagem Principal (Otimização)
class Jogador {
  constructor() {
    this.largura = 60;
    this.altura = 60;
    this.x = 100;
    this.y = 300;
    this.velX = 0;
    this.velY = 0;
    this.velocidade = 6;
    this.forcaPulo = -14; // Pulo mais firme
    this.gravidade = 0.8;
    this.noChao = false;
  }

  atualizar() {
    // Aplica a gravidade constantemente
    this.velY += this.gravidade;
    this.y += this.velY;
    this.x += this.velX;

    // Define onde fica o "chão" da imagem
    let nivelDoChao = height - 90;

    // Sistema de Colisão com o chão
    if (this.y + this.altura >= nivelDoChao) {
      this.y = nivelDoChao - this.altura;
      this.velY = 0;
      this.noChao = true;
    } else {
      this.noChao = false;
    }

    // Limites da tela (Impede que o Tonhão saia do mapa)
    if (this.x < 0) this.x = 0;
    if (this.x + this.largura > width) this.x = width - this.largura;
  }

  mover() {
    // Seta Esquerda ou Tecla 'A'
    if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) { 
      this.velX = -this.velocidade;
    } 
    // Seta Direita ou Tecla 'D'
    else if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) { 
      this.velX = this.velocidade;
    } 
    // Ficar parado
    else {
      this.velX = 0;
    }
  }

  pular() {
    // Só permite pular se estiver encostado no chão
    if (this.noChao) {
      this.velY = this.forcaPulo;
      this.noChao = false;
    }
  }

  desenhar() {
    image(imgPersonagem, this.x, this.y, this.largura, this.altura);
  }
}

let tonhao; // Variável que vai guardar o nosso jogador

// Carrega as imagens antes do jogo iniciar
function preload() {
  // ATENÇÃO: Os nomes devem estar idênticos aos arquivos no seu computador/GitHub
  imgMenu = loadImage('Gemini_Generated_Image_uwyfimuwyfimuwyf.jpg');
  imgPersonagem = loadImage('indio.png');
  imgCenarioSala = loadImage('primeira,sala.png');
  imgCenarioPantano = loadImage('pantanog.png');
}

function setup() {
  createCanvas(800, 600);
  tonhao = new Jogador(); // Cria o Tonhão
}

function draw() {
  if (estadoJogo === "MENU") {
    desenharMenu();
  } else if (estadoJogo === "JOGANDO") {
    desenharJogo();
  }
}

function desenharMenu() {
  image(imgMenu, 0, 0, width, height);
}

function desenharJogo() {
  // Desenha o fundo
  image(imgCenarioPantano, 0, 0, width, height);

  // Executa os comandos do Tonhão
  tonhao.mover();
  tonhao.atualizar();
  tonhao.desenhar();

  // Texto de instruções na tela
  fill(255); // Cor branca
  textSize(16);
  text("A/D ou Setas: Mover | W ou ESPAÇO: Pular | E: Interagir", 20, 30);
}

// Controle do Mouse (Para o Menu)
function mousePressed() {
  if (estadoJogo === "MENU") {
    // Coordenadas invisíveis do botão "START" gerado na imagem
    if (mouseX > 310 && mouseX < 490 && mouseY > 400 && mouseY < 460) {
      estadoJogo = "JOGANDO";
    }
  }
}

// Controle do Teclado (Para ações que não são segurar o botão, como pular e interagir)
function keyPressed() {
  if (estadoJogo === "JOGANDO") {
    // PULAR: Seta pra cima, Espaço (32) ou 'W' (87)
    if (keyCode === UP_ARROW || keyCode === 32 || keyCode === 87) {
      tonhao.pular();
    }
    
    // INTERAGIR: Tecla 'E' (69)
    if (keyCode === 69) {
      console.log("Interação ativada!");
      // Futuramente colocaremos a lógica para trocar de cenário aqui
    }
  }
}
