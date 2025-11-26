require('dotenv').config();
const mongoose = require('mongoose');
const config = require('./config/config');
const placaService = require('./services/placaService');

async function testGetPlacasDisponiveis() {
    try {
        console.log('Conectando ao MongoDB...');
        await mongoose.connect(config.mongoUri);
        console.log('✅ Conectado ao MongoDB\n');

        // Busca o empresaId da primeira placa disponível
        const Placa = require('./models/Placa');
        const primeiraPlaca = await Placa.findOne();
        
        if (!primeiraPlaca) {
            console.log('❌ Nenhuma placa encontrada no banco');
            process.exit(1);
        }

        const empresaId = primeiraPlaca.empresa;
        console.log(`📍 Usando empresaId: ${empresaId}\n`);

        // Simula os parâmetros do frontend
        const dataInicio = '2025-01-01';
        const dataFim = '2025-12-31';
        const queryParams = {
            regiao: undefined, // Sem filtro de região
            search: undefined, // Sem busca
            excludePiId: undefined
        };

        console.log('📊 Testando getPlacasDisponiveis com params:');
        console.log(`  empresaId: ${empresaId}`);
        console.log(`  dataInicio: ${dataInicio}`);
        console.log(`  dataFim: ${dataFim}`);
        console.log(`  queryParams: ${JSON.stringify(queryParams)}`);
        console.log('');

        const result = await placaService.getPlacasDisponiveis(empresaId, dataInicio, dataFim, queryParams);

        console.log(`\n✅ Resultado: ${result.length} placas disponíveis`);
        console.log('\n📝 Amostras (5 primeiras):');
        result.slice(0, 5).forEach(p => {
            console.log(`   ${p.numero_placa}: disponivel=${p.disponivel}, regiao=${p.regiao?.nome || 'N/A'}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Erro:', error);
        process.exit(1);
    }
}

testGetPlacasDisponiveis();
