// scripts/debugPIsAtivas.js
/**
 * Script de debug para verificar PIs ativas e suas placas
 */

require('dotenv').config();
const mongoose = require('mongoose');
const PropostaInterna = require('../models/PropostaInterna');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/inmidia';

async function debugPIs() {
    try {
        console.log('🔄 Conectando ao MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado ao MongoDB!\n');

        // 1. Buscar TODAS as PIs
        console.log('📊 Buscando TODAS as PIs...');
        const todasPIs = await PropostaInterna.find({})
            .select('status dataInicio dataFim placas')
            .populate('placas', 'numero_placa')
            .lean();
        
        console.log(`✅ Total de PIs no sistema: ${todasPIs.length}\n`);

        // 2. Agrupar por status
        const porStatus = todasPIs.reduce((acc, pi) => {
            acc[pi.status] = (acc[pi.status] || 0) + 1;
            return acc;
        }, {});

        console.log('📊 PIs por status:');
        Object.entries(porStatus).forEach(([status, count]) => {
            console.log(`   - ${status}: ${count}`);
        });
        console.log('');

        // 3. PIs em andamento ou concluídas
        const pisAtivas = todasPIs.filter(pi => 
            pi.status === 'em_andamento' || pi.status === 'concluida'
        );

        console.log(`📊 PIs ativas (em_andamento ou concluida): ${pisAtivas.length}\n`);

        if (pisAtivas.length > 0) {
            console.log('🔍 Detalhes das PIs ativas:\n');
            pisAtivas.forEach((pi, index) => {
                console.log(`${index + 1}. PI ${pi._id}`);
                console.log(`   Status: ${pi.status}`);
                console.log(`   Período: ${pi.dataInicio?.toISOString().split('T')[0]} até ${pi.dataFim?.toISOString().split('T')[0]}`);
                console.log(`   Placas: ${pi.placas?.length || 0}`);
                if (pi.placas && pi.placas.length > 0) {
                    const numeros = pi.placas.map(p => p.numero_placa || p).join(', ');
                    console.log(`   Números: ${numeros}`);
                }
                console.log('');
            });

            // 4. Contar placas ocupadas
            const placasOcupadas = new Set();
            pisAtivas.forEach(pi => {
                if (pi.placas) {
                    pi.placas.forEach(placa => {
                        const id = placa._id?.toString() || placa.toString();
                        placasOcupadas.add(id);
                    });
                }
            });

            console.log(`📊 Total de placas ocupadas por PIs ativas: ${placasOcupadas.size}\n`);
        }

        // 5. Verificar PIs com datas no futuro ou passado
        const hoje = new Date();
        const pisPassadas = pisAtivas.filter(pi => pi.dataFim < hoje);
        const pisFuturas = pisAtivas.filter(pi => pi.dataInicio > hoje);
        const pisAtuais = pisAtivas.filter(pi => pi.dataInicio <= hoje && pi.dataFim >= hoje);

        console.log('📊 PIs ativas por período temporal:');
        console.log(`   - Passadas (já terminaram): ${pisPassadas.length}`);
        console.log(`   - Futuras (ainda não começaram): ${pisFuturas.length}`);
        console.log(`   - Atuais (em curso agora): ${pisAtuais.length}`);
        console.log('');

        if (pisPassadas.length > 0) {
            console.log('⚠️  ATENÇÃO: PIs com status ativo mas já terminadas:');
            pisPassadas.forEach(pi => {
                console.log(`   - PI ${pi._id}: terminou em ${pi.dataFim.toISOString().split('T')[0]}`);
            });
            console.log('');
        }

        await mongoose.disconnect();
        console.log('✅ Script concluído!');

    } catch (error) {
        console.error('❌ Erro:', error);
        process.exit(1);
    }
}

debugPIs();
