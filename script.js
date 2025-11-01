// script.js
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('placa-form');
    const statusMessage = document.getElementById('status-message');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        // 1. Coleta os dados do formulário
        const coordenadas = document.getElementById('coordenadas').value;
        const nomeDaRua = document.getElementById('nomeDaRua').value;
        const tamanho = document.getElementById('tamanho').value;
        const imagem = document.getElementById('imagem').value;

        const novaPlaca = {
            coordenadas,
            nomeDaRua,
            tamanho,
            imagem: imagem || null // Se o campo estiver vazio, envia null
        };

        try {
            // 2. Envia os dados para a API usando o método POST
            const response = await fetch('http://localhost:3000/placas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(novaPlaca)
            });

            // 3. Processa a resposta da API
            const data = await response.json();

            if (response.ok) {
                statusMessage.textContent = '✅ Placa adicionada com sucesso!';
                statusMessage.style.color = 'green';
                form.reset(); // Limpa o formulário
            } else {
                // Se a resposta não for OK (ex: 400, 409), exibe a mensagem de erro da API
                statusMessage.textContent = `❌ Erro: ${data.message}`;
                statusMessage.style.color = 'red';
            }
        } catch (error) {
            // Se houver um erro de rede ou na requisição
            statusMessage.textContent = `❌ Erro de conexão com a API. Verifique se o servidor está rodando.`;
            statusMessage.style.color = 'red';
            console.error('Erro:', error);
        }
    });
});