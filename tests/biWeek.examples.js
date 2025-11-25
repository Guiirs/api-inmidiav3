// BECKEND/tests/biWeek.test.examples.js
/**
 * Exemplos de uso do sistema de Bi-Semanas
 * 
 * ATENÇÃO: Este arquivo contém APENAS exemplos de código.
 * Não é um arquivo de testes automatizados.
 * 
 * Para executar testes reais, configure Jest primeiro.
 */

const BiWeek = require('../models/BiWeek');
const BiWeekService = require('../services/biWeekService');
const biWeekService = new BiWeekService();

// ============================================================================
// EXEMPLO 1: Gerar calendário programaticamente
// ============================================================================
async function exemplo1_GerarCalendario() {
    console.log('\n=== EXEMPLO 1: Gerar Calendário 2027 ===\n');
    
    // Conectar ao MongoDB primeiro...
    
    const result = await biWeekService.generateCalendar(2027, false);
    
    console.log(`✅ Calendário gerado:`);
    console.log(`   - Criadas: ${result.created}`);
    console.log(`   - Puladas: ${result.skipped}`);
    console.log(`   - Total: ${result.total}`);
    console.log(`   - Mensagem: ${result.message}`);
}

// ============================================================================
// EXEMPLO 2: Buscar Bi-Semana de uma data específica
// ============================================================================
async function exemplo2_BuscarPorData() {
    console.log('\n=== EXEMPLO 2: Buscar Bi-Semana por Data ===\n');
    
    const data = new Date('2026-03-15');
    
    const biWeek = await BiWeek.findByDate(data);
    
    if (biWeek) {
        console.log(`✅ Bi-Semana encontrada:`);
        console.log(`   - ID: ${biWeek.bi_week_id}`);
        console.log(`   - Número: ${biWeek.numero}`);
        console.log(`   - Início: ${biWeek.start_date.toLocaleDateString('pt-BR')}`);
        console.log(`   - Fim: ${biWeek.end_date.toLocaleDateString('pt-BR')}`);
    } else {
        console.log('❌ Nenhuma Bi-Semana encontrada para esta data.');
    }
}

// ============================================================================
// EXEMPLO 3: Validar período de aluguel
// ============================================================================
async function exemplo3_ValidarPeriodo() {
    console.log('\n=== EXEMPLO 3: Validar Período de Aluguel ===\n');
    
    // Período VÁLIDO (alinhado com Bi-Semana)
    const startDate1 = new Date('2026-01-01');
    const endDate1 = new Date('2026-01-14');
    
    const validation1 = await BiWeek.validatePeriod(startDate1, endDate1);
    
    console.log('Teste 1 - Período alinhado:');
    console.log(`   - Válido: ${validation1.valid}`);
    console.log(`   - Mensagem: ${validation1.message}`);
    console.log(`   - Bi-Semanas: ${validation1.biWeeks.length}`);
    
    console.log('\n---\n');
    
    // Período INVÁLIDO (não alinhado)
    const startDate2 = new Date('2026-01-05');
    const endDate2 = new Date('2026-01-19');
    
    const validation2 = await BiWeek.validatePeriod(startDate2, endDate2);
    
    console.log('Teste 2 - Período NÃO alinhado:');
    console.log(`   - Válido: ${validation2.valid}`);
    console.log(`   - Mensagem: ${validation2.message}`);
    
    if (validation2.suggestion) {
        console.log(`   - Sugestão:`);
        console.log(`     - Início: ${validation2.suggestion.start_date.toLocaleDateString('pt-BR')}`);
        console.log(`     - Fim: ${validation2.suggestion.end_date.toLocaleDateString('pt-BR')}`);
    }
}

// ============================================================================
// EXEMPLO 4: Listar todas as Bi-Semanas de um ano
// ============================================================================
async function exemplo4_ListarPorAno() {
    console.log('\n=== EXEMPLO 4: Listar Bi-Semanas de 2026 ===\n');
    
    const biWeeks = await BiWeek.findByYear(2026);
    
    console.log(`✅ ${biWeeks.length} Bi-Semanas encontradas:\n`);
    
    biWeeks.forEach(bw => {
        const periodo = bw.getFormattedPeriod();
        console.log(`   ${bw.bi_week_id} (Nº ${bw.numero}): ${periodo}`);
    });
}

// ============================================================================
// EXEMPLO 5: Criar Bi-Semana manualmente
// ============================================================================
async function exemplo5_CriarManual() {
    console.log('\n=== EXEMPLO 5: Criar Bi-Semana Manualmente ===\n');
    
    const novaBiWeek = await biWeekService.createBiWeek({
        bi_week_id: '2027-01',
        ano: 2027,
        numero: 1,
        start_date: '2027-01-01',
        end_date: '2027-01-14',
        descricao: 'Primeira quinzena de 2027 - Ano Novo',
        ativo: true
    });
    
    console.log(`✅ Bi-Semana criada:`);
    console.log(`   - ID: ${novaBiWeek.bi_week_id}`);
    console.log(`   - Período: ${novaBiWeek.getFormattedPeriod()}`);
}

// ============================================================================
// EXEMPLO 6: Atualizar descrição de uma Bi-Semana
// ============================================================================
async function exemplo6_Atualizar() {
    console.log('\n=== EXEMPLO 6: Atualizar Bi-Semana ===\n');
    
    const biWeekAtualizada = await biWeekService.updateBiWeek('2026-01', {
        descricao: 'Primeira quinzena de 2026 - Pós-Reveillon',
        ativo: true
    });
    
    console.log(`✅ Bi-Semana atualizada:`);
    console.log(`   - ID: ${biWeekAtualizada.bi_week_id}`);
    console.log(`   - Nova descrição: ${biWeekAtualizada.descricao}`);
}

// ============================================================================
// EXEMPLO 7: Verificar Bi-Semanas em conflito com um período
// ============================================================================
async function exemplo7_VerificarConflitos() {
    console.log('\n=== EXEMPLO 7: Verificar Conflitos ===\n');
    
    const dataInicio = new Date('2026-02-01');
    const dataFim = new Date('2026-02-28');
    
    // Busca Bi-Semanas que se sobrepõem ao período
    const biWeeksConflitantes = await BiWeek.find({
        $or: [
            { start_date: { $gte: dataInicio, $lte: dataFim } },
            { end_date: { $gte: dataInicio, $lte: dataFim } },
            { start_date: { $lte: dataInicio }, end_date: { $gte: dataFim } }
        ],
        ativo: true
    }).sort({ start_date: 1 });
    
    console.log(`✅ ${biWeeksConflitantes.length} Bi-Semanas encontradas no período:\n`);
    
    biWeeksConflitantes.forEach(bw => {
        console.log(`   ${bw.bi_week_id}: ${bw.getFormattedPeriod()}`);
    });
}

// ============================================================================
// EXEMPLO 8: Calcular número de Bi-Semanas em um período
// ============================================================================
async function exemplo8_ContarBiSemanas() {
    console.log('\n=== EXEMPLO 8: Contar Bi-Semanas em Período ===\n');
    
    const dataInicio = new Date('2026-01-01');
    const dataFim = new Date('2026-06-30');
    
    const validation = await BiWeek.validatePeriod(dataInicio, dataFim);
    
    console.log(`✅ Período: ${dataInicio.toLocaleDateString('pt-BR')} até ${dataFim.toLocaleDateString('pt-BR')}`);
    console.log(`   - Bi-Semanas completas: ${validation.biWeeks.length}`);
    console.log(`   - Válido (alinhado): ${validation.valid ? 'Sim' : 'Não'}`);
    
    if (validation.biWeeks.length > 0) {
        console.log(`\n   Lista de Bi-Semanas:`);
        validation.biWeeks.forEach(bw => {
            console.log(`      - ${bw.bi_week_id}`);
        });
    }
}

// ============================================================================
// EXEMPLO 9: Buscar anos disponíveis
// ============================================================================
async function exemplo9_AnosDisponiveis() {
    console.log('\n=== EXEMPLO 9: Anos Disponíveis ===\n');
    
    const anos = await biWeekService.getAvailableYears();
    
    console.log(`✅ Anos com calendário cadastrado:`);
    console.log(`   ${anos.join(', ')}`);
    
    // Verifica qual ano falta
    const anoAtual = new Date().getFullYear();
    const proximoAno = anoAtual + 1;
    
    if (!anos.includes(proximoAno)) {
        console.log(`\n⚠️  ATENÇÃO: Calendário de ${proximoAno} ainda não foi gerado!`);
        console.log(`   Execute: biWeekService.generateCalendar(${proximoAno})`);
    }
}

// ============================================================================
// EXEMPLO 10: Desabilitar/Reabilitar Bi-Semana
// ============================================================================
async function exemplo10_ToggleAtivo() {
    console.log('\n=== EXEMPLO 10: Desabilitar Bi-Semana ===\n');
    
    // Desabilita
    let biWeek = await biWeekService.updateBiWeek('2026-01', { ativo: false });
    console.log(`✅ Bi-Semana ${biWeek.bi_week_id} desabilitada.`);
    
    // Reabilita
    biWeek = await biWeekService.updateBiWeek('2026-01', { ativo: true });
    console.log(`✅ Bi-Semana ${biWeek.bi_week_id} reabilitada.`);
}

// ============================================================================
// EXEMPLO DE USO EM ROTA EXPRESS
// ============================================================================

/**
 * Exemplo de endpoint customizado que usa Bi-Semanas
 */
async function exemploRotaExpress(req, res, next) {
    const { data_inicio, data_fim } = req.body;
    
    try {
        // 1. Valida o período
        const validation = await BiWeek.validatePeriod(
            new Date(data_inicio),
            new Date(data_fim)
        );
        
        // 2. Se não for válido, retorna erro com sugestão
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: validation.message,
                suggestion: validation.suggestion
            });
        }
        
        // 3. Se válido, continua com a lógica de criação
        const biWeeksUsadas = validation.biWeeks.map(bw => bw.bi_week_id);
        
        // Cria o aluguel/PI com as Bi-Semanas identificadas
        const novoAluguel = await Aluguel.create({
            // ... outros campos
            data_inicio: new Date(data_inicio),
            data_fim: new Date(data_fim),
            bi_weeks: biWeeksUsadas // Opcional: salvar quais Bi-Semanas foram usadas
        });
        
        res.status(201).json({
            success: true,
            data: novoAluguel,
            bi_weeks_used: biWeeksUsadas
        });
        
    } catch (error) {
        next(error);
    }
}

// ============================================================================
// EXEMPLO FRONTEND (REACT)
// ============================================================================

/**
 * Exemplo de uso no React (copiar para componente)
 */
const exemploReact = `
import { useState, useEffect } from 'react';
import { fetchBiWeeksCalendar, validatePeriod } from '../services/biWeekService';

function MinhaComponente() {
    const [biWeeks, setBiWeeks] = useState([]);
    const [validation, setValidation] = useState(null);
    
    // Carregar calendário ao montar
    useEffect(() => {
        const loadCalendar = async () => {
            const data = await fetchBiWeeksCalendar({ ano: 2026 });
            setBiWeeks(data);
        };
        loadCalendar();
    }, []);
    
    // Validar quando usuário seleciona datas
    const handleDateChange = async (startDate, endDate) => {
        const result = await validatePeriod(startDate, endDate);
        setValidation(result);
        
        if (!result.valid) {
            alert(result.message);
            // Sugerir datas corretas ao usuário
            if (result.suggestion) {
                console.log('Sugestão:', result.suggestion);
            }
        }
    };
    
    return (
        <div>
            {/* Renderizar calendário */}
            {biWeeks.map(bw => (
                <div key={bw._id}>
                    {bw.bi_week_id}: {bw.start_date} - {bw.end_date}
                </div>
            ))}
            
            {/* Feedback de validação */}
            {validation && !validation.valid && (
                <Alert severity="error">
                    {validation.message}
                </Alert>
            )}
        </div>
    );
}
`;

// ============================================================================
// EXECUTAR TODOS OS EXEMPLOS
// ============================================================================

async function executarTodosExemplos() {
    console.log('\n📅 EXEMPLOS DE USO DO SISTEMA DE BI-SEMANAS\n');
    console.log('='.repeat(60));
    
    try {
        // Conectar ao MongoDB
        const mongoose = require('mongoose');
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Conectado ao MongoDB\n');
        
        // Executar exemplos
        await exemplo1_GerarCalendario();
        await exemplo2_BuscarPorData();
        await exemplo3_ValidarPeriodo();
        await exemplo4_ListarPorAno();
        // await exemplo5_CriarManual(); // Comentado para não duplicar
        // await exemplo6_Atualizar(); // Comentado para não modificar dados
        await exemplo7_VerificarConflitos();
        await exemplo8_ContarBiSemanas();
        await exemplo9_AnosDisponiveis();
        // await exemplo10_ToggleAtivo(); // Comentado para não modificar dados
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ Todos os exemplos executados com sucesso!\n');
        
        // Fechar conexão
        await mongoose.connection.close();
        
    } catch (error) {
        console.error('❌ Erro ao executar exemplos:', error);
    }
}

// ============================================================================
// PARA EXECUTAR:
// ============================================================================
// node BECKEND/tests/biWeek.test.examples.js

// Descomente a linha abaixo para executar automaticamente
// executarTodosExemplos();

module.exports = {
    exemplo1_GerarCalendario,
    exemplo2_BuscarPorData,
    exemplo3_ValidarPeriodo,
    exemplo4_ListarPorAno,
    exemplo5_CriarManual,
    exemplo6_Atualizar,
    exemplo7_VerificarConflitos,
    exemplo8_ContarBiSemanas,
    exemplo9_AnosDisponiveis,
    exemplo10_ToggleAtivo,
    executarTodosExemplos
};
