// services/publicApiService.js
const Placa = require('../models/Placa'); // Importa o modelo Placa Mongoose
const Regiao = require('../models/Regiao'); // Importa o modelo Regiao para populate

class PublicApiService {
    // constructor não precisa mais do 'db'
    constructor() {}

    /**
     * Obtém todas as placas disponíveis para uma empresa específica.
     * @param {string | mongoose.Types.ObjectId} empresa_id - O ID da empresa.
     * @returns {Promise<Array>} - Uma promessa que resolve para um array de placas disponíveis.
     */
    async getAvailablePlacas(empresa_id) {
        if (!empresa_id) {
            // Lança um erro se o ID da empresa não for fornecido
            throw new Error('O ID da empresa é obrigatório.');
        }

        // Busca as placas usando Mongoose
        const placasDisponiveis = await Placa.find({
                empresa: empresa_id,   // Filtra pela empresa (ObjectId)
                disponivel: true       // Filtra apenas as disponíveis
            })
            // Popula o campo 'regiao', selecionando apenas o campo 'nome' do documento Regiao
            .populate('regiao', 'nome')
            // Seleciona os campos desejados do documento Placa
            // Exclui o _id e __v por padrão, inclui os outros listados
            .select('numero_placa coordenadas nomeDaRua tamanho imagem regiao -_id')
            .exec(); // Executa a query

        // Mapeia o resultado para incluir o nome da região no nível superior (opcional, mas igual ao Knex)
        return placasDisponiveis.map(placa => ({
            numero_placa: placa.numero_placa,
            coordenadas: placa.coordenadas,
            nomeDaRua: placa.nomeDaRua,
            tamanho: placa.tamanho,
            imagem: placa.imagem,
            regiao: placa.regiao ? placa.regiao.nome : null // Extrai o nome da região populada
        }));
    }
}

module.exports = PublicApiService;