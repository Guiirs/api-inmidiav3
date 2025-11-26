// Script para testar se PIs estão criando aluguéis
require('dotenv').config();
const mongoose = require('mongoose');
const PropostaInterna = require('../models/PropostaInterna');
const Aluguel = require('../models/Aluguel');
const Cliente = require('../models/Cliente');
const Placa = require('../models/Placa');

async function verificarAlugueisPI() {
    try {
        console.log('🔍 Conectando ao banco de dados...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado!\n');

        // Buscar todas as PIs ativas
        const pisAtivas = await PropostaInterna.find({ 
            status: 'em_andamento' 
        })
        .populate('cliente', 'nome')
        .populate('placas', 'numero_placa')
        .lean();

        console.log(`📊 Total de PIs ativas: ${pisAtivas.length}\n`);

        for (const pi of pisAtivas) {
            console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`📋 PI ID: ${pi._id}`);
            console.log(`👤 Cliente: ${pi.cliente?.nome || 'N/A'}`);
            console.log(`📅 Período: ${pi.dataInicio?.toLocaleDateString()} até ${pi.dataFim?.toLocaleDateString()}`);
            console.log(`📍 Placas na PI: ${pi.placas?.length || 0}`);

            if (pi.placas && pi.placas.length > 0) {
                console.log(`
   Placas:`);
                pi.placas.forEach((placa, idx) => {
                    console.log(`   ${idx + 1}. ${placa.numero_placa}`);
                });
            }

            // Buscar aluguéis relacionados
            const alugueis = await Aluguel.find({
                cliente: pi.cliente._id,
                placa: { $in: pi.placas?.map(p => p._id) || [] },
                data_inicio: pi.dataInicio,
                data_fim: pi.dataFim
            }).lean();

            console.log(`
   🔑 Aluguéis criados: ${alugueis.length}`);
            
            if (alugueis.length === 0 && pi.placas?.length > 0) {
                console.log(`   ⚠️  ATENÇÃO: PI tem ${pi.placas.length} placas mas nenhum aluguel!`);
            } else if (alugueis.length < pi.placas?.length) {
                console.log(`   ⚠️  ATENÇÃO: Faltam ${pi.placas.length - alugueis.length} aluguéis!`);
            } else if (alugueis.length === pi.placas?.length) {
                console.log(`   ✅ Todos os aluguéis estão corretos!`);
            }
        }

        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

        // Estatísticas gerais
        const totalAlugueis = await Aluguel.countDocuments();
        const alugueisAtivos = await Aluguel.countDocuments({
            data_inicio: { $lte: new Date() },
            data_fim: { $gte: new Date() }
        });

        console.log(`📊 ESTATÍSTICAS GERAIS:`);
        console.log(`   Total de aluguéis no banco: ${totalAlugueis}`);
        console.log(`   Aluguéis ativos hoje: ${alugueisAtivos}`);

        await mongoose.connection.close();
        console.log('\n✅ Verificação concluída!');
    } catch (error) {
        console.error('❌ Erro:', error.message);
        await mongoose.connection.close();
        process.exit(1);
    }
}

verificarAlugueisPI();