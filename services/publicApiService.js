// services/publicApiService.js
const Placa = require('../models/Placa'); // Importa o modelo Placa Mongoose
const Regiao = require('../models/Regiao'); // Importa o modelo Regiao para populate
const mongoose = require('mongoose'); // Importa mongoose para ObjectId

class PublicApiService {
    constructor() {}

    /**
     * Obtém todas as placas disponíveis para uma empresa específica.
     * @param {string | mongoose.Types.ObjectId} empresa_id - O ID da empresa.
     * @returns {Promise<Array>} - Uma promessa que resolve para um array de placas disponíveis (objetos simples).
     */
    async getAvailablePlacas(empresa_id) {
        if (!empresa_id) {
            throw new Error('O ID da empresa é obrigatório.');
        }

        // Busca as placas disponíveis
        const placasDisponiveis = await Placa.find({
                // Converte para ObjectId para garantir a correspondência correta
                empresa: new mongoose.Types.ObjectId(empresa_id),
                disponivel: true
            })
            .populate('regiao', 'nome') // Popula nome da região
            // Seleciona campos e exclui _id e __v
            .select('numero_placa coordenadas nomeDaRua tamanho imagem regiao -_id -__v')
            .lean() // <-- Adicionado .lean() para retornar objetos simples
            .exec();

        // Mapeia o resultado para formatar o campo 'regiao'
        return placasDisponiveis.map(placa => ({
            numero_placa: placa.numero_placa,
            coordenadas: placa.coordenadas,
            nomeDaRua: placa.nomeDaRua,
            tamanho: placa.tamanho,
            imagem: placa.imagem,
            // Acessa o nome da região populada (que é um objeto simples devido ao .lean())
            regiao: placa.regiao ? placa.regiao.nome : null
        }));
    }
}

module.exports = PublicApiService;