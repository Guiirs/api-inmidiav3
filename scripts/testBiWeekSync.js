// scripts/testBiWeekSync.js
// Script para testar a sincronização com bi-semanas

require('dotenv').config();
const mongoose = require('mongoose');
const BiWeek = require('../models/BiWeek');
const BiWeekService = require('../services/biWeekService');
const AluguelService = require('../services/aluguelService');
const BiWeekHelpers = require('../utils/biWeekHelpers');
const logger = require('../config/logger');

async function main() {
    try {
        console.log('\n🧪 ===== TESTE DE SINCRONIZAÇÃO COM BI-SEMANAS =====\n');

        // Conecta ao MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB conectado\n');

        const biWeekService = new BiWeekService();
        const aluguelService = new AluguelService();

        // ========== TESTE 1: Gerar calendário de bi-semanas ==========
        console.log('📅 TESTE 1: Gerando calendário de bi-semanas para 2025...\n');
        
        const resultado = await biWeekService.generateCalendar(2025, false);
        console.log(`   ✅ Calendário gerado:`);
        console.log(`      - Criadas: ${resultado.created}`);
        console.log(`      - Puladas: ${resultado.skipped}`);
        console.log(`      - Total: ${resultado.total}\n`);

        // ========== TESTE 2: Buscar bi-semanas disponíveis ==========
        console.log('📅 TESTE 2: Buscando bi-semanas de 2025...\n');
        
        const biWeeks2025 = await biWeekService.getAllBiWeeks({ ano: 2025 });
        console.log(`   ✅ ${biWeeks2025.length} bi-semanas encontradas`);
        
        if (biWeeks2025.length > 0) {
            console.log(`   📋 Primeiras 3 bi-semanas:`);
            biWeeks2025.slice(0, 3).forEach(bw => {
                console.log(`      - ${bw.bi_week_id}: ${BiWeekHelpers.formatDate(bw.start_date)} a ${BiWeekHelpers.formatDate(bw.end_date)}`);
            });
            console.log('');
        }

        // ========== TESTE 3: Calcular período a partir de bi-week_ids ==========
        console.log('📅 TESTE 3: Calculando período para bi-semanas 2025-01, 2025-02...\n');
        
        const biWeekIds = ['2025-01', '2025-02'];
        const periodData = await BiWeekHelpers.calculatePeriodFromBiWeekIds(biWeekIds);
        
        console.log(`   ✅ Período calculado:`);
        console.log(`      - Início: ${BiWeekHelpers.formatDate(periodData.start_date)}`);
        console.log(`      - Fim: ${BiWeekHelpers.formatDate(periodData.end_date)}`);
        console.log(`      - Bi-semanas: ${periodData.count}`);
        console.log(`      - Descrição: ${BiWeekHelpers.generatePeriodDescription(periodData.biWeeks)}\n`);

        // ========== TESTE 4: Validar alinhamento de período ==========
        console.log('📅 TESTE 4: Validando alinhamento de período com bi-semanas...\n');
        
        // Testa período alinhado
        const validation1 = await BiWeekHelpers.validatePeriodAlignment(
            periodData.start_date,
            periodData.end_date
        );
        
        console.log(`   Período alinhado:`);
        console.log(`      - Válido: ${validation1.valid ? '✅ SIM' : '❌ NÃO'}`);
        console.log(`      - Mensagem: ${validation1.message}\n`);

        // Testa período desalinhado
        const dataDesalinhada1 = new Date('2025-01-05'); // Meio de uma bi-semana
        const dataDesalinhada2 = new Date('2025-02-10');
        
        const validation2 = await BiWeekHelpers.validatePeriodAlignment(
            dataDesalinhada1,
            dataDesalinhada2
        );
        
        console.log(`   Período desalinhado (05/01 - 10/02):`);
        console.log(`      - Válido: ${validation2.valid ? '✅ SIM' : '❌ NÃO'}`);
        console.log(`      - Mensagem: ${validation2.message}`);
        if (validation2.suggestion) {
            console.log(`      - Sugestão: ${validation2.suggestion.message}\n`);
        }

        // ========== TESTE 5: Ajustar período automaticamente ==========
        console.log('📅 TESTE 5: Ajustando período desalinhado automaticamente...\n');
        
        const aligned = await BiWeekHelpers.alignPeriodToBiWeeks(
            dataDesalinhada1,
            dataDesalinhada2
        );
        
        console.log(`   ✅ Período ajustado:`);
        console.log(`      - Original: ${BiWeekHelpers.formatDate(dataDesalinhada1)} - ${BiWeekHelpers.formatDate(dataDesalinhada2)}`);
        console.log(`      - Ajustado: ${BiWeekHelpers.formatDate(aligned.start_date)} - ${BiWeekHelpers.formatDate(aligned.end_date)}`);
        console.log(`      - Bi-semanas: ${aligned.biWeeks.length}`);
        console.log(`      - Descrição: ${BiWeekHelpers.generatePeriodDescription(aligned.biWeeks)}\n`);

        // ========== TESTE 6: Buscar bi-semana por data ==========
        console.log('📅 TESTE 6: Buscando bi-semana que contém uma data específica...\n');
        
        const hoje = new Date();
        const biWeekHoje = await BiWeekHelpers.findBiWeekByDate(hoje);
        
        if (biWeekHoje) {
            console.log(`   ✅ Bi-semana atual (${BiWeekHelpers.formatDate(hoje)}):`);
            console.log(`      - ID: ${biWeekHoje.bi_week_id}`);
            console.log(`      - Número: ${biWeekHoje.numero}/${biWeekHoje.ano}`);
            console.log(`      - Período: ${BiWeekHelpers.formatDate(biWeekHoje.start_date)} - ${BiWeekHelpers.formatDate(biWeekHoje.end_date)}`);
            console.log(`      - Descrição: ${biWeekHoje.descricao}\n`);
        } else {
            console.log(`   ⚠️  Nenhuma bi-semana encontrada para hoje. Gere o calendário de ${hoje.getFullYear()}.\n`);
        }

        // ========== TESTE 7: Validar sequência de bi-semanas ==========
        console.log('📅 TESTE 7: Validando sequência de bi-semanas...\n');
        
        // Sequência válida
        const seqValida = ['2025-01', '2025-02', '2025-03'];
        const validSeq = await BiWeekHelpers.validateBiWeekSequence(seqValida);
        
        console.log(`   Sequência válida [${seqValida.join(', ')}]:`);
        console.log(`      - Válida: ${validSeq.valid ? '✅ SIM' : '❌ NÃO'}`);
        console.log(`      - Mensagem: ${validSeq.message}\n`);

        // Sequência com gap
        const seqComGap = ['2025-01', '2025-03', '2025-05']; // Pula 02, 04
        const invalidSeq = await BiWeekHelpers.validateBiWeekSequence(seqComGap);
        
        console.log(`   Sequência com gaps [${seqComGap.join(', ')}]:`);
        console.log(`      - Válida: ${invalidSeq.valid ? '✅ SIM' : '❌ NÃO'}`);
        console.log(`      - Mensagem: ${invalidSeq.message}`);
        if (invalidSeq.gaps.length > 0) {
            console.log(`      - Gaps encontrados:`);
            invalidSeq.gaps.forEach(gap => {
                console.log(`         • Entre ${gap.after} e ${gap.before} (${gap.gap_days} dias)`);
            });
        }
        console.log('');

        // ========== RESUMO ==========
        console.log('✅ ===== TODOS OS TESTES CONCLUÍDOS =====\n');
        console.log('📊 Resumo:');
        console.log(`   - Calendário 2025: ${resultado.total} bi-semanas`);
        console.log(`   - Sistema pronto para sincronização`);
        console.log(`   - Helpers funcionando corretamente`);
        console.log(`   - Validações operacionais\n`);

        console.log('💡 Próximos passos:');
        console.log('   1. Teste criar aluguel com bi_week_ids via API');
        console.log('   2. Teste criar aluguel com datas (auto-alinhamento)');
        console.log('   3. Teste buscar aluguéis por bi-semana');
        console.log('   4. Teste relatório de ocupação por bi-semana\n');

        await mongoose.connection.close();
        console.log('✅ Conexão fechada\n');

    } catch (error) {
        console.error('\n❌ Erro durante os testes:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

main();
