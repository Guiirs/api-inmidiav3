// scripts/checkPlacasDisponibilidade.js
// Script para verificar a disponibilidade de todas as placas no banco de dados

require('dotenv').config(); // Carrega variáveis de ambiente
const mongoose = require('mongoose');
const Placa = require('../models/Placa');
const Aluguel = require('../models/Aluguel');
const PropostaInterna = require('../models/PropostaInterna');
const Regiao = require('../models/Regiao');
const Cliente = require('../models/Cliente');

// Configuração do MongoDB a partir do .env
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI não encontrado no arquivo .env');
    process.exit(1);
}

async function checkPlacasDisponibilidade() {
    try {
        console.log('🔌 Conectando ao MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado ao MongoDB!\n');

        const hoje = new Date();
        console.log(`📅 Data de referência: ${hoje.toISOString()}\n`);

        // 1. Buscar todas as placas
        const todasPlacas = await Placa.find({})
            .populate('regiao', 'nome')
            .sort({ numero_placa: 1 })
            .lean();

        console.log(`📊 Total de placas no sistema: ${todasPlacas.length}\n`);

        // 2. Buscar aluguéis ativos
        const alugueisAtivos = await Aluguel.find({
            data_inicio: { $lte: hoje },
            data_fim: { $gte: hoje }
        })
        .populate('cliente', 'nome')
        .populate('placa', 'numero_placa')
        .lean();

        console.log(`🏢 Aluguéis ativos: ${alugueisAtivos.length}`);

        // 3. Buscar PIs ativas
        const pisAtivas = await PropostaInterna.find({
            status: 'em_andamento',
            dataInicio: { $lte: hoje },
            dataFim: { $gte: hoje }
        })
        .populate('cliente', 'nome')
        .lean();

        console.log(`📋 PIs ativas: ${pisAtivas.length}\n`);

        // 4. Criar mapa de placas ocupadas
        const placasEmAluguel = new Map();
        alugueisAtivos.forEach(aluguel => {
            const placaId = aluguel.placa?._id?.toString() || aluguel.placa?.toString();
            if (placaId) {
                placasEmAluguel.set(placaId, {
                    tipo: 'aluguel',
                    cliente: aluguel.cliente?.nome || 'Cliente não identificado',
                    dataInicio: aluguel.data_inicio,
                    dataFim: aluguel.data_fim
                });
            }
        });

        const placasEmPI = new Map();
        pisAtivas.forEach(pi => {
            pi.placas?.forEach(placaId => {
                const id = placaId.toString();
                if (!placasEmAluguel.has(id)) { // Aluguel tem prioridade
                    placasEmPI.set(id, {
                        tipo: 'pi',
                        cliente: pi.cliente?.nome || 'Cliente não identificado',
                        descricao: pi.descricao,
                        dataInicio: pi.dataInicio,
                        dataFim: pi.dataFim
                    });
                }
            });
        });

        // 5. Classificar placas
        const placasDisponiveis = [];
        const placasIndisponiveis = [];

        todasPlacas.forEach(placa => {
            const placaId = placa._id.toString();
            const regiaoNome = placa.regiao?.nome || 'Sem região';
            
            // Verifica se está em aluguel
            if (placasEmAluguel.has(placaId)) {
                const info = placasEmAluguel.get(placaId);
                placasIndisponiveis.push({
                    numero: placa.numero_placa,
                    regiao: regiaoNome,
                    rua: placa.nomeDaRua || 'Sem rua',
                    motivo: '🏢 ALUGADA',
                    cliente: info.cliente,
                    periodo: `${info.dataInicio.toISOString().split('T')[0]} até ${info.dataFim.toISOString().split('T')[0]}`,
                    campoDisponivel: placa.disponivel
                });
            }
            // Verifica se está em PI
            else if (placasEmPI.has(placaId)) {
                const info = placasEmPI.get(placaId);
                placasIndisponiveis.push({
                    numero: placa.numero_placa,
                    regiao: regiaoNome,
                    rua: placa.nomeDaRua || 'Sem rua',
                    motivo: '📋 EM PI',
                    cliente: info.cliente,
                    descricao: info.descricao,
                    periodo: `${info.dataInicio.toISOString().split('T')[0]} até ${info.dataFim.toISOString().split('T')[0]}`,
                    campoDisponivel: placa.disponivel
                });
            }
            // Verifica se está em manutenção manual
            else if (!placa.disponivel) {
                placasIndisponiveis.push({
                    numero: placa.numero_placa,
                    regiao: regiaoNome,
                    rua: placa.nomeDaRua || 'Sem rua',
                    motivo: '🔧 MANUTENÇÃO MANUAL',
                    campoDisponivel: placa.disponivel
                });
            }
            // Está disponível
            else {
                placasDisponiveis.push({
                    numero: placa.numero_placa,
                    regiao: regiaoNome,
                    rua: placa.nomeDaRua || 'Sem rua',
                    campoDisponivel: placa.disponivel
                });
            }
        });

        // 6. Exibir resultados
        console.log('═'.repeat(80));
        console.log('🟢 PLACAS DISPONÍVEIS');
        console.log('═'.repeat(80));
        console.log(`Total: ${placasDisponiveis.length} placas\n`);

        if (placasDisponiveis.length > 0) {
            placasDisponiveis.forEach((p, index) => {
                console.log(`${(index + 1).toString().padStart(3, ' ')}. ${p.numero.padEnd(15)} | ${p.regiao.padEnd(20)} | ${p.rua.substring(0, 30)}`);
            });
        } else {
            console.log('  Nenhuma placa disponível no momento.');
        }

        console.log('\n' + '═'.repeat(80));
        console.log('🔴 PLACAS INDISPONÍVEIS');
        console.log('═'.repeat(80));
        console.log(`Total: ${placasIndisponiveis.length} placas\n`);

        if (placasIndisponiveis.length > 0) {
            placasIndisponiveis.forEach((p, index) => {
                console.log(`${(index + 1).toString().padStart(3, ' ')}. ${p.numero.padEnd(15)} | ${p.motivo.padEnd(25)} | ${p.regiao}`);
                console.log(`    ${p.rua}`);
                if (p.cliente) {
                    console.log(`    Cliente: ${p.cliente}`);
                }
                if (p.descricao) {
                    console.log(`    Descrição: ${p.descricao}`);
                }
                if (p.periodo) {
                    console.log(`    Período: ${p.periodo}`);
                }
                console.log(`    Campo 'disponivel' no banco: ${p.campoDisponivel}`);
                console.log('');
            });
        } else {
            console.log('  Todas as placas estão disponíveis!');
        }

        // 7. Resumo
        console.log('═'.repeat(80));
        console.log('📊 RESUMO');
        console.log('═'.repeat(80));
        console.log(`Total de placas:              ${todasPlacas.length}`);
        console.log(`Placas disponíveis:           ${placasDisponiveis.length} (${((placasDisponiveis.length / todasPlacas.length) * 100).toFixed(1)}%)`);
        console.log(`Placas indisponíveis:         ${placasIndisponiveis.length} (${((placasIndisponiveis.length / todasPlacas.length) * 100).toFixed(1)}%)`);
        console.log('');
        console.log(`  - Alugadas:                 ${placasEmAluguel.size}`);
        console.log(`  - Em PIs:                   ${placasEmPI.size}`);
        console.log(`  - Em manutenção manual:     ${placasIndisponiveis.filter(p => p.motivo.includes('MANUTENÇÃO')).length}`);
        console.log('═'.repeat(80));

        // 8. Inconsistências (placas com campo disponivel=false mas sem motivo)
        const inconsistencias = placasIndisponiveis.filter(p => 
            p.motivo.includes('MANUTENÇÃO') && 
            (placasEmAluguel.size > 0 || placasEmPI.size > 0)
        );

        if (inconsistencias.length > 0) {
            console.log('\n⚠️  ATENÇÃO: Placas marcadas manualmente como indisponíveis:');
            inconsistencias.forEach(p => {
                console.log(`  - ${p.numero} (${p.regiao})`);
            });
        }

    } catch (error) {
        console.error('❌ Erro ao verificar disponibilidade:', error);
        throw error;
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Conexão com MongoDB fechada.');
    }
}

// Executa o script
checkPlacasDisponibilidade()
    .then(() => {
        console.log('\n✅ Script concluído com sucesso!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Erro ao executar script:', error.message);
        process.exit(1);
    });