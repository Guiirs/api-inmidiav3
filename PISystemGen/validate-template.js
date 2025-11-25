/**
 * ===================================================
 * VALIDADOR DE TEMPLATE CONTRATO.XLSX
 * ===================================================
 * 
 * Valida se o template atual corresponde ao schema
 * e verifica se todos os placeholders estão presentes
 */

const schemaLoader = require('../services/schemaLoader');
const path = require('path');
const ExcelJS = require('exceljs');

async function validateTemplate() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║   VALIDADOR DE TEMPLATE CONTRATO.XLSX                 ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  try {
    // 1. Carregar schema
    console.log('📋 Carregando schema...');
    await schemaLoader.loadSchema();
    const stats = schemaLoader.getStats();
    console.log(`✅ Schema carregado: ${stats.totalCells} células, ${stats.totalPlaceholders} placeholders\n`);

    // 2. Carregar template
    console.log('📊 Carregando template...');
    const templatePath = path.join(__dirname, '../Schema/CONTRATO.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.getWorksheet(1);
    console.log(`✅ Template carregado: ${worksheet.name}\n`);

    // 3. Validar estrutura
    console.log('🔍 Validando estrutura...');
    const validation = await schemaLoader.validateTemplate(templatePath);
    
    if (validation.errors.length > 0) {
      console.log('❌ ERROS ENCONTRADOS:');
      validation.errors.forEach((err, i) => {
        console.log(`   ${i + 1}. Célula ${err.address}: ${err.message}`);
      });
    } else {
      console.log('✅ Nenhum erro estrutural encontrado');
    }

    if (validation.warnings.length > 0) {
      console.log('\n⚠️  AVISOS:');
      validation.warnings.forEach((warn, i) => {
        console.log(`   ${i + 1}. Célula ${warn.address}:`);
        console.log(`      Esperado: ${warn.expected}`);
        console.log(`      Encontrado: ${warn.found}`);
      });
    }

    // 4. Verificar placeholders
    console.log('\n🔍 Verificando placeholders...');
    const mapping = schemaLoader.getPlaceholderMapping();
    const placeholderStatus = {};
    
    Object.keys(mapping).forEach(placeholder => {
      const cells = mapping[placeholder];
      let found = 0;
      
      cells.forEach(cellInfo => {
        const cell = worksheet.getCell(cellInfo.address);
        const value = cell.value;
        
        if (value && typeof value === 'string' && value.includes(`{{${placeholder}}}`)) {
          found++;
        }
      });
      
      placeholderStatus[placeholder] = {
        total: cells.length,
        found: found,
        missing: cells.length - found
      };
    });

    // Resumo de placeholders
    console.log('\n📊 Status dos Placeholders:\n');
    
    const found = Object.entries(placeholderStatus).filter(([_, s]) => s.found > 0);
    const missing = Object.entries(placeholderStatus).filter(([_, s]) => s.found === 0);
    
    if (found.length > 0) {
      console.log('✅ ENCONTRADOS:');
      found.forEach(([ph, status]) => {
        console.log(`   ${ph}: ${status.found}/${status.total} célula(s)`);
      });
    }
    
    if (missing.length > 0) {
      console.log('\n❌ AUSENTES:');
      missing.forEach(([ph, status]) => {
        const cells = mapping[ph].map(c => c.address).join(', ');
        console.log(`   ${ph} (células esperadas: ${cells})`);
      });
    }

    // 5. Verificar mapeamento JSON
    console.log('\n🔍 Verificando placeholder_mapping.json...');
    const fs = require('fs').promises;
    const mappingPath = path.join(__dirname, '../Schema/placeholder_mapping.json');
    
    try {
      const mappingContent = await fs.readFile(mappingPath, 'utf8');
      const mappingConfig = JSON.parse(mappingContent);
      
      console.log(`✅ Mapeamento carregado`);
      console.log(`   - Campos: ${Object.keys(mappingConfig.mappings).length}`);
      console.log(`   - Tabela de placas: ${mappingConfig.placasTable ? 'Configurada' : 'NÃO CONFIGURADA'}`);
      
      // Verificar se todos os campos do mapping estão no schema
      const schemaPlaceholders = stats.placeholders;
      const mappingPlaceholders = Object.keys(mappingConfig.mappings);
      
      const onlyInMapping = mappingPlaceholders.filter(p => !schemaPlaceholders.includes(p));
      const onlyInSchema = schemaPlaceholders.filter(p => !mappingPlaceholders.includes(p));
      
      if (onlyInMapping.length > 0) {
        console.log('\n⚠️  Campos no mapping mas não no schema:');
        onlyInMapping.forEach(p => console.log(`   - ${p}`));
      }
      
      if (onlyInSchema.length > 0) {
        console.log('\n⚠️  Placeholders no schema mas não no mapping:');
        onlyInSchema.forEach(p => console.log(`   - ${p}`));
      }
      
    } catch (err) {
      console.log('❌ Erro ao carregar mapeamento:', err.message);
    }

    // 6. Verificar células mescladas
    console.log('\n🔍 Verificando células mescladas...');
    const mergedCells = worksheet.model.merges || [];
    console.log(`✅ Total de células mescladas: ${mergedCells.length}`);
    
    if (mergedCells.length > 0) {
      console.log('   Exemplos:');
      mergedCells.slice(0, 5).forEach(merge => {
        console.log(`   - ${merge}`);
      });
      if (mergedCells.length > 5) {
        console.log(`   ... e mais ${mergedCells.length - 5}`);
      }
    }

    // 7. Resumo final
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║   RESUMO DA VALIDAÇÃO                                 ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');
    
    const totalPlaceholders = Object.keys(placeholderStatus).length;
    const foundPlaceholders = found.length;
    const missingPlaceholders = missing.length;
    
    console.log(`📊 Estatísticas:`);
    console.log(`   - Células no schema: ${stats.totalCells}`);
    console.log(`   - Células mescladas: ${mergedCells.length}`);
    console.log(`   - Placeholders esperados: ${totalPlaceholders}`);
    console.log(`   - Placeholders encontrados: ${foundPlaceholders} ✅`);
    console.log(`   - Placeholders ausentes: ${missingPlaceholders} ${missingPlaceholders > 0 ? '❌' : '✅'}`);
    
    console.log('\n📝 Status:');
    if (validation.errors.length === 0 && missingPlaceholders === 0) {
      console.log('   ✅ Template está VÁLIDO e pronto para uso!');
    } else if (validation.errors.length > 0) {
      console.log('   ❌ Template possui ERROS que precisam ser corrigidos');
    } else if (missingPlaceholders > 0) {
      console.log('   ⚠️  Template funciona mas alguns placeholders estão ausentes');
      console.log('       O sistema usará valores padrão para esses campos');
    }
    
    console.log('\n💡 Ações recomendadas:');
    if (missingPlaceholders > 0) {
      console.log('   1. Edite Schema/CONTRATO.xlsx');
      console.log('   2. Adicione os placeholders ausentes');
      console.log('   3. Execute este validador novamente');
    } else {
      console.log('   1. Execute os testes: node PISystemGen/test-schema-generator.js');
      console.log('   2. Gere um contrato de teste via API');
      console.log('   3. Valide visualmente o PDF gerado');
    }
    
    console.log('');
    
    // Retornar código de saída
    const exitCode = (validation.errors.length === 0 && missingPlaceholders === 0) ? 0 : 1;
    process.exit(exitCode);
    
  } catch (error) {
    console.error('\n❌ ERRO na validação:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Executar validação
validateTemplate();
