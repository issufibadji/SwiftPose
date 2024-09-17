export function renderKeypoints(results, img, scaledWidth, scaledHeight, container) {
    const colors = ['red', 'yellow'];
    container.innerHTML = ''; // Limpa o layer antes de adicionar novos elementos

    // Obtenha as dimensões reais da imagem renderizada no contêiner
    const renderedWidth = img.width;
    const renderedHeight = img.height;

    // Calcula a relação de escala entre a imagem original e a imagem renderizada
    const scaleX = renderedWidth / scaledWidth;
    const scaleY = renderedHeight / scaledHeight;

    results.forEach(({ keypoints }, index) => {
        for (let i = 0; i < keypoints.length; i += 3) {
            const [x, y, point_score] = keypoints.slice(i, i + 3);
            if (point_score < 0.3) continue; // Desconsidera pontos com baixa confiança

            // Escala as coordenadas dos pontos para o tamanho da imagem renderizada
            const scaledX = x * scaleX;
            const scaledY = y * scaleY;

            // Desenhar o ponto
            const keypointElement = document.createElement('div');
            keypointElement.className = 'keypoint';
            Object.assign(keypointElement.style, {
                left: `${scaledX}px`,
                top: `${scaledY}px`,
                width: '6px',
                height: '6px',
                backgroundColor: colors[index % colors.length],
                position: 'absolute',
                borderRadius: '50%',
            });

            // Desenhar o número do ponto-chave
            const textElement = document.createElement('div');
            textElement.innerText = i / 3; // Índice do ponto-chave
            Object.assign(textElement.style, {
                left: `${scaledX + 10}px`, // Pequeno deslocamento para não sobrepor o ponto
                top: `${scaledY}px`,
                color: 'yellow',
                position: 'absolute',
                fontSize: '12px',
            });

            container.appendChild(keypointElement);
            container.appendChild(textElement);
        }
    });
}