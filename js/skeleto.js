export function renderSkeleto(results, img, scaledWidth, scaledHeight, container) {
    const keypointConnections = [
        [5, 6], // shoulders
        [5, 7], // left arm
        [7, 9], // left elbow to wrist
        [6, 8], // right arm
        [8, 10], // right elbow to wrist
        [5, 11], // upper torso to left hip
        [6, 12], // upper torso to right hip
        [11, 12], // hips connection
        [11, 13], // left hip to knee
        [13, 15], // left knee to foot
        [12, 14], // right hip to knee
        [14, 16], // right knee to foot
    ];

    container.innerHTML = ''; // Limpa o layer antes de adicionar novos elementos

    // Obtenha as dimensões reais da imagem renderizada no contêiner
    const renderedWidth = img.width;
    const renderedHeight = img.height;

    // Calcula a relação de escala entre a imagem original e a imagem renderizada
    const scaleX = renderedWidth / scaledWidth;
    const scaleY = renderedHeight / scaledHeight;

    results.forEach(({ keypoints }) => {
        const points = [];
        for (let i = 0; i < keypoints.length; i += 3) {
            const [x, y, point_score] = keypoints.slice(i, i + 3);
            if (point_score < 0.3) continue;

            points.push({ x: x * scaleX, y: y * scaleY });
        }

        keypointConnections.forEach(([start, end]) => {
            if (points[start] && points[end]) {
                const lineElement = document.createElement('div');
                lineElement.style.position = 'absolute';
                lineElement.style.backgroundColor = 'red'; // Cor da linha do esqueleto
                lineElement.style.height = '2px';

                const xDiff = points[end].x - points[start].x;
                const yDiff = points[end].y - points[start].y;
                const length = Math.sqrt(xDiff * xDiff + yDiff * yDiff);
                const angle = Math.atan2(yDiff, xDiff) * (180 / Math.PI);

                Object.assign(lineElement.style, {
                    left: `${points[start].x}px`,
                    top: `${points[start].y}px`,
                    width: `${length}px`,
                    transform: `rotate(${angle}deg)`,
                    transformOrigin: '0 0',
                });

                container.appendChild(lineElement);
            }
        });
    });
}