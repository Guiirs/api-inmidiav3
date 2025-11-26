// utils/periodTypes.js
/**
 * SISTEMA DE PERÍODOS UNIFICADO
 * 
 * Este arquivo define os tipos e constantes para o novo sistema de períodos padronizado.
 * Substitui a lógica antiga de bi-weeks/datas customizadas por um sistema unificado.
 * 
 * TIPOS DE PERÍODO:
 * - bi-week: Período quinzenal (14 dias) alinhado ao calendário de bi-semanas
 * - custom: Período customizado com datas escolhidas pelo usuário
 */

/**
 * Enum de tipos de período
 * @readonly
 * @enum {string}
 */
const PeriodType = {
    BI_WEEK: 'bi-week',
    CUSTOM: 'custom'
};

/**
 * Validador de tipo de período
 * @param {string} type - Tipo de período a validar
 * @returns {boolean} - True se válido
 */
const isValidPeriodType = (type) => {
    return Object.values(PeriodType).includes(type);
};

/**
 * Schema reutilizável para embed em models que usam períodos
 * Não use este schema diretamente - use createPeriodSchema() para criar uma instância
 */
const PeriodSchemaDefinition = {
    periodType: {
        type: String,
        enum: Object.values(PeriodType),
        required: [true, 'O tipo de período é obrigatório'],
        index: true
    },
    startDate: {
        type: Date,
        required: [true, 'A data de início é obrigatória'],
        index: true
    },
    endDate: {
        type: Date,
        required: [true, 'A data de fim é obrigatória'],
        index: true
    },
    // Apenas para periodType === 'bi-week'
    biWeekIds: [{
        type: String,
        sparse: true // Só existe se for bi-week
    }],
    // Referências aos documentos BiWeek (apenas para periodType === 'bi-week')
    biWeeks: [{
        type: require('mongoose').Schema.Types.ObjectId,
        ref: 'BiWeek',
        sparse: true
    }]
};

/**
 * Factory para criar um schema de período embedado
 * Use esta função para adicionar campos de período em seus models
 * 
 * @example
 * const AluguelSchema = new Schema({
 *   placa: { type: ObjectId, ref: 'Placa' },
 *   cliente: { type: ObjectId, ref: 'Cliente' },
 *   ...createPeriodSchema(), // Adiciona todos os campos de período
 *   status: { type: String, enum: ['ativo', 'cancelado'] }
 * });
 * 
 * @returns {Object} Schema fields para período
 */
const createPeriodSchema = () => {
    return { ...PeriodSchemaDefinition };
};

/**
 * Validador de período
 * Garante que as datas são válidas e que biWeekIds existe apenas quando necessário
 * 
 * @param {Object} periodData - Dados do período a validar
 * @param {string} periodData.periodType - Tipo do período
 * @param {Date} periodData.startDate - Data de início
 * @param {Date} periodData.endDate - Data de fim
 * @param {Array<string>} [periodData.biWeekIds] - IDs de bi-semanas (opcional)
 * @returns {Object} - { valid: boolean, errors: Array<string> }
 */
const validatePeriod = (periodData) => {
    const errors = [];

    if (!periodData) {
        errors.push('Dados de período não fornecidos');
        return { valid: false, errors };
    }

    // Validar tipo
    if (!isValidPeriodType(periodData.periodType)) {
        errors.push(`Tipo de período inválido: ${periodData.periodType}. Use '${PeriodType.BI_WEEK}' ou '${PeriodType.CUSTOM}'`);
    }

    // Validar datas
    if (!periodData.startDate) {
        errors.push('startDate é obrigatório');
    }
    if (!periodData.endDate) {
        errors.push('endDate é obrigatório');
    }

    if (periodData.startDate && periodData.endDate) {
        const start = new Date(periodData.startDate);
        const end = new Date(periodData.endDate);

        if (isNaN(start.getTime())) {
            errors.push('startDate inválido');
        }
        if (isNaN(end.getTime())) {
            errors.push('endDate inválido');
        }

        if (start >= end) {
            errors.push('startDate deve ser anterior a endDate');
        }
    }

    // Validar bi-week específico
    if (periodData.periodType === PeriodType.BI_WEEK) {
        if (!periodData.biWeekIds || periodData.biWeekIds.length === 0) {
            errors.push('biWeekIds é obrigatório para períodos do tipo bi-week');
        } else {
            // Validar formato dos IDs (YYYY-NN)
            const biWeekIdRegex = /^\d{4}-\d{2}$/;
            periodData.biWeekIds.forEach(id => {
                if (!biWeekIdRegex.test(id)) {
                    errors.push(`biWeekId inválido: ${id}. Use formato YYYY-NN (ex: 2025-02)`);
                }
            });
        }
    }

    // Para custom, biWeekIds não deve existir
    if (periodData.periodType === PeriodType.CUSTOM) {
        if (periodData.biWeekIds && periodData.biWeekIds.length > 0) {
            errors.push('biWeekIds não deve ser fornecido para períodos customizados');
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

/**
 * Normaliza dados de período de entrada
 * Converte formatos antigos para o novo padrão
 * 
 * @param {Object} input - Dados de entrada (pode estar no formato antigo)
 * @returns {Object} - Dados normalizados no novo formato
 */
const normalizePeriodInput = (input) => {
    const normalized = {
        periodType: null,
        startDate: null,
        endDate: null,
        biWeekIds: null,
        biWeeks: null
    };

    // Detectar formato antigo: bi_week_ids
    if (input.bi_week_ids && input.bi_week_ids.length > 0) {
        normalized.periodType = PeriodType.BI_WEEK;
        normalized.biWeekIds = input.bi_week_ids;
        // startDate e endDate serão calculados pelo serviço
    }
    // Detectar formato antigo: data_inicio/data_fim
    else if (input.data_inicio && input.data_fim) {
        // Se também tem bi_week_ids, é bi-week
        if (input.bi_weeks || input.bi_week_ids) {
            normalized.periodType = PeriodType.BI_WEEK;
            normalized.biWeekIds = input.bi_week_ids || [];
            normalized.biWeeks = input.bi_weeks || [];
        } else {
            normalized.periodType = PeriodType.CUSTOM;
        }
        normalized.startDate = new Date(input.data_inicio);
        normalized.endDate = new Date(input.data_fim);
    }
    // Formato novo
    else if (input.periodType) {
        normalized.periodType = input.periodType;
        normalized.startDate = input.startDate ? new Date(input.startDate) : null;
        normalized.endDate = input.endDate ? new Date(input.endDate) : null;
        normalized.biWeekIds = input.biWeekIds || null;
        normalized.biWeeks = input.biWeeks || null;
    }

    return normalized;
};

/**
 * Formata período para exibição
 * @param {Object} period - Objeto com dados de período
 * @returns {string} - String formatada (ex: "Bi-week: 2025-02, 2025-04" ou "Custom: 01/01/2025 - 31/01/2025")
 */
const formatPeriodDisplay = (period) => {
    if (!period) return 'Período não definido';

    const formatDate = (date) => {
        if (!date) return 'N/A';
        const d = new Date(date);
        return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    if (period.periodType === PeriodType.BI_WEEK) {
        const biWeeks = period.biWeekIds ? period.biWeekIds.join(', ') : 'N/A';
        return `Quinzenal: ${biWeeks}`;
    } else if (period.periodType === PeriodType.CUSTOM) {
        return `Personalizado: ${formatDate(period.startDate)} - ${formatDate(period.endDate)}`;
    }

    return 'Tipo de período desconhecido';
};

module.exports = {
    PeriodType,
    PeriodSchemaDefinition,
    createPeriodSchema,
    isValidPeriodType,
    validatePeriod,
    normalizePeriodInput,
    formatPeriodDisplay
};
