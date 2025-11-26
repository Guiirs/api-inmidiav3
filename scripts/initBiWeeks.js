// scripts/initBiWeeks.js
const BiWeek = require('../models/BiWeek');
const logger = require('../config/logger');

/**
 * Inicializa automaticamente as bi-semanas para os próximos anos
 * se não existirem no banco de dados
 */
async function initBiWeeks() {
    try {
        logger.info('[BiWeek Init] 🔄 Verificando bi-semanas no banco de dados...');

        const currentYear = new Date().getFullYear();
        const yearsToGenerate = [currentYear, currentYear + 1, currentYear + 2]; // Ano atual + 2 anos seguintes

        for (const year of yearsToGenerate) {
            // Verifica se já existem bi-semanas para este ano
            const existingCount = await BiWeek.countDocuments({ ano: year });

            if (existingCount > 0) {
                logger.info(`[BiWeek Init] ✅ Ano ${year} já possui ${existingCount} bi-semanas cadastradas.`);
                continue;
            }

            logger.info(`[BiWeek Init] 📅 Gerando bi-semanas para o ano ${year}...`);

            // Gera as bi-semanas usando o método estático do model
            const biWeeksData = BiWeek.generateCalendar(year);

            // Insere todas de uma vez
            const inserted = await BiWeek.insertMany(biWeeksData, { ordered: false });

            logger.info(`[BiWeek Init] ✅ ${inserted.length} bi-semanas criadas para o ano ${year}`);
            
            // Log das primeiras 3 bi-semanas para conferência
            const primeiras = inserted.slice(0, 3);
            primeiras.forEach(bw => {
                logger.debug(`  📍 ${bw.bi_week_id}: ${formatDate(bw.start_date)} a ${formatDate(bw.end_date)}`);
            });
            
            if (inserted.length > 3) {
                logger.debug(`  ... e mais ${inserted.length - 3} bi-semanas`);
            }
        }

        logger.info('[BiWeek Init] 🎉 Inicialização de bi-semanas concluída com sucesso!');
        return true;

    } catch (error) {
        // Se o erro for de duplicação (código 11000), ignoramos
        if (error.code === 11000) {
            logger.info('[BiWeek Init] ℹ️ Algumas bi-semanas já existiam (duplicadas ignoradas).');
            return true;
        }

        logger.error(`[BiWeek Init] ❌ Erro ao inicializar bi-semanas: ${error.message}`);
        logger.error(error.stack);
        
        // Não falha o servidor por causa disso, apenas avisa
        logger.warn('[BiWeek Init] ⚠️ Servidor continuará sem bi-semanas pré-geradas.');
        return false;
    }
}

/**
 * Formata data para log
 */
function formatDate(date) {
    return new Date(date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/**
 * Verifica e retorna estatísticas das bi-semanas
 */
async function getBiWeekStats() {
    try {
        const currentYear = new Date().getFullYear();
        
        const stats = {
            total: await BiWeek.countDocuments(),
            ativas: await BiWeek.countDocuments({ ativo: true }),
            porAno: {}
        };

        // Conta por ano
        for (let year = currentYear - 1; year <= currentYear + 2; year++) {
            const count = await BiWeek.countDocuments({ ano: year });
            if (count > 0) {
                stats.porAno[year] = count;
            }
        }

        return stats;

    } catch (error) {
        logger.error(`[BiWeek Init] Erro ao obter estatísticas: ${error.message}`);
        return null;
    }
}

module.exports = {
    initBiWeeks,
    getBiWeekStats
};
