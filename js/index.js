import { AutoModel, AutoProcessor, RawImage } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0';
import { renderKeypoints } from './keypoints.js';
import { renderSkeleto } from './skeleto.js';
import { renderHeatmap } from './mapa.js';

// Funções auxiliares
function removeDuplicates(detections, iouThreshold) {
    const filteredDetections = [];

    for (const detection of detections) {
        let isDuplicate = false;
        let duplicateIndex = -1;
        let maxIoU = 0;

        for (let i = 0; i < filteredDetections.length; ++i) {
            const filteredDetection = filteredDetections[i];
            const iou = calculateIoU(detection, filteredDetection);
            if (iou > iouThreshold) {
                isDuplicate = true;
                if (iou > maxIoU) {
                    maxIoU = iou;
                    duplicateIndex = i;
                }
            }
        }

        if (!isDuplicate) {
            filteredDetections.push(detection);
        } else if (duplicateIndex !== -1 && detection.score > filteredDetections[duplicateIndex].score) {
            filteredDetections[duplicateIndex] = detection;
        }
    }

    return filteredDetections;
}

function calculateIoU(detection1, detection2) {
    const xOverlap = Math.max(0, Math.min(detection1.x2, detection2.x2) - Math.max(detection1.x1, detection2.x1));
    const yOverlap = Math.max(0, Math.min(detection1.y2, detection2.y2) - Math.max(detection1.y1, detection2.y1));
    const overlapArea = xOverlap * yOverlap;

    const area1 = (detection1.x2 - detection1.x1) * (detection1.y2 - detection1.y1);
    const area2 = (detection2.x2 - detection2.x1) * (detection2.y2 - detection2.y1);
    const unionArea = area1 + area2 - overlapArea;

    return overlapArea / unionArea;
}

// Função que carrega o modelo e processa a imagem
async function estimatePose(img, keypointsLayer, skeletoLayer, heatmapLayer) {
    const status = document.getElementById('status');
    status.textContent = 'Analisando...';

    const rawImage = await RawImage.read(img.src);
    const { pixel_values } = await processor(rawImage);

    const { output0 } = await model({ images: pixel_values });
    const permuted = output0[0].transpose(1, 0);

    const results = [];
    const pointsData = [];
    const [scaledHeight, scaledWidth] = pixel_values.dims.slice(-2);
    for (const [xc, yc, w, h, score, ...keypoints] of permuted.tolist()) {
        if (score < 0.3) continue;

        const x1 = (xc - w / 2) / scaledWidth * img.width;
        const y1 = (yc - h / 2) / scaledHeight * img.height;
        const x2 = (xc + w / 2) / scaledWidth * img.width;
        const y2 = (yc + h / 2) / scaledHeight * img.height;
        results.push({ x1, x2, y1, y2, score, keypoints });

        if (keypoints && Array.isArray(keypoints)) {
            const reliablePoints = keypoints.filter((_, i) => i % 3 === 2 && keypoints[i] > 0.5).length;
            pointsData.push(reliablePoints);
        }
    }

    const filteredResults = removeDuplicates(results, 0.5);

    // Chama as funções que renderizam os resultados nos layers apropriados
    renderKeypoints(filteredResults, img, scaledWidth, scaledHeight, keypointsLayer);
    renderSkeleto(filteredResults, img, scaledWidth, scaledHeight, skeletoLayer);
    renderHeatmap(filteredResults, img, scaledWidth, scaledHeight, heatmapLayer);

    status.textContent = 'Carregado';
}


// Carregar modelo e processador
const model_id = 'Xenova/yolov8s-pose';
const model = await AutoModel.from_pretrained(model_id);
const processor = await AutoProcessor.from_pretrained(model_id);

const fileUpload = document.getElementById('file-upload');
const imageContainer = document.getElementById('image-container');

fileUpload.addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) {
        console.log("Nenhum arquivo foi selecionado.");
        return;
    }

    const reader = new FileReader();

    reader.onload = async function(e2) {
        // Limpa os três contêineres, mas deixa espaço para a imagem de fundo
        document.getElementById('keypoints-container').innerHTML = '';
        document.getElementById('skeleto-container').innerHTML = '';
        document.getElementById('heatmap-container').innerHTML = '';

        // Cria uma imagem para mostrar nos três contêineres
        const image = document.createElement('img');
        image.src = e2.target.result;

        image.onload = async function() {
            // Adiciona a imagem em cada um dos três contêineres
            const keypointsContainer = document.getElementById('keypoints-container');
            const skeletoContainer = document.getElementById('skeleto-container');
            const heatmapContainer = document.getElementById('heatmap-container');

            // Criar divs que servirão como "layer" para renderizar os pontos e o esqueleto sobre a imagem
            const keypointsLayer = document.createElement('div');
            const skeletoLayer = document.createElement('div');
            const heatmapLayer = document.createElement('div');
            keypointsLayer.style.position = skeletoLayer.style.position = heatmapLayer.style.position = 'absolute';

            // Define as dimensões dos contêineres com base no tamanho da imagem
            keypointsContainer.style.position = 'relative';
            keypointsContainer.appendChild(image.cloneNode(true));
            keypointsContainer.appendChild(keypointsLayer);

            skeletoContainer.style.position = 'relative';
            skeletoContainer.appendChild(image.cloneNode(true));
            skeletoContainer.appendChild(skeletoLayer);

            heatmapContainer.style.position = 'relative';
            heatmapContainer.appendChild(image.cloneNode(true));
            heatmapContainer.appendChild(heatmapLayer);

            // Chama a função para processar a pose, passando os layers apropriados para cada função
            await estimatePose(image, keypointsLayer, skeletoLayer, heatmapLayer);
        };
    };
    reader.readAsDataURL(file);
});