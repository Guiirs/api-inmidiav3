// scripts/migratePeriods.js
/**
 * SCRIPT DE MIGRAÇÃO - SISTEMA DE PERÍODOS UNIFICADO
 * 
 * Este script migra dados antigos (data_inicio/data_fim/bi_week_ids) para o novo formato
 * padronizado (periodType/startDate/endDate)
 * 
 * IMPORTANTE:
 * - Faz backup antes de executar
 * - Executa em modo dry-run primeiro para verificar mudanças
 * - Mantém campos antigos para compatibilidade
 * 
 * USO:
 * node scripts/migratePeriods.js --dry-run  # Simula migração sem alterar dados
 * node scripts/migratePeriods.js --execute  # Executa migração real
 */

const mongoose = require('mongoose');
const config = require('../config/config');
const logger = require('../config/logger');
const Aluguel = require('../models/Aluguel');
const PropostaInterna = require('../models/PropostaInterna');
const { PeriodType } = require('../utils/periodTypes');

// Verificar argumentos
const isDryRun = process.argv.includes('--dry-run');
const isExecute = process.argv.includes('--execute');

if (!isDryRun && !isExecute) {
    console.error('❌ Erro: Especifique --dry-run ou --execute');
    console.log('\nUso:');
    console.log('  node scripts/migratePeriods.js --dry-run   # Simular migração');
    console.log('  node scripts/migratePeriods.js --execute   # Executar migração\n');
    process.exit(1);
}

class PeriodMigrator {
    constructor(dryRun) {
        this.dryRun = dryRun;
        this.stats = {
            alugueis: { total: 0, migrated: 0, skipped: 0, errors: 0 },
            pis: { total: 0, migrated: 0, skipped: 0, errors: 0 }
        };
    }

    /**
     * Conecta ao MongoDB
     */
    async connect() {
        try {
            const mongoUri = config.DB_MONGO_URI || process.env.MONGODB_URI;
            await mongoose.connect(mongoUri);
            logger.info('[Migration] Conectado ao MongoDB');
        } catch (error) {
            logger.error('[Migration] Erro ao conectar ao MongoDB:', error);
            throw error;
        }
    }

    /**
     * Migra aluguéis
     */
    async migrateAlugueis() {
        console.log('\n📋 Migrando Aluguéis...\n');

        const alugueis = await Aluguel.find({}).exec();
        this.stats.alugueis.total = alugueis.length;

        for (const aluguel of alugueis) {
            try {
                // Se já tem periodType, pular
                if (aluguel.periodType) {
                    this.stats.alugueis.skipped++;
                    continue;
                }

                // Determinar tipo de período
                const hasBiWeeks = (aluguel.bi_week_ids && aluguel.bi_week_ids.length > 0) ||
                                  (aluguel.bi_weeks && aluguel.bi_weeks.length > 0);

                const periodType = hasBiWeeks ? PeriodType.BI_WEEK : PeriodType.CUSTOM;
                const startDate = aluguel.data_inicio;
                const endDate = aluguel.data_fim;
                const biWeekIds = aluguel.bi_week_ids || [];
                const biWeeks = aluguel.bi_weeks || [];

                console.log(`   Aluguel ${aluguel._id}:`);
                console.log(`      Tipo: ${periodType}`);
                console.log(`      Datas: ${startDate?.toISOString().split('T')[0]} a ${endDate?.toISOString().split('T')[0]}`);
                if (hasBiWeeks) {
                    console.log(`      Bi-weeks: ${biWeekIds.join(', ')}`);
                }

                if (!this.dryRun) {
                    aluguel.periodType = periodType;
                    aluguel.startDate = startDate;
                    aluguel.endDate = endDate;
                    aluguel.biWeekIds = biWeekIds;
                    aluguel.biWeeks = biWeeks;
                    await aluguel.save();
                }

                this.stats.alugueis.migrated++;
            } catch (error) {
                console.error(`   ❌ Erro ao migrar aluguel ${aluguel._id}:`, error.message);
                this.stats.alugueis.errors++;
            }
        }

        console.log(`\n✅ Aluguéis: ${this.stats.alugueis.migrated} migrados, ${this.stats.alugueis.skipped} pulados, ${this.stats.alugueis.errors} erros\n`);
    }

    /**
     * Migra PIs
     */
    async migratePIs() {
        console.log('\n📋 Migrando Propostas Internas...\n');

        const pis = await PropostaInterna.find({}).exec();
        this.stats.pis.total = pis.length;

        for (const pi of pis) {
            try {
                // Se já tem periodType, pular
                if (pi.periodType) {
                    this.stats.pis.skipped++;
                    continue;
                }

                // PIs antigas só tinham tipoPeriodo: 'quinzenal' | 'mensal'
                // Mapear para novo sistema
                const periodType = pi.tipoPeriodo === 'quinzenal' ? PeriodType.BI_WEEK : PeriodType.CUSTOM;
                const startDate = pi.dataInicio;
                const endDate = pi.dataFim;

                console.log(`   PI ${pi._id} (${pi.pi_code}):`);
                console.log(`      Tipo antigo: ${pi.tipoPeriodo} → Novo: ${periodType}`);
                console.log(`      Datas: ${startDate?.toISOString().split('T')[0]} a ${endDate?.toISOString().split('T')[0]}`);

                if (!this.dryRun) {
                    pi.periodType = periodType;
                    pi.startDate = startDate;
                    pi.endDate = endDate;
                    pi.biWeekIds = []; // PIs antigas não tinham bi-week tracking
                    pi.biWeeks = [];
                    await pi.save();
                }

                this.stats.pis.migrated++;
            } catch (error) {
                console.error(`   ❌ Erro ao migrar PI ${pi._id}:`, error.message);
                this.stats.pis.errors++;
            }
        }

        console.log(`\n✅ PIs: ${this.stats.pis.migrated} migradas, ${this.stats.pis.skipped} puladas, ${this.stats.pis.errors} erros\n`);
    }

    /**
     * Executa migração completa
     */
    async run() {
        console.log('\n' + '='.repeat(60));
        console.log('  MIGRAÇÃO DE PERÍODOS');
        console.log('='.repeat(60));
        console.log(`\nModo: ${this.dryRun ? '🔍 DRY RUN (simulação)' : '⚠️  EXECUÇÃO REAL'}\n`);

        if (!this.dryRun) {
            console.log('⚠️  ATENÇÃO: Esta operação modificará o banco de dados!');
            console.log('⚠️  Certifique-se de ter um backup antes de continuar.\n');
        }

        try {
            await this.connect();

            await this.migrateAlugueis();
            await this.migratePIs();

            console.log('\n' + '='.repeat(60));
            console.log('  RESUMO DA MIGRAÇÃO');
            console.log('='.repeat(60) + '\n');
            console.log(`Aluguéis:`);
            console.log(`  Total: ${this.stats.alugueis.total}`);
            console.log(`  Migrados: ${this.stats.alugueis.migrated}`);
            console.log(`  Pulados: ${this.stats.alugueis.skipped}`);
            console.log(`  Erros: ${this.stats.alugueis.errors}\n`);
            console.log(`Propostas Internas:`);
            console.log(`  Total: ${this.stats.pis.total}`);
            console.log(`  Migradas: ${this.stats.pis.migrated}`);
            console.log(`  Puladas: ${this.stats.pis.skipped}`);
            console.log(`  Erros: ${this.stats.pis.errors}\n`);

            if (this.dryRun) {
                console.log('✅ Simulação concluída. Nenhum dado foi alterado.');
                console.log('📝 Execute com --execute para aplicar as mudanças.\n');
            } else {
                console.log('✅ Migração concluída com sucesso!\n');
            }

        } catch (error) {
            console.error('\n❌ Erro durante migração:', error);
            process.exit(1);
        } finally {
            await mongoose.disconnect();
            logger.info('[Migration] Desconectado do MongoDB');
        }
    }
}

// Executar migração
(async () => {
    const migrator = new PeriodMigrator(isDryRun);
    await migrator.run();
    process.exit(0);
})();
