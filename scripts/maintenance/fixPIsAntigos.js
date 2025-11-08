// scripts/fixPIsAntigos.js
// Script para criar aluguéis para PIs antigas que não têm aluguéis
require('dotenv').config();
const mongoose = require('mongoose');
const PropostaInterna = require('../models/PropostaInterna');
const Aluguel = require('../models/Aluguel');
const Cliente = require('../models/Cliente');
const Placa = require('../models/Placa');

async function fixPIsAntigos() {
    try {
        console.log('🔍 Conectando ao banco de dados...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado!\n');

        // Buscar todas as PIs ativas
        const pisAtivas = await PropostaInterna.find({ 
            status: 'em_andamento' 
        }).lean();

        console.log(`📊 Total de PIs ativas: ${pisAtivas.length}\n`);

        let pisCorrigidas = 0;
        let alugueisCreated = 0;

        for (const pi of pisAtivas) {
            if (!pi.placas || pi.placas.length === 0) {
                console.log(`⏭️  PI ${pi._id} não tem placas, pulando...`);
                continue;
            }

            // Verificar se já existem aluguéis
            const alugueisExistentes = await Aluguel.countDocuments({
                cliente: pi.cliente,
                placa: { $in: pi.placas },
                data_inicio: pi.dataInicio,
                data_fim: pi.dataFim
            });

            if (alugueisExistentes === pi.placas.length) {
                console.log(`✅ PI ${pi._id} já tem todos os aluguéis (${alugueisExistentes}/${pi.placas.length})`);
                continue;
            }

            console.log(`\n🔧 Corrigindo PI ${pi._id}...`);
            console.log(`   Cliente: ${pi.cliente}`);
            console.log(`   Placas: ${pi.placas.length}`);
            console.log(`   Aluguéis existentes: ${alugueisExistentes}`);
            console.log(`   Período: ${pi.dataInicio?.toLocaleDateString()} até ${pi.dataFim?.toLocaleDateString()}`);

            // Criar aluguéis para todas as placas
            const alugueis = pi.placas.map(placaId => ({
                placa: placaId,
                cliente: pi.cliente,
                empresa: pi.empresa,
                data_inicio: pi.dataInicio,
                data_fim: pi.dataFim
            }));

            try {
                // Remove aluguéis antigos se houver algum inconsistente
                if (alugueisExistentes > 0) {
                    await Aluguel.deleteMany({
                        cliente: pi.cliente,
                        placa: { $in: pi.placas },
                        data_inicio: pi.dataInicio,
                        data_fim: pi.dataFim
                    });
                    console.log(`   🗑️  Removidos ${alugueisExistentes} aluguéis inconsistentes`);
                }

                const result = await Aluguel.insertMany(alugueis);
                console.log(`   ✅ Criados ${result.length} aluguéis!`);
                
                pisCorrigidas++;
                alugueisCreated += result.length;
            } catch (error) {
                console.error(`   ❌ Erro ao criar aluguéis: ${error.message}`);
            }
        }

        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📊 RESUMO:`);
        console.log(`   PIs corrigidas: ${pisCorrigidas}`);
        console.log(`   Aluguéis criados: ${alugueisCreated}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

        await mongoose.connection.close();
        console.log('✅ Correção concluída!');
    } catch (error) {
        console.error('❌ Erro:', error.message);
        console.error(error.stack);
        await mongoose.connection.close();
        process.exit(1);
    }
}

fixPIsAntigos();