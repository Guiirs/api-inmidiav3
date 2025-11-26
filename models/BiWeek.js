// models/BiWeek.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Modelo para o calendário de Bi-Semanas (períodos de 14 dias) do mercado outdoor.
 * Numeradas de 2 em 2: 02, 04, 06, 08... até 52 (26 bi-semanas por ano).
 */
const BiWeekSchema = new Schema({
    // Identificador único da Bi-Semana (Ex: '2026-02', '2026-04', etc.)
    bi_week_id: {
        type: String,
        required: [true, 'O ID da Bi-Semana é obrigatório.'],
        unique: true,
        index: true,
        trim: true,
        // Formato esperado: 'YYYY-NN' onde NN é o número da bi-semana (02, 04, 06... 52)
        match: [/^\d{4}-\d{2}$/, 'Formato de bi_week_id inválido. Use YYYY-NN (ex: 2026-02)']
    },
    
    // Ano da Bi-Semana
    ano: {
        type: Number,
        required: [true, 'O ano é obrigatório.'],
        index: true,
        min: [2020, 'O ano deve ser 2020 ou posterior.'],
        max: [2100, 'Ano inválido.']
    },
    
    // Número sequencial da Bi-Semana no ano (02, 04, 06... 52 - numeração de 2 em 2)
    numero: {
        type: Number,
        required: [true, 'O número da Bi-Semana é obrigatório.'],
        min: [2, 'O número da Bi-Semana deve ser entre 2 e 52.'],
        max: [52, 'O número da Bi-Semana deve ser entre 2 e 52.'],
        validate: {
            validator: function(v) {
                return v % 2 === 0; // Deve ser par
            },
            message: 'O número da bi-semana deve ser par (02, 04, 06... 52)'
        }
    },
    
    // Data de início da Bi-Semana (00:00:00 UTC)
    start_date: {
        type: Date,
        required: [true, 'A data de início é obrigatória.'],
        index: true
    },
    
    // Data de término da Bi-Semana (23:59:59 UTC)
    end_date: {
        type: Date,
        required: [true, 'A data de término é obrigatória.'],
        index: true
    },
    
    // Descrição opcional (Ex: "1ª Quinzena de Janeiro", "Início do Ano")
    descricao: {
        type: String,
        trim: true,
        maxlength: [200, 'A descrição não pode ter mais de 200 caracteres.']
    },
    
    // Flag para indicar se esta Bi-Semana está ativa/disponível para uso
    ativo: {
        type: Boolean,
        default: true,
        index: true
    }
}, { 
    timestamps: true // Adiciona createdAt e updatedAt automaticamente
});

// ========== ÍNDICES COMPOSTOS ==========

// Índice composto para garantir que não haja Bi-Semanas duplicadas no mesmo ano
BiWeekSchema.index({ ano: 1, numero: 1 }, { unique: true });

// Índice composto para buscas por período de datas
BiWeekSchema.index({ start_date: 1, end_date: 1 });

// ========== VALIDAÇÕES CUSTOMIZADAS ==========

// Validação: end_date deve ser posterior a start_date
BiWeekSchema.pre('save', function(next) {
    if (this.end_date <= this.start_date) {
        return next(new Error('A data de término deve ser posterior à data de início.'));
    }
    
    // Validação: Bi-Semana deve ter aproximadamente 14 dias (tolerância de ±2 dias)
    const diffMs = this.end_date - this.start_date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    
    if (diffDays < 12 || diffDays > 16) {
        return next(new Error(`Uma Bi-Semana deve ter aproximadamente 14 dias. Período atual: ${diffDays} dias.`));
    }
    
    next();
});

// ========== MÉTODOS ESTÁTICOS ==========

/**
 * Busca a Bi-Semana que contém uma data específica
 * @param {Date} date - Data a ser verificada
 * @returns {Promise<object|null>} - Bi-Semana encontrada ou null
 */
BiWeekSchema.statics.findByDate = function(date) {
    return this.findOne({
        start_date: { $lte: date },
        end_date: { $gte: date },
        ativo: true
    }).exec();
};

/**
 * Busca todas as Bi-Semanas de um ano específico
 * @param {number} year - Ano desejado
 * @returns {Promise<Array>} - Array de Bi-Semanas
 */
BiWeekSchema.statics.findByYear = function(year) {
    return this.find({ ano: year, ativo: true })
               .sort({ numero: 1 })
               .exec();
};

/**
 * Valida se um período (start_date, end_date) está alinhado com Bi-Semanas
 * @param {Date} startDate - Data de início do período
 * @param {Date} endDate - Data de fim do período
 * @returns {Promise<object>} - { valid: Boolean, message: String, biWeeks: Array }
 */
BiWeekSchema.statics.validatePeriod = async function(startDate, endDate) {
    const biWeeksInRange = await this.find({
        $or: [
            // Bi-Semana começa dentro do período
            { start_date: { $gte: startDate, $lte: endDate } },
            // Bi-Semana termina dentro do período
            { end_date: { $gte: startDate, $lte: endDate } },
            // Período está completamente dentro de uma Bi-Semana
            { start_date: { $lte: startDate }, end_date: { $gte: endDate } }
        ],
        ativo: true
    }).sort({ start_date: 1 }).exec();
    
    if (biWeeksInRange.length === 0) {
        return {
            valid: false,
            message: 'Nenhuma Bi-Semana encontrada para o período especificado.',
            biWeeks: []
        };
    }
    
    // Verifica se as datas coincidem exatamente com os limites das Bi-Semanas
    const firstBiWeek = biWeeksInRange[0];
    const lastBiWeek = biWeeksInRange[biWeeksInRange.length - 1];
    
    const startAligned = startDate.getTime() === firstBiWeek.start_date.getTime();
    const endAligned = endDate.getTime() === lastBiWeek.end_date.getTime();
    
    if (startAligned && endAligned) {
        return {
            valid: true,
            message: `Período válido: ${biWeeksInRange.length} Bi-Semana(s) completa(s).`,
            biWeeks: biWeeksInRange
        };
    }
    
    return {
        valid: false,
        message: 'As datas não estão alinhadas com os limites das Bi-Semanas cadastradas.',
        biWeeks: biWeeksInRange,
        suggestion: {
            start_date: firstBiWeek.start_date,
            end_date: lastBiWeek.end_date
        }
    };
};

/**
 * Gera o calendário de Bi-Semanas para um ano específico
 * @param {number} year - Ano para gerar o calendário
 * @param {string|Date} customStartDate - Data de início customizada (opcional)
 * @returns {Array} - Array de Bi-Semanas geradas (não salvas)
 */
BiWeekSchema.statics.generateCalendar = function(year, customStartDate = null) {
    const biWeeks = [];
    
    // Define data de início: customizada ou padrão (1º de Janeiro)
    let startOfYear;
    if (customStartDate) {
        startOfYear = new Date(customStartDate);
        startOfYear.setUTCHours(0, 0, 0, 0);
    } else {
        startOfYear = new Date(Date.UTC(year, 0, 1)); // 1º de Janeiro
    }
    
    // 26 bi-semanas de 14 dias cada (numeradas 02, 04, 06... 52)
    for (let i = 0; i < 26; i++) {
        const startDate = new Date(startOfYear);
        startDate.setUTCDate(startOfYear.getUTCDate() + (i * 14));
        
        const endDate = new Date(startDate);
        endDate.setUTCDate(startDate.getUTCDate() + 13); // Soma 13 dias (dia 0 + 13 = 14 dias total)
        endDate.setUTCHours(23, 59, 59, 999);
        
        // Numeração de 2 em 2: 02, 04, 06, 08... 52
        const numero = (i + 1) * 2;
        const bi_week_id = `${year}-${String(numero).padStart(2, '0')}`;
        
        biWeeks.push({
            bi_week_id,
            ano: year,
            numero,
            start_date: startDate,
            end_date: endDate,
            descricao: `Bi-Semana ${numero} de ${year}`,
            ativo: true
        });
    }
    
    return biWeeks;
};

// ========== MÉTODO DE INSTÂNCIA ==========

/**
 * Retorna o período da Bi-Semana formatado para exibição
 */
BiWeekSchema.methods.getFormattedPeriod = function() {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    const start = this.start_date.toLocaleDateString('pt-BR', options);
    const end = this.end_date.toLocaleDateString('pt-BR', options);
    return `${start} até ${end}`;
};

module.exports = mongoose.model('BiWeek', BiWeekSchema);
