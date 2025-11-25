// Script para gerar automaticamente o calendário de Bi-Semanas 2026
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const BiWeek = require('../models/BiWeek');

async function generateCalendar() {
    try {
        console.log('🔌 Conectando ao MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado ao MongoDB.\n');
        
        // Remove Bi-Semanas existentes de 2026
        const deleted = await BiWeek.deleteMany({ ano: 2026 });
        console.log(`🗑️  Removidas ${deleted.deletedCount} Bi-Semanas de 2026.\n`);
        
        // Gera novo calendário
        console.log('⚙️  Gerando calendário de Bi-Semanas para 2026...');
        const generated = await BiWeek.generateCalendar(2026);
        console.log(`✅ Geradas ${generated.length} Bi-Semanas para 2026\n`);
        
        // Mostra as primeiras 5
        console.log('📋 Primeiras 5 Bi-Semanas:');
        generated.slice(0, 5).forEach(bw => {
            const inicio = bw.start_date.toISOString().split('T')[0];
            const fim = bw.end_date.toISOString().split('T')[0];
            console.log(`  ${bw.bi_week_id}: ${inicio} até ${fim}`);
        });
        
        console.log('\n✅ Calendário gerado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Conexão com MongoDB fechada.');
    }
}

generateCalendar();
