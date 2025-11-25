// scripts/importBiWeeks.js
const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const path = require('path');
const BiWeek = require('../models/BiWeek');

/**
 * Script para importar o calendário de Bi-Semanas de um arquivo Excel (.xlsx)
 * para a collection 'biweeks' no MongoDB.
 * 
 * USO:
 *   node scripts/importBiWeeks.js
 * 
 * REQUISITOS:
 *   - Arquivo Excel em: BECKEND/Schema/BI SEMANA 2026.xlsx
 *   - Arquivo .env configurado com MONGODB_URI
 *   - Formato do Excel: Colunas esperadas (pode variar, o script tenta detectar)
 *     - Coluna A: Bi-Semana ID (ex: "2026-01")
 *     - Coluna B: Número da Bi-Semana (ex: 1)
 *     - Coluna C: Data de Início
 *     - Coluna D: Data de Fim
 *     - Coluna E (opcional): Descrição
 */

// Carrega variáveis de ambiente
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const EXCEL_FILE_PATH = path.join(__dirname, '..', 'Schema', 'BI SEMANA 2026.xlsx');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/inmidiav3';

/**
 * Converte um valor do Excel para Date do JavaScript
 * @param {any} excelDate - Valor da célula (pode ser Date, número serial do Excel, ou string)
 * @returns {Date|null} - Data convertida ou null se inválido
 */
function parseExcelDate(excelDate) {
    if (!excelDate) return null;
    
    // Se já é um objeto Date
    if (excelDate instanceof Date && !isNaN(excelDate.getTime())) {
        return excelDate;
    }
    
    // Se é um número (serial date do Excel - dias desde 1/1/1900)
    if (typeof excelDate === 'number') {
        // Excel considera 1/1/1900 como dia 1, mas há um bug histórico (1900 não foi bissexto)
        const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // 30/12/1899
        const date = new Date(excelEpoch.getTime() + excelDate * 24 * 60 * 60 * 1000);
        return date;
    }
    
    // Se é uma string, tenta parsear em vários formatos
    if (typeof excelDate === 'string') {
        // Formato DD/MM/YYYY ou DD-MM-YYYY
        const ddmmyyyy = excelDate.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (ddmmyyyy) {
            const day = parseInt(ddmmyyyy[1], 10);
            const month = parseInt(ddmmyyyy[2], 10) - 1; // Mês é 0-indexed
            const year = parseInt(ddmmyyyy[3], 10);
            return new Date(year, month, day);
        }
        
        // Tenta parse padrão
        const parsed = new Date(excelDate);
        if (!isNaN(parsed.getTime())) {
            return parsed;
        }
    }
    
    return null;
}

/**
 * Lê o arquivo Excel e extrai os dados das Bi-Semanas
 * @returns {Promise<Array>} - Array de objetos com dados das Bi-Semanas
 */
async function readExcelFile() {
    console.log(`📂 Lendo arquivo Excel: ${EXCEL_FILE_PATH}`);
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(EXCEL_FILE_PATH);
    
    // Assume que os dados estão na primeira planilha
    const worksheet = workbook.worksheets[0];
    
    if (!worksheet) {
        throw new Error('Nenhuma planilha encontrada no arquivo Excel.');
    }
    
    console.log(`📄 Planilha encontrada: "${worksheet.name}"`);
    console.log(`   Total de linhas: ${worksheet.rowCount}`);
    
    const biWeeksData = [];
    let headerRow = null;
    
    // Detecta a linha de cabeçalho (procura por palavras-chave)
    worksheet.eachRow((row, rowNumber) => {
        if (headerRow) return; // Já encontrou o cabeçalho
        
        const firstCell = row.getCell(1).text.toLowerCase();
        if (firstCell.includes('bi') || firstCell.includes('semana') || firstCell.includes('id')) {
            headerRow = rowNumber;
            console.log(`📋 Cabeçalho detectado na linha ${rowNumber}`);
        }
    });
    
    // Se não encontrou cabeçalho, assume linha 1
    if (!headerRow) {
        console.warn('⚠️  Cabeçalho não detectado. Assumindo linha 1.');
        headerRow = 1;
    }
    
    // Lê os dados a partir da linha após o cabeçalho
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= headerRow) return; // Pula cabeçalho
        
        // Estrutura do arquivo Excel:
        // Coluna A: Número da Bi-Semana (2, 4, 6, 8...)
        // Coluna B: Data de Início
        // Coluna C: Data de Término
        const numeroRaw = row.getCell(1).value;
        const startDateRaw = row.getCell(2).value;
        const endDateRaw = row.getCell(3).value;
        
        // Converte o número
        const numero = typeof numeroRaw === 'number' ? numeroRaw : parseInt(String(numeroRaw), 10);
        if (isNaN(numero) || numero < 1 || numero > 26) {
            console.warn(`⚠️  Linha ${rowNumber}: Número da Bi-Semana inválido (${numeroRaw}), pulando...`);
            return;
        }
        
        // Converte as datas
        const start_date = parseExcelDate(startDateRaw);
        const end_date = parseExcelDate(endDateRaw);
        
        if (!start_date || !end_date) {
            console.warn(`⚠️  Linha ${rowNumber}: Datas inválidas (Início: ${startDateRaw}, Término: ${endDateRaw}), pulando...`);
            return;
        }
        
        // Ajusta para UTC às 00:00:00
        start_date.setUTCHours(0, 0, 0, 0);
        
        // Ajusta end_date para 23:59:59.999
        end_date.setUTCHours(23, 59, 59, 999);
        
        // Extrai o ano da data de início
        const ano = start_date.getFullYear();
        
        // Gera o bi_week_id no formato YYYY-NN (ex: 2026-01, 2026-02)
        const bi_week_id = `${ano}-${String(numero).padStart(2, '0')}`;
        
        biWeeksData.push({
            bi_week_id,
            ano,
            numero,
            start_date,
            end_date,
            descricao: `Bi-Semana ${numero} de ${ano}`,
            ativo: true
        });
    });
    
    console.log(`✅ Total de Bi-Semanas extraídas: ${biWeeksData.length}`);
    return biWeeksData;
}

/**
 * Insere ou atualiza as Bi-Semanas no banco de dados
 * @param {Array} biWeeksData - Array de objetos com dados das Bi-Semanas
 */
async function insertBiWeeks(biWeeksData) {
    console.log('\n💾 Iniciando importação para o MongoDB...');
    
    let inserted = 0;
    let updated = 0;
    let errors = 0;
    
    for (const data of biWeeksData) {
        try {
            // Usa upsert para inserir ou atualizar
            const result = await BiWeek.findOneAndUpdate(
                { bi_week_id: data.bi_week_id }, // Filtro
                data, // Dados para atualizar/inserir
                { 
                    upsert: true, // Cria se não existir
                    new: true, // Retorna o documento atualizado
                    runValidators: true // Executa validações do schema
                }
            );
            
            if (result) {
                // Se foi criado agora, isNew não está disponível aqui, mas podemos verificar se já existia
                const existed = await BiWeek.countDocuments({ 
                    bi_week_id: data.bi_week_id, 
                    createdAt: { $lt: result.createdAt } 
                });
                
                if (existed === 0) {
                    inserted++;
                    console.log(`   ✅ Inserido: ${data.bi_week_id} (${data.start_date.toISOString().split('T')[0]} - ${data.end_date.toISOString().split('T')[0]})`);
                } else {
                    updated++;
                    console.log(`   🔄 Atualizado: ${data.bi_week_id}`);
                }
            }
        } catch (error) {
            errors++;
            console.error(`   ❌ Erro ao processar ${data.bi_week_id}: ${error.message}`);
        }
    }
    
    console.log('\n📊 Resumo da Importação:');
    console.log(`   ✅ Inseridos: ${inserted}`);
    console.log(`   🔄 Atualizados: ${updated}`);
    console.log(`   ❌ Erros: ${errors}`);
}

/**
 * Função principal
 */
async function main() {
    console.log('🚀 Iniciando importação do calendário de Bi-Semanas...\n');
    
    try {
        // 1. Conecta ao MongoDB
        console.log(`🔌 Conectando ao MongoDB: ${MONGODB_URI.replace(/\/\/.*@/, '//***@')}`);
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Conectado ao MongoDB.\n');
        
        // 2. Lê o arquivo Excel
        const biWeeksData = await readExcelFile();
        
        if (biWeeksData.length === 0) {
            console.warn('⚠️  Nenhuma Bi-Semana encontrada no arquivo Excel. Abortando.');
            return;
        }
        
        // 3. Insere/Atualiza no banco
        await insertBiWeeks(biWeeksData);
        
        console.log('\n✅ Importação concluída com sucesso!');
        
    } catch (error) {
        console.error('\n❌ Erro durante a importação:', error);
        process.exit(1);
    } finally {
        // Fecha a conexão com o MongoDB
        await mongoose.connection.close();
        console.log('\n🔌 Conexão com MongoDB fechada.');
    }
}

// Executa o script
if (require.main === module) {
    main().catch(err => {
        console.error('❌ Erro fatal:', err);
        process.exit(1);
    });
}

module.exports = { readExcelFile, insertBiWeeks };
