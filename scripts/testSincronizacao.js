// Script para testar o sistema de sincronização PI ↔ Aluguéis
require('dotenv').config();
const mongoose = require('mongoose');
const PISyncService = require('../services/piSyncService');
const PropostaInterna = require('../models/PropostaInterna');
const Aluguel = require('../models/Aluguel');

async function testarSincronizacao() {
    try {
        console.log('🔍 Conectando ao banco de dados...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado!\n');

        // Estatísticas antes
        const pisAntes = await PropostaInterna.countDocuments({
            status: { $in: ['em_andamento', 'concluida'] }
        });
        const alugueisAntes = await Aluguel.countDocuments({ tipo: 'pi' });

        console.log('📊 ANTES DA SINCRONIZAÇÃO:');
        console.log(`   PIs ativas: ${pisAntes}`);
        console.log(`   Aluguéis de PI: ${alugueisAntes}\n`);

        // Executar sincronização
        console.log('🔄 Executando sincronização...\n');
        await PISyncService.syncPIsWithAlugueis();
        
        console.log('\n🧹 Limpando aluguéis órfãos...\n');
        await PISyncService.cleanOrphanAlugueis();

        // Estatísticas depois
        const pisDepois = await PropostaInterna.countDocuments({
            status: { $in: ['em_andamento', 'concluida'] }
        });
        const alugueisDepois = await Aluguel.countDocuments({ tipo: 'pi' });

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 APÓS A SINCRONIZAÇÃO:');
        console.log(`   PIs ativas: ${pisDepois}`);
        console.log(`   Aluguéis de PI: ${alugueisDepois}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        await mongoose.connection.close();
        console.log('✅ Teste concluído!');
    } catch (error) {
        console.error('❌ Erro:', error.message);
        console.error(error.stack);
        await mongoose.connection.close();
        process.exit(1);
    }
}

testarSincronizacao();
