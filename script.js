// Selección de elementos
const video = document.getElementById("video");
const capture_video = document.getElementById("capture_video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// Crear un arreglo con las imágenes que deseas alternar
const corredoresImages = [
  document.getElementById("corredores"),
  document.getElementById("corredor1"),
  document.getElementById("corredor2"),
];

const maxFrames = 3;
let canCapture = false;
let frameCount = 0;
let isCaptured = false;

// Carga del modelo BodyPix
async function loadBodyPix() {
  const net = await bodyPix.load({
    architecture: "ResNet50", // Modelo más preciso (opcional)
    outputStride: 16,
    segmentationThreshold: 0.7, // Aumenta el umbral de confianza (por defecto 0.5)
  });

  // Configuración del video
  navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
    video.srcObject = stream;
    video.play();

    video.onloadeddata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      segmentPerson(net);
    };
  });
}

// Segmentación y reemplazo del fondo
async function segmentPerson(net) {
  const segmentation = await net.segmentPerson(video);

  const personDetected = segmentation.allPoses.length > 0;

  if (personDetected) {
    canCapture = true;
    capture_video.play();
    const mask = bodyPix.toMask(segmentation);
    ctx.putImageData(mask, 0, 0);

    ctx.globalCompositeOperation = "source-in";
    const backgroundImage = document.getElementById("background");
    backgroundImage.style.filter = "blur(5px)";
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = "destination-over";
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Dibujar la imagen de corredores, cambiando según el frameCount
    ctx.globalCompositeOperation = "source-over";
    const corredores = corredoresImages[frameCount % corredoresImages.length];
    ctx.drawImage(
      corredores,
      canvas.width - corredores.width / 1.6,
      canvas.height - corredores.height / 1.5,
      corredores.width / 1.5,
      corredores.height / 1.5
    );

    requestAnimationFrame(() => segmentPerson(net));
  }
}

// Loop principal
function mainLoop() {
  if (!canCapture && !isCaptured) {
    loadBodyPix();
  }

  if (canCapture && !isCaptured) {
    setTimeout(() => {
      canvas.style.display = "inherit";
    }, 7000);
    setTimeout(() => {
      startFrameCapture();
    }, 10000); // Espera 10 segundos antes de iniciar la captura de frames
  }

  if (!isCaptured) {
    setTimeout(mainLoop, 1000); // Revisa cada segundo
  }
}

function startFrameCapture() {
  console.log("Capturando frames...");

  const captureNextFrame = () => {
    if (frameCount < maxFrames) {
      captureFrame();
      frameCount++;
      setTimeout(captureNextFrame, 3000); // Espera 3 segundos antes de capturar el siguiente frame
    } else {
      console.log("Captura de frames completada");
      canCapture = false;
      isCaptured = true;
      resetCapture();
      window.location.href = "images.html";
      setTimeout(mainLoop, 10000); // Espera 10 segundos antes de reiniciar el loop
    }
  };

  captureNextFrame();
}

function captureFrame() {
  const dataURL = canvas.toDataURL("image/png");
  localStorage.setItem(`capturedImage_${frameCount + 1}`, dataURL);
}

function resetCapture() {
  frameCount = 0;
  canCapture = true;
  isCaptured = false;
}

// Manejo del video de captura para que no se reinicie
capture_video.addEventListener("ended", function() {
  this.pause();
  this.currentTime = this.duration - 0.01; // Deja el video en el último frame
});

// Inicia el loop
mainLoop();
