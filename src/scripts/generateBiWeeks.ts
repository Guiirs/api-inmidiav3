// src/scripts/generateBiWeeks.ts
/**
 * Script para gerar manualmente as bi-semanas de um ano específico
 * 
 * Uso:
 *   node dist/scripts/generateBiWeeks.js 2025
 *   node dist/scripts/generateBiWeeks.js 2025 --force  (sobrescreve existentes)
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import BiWeek from '../models/BiWeek';

interface ValidationResult {
    valid: boolean;
    allAround14Days: boolean;
    noGaps: boolean;
    coversFullYear: boolean;
    warnings: string[];
}

async function main(): Promise<void> {
    try {
        // Pega o ano da linha de comando
        const year = parseInt(process.argv[2] || '') || new Date().getFullYear();
        const forceOverwrite = process.argv.includes('--force');

        console.log('\n🔧 ===== GERADOR DE BI-SEMANAS =====\n');
        console.log(`📅 Ano: ${year}`);
        console.log(`🔄 Modo: ${forceOverwrite ? 'SOBRESCREVER' : 'PRESERVAR EXISTENTES'}\n`);

        // Conecta ao MongoDB
        console.log('📡 Conectando ao MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log('✅ Conectado!\n');

        // Verifica bi-semanas existentes
        const existing = await BiWeek.find({ ano: year }).sort({ numero: 1 }).exec();
        
        if (existing.length > 0) {
            console.log(`⚠️  Encontradas ${existing.length} bi-semanas já cadastradas para ${year}:`);
            existing.forEach((bw: any) => {
                console.log(`   ${bw.bi_week_id}: ${formatDate(bw.start_date)} a ${formatDate(bw.end_date)}`);
            });
            console.log();

            if (!forceOverwrite) {
                console.log('ℹ️  Use --force para sobrescrever as bi-semanas existentes.');
                console.log('   Exemplo: node dist/scripts/generateBiWeeks.js 2025 --force\n');
                process.exit(0);
            }

            console.log('🗑️  Removendo bi-semanas existentes...');
            const deleted = await BiWeek.deleteMany({ ano: year });
            console.log(`✅ ${deleted.deletedCount} bi-semanas removidas\n`);
        }

        // Gera as bi-semanas
        console.log(`📅 Gerando bi-semanas para ${year}...`);
        const biWeeksData = (BiWeek as any).generateCalendar(year);
        
        console.log(`📊 Total de bi-semanas geradas: ${biWeeksData.length}\n`);

        // Mostra preview das primeiras e últimas
        console.log('🔍 Preview das bi-semanas:');
        console.log('\n   Primeiras 3:');
        biWeeksData.slice(0, 3).forEach((bw: any) => {
            console.log(`   ✅ ${bw.bi_week_id}: ${formatDate(bw.start_date)} a ${formatDate(bw.end_date)} (${calcDays(bw)} dias)`);
        });
        
        if (biWeeksData.length > 6) {
            console.log(`   ... (${biWeeksData.length - 6} bi-semanas intermediárias) ...`);
        }
        
        console.log('\n   Últimas 3:');
        biWeeksData.slice(-3).forEach((bw: any) => {
            console.log(`   ✅ ${bw.bi_week_id}: ${formatDate(bw.start_date)} a ${formatDate(bw.end_date)} (${calcDays(bw)} dias)`);
        });

        // Insere no banco
        console.log('\n💾 Salvando no banco de dados...');
        const inserted = await BiWeek.insertMany(biWeeksData);
        console.log(`✅ ${inserted.length} bi-semanas criadas com sucesso!\n`);

        // Validação
        console.log('🔍 Validando integridade...');
        const validation = validateBiWeeks(biWeeksData);
        
        if (validation.valid) {
            console.log('✅ Validação passou! Bi-semanas estão corretas:');
            console.log(`   • Todas com ~14 dias: ${validation.allAround14Days ? '✅' : '❌'}`);
            console.log(`   • Sem gaps (sequenciais): ${validation.noGaps ? '✅' : '❌'}`);
            console.log(`   • Cobrem ano completo: ${validation.coversFullYear ? '✅' : '❌'}`);
        } else {
            console.log('⚠️  Avisos de validação:');
            validation.warnings.forEach(w => console.log(`   ⚠️  ${w}`));
        }

        // Estatísticas finais
        console.log('\n📊 Estatísticas:');
        const stats = await BiWeek.countDocuments({ ano: year });
        const total = await BiWeek.countDocuments();
        console.log(`   • Bi-semanas de ${year}: ${stats}`);
        console.log(`   • Total no banco: ${total}`);
        
        // Mostra anos disponíveis
        const years = await BiWeek.distinct('ano');
        years.sort();
        console.log(`   • Anos cadastrados: ${years.join(', ')}`);

        console.log('\n✅ Concluído com sucesso!\n');
        
        process.exit(0);

    } catch (error: any) {
        console.error('\n❌ ERRO:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function calcDays(biWeek: any): number {
    const diffMs = biWeek.end_date.getTime() - biWeek.start_date.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1; // +1 porque inclui ambos os dias
}

function validateBiWeeks(biWeeks: any[]): ValidationResult {
    const warnings: string[] = [];
    let allAround14Days = true;
    let noGaps = true;
    let coversFullYear = true;

    // Verifica duração
    biWeeks.forEach(bw => {
        const days = calcDays(bw);
        if (days < 13 || days > 15) {
            allAround14Days = false;
            warnings.push(`${bw.bi_week_id} tem ${days} dias (esperado ~14)`);
        }
    });

    // Verifica gaps
    for (let i = 0; i < biWeeks.length - 1; i++) {
        const current = biWeeks[i];
        const next = biWeeks[i + 1];
        
        const endDate = new Date(current.end_date);
        const nextStart = new Date(next.start_date);
        
        const diffDays = Math.floor((nextStart.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays > 1) {
            noGaps = false;
            warnings.push(`Gap de ${diffDays - 1} dias entre ${current.bi_week_id} e ${next.bi_week_id}`);
        }
        
        if (diffDays < 1) {
            noGaps = false;
            warnings.push(`Sobreposição entre ${current.bi_week_id} e ${next.bi_week_id}`);
        }
    }

    // Verifica se cobre o ano todo
    const firstBw = biWeeks[0];
    const lastBw = biWeeks[biWeeks.length - 1];
    
    const yearStart = new Date(firstBw.ano, 0, 1);
    const yearEnd = new Date(firstBw.ano, 11, 31);
    
    const firstStart = new Date(firstBw.start_date);
    const lastEnd = new Date(lastBw.end_date);
    
    if (firstStart.getTime() !== yearStart.getTime()) {
        coversFullYear = false;
        warnings.push(`Primeira bi-semana não começa em 01/01/${firstBw.ano}`);
    }
    
    if (lastEnd < yearEnd) {
        coversFullYear = false;
        warnings.push(`Última bi-semana não chega até 31/12/${firstBw.ano}`);
    }

    return {
        valid: warnings.length === 0,
        allAround14Days,
        noGaps,
        coversFullYear,
        warnings
    };
}

main();
