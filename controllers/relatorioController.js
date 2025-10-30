// controllers/relatorioController.js
const relatorioService = require('../services/relatorioService');
const logger = require('../config/logger');

/**
 * Obtém os dados agregados para o Dashboard.
 * (Esta função substitui a sua 'getDashboardSummary' e 'getPlacasPorRegiao' anteriores)
 */
exports.getDashboardData = async (req, res, next) => {
    try {
        // 🐞 CORREÇÃO: Lê 'empresaId' (camelCase) do token
        const empresaId = req.user.empresaId; 
        if (!empresaId) {
            logger.warn('[RelatorioController] getDashboardData: empresaId não encontrado no token.');
            return res.status(401).json({ message: 'Autorização inválida ou dados em falta.' });
        }
        
        logger.info(`[RelatorioController] Buscando dados do dashboard para empresa: ${empresaId}`);

        // Executa as consultas em paralelo para maior performance
        // Estas são as funções que o seu services/relatorioService.js (o que não usa classes) exporta
        const [
            faturamentoTotal,
            totalPlacas,
            placasDisponiveis,
            placasPorRegiao,
            faturamentoUltimosMeses
        ] = await Promise.all([
            // 🐞 CORREÇÃO: Passa 'empresaId' (camelCase) para o serviço
            relatorioService.getFaturamentoTotal(empresaId),
            relatorioService.getTotalPlacas(empresaId),
            relatorioService.getPlacasDisponiveis(empresaId),
            relatorioService.getPlacasPorRegiao(empresaId),
            relatorioService.getFaturamentoUltimosMeses(empresaId)
        ]);

        const dashboardData = {
            faturamentoTotal,
            totalPlacas,
            placasDisponiveis,
            placasPorRegiao,
            faturamentoUltimosMeses
        };

        res.status(200).json(dashboardData);
    } catch (error) {
        // O erro "relatorioService.getFaturamentoTotal is not a function"
        // acontecia porque o controller errado estava a chamar o service errado.
        // Esta implementação está alinhada.
        logger.error(`[RelatorioController] Erro ao buscar dados do dashboard: ${error.message}`, { stack: error.stack });
        next(error);
    }
};


/**
 * Obtém o faturamento total dentro de um período específico.
 * (Esta é a nova função para o seu novo relatório)
 */
exports.getFaturamentoPorPeriodo = async (req, res, next) => {
    try {
        const empresaId = req.user.empresaId; // 🐞 CORREÇÃO: 'empresaId' (camelCase)
        if (!empresaId) {
            logger.warn('[RelatorioController] getFaturamentoPorPeriodo: empresaId não encontrado no token.');
            return res.status(401).json({ message: 'Autorização inválida ou dados em falta.' });
        }

        const { dataInicio, dataFim } = req.query;
        logger.info(`[RelatorioController] Requisição getFaturamentoPorPeriodo para empresa: ${empresaId}. Datas: ${dataInicio} a ${dataFim}`);

        // --- VALIDAÇÃO CRÍTICA DAS DATAS ---
        if (!dataInicio || !dataFim) {
            logger.warn(`[RelatorioController] Datas em falta. Empresa: ${empresaId}`);
            return res.status(400).json({ message: 'Data de início e data de fim são obrigatórias.' });
        }
        const regexISO = /^\d{4}-\d{2}-\d{2}$/;
        if (!regexISO.test(dataInicio) || !regexISO.test(dataFim)) {
            logger.warn(`[RelatorioController] Formato de data inválido. Recebido: ${dataInicio}, ${dataFim}`);
            return res.status(400).json({ message: 'Formato de data inválido. Use AAAA-MM-DD.' });
        }
        const inicio = new Date(dataInicio);
        const fim = new Date(dataFim);
        if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
            logger.warn(`[RelatorioController] Data inválida (ex: dia ou mês inexistente). Recebido: ${dataInicio}, ${dataFim}`);
            return res.status(400).json({ message: 'Data inválida (ex: dia ou mês inexistente).' });
        }
        if (inicio > fim) {
            logger.warn(`[RelatorioController] Data de início (${dataInicio}) posterior à data de fim (${dataFim}).`);
            return res.status(400).json({ message: 'A data de início não pode ser posterior à data de fim.' });
        }
        // --- Fim da Validação ---

        // Chama o serviço (que iremos criar/corrigir no próximo passo)
        const resultado = await relatorioService.getFaturamentoPorPeriodo(
            empresaId, 
            dataInicio, 
            dataFim
        );
        
        logger.info(`[RelatorioController] Faturamento por período retornado com sucesso para empresa: ${empresaId}`);
        res.status(200).json(resultado);

    } catch (error) {
        logger.error(`[RelatorioController] Erro ao buscar faturamento por período: ${error.message}`, { stack: error.stack });
        next(error); 
    }
};