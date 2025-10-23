// services/publicApiService.js

class PublicApiService {
    constructor(db) {
        this.db = db;
    }

    /**
     * Obtém todas as placas disponíveis para uma empresa específica.
     * @param {number} empresa_id - O ID da empresa.
     * @returns {Promise<Array>} - Uma promessa que resolve para um array de placas.
     */
    async getAvailablePlacas(empresa_id) {
        if (!empresa_id) {
            throw new Error('O ID da empresa é obrigatório.');
        }

        return await this.db('placas')
            .join('regioes', 'placas.regiao_id', 'regioes.id')
            .select(
                'placas.numero_placa',
                'placas.coordenadas',
                'placas.nomeDaRua',
                'placas.tamanho',
                'placas.imagem',
                'regioes.nome as regiao'
            )
            .where('placas.empresa_id', empresa_id)
            .andWhere('placas.disponivel', true);
    }
}

module.exports = PublicApiService;