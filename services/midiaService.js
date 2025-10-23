// services/mediaService.js
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // Para gerar nomes únicos se necessário

class MediaService {
    constructor() {
        // Define o diretório base para os uploads públicos
        this.uploadDir = path.join(__dirname, '..', 'public', 'uploads');
        // Define o caminho base da URL para aceder aos uploads
        this.baseUrl = '/uploads/';
    }

    /**
     * Salva um ficheiro carregado no diretório de uploads.
     * @param {object} fileObject - O objeto do ficheiro fornecido pelo multer (req.file).
     * @returns {Promise<object>} - Uma promessa que resolve para um objeto com o caminho relativo do ficheiro salvo (path).
     * @throws {Error} - Lança um erro se o objeto do ficheiro for inválido.
     */
    async saveImage(fileObject) {
        if (!fileObject || !fileObject.path) {
            throw new Error('Objeto de ficheiro inválido fornecido ao MediaService.');
        }

        // O multer já salvou o ficheiro com um nome único no diretório de destino
        const originalFilePath = fileObject.path; // Caminho completo onde o multer salvou
        const filename = fileObject.filename; // Nome do ficheiro gerado pelo multer

        // O caminho relativo que será guardado na base de dados e usado na URL
        const relativePath = `${this.baseUrl}${filename}`; // Ex: /uploads/imagem-timestamp-random.jpg

        console.log(`MediaService: Ficheiro salvo em ${originalFilePath}, caminho relativo: ${relativePath}`);

        // Por enquanto, apenas retornamos o caminho relativo.
        // Nenhuma movimentação de ficheiro é necessária se o multer já salva no destino final.
        return {
            path: relativePath,
            filename: filename // Pode ser útil retornar o nome do ficheiro também
        };
    }

    /**
     * Apaga um ficheiro do sistema de ficheiros com base no seu caminho relativo.
     * @param {string} relativePath - O caminho relativo do ficheiro (ex: /uploads/imagem.jpg).
     * @returns {Promise<void>}
     */
    async deleteImage(relativePath) {
        if (!relativePath) return;

        try {
            // Extrai o nome do ficheiro do caminho relativo
            const filename = path.basename(relativePath);
            // Constrói o caminho completo no sistema de ficheiros
            const fullPath = path.join(this.uploadDir, filename);

            await fs.unlink(fullPath);
            console.log(`MediaService: Ficheiro apagado com sucesso: ${fullPath}`);
        } catch (err) {
            // Ignora o erro se o ficheiro não existir (ENOENT), mas loga outros erros
            if (err.code !== 'ENOENT') {
                console.error(`MediaService: Erro ao apagar o ficheiro ${relativePath}:`, err);
                // Considerar logar com Winston aqui
            }
        }
    }
}

// Exporta uma instância única (singleton) do serviço
module.exports = new MediaService();