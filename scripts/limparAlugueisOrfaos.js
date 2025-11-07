// Script para limpar aluguéis órfãos (sem PI correspondente)
require('dotenv').config();
const mongoose = require('mongoose');
const Aluguel = require('../models/Aluguel');
const PropostaInterna = require('../models/PropostaInterna');
const Cliente = require('../models/Cliente');
const Placa = require('../models/Placa');

async function limparAlugueisOrfaos() {
    try {
        console.log('🔍 Conectando...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado!\n');

        const todosAlugueis = await Aluguel.find()
            .populate('cliente', 'nome')
            .populate('placa', 'numero_placa')
            .lean();

        console.log(`📊 Total de aluguéis no banco: ${todosAlugueis.length}\n`);

        let orfaos = 0;
        let removidos = 0;

        for (const aluguel of todosAlugueis) {
            // Verificar se existe PI com este aluguel
            const pi = await PropostaInterna.findOne({
                cliente: aluguel.cliente._id,
                placas: aluguel.placa._id,
                dataInicio: aluguel.data_inicio,
                dataFim: aluguel.data_fim,
                empresa: aluguel.empresa
            }).lean();

            if (!pi) {
                console.log(`⚠️  Aluguel órfão encontrado:`);
                console.log(`   ID: ${aluguel._id}`);
                console.log(`   Cliente: ${aluguel.cliente?.nome || 'N/A'}`);
                console.log(`   Placa: ${aluguel.placa?.numero_placa || 'N/A'}`);
                console.log(`   Período: ${aluguel.data_inicio.toLocaleDateString()} até ${aluguel.data_fim.toLocaleDateString()}`);
                
                // Remove o aluguel órfão
                await Aluguel.deleteOne({ _id: aluguel._id });
                console.log(`   ✅ Removido!`);
                console.log('');
                
                orfaos++;
                removidos++;
            }
        }

        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📊 RESUMO:`);
        console.log(`   Total de aluguéis: ${todosAlugueis.length}`);
        console.log(`   Órfãos encontrados: ${orfaos}`);
        console.log(`   Órfãos removidos: ${removidos}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

        await mongoose.connection.close();
        console.log('✅ Limpeza concluída!');
    } catch (error) {
        console.error('❌ Erro:', error.message);
        console.error(error.stack);
        await mongoose.connection.close();
        process.exit(1);
    }
}

limparAlugueisOrfaos();
