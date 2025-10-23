// InMidia/backend/services/relatorioService.js

class RelatorioService {
    constructor(db) {
        this.db = db;
    }

    async placasPorRegiao(empresa_id) {
        return this.db('placas')
            .join('regioes', 'placas.regiao_id', 'regioes.id')
            .where('placas.empresa_id', empresa_id)
            .groupBy('regioes.nome')
            .select('regioes.nome as regiao')
            .count('placas.id as total_placas');
    }

    async getDashboardSummary(empresa_id) {
        const totalPlacas = await this.db('placas')
            .where({ empresa_id })
            .count('id as total')
            .first();

        const placasDisponiveis = await this.db('placas')
            .where({ empresa_id, disponivel: true })
            .count('id as total')
            .first();

        // --- CORREÇÃO APLICADA AQUI ---
        // A consulta foi reescrita para ser compatível com diferentes bases de dados
        // e para lidar com o caso de não haver placas.
        const regiaoPrincipalResult = await this.db('placas')
            .select('regioes.nome')
            .join('regioes', 'placas.regiao_id', 'regioes.id')
            .where('placas.empresa_id', empresa_id)
            .groupBy('regioes.nome')
            .orderByRaw('count(placas.id) desc')
            .limit(1)
            .first();

        return {
            totalPlacas: parseInt(totalPlacas.total) || 0,
            placasDisponiveis: parseInt(placasDisponiveis.total) || 0,
            regiaoPrincipal: regiaoPrincipalResult ? regiaoPrincipalResult.nome : 'N/A',
        };
    }
}

module.exports = RelatorioService;