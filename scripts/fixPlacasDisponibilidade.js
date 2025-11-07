// scripts/fixPlacasDisponibilidade.js
/**
 * Script de migração para corrigir a disponibilidade das placas.
 * Este script marca todas as placas como 'disponivel: true' (exceto as que estão em aluguéis ativos).
 * 
 * Contexto:
 * - O campo 'disponivel' deve ser usado APENAS para manutenção manual
 * - PIs não devem modificar o campo 'disponivel'
 * - Apenas aluguéis ativos devem marcar placas como indisponíveis
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Placa = require('../models/Placa');
const Aluguel = require('../models/Aluguel');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/inmidia';

async function fixPlacasDisponibilidade() {
    try {
        console.log('🔄 Conectando ao MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado ao MongoDB!');

        const hoje = new Date();

        // 1. Buscar todas as placas
        console.log('\n📊 Buscando todas as placas...');
        const todasPlacas = await Placa.find({}).select('_id numero_placa disponivel').lean();
        console.log(`✅ Encontradas ${todasPlacas.length} placas no total.`);

        // 2. Buscar placas em aluguéis ativos
        console.log('\n🔍 Verificando aluguéis ativos...');
        const alugueisAtivos = await Aluguel.find({
            data_inicio: { $lte: hoje },
            data_fim: { $gte: hoje }
        }).select('placa').lean();

        const placasEmAluguel = new Set(alugueisAtivos.map(a => a.placa.toString()));
        console.log(`✅ ${placasEmAluguel.size} placas estão em aluguel ativo.`);

        // 3. Contar placas com status incorreto
        const placasIndisponiveis = todasPlacas.filter(p => p.disponivel === false);
        const placasIndisponiveisIndevidamente = placasIndisponiveis.filter(p => !placasEmAluguel.has(p._id.toString()));

        console.log(`\n📊 Status atual:`);
        console.log(`   - Total de placas: ${todasPlacas.length}`);
        console.log(`   - Placas marcadas como indisponíveis: ${placasIndisponiveis.length}`);
        console.log(`   - Placas em aluguel ativo: ${placasEmAluguel.size}`);
        console.log(`   - Placas marcadas como indisponíveis INDEVIDAMENTE: ${placasIndisponiveisIndevidamente.length}`);

        if (placasIndisponiveisIndevidamente.length === 0) {
            console.log('\n✅ Nenhuma correção necessária! Todas as placas estão com status correto.');
            await mongoose.disconnect();
            return;
        }

        // 4. Perguntar confirmação (em produção, sempre cuidado!)
        console.log(`\n⚠️  Serão corrigidas ${placasIndisponiveisIndevidamente.length} placas.`);
        console.log('   Placas que serão marcadas como disponíveis:');
        placasIndisponiveisIndevidamente.slice(0, 10).forEach(p => {
            console.log(`   - ${p.numero_placa} (ID: ${p._id})`);
        });
        if (placasIndisponiveisIndevidamente.length > 10) {
            console.log(`   ... e mais ${placasIndisponiveisIndevidamente.length - 10} placas.`);
        }

        // 5. Executar correção
        console.log('\n🔧 Aplicando correções...');
        
        const idsParaCorrigir = placasIndisponiveisIndevidamente.map(p => p._id);
        
        const result = await Placa.updateMany(
            { _id: { $in: idsParaCorrigir } },
            { $set: { disponivel: true } }
        );

        console.log(`\n✅ Correção concluída!`);
        console.log(`   - Placas atualizadas: ${result.modifiedCount}`);
        console.log(`   - Placas que permaneceram indisponíveis (em aluguel): ${placasEmAluguel.size}`);

        // 6. Verificar resultado final
        console.log('\n🔍 Verificando resultado final...');
        const placasAposCorrecao = await Placa.countDocuments({ disponivel: false });
        console.log(`✅ Placas indisponíveis após correção: ${placasAposCorrecao}`);
        
        if (placasAposCorrecao === placasEmAluguel.size) {
            console.log('✅ Perfeito! Apenas placas em aluguel estão marcadas como indisponíveis.');
        } else {
            console.log('⚠️  Atenção: O número não corresponde exatamente. Verifique manualmente.');
        }

        await mongoose.disconnect();
        console.log('\n✅ Script concluído com sucesso!');

    } catch (error) {
        console.error('❌ Erro ao executar script:', error);
        process.exit(1);
    }
}

// Executar script
fixPlacasDisponibilidade();
