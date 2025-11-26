// Test new report format - grouped by region, no addresses
require('dotenv').config();
const mongoose = require('mongoose');
const Placa = require('../models/Placa');
const Aluguel = require('../models/Aluguel');
const Regiao = require('../models/Regiao');
const Cliente = require('../models/Cliente');

async function formatarMensagemSimples(relatorio) {
    const { total, disponiveis, alugadas, indisponiveis, data } = relatorio;
    
    const dataHoraFormatada = new Date().toLocaleString('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    let mensagem = `📊 *RELATÓRIO DE DISPONIBILIDADE*\n`;
    mensagem += `_Atualizado em ${dataHoraFormatada}_\n\n`;

    // Resumo
    mensagem += `📈 *RESUMO GERAL*\n`;
    mensagem += `• Total: ${total} placas\n`;
    mensagem += `• Disponíveis: ✅ ${disponiveis.length}\n`;
    mensagem += `• Alugadas: 🟡 ${alugadas.length}\n`;
    mensagem += `• Indisponíveis: ❌ ${indisponiveis.length}\n\n`;

    // Placas Disponíveis (agrupadas por região)
    if (disponiveis.length > 0) {
        mensagem += `✅ *PLACAS DISPONÍVEIS (${disponiveis.length})*\n\n`;
        
        // Agrupa por região
        const porRegiao = {};
        disponiveis.forEach(placa => {
            const regiao = placa.regiao?.nome || 'Sem região';
            if (!porRegiao[regiao]) {
                porRegiao[regiao] = [];
            }
            porRegiao[regiao].push(placa.numero_placa);
        });

        // Lista por região
        Object.keys(porRegiao).sort().forEach(regiao => {
            const placas = porRegiao[regiao].sort();
            mensagem += `📍 *${regiao}* (${placas.length})\n`;
            mensagem += `${placas.join(', ')}\n\n`;
        });
    }

    // Placas Alugadas (agrupadas por região)
    if (alugadas.length > 0) {
        mensagem += `🟡 *PLACAS ALUGADAS (${alugadas.length})*\n\n`;
        
        // Agrupa por região
        const porRegiao = {};
        alugadas.forEach(placa => {
            const regiao = placa.regiao?.nome || 'Sem região';
            if (!porRegiao[regiao]) {
                porRegiao[regiao] = [];
            }
            porRegiao[regiao].push({
                numero: placa.numero_placa,
                cliente: placa.cliente,
                data_fim: placa.data_fim
            });
        });

        // Lista por região
        Object.keys(porRegiao).sort().forEach(regiao => {
            const placas = porRegiao[regiao];
            mensagem += `📍 *${regiao}* (${placas.length})\n`;
            placas.forEach(p => {
                const dataFim = new Date(p.data_fim).toLocaleDateString('pt-PT');
                mensagem += `• ${p.numero} - ${p.cliente} (até ${dataFim})\n`;
            });
            mensagem += `\n`;
        });
    }

    // Placas Indisponíveis (agrupadas por região)
    if (indisponiveis.length > 0) {
        mensagem += `❌ *PLACAS INDISPONÍVEIS (${indisponiveis.length})*\n\n`;
        
        // Agrupa por região
        const porRegiao = {};
        indisponiveis.forEach(placa => {
            const regiao = placa.regiao?.nome || 'Sem região';
            if (!porRegiao[regiao]) {
                porRegiao[regiao] = [];
            }
            porRegiao[regiao].push(placa.numero_placa);
        });

        // Lista por região
        Object.keys(porRegiao).sort().forEach(regiao => {
            const placas = porRegiao[regiao].sort();
            mensagem += `📍 *${regiao}* (${placas.length})\n`;
            mensagem += `${placas.join(', ')}\n\n`;
        });
    }

    mensagem += `_Sistema de Gestão de Placas_`;

    return mensagem;
}

async function gerarRelatorio() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const placas = await Placa.find({})
        .populate('regiao', 'nome')
        .sort({ numero_placa: 1 })
        .lean();

    const alugueisAtivos = await Aluguel.find({
        data_inicio: { $lte: hoje },
        data_fim: { $gte: hoje }
    })
    .populate('placa', '_id numero_placa')
    .populate('cliente', 'nome')
    .lean();

    const placasAlugadasMap = new Map();
    
    alugueisAtivos.forEach(aluguel => {
        if (aluguel.placa) {
            const placaId = typeof aluguel.placa === 'object' 
                ? aluguel.placa._id.toString() 
                : aluguel.placa.toString();
            
            placasAlugadasMap.set(placaId, {
                cliente: aluguel.cliente?.nome || 'Cliente Desconhecido',
                data_inicio: aluguel.data_inicio,
                data_fim: aluguel.data_fim
            });
        }
    });

    const disponiveisSemAluguel = [];
    const alugadas = [];
    const indisponiveis = [];

    placas.forEach(placa => {
        const placaId = placa._id.toString();
        const infoAluguel = placasAlugadasMap.get(placaId);

        if (infoAluguel) {
            alugadas.push({
                ...placa,
                cliente: infoAluguel.cliente,
                data_inicio: infoAluguel.data_inicio,
                data_fim: infoAluguel.data_fim
            });
        } else if (placa.disponivel === false) {
            indisponiveis.push(placa);
        } else {
            disponiveisSemAluguel.push(placa);
        }
    });

    return {
        total: placas.length,
        disponiveis: disponiveisSemAluguel,
        alugadas,
        indisponiveis,
        data: hoje
    };
}

async function main() {
    try {
        console.log('\n📊 ===== TESTE DO NOVO FORMATO DO RELATÓRIO =====\n');

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB conectado\n');

        const relatorio = await gerarRelatorio();
        const mensagem = await formatarMensagemSimples(relatorio);

        console.log('📨 NOVO FORMATO (Agrupado por Região, Sem Endereços):');
        console.log('='.repeat(60));
        console.log(mensagem);
        console.log('='.repeat(60));

        await mongoose.connection.close();
        console.log('\n✅ Teste concluído!');

    } catch (error) {
        console.error('❌ Erro:', error.message);
        process.exit(1);
    }
}

main();
