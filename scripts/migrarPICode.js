// Script para migrar PIs antigas sem pi_code
require('dotenv').config();
const mongoose = require('mongoose');
const PropostaInterna = require('../models/PropostaInterna');
const Aluguel = require('../models/Aluguel');

function generatePICode() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `PI-${timestamp}-${random}`.toUpperCase();
}

async function migrarPIsAntigas() {
    try {
        console.log('🔍 Conectando ao banco de dados...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado!\n');

        // Buscar PIs sem pi_code
        const pisSemCode = await PropostaInterna.find({
            $or: [
                { pi_code: { $exists: false } },
                { pi_code: null },
                { pi_code: '' }
            ]
        }).lean();

        if (pisSemCode.length === 0) {
            console.log('✅ Todas as PIs já têm pi_code!');
            await mongoose.connection.close();
            return;
        }

        console.log(`📊 Encontradas ${pisSemCode.length} PIs sem pi_code\n`);

        let migradas = 0;
        let alugueisAtualizados = 0;

        for (const pi of pisSemCode) {
            const piCode = generatePICode();
            console.log(`🔧 Migrando PI ${pi._id} → ${piCode}`);

            // Atualizar PI com o novo código
            await PropostaInterna.updateOne(
                { _id: pi._id },
                { $set: { pi_code: piCode } }
            );

            // Buscar e atualizar aluguéis desta PI
            const alugueisResult = await Aluguel.updateMany(
                {
                    cliente: pi.cliente,
                    empresa: pi.empresa,
                    placa: { $in: pi.placas || [] },
                    data_inicio: pi.dataInicio,
                    data_fim: pi.dataFim,
                    tipo: { $in: ['pi', null] } // Inclui aluguéis sem tipo definido
                },
                {
                    $set: {
                        pi_code: piCode,
                        proposta_interna: pi._id,
                        tipo: 'pi'
                    }
                }
            );

            console.log(`   ✅ PI atualizada, ${alugueisResult.modifiedCount} aluguéis vinculados`);
            
            migradas++;
            alugueisAtualizados += alugueisResult.modifiedCount;
        }

        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📊 RESUMO DA MIGRAÇÃO:`);
        console.log(`   PIs migradas: ${migradas}`);
        console.log(`   Aluguéis atualizados: ${alugueisAtualizados}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

        await mongoose.connection.close();
        console.log('✅ Migração concluída!');
    } catch (error) {
        console.error('❌ Erro:', error.message);
        console.error(error.stack);
        await mongoose.connection.close();
        process.exit(1);
    }
}

migrarPIsAntigas();
