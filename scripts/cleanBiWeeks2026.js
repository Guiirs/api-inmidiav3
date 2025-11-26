// scripts/cleanBiWeeks2026.js
require('dotenv').config();

const mongoose = require('mongoose');
const BiWeek = require('../models/BiWeek');
const logger = require('../config/logger');

async function cleanAndRegenerate() {
    try {
        const mongoUri = process.env.MONGODB_URI || process.env.DB_MONGO_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI não definido no .env');
        }

        await mongoose.connect(mongoUri);
        logger.info('📌 Conectado ao MongoDB');

        // Deleta todas as bi-semanas de 2026
        const deleteResult = await BiWeek.deleteMany({ ano: 2026 });
        logger.info(`🗑️  Deletadas ${deleteResult.deletedCount} bi-semanas de 2026`);

        // Regenera apenas as 26 corretas
        const biWeeksData = BiWeek.generateCalendar(2026, new Date('2025-12-29'));
        logger.info(`📊 Gerando ${biWeeksData.length} bi-semanas corretas`);

        let created = 0;
        for (const data of biWeeksData) {
            await BiWeek.create(data);
            created++;
            logger.debug(`✅ Criada: ${data.bi_week_id}`);
        }

        logger.info(`🎉 Sucesso! ${created} bi-semanas criadas para 2026`);

        // Verifica o resultado
        const count = await BiWeek.countDocuments({ ano: 2026 });
        const biWeeks = await BiWeek.find({ ano: 2026 }).sort('numero');
        logger.info(`📅 Total: ${count} bi-semanas`);
        logger.info(`📋 Números: ${biWeeks.map(b => b.numero).join(', ')}`);

        process.exit(0);
    } catch (error) {
        logger.error(`❌ Erro: ${error.message}`);
        process.exit(1);
    }
}

cleanAndRegenerate();
