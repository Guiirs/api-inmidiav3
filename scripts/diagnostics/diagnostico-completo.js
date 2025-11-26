require('dotenv').config();
const mongoose = require('mongoose');
const config = require('./config/config');

async function diagnosticoCompleto() {
    try {
        console.log('🔍 Diagnóstico Completo do Sistema\n');
        console.log('='.repeat(60));
        
        await mongoose.connect(config.mongoUri);
        console.log('✅ Conectado ao MongoDB\n');

        const User = require('./models/User');
        const Empresa = require('./models/Empresa');
        const Placa = require('./models/Placa');
        const PropostaInterna = require('./models/PropostaInterna');
        const Aluguel = require('./models/Aluguel');

        // 1. Empresas
        console.log('📊 EMPRESAS:');
        const empresas = await Empresa.find();
        console.log(`   Total: ${empresas.length}`);
        empresas.forEach(emp => {
            console.log(`   - ${emp.nome} (ID: ${emp._id})`);
        });
        console.log('');

        // 2. Usuários
        console.log('👤 USUÁRIOS:');
        const users = await User.find();
        console.log(`   Total: ${users.length}`);
        for (const user of users) {
            const empresa = empresas.find(e => e._id.equals(user.empresa));
            console.log(`   - ${user.email} → Empresa: ${empresa?.nome || 'N/A'} (${user.empresa})`);
        }
        console.log('');

        // 3. Placas por empresa
        console.log('🏷️  PLACAS POR EMPRESA:');
        for (const emp of empresas) {
            const placas = await Placa.find({ empresa: emp._id });
            const disponiveis = placas.filter(p => p.disponivel === true).length;
            const indisponiveis = placas.filter(p => p.disponivel === false).length;
            console.log(`   ${emp.nome}:`);
            console.log(`      Total: ${placas.length} (${disponiveis} disponíveis, ${indisponiveis} indisponíveis)`);
            if (placas.length > 0 && placas.length <= 5) {
                placas.forEach(p => {
                    console.log(`         - ${p.numero_placa}: disponivel=${p.disponivel}`);
                });
            }
        }
        console.log('');

        // 4. PIs ativas
        console.log('📝 PROPOSTAS INTERNAS ATIVAS:');
        const pis = await PropostaInterna.find({ status: { $in: ['em_andamento', 'concluida'] } });
        console.log(`   Total: ${pis.length}`);
        if (pis.length > 0) {
            for (const pi of pis) {
                console.log(`   - PI ${pi.numero_pi}: ${pi.placas?.length || 0} placas`);
                console.log(`     Período: ${pi.dataInicio} a ${pi.dataFim}`);
                console.log(`     Status: ${pi.status}`);
            }
        }
        console.log('');

        // 5. Aluguéis ativos
        console.log('🏠 ALUGUÉIS ATIVOS:');
        const alugueis = await Aluguel.find();
        console.log(`   Total: ${alugueis.length}`);
        console.log('');

        // 6. Teste de getPlacasDisponiveis para cada empresa
        console.log('🧪 TESTE getPlacasDisponiveis:');
        const placaService = require('./services/placaService');
        for (const emp of empresas) {
            console.log(`   ${emp.nome} (${emp._id}):`);
            try {
                const result = await placaService.getPlacasDisponiveis(
                    emp._id,
                    '2025-01-01',
                    '2025-12-31',
                    {}
                );
                console.log(`      ✅ Retorna: ${result.length} placas disponíveis`);
                if (result.length > 0 && result.length <= 5) {
                    result.forEach(p => {
                        console.log(`         - ${p.numero_placa}`);
                    });
                }
            } catch (error) {
                console.log(`      ❌ Erro: ${error.message}`);
            }
        }
        console.log('');

        console.log('='.repeat(60));
        console.log('✅ Diagnóstico concluído');

        process.exit(0);
    } catch (error) {
        console.error('❌ Erro:', error);
        process.exit(1);
    }
}

diagnosticoCompleto();
