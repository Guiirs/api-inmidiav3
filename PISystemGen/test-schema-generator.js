/**
 * ===================================================
 * TESTE DO GERADOR DE PI COM SCHEMA
 * ===================================================
 * 
 * Script para testar a geração de Excel/PDF usando o schema
 */

const mongoose = require('mongoose');
const config = require('../config/config');
const ExcelService = require('../services/excelServiceV2');
const schemaLoader = require('../services/schemaLoader');
const Contrato = require('../models/Contrato');
const Empresa = require('../models/Empresa');
const Cliente = require('../models/Cliente');
const PropostaInterna = require('../models/PropostaInterna');
const fs = require('fs').promises;
const path = require('path');

async function testSchemaLoader() {
  console.log('\n=== TESTE 1: Schema Loader ===\n');
  
  try {
    // Carregar schema
    await schemaLoader.loadSchema();
    
    // Estatísticas
    const stats = schemaLoader.getStats();
    console.log('📊 Estatísticas do Schema:');
    console.log(`   - Total de células: ${stats.totalCells}`);
    console.log(`   - Total de placeholders: ${stats.totalPlaceholders}`);
    console.log(`   - Template: ${stats.template}`);
    console.log(`   - Analisado em: ${stats.analyzedAt}`);
    
    // Verificar se o schema foi carregado
    if (stats.totalCells === 0) {
      console.log('\n❌ Schema vazio!');
      return false;
    }
    
    console.log('\n✅ Schema carregado com sucesso!');
    
    // Avisar se não há placeholders
    if (stats.totalPlaceholders === 0) {
      console.log('\n⚠️  IMPORTANTE: Nenhum placeholder encontrado no template!');
      console.log('   O template CONTRATO.xlsx não contém placeholders {{XXX}}');
      console.log('   O sistema usará o método de preenchimento direto via mapping');
      console.log('   Para usar placeholders, edite o arquivo Schema/CONTRATO.xlsx');
    } else {
      // Listar placeholders encontrados
      console.log('\n📝 Placeholders encontrados:');
      stats.placeholders.forEach((ph, i) => {
        const cells = schemaLoader.getCellsByPlaceholder(ph);
        console.log(`   ${i + 1}. ${ph} -> ${cells.length} célula(s)`);
      });
    }
    
    // Testar busca por célula
    console.log('\n🔍 Teste de busca por célula:');
    const cellH1 = schemaLoader.getCellByAddress('H1');
    if (cellH1) {
      console.log(`   H1: ${cellH1.value}`);
    }
    
    console.log('\n✅ Schema Loader funcionando corretamente!\n');
    return true;
  } catch (error) {
    console.error('❌ Erro no Schema Loader:', error);
    return false;
  }
}

async function testExcelGeneration() {
  console.log('\n=== TESTE 2: Geração de Excel ===\n');
  
  try {
    // Conectar ao MongoDB
    const mongoUri = config.mongoUri || process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.log('⚠️  MongoDB URI não configurada - pulando teste');
      console.log('   Configure MONGODB_URI no .env para testar geração');
      return 'skipped';
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado ao MongoDB');
    
    // Buscar primeiro contrato com PI válida
    const contrato = await Contrato.findOne({ pi: { $ne: null } })
      .populate('empresa')
      .populate({ path: 'pi', populate: { path: 'cliente' } })
      .lean();
    
    if (!contrato) {
      console.log('⚠️  Nenhum contrato com PI encontrado no banco');
      console.log('   Crie um contrato com PI para testar a geração');
      return 'skipped';
    }
    
    if (!contrato.pi) {
      console.log('⚠️  Contrato encontrado mas sem PI vinculada');
      return 'skipped';
    }
    
    if (!contrato.pi.cliente) {
      console.log('⚠️  PI encontrada mas sem cliente vinculado');
      return 'skipped';
    }
    
    console.log(`📄 Contrato encontrado: ${contrato._id}`);
    console.log(`   PI: ${contrato.pi?.pi_code}`);
    console.log(`   Cliente: ${contrato.pi?.cliente?.nome}`);
    console.log(`   Empresa: ${contrato.empresa?.nome}`);
    
    // Gerar Excel
    console.log('\n📊 Gerando Excel...');
    const buffer = await ExcelService.generateContratoExcel(
      contrato.pi,
      contrato.pi.cliente,
      contrato.empresa,
      { name: 'Teste' }
    );
    
    // Salvar arquivo de teste
    const outputDir = path.join(__dirname, '../test-outputs');
    await fs.mkdir(outputDir, { recursive: true });
    
    const filename = `test_contrato_${Date.now()}.xlsx`;
    const filepath = path.join(outputDir, filename);
    await fs.writeFile(filepath, buffer);
    
    console.log(`✅ Excel gerado: ${filepath}`);
    console.log(`   Tamanho: ${(buffer.length / 1024).toFixed(2)} KB`);
    
    return filepath;
  } catch (error) {
    console.error('❌ Erro na geração de Excel:', error.message);
    return false;
  }
}

async function testPDFGeneration() {
  console.log('\n=== TESTE 3: Geração de PDF ===\n');
  
  try {
    // Verificar se MongoDB está conectado
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️  MongoDB não conectado - pulando teste');
      return 'skipped';
    }
    
    // Buscar primeiro contrato com PI válida
    const contrato = await Contrato.findOne({ pi: { $ne: null } })
      .populate('empresa')
      .populate({ path: 'pi', populate: { path: 'cliente' } })
      .lean();
    
    if (!contrato || !contrato.pi || !contrato.pi.cliente) {
      console.log('⚠️  Nenhum contrato válido com PI e cliente encontrado');
      return 'skipped';
    }
    
    console.log(`📄 Contrato: ${contrato._id}`);
    
    // Gerar PDF
    console.log('\n📄 Gerando PDF...');
    const buffer = await ExcelService.generateContratoPDF(
      contrato.pi,
      contrato.pi.cliente,
      contrato.empresa,
      { name: 'Teste' }
    );
    
    // Salvar arquivo de teste
    const outputDir = path.join(__dirname, '../test-outputs');
    const filename = `test_contrato_${Date.now()}.pdf`;
    const filepath = path.join(outputDir, filename);
    await fs.writeFile(filepath, buffer);
    
    console.log(`✅ PDF gerado: ${filepath}`);
    console.log(`   Tamanho: ${(buffer.length / 1024).toFixed(2)} KB`);
    
    return filepath;
  } catch (error) {
    console.error('❌ Erro na geração de PDF:', error.message);
    return false;
  }
}

async function testPlaceholderMapping() {
  console.log('\n=== TESTE 4: Mapeamento de Placeholders ===\n');
  
  try {
    const mappingPath = path.join(__dirname, '../Schema/placeholder_mapping.json');
    const content = await fs.readFile(mappingPath, 'utf8');
    const mapping = JSON.parse(content);
    
    console.log('📋 Mapeamentos carregados:');
    console.log(`   - Total de campos: ${Object.keys(mapping.mappings).length}`);
    console.log(`   - Configuração de placas: ${mapping.placasTable ? 'OK' : 'NÃO ENCONTRADA'}`);
    
    // Mostrar alguns exemplos
    console.log('\n🔍 Exemplos de mapeamentos:');
    const samples = ['AGENCIA_NOME', 'CLIENTE_NOME', 'PI_CODE', 'VALOR_TOTAL'];
    samples.forEach(key => {
      const config = mapping.mappings[key];
      if (config) {
        console.log(`   - ${key}:`);
        console.log(`     Células: ${config.cells.join(', ')}`);
        console.log(`     Formato: ${config.format}`);
      }
    });
    
    console.log('\n✅ Mapeamento carregado com sucesso!\n');
    return true;
  } catch (error) {
    console.error('❌ Erro ao carregar mapeamento:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   TESTE DO GERADOR DE PI COM SCHEMA                   ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  
  const results = {
    schemaLoader: false,
    placeholderMapping: false,
    excelGeneration: false,
    pdfGeneration: false
  };
  
  try {
    // Teste 1: Schema Loader
    results.schemaLoader = await testSchemaLoader();
    
    // Teste 4: Mapeamento (antes de conectar ao DB)
    results.placeholderMapping = await testPlaceholderMapping();
    
    // Testes que precisam do DB
    results.excelGeneration = await testExcelGeneration();
    results.pdfGeneration = await testPDFGeneration();
    
  } catch (error) {
    console.error('\n❌ Erro geral nos testes:', error);
  } finally {
    // Desconectar do MongoDB
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('\n✅ Desconectado do MongoDB');
    }
  }
  
  // Resumo
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   RESUMO DOS TESTES                                   ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('');
  
  Object.entries(results).forEach(([test, passed]) => {
    let status;
    if (passed === 'skipped') {
      status = '⏭️  PULADO';
    } else if (passed) {
      status = '✅ PASSOU';
    } else {
      status = '❌ FALHOU';
    }
    const testName = test.replace(/([A-Z])/g, ' $1').trim();
    console.log(`${status} - ${testName}`);
  });
  
  const totalPassed = Object.values(results).filter(r => r === true).length;
  const totalSkipped = Object.values(results).filter(r => r === 'skipped').length;
  const totalFailed = Object.values(results).filter(r => r === false).length;
  const totalTests = Object.keys(results).length;
  
  console.log('');
  console.log(`Resultado: ${totalPassed} passaram, ${totalSkipped} pulados, ${totalFailed} falharam de ${totalTests} testes`);
  
  if (totalSkipped > 0) {
    console.log('\n💡 Alguns testes foram pulados:');
    if (results.excelGeneration === 'skipped' || results.pdfGeneration === 'skipped') {
      console.log('   - Não há contratos válidos no banco de dados');
      console.log('   - Crie uma Empresa, Cliente, PI e Contrato vinculados');
      console.log('   - Execute os testes novamente para testar geração completa');
    }
  }
  
  console.log('');
  
  // Passar se os testes essenciais passaram (schema e mapping)
  const essentialPassed = results.schemaLoader === true && results.placeholderMapping === true;
  process.exit(essentialPassed ? 0 : 1);
}

// Executar testes
runAllTests().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
