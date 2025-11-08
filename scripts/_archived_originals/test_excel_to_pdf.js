/**
 * Script para testar a conversão de Excel para PDF
 * Carrega o CONTRATO.xlsx, substitui os placeholders com dados de teste
 * e gera um PDF para visualização
 */

const ExcelJS = require('exceljs');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

async function convertExcelToPDF() {
  console.log('========================================');
  console.log('CONVERSÃO EXCEL -> PDF (TESTE)');
  console.log('========================================\n');

  // 1. CARREGAR O TEMPLATE
  console.log('📄 Carregando template CONTRATO.xlsx...');
  const templatePath = path.join(__dirname, '..', 'CONTRATO.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  const worksheet = workbook.getWorksheet(1);
  
  console.log(`✅ Template carregado: ${worksheet.name}`);
  console.log(`📊 Células mescladas: ${worksheet._merges.length}\n`);

  // 2. DADOS DE TESTE
  console.log('🧪 Preparando dados de teste...');
  const dadosTeste = {
    // AGÊNCIA
    agenciaNome: 'Future Outdoors',
    agenciaCNPJ: '55.710.147/0001-67',
    agenciaEndereco: 'Rua Puebla, 420 - Dionísio Torres, Fortaleza/CE',
    agenciaTelefone: '(85) 99275-1572',
    
    // CLIENTE
    clienteNome: 'Mix Mateus',
    clienteCNPJ: '12.345.678/0001-99',
    clienteEndereco: 'Av. Washington Soares, 1000 - Edson Queiroz, Fortaleza/CE',
    clienteTelefone: '(85) 3333-4444',
    clienteResponsavel: 'João Silva',
    
    // CONTRATO/PI
    piCode: 'PI-TEST-123456',
    titulo: 'Campanha Black Friday 2025',
    produto: 'OUTDOOR',
    periodo: '30 dias',
    formaPagamento: 'PIX',
    autorizacao: 'PI-TEST-123456',
    dataEmissao: '08/11/2025',
    periodoVeiculacao: '08/11/2025 até 08/12/2025',
    
    // VALORES
    valorTotal: 'R$ 2.500,00',
    valorProducao: 'R$ 500,00',
    valorVeiculacao: 'R$ 2.000,00'
  };

  // 3. SUBSTITUIR PLACEHOLDERS
  console.log('🔄 Substituindo placeholders...\n');
  
  const placeholders = {
    '{{AGENCIA_NOME}}': dadosTeste.agenciaNome,
    '{{AGENCIA_CNPJ}}': dadosTeste.agenciaCNPJ,
    '{{AGENCIA_ENDERECO}}': dadosTeste.agenciaEndereco,
    '{{AGENCIA_TELEFONE}}': dadosTeste.agenciaTelefone,
    '{{CLIENTE_NOME}}': dadosTeste.clienteNome,
    '{{CLIENTE_CNPJ}}': dadosTeste.clienteCNPJ,
    '{{CLIENTE_ENDERECO}}': dadosTeste.clienteEndereco,
    '{{CLIENTE_TELEFONE}}': dadosTeste.clienteTelefone,
    '{{CLIENTE_RESPONSAVEL}}': dadosTeste.clienteResponsavel,
    '{{PI_CODE}}': dadosTeste.piCode,
    '{{TITULO}}': dadosTeste.titulo,
    '{{PRODUTO}}': dadosTeste.produto,
    '{{PERIODO}}': dadosTeste.periodo,
    '{{FORMA_PAGAMENTO}}': dadosTeste.formaPagamento,
    '{{AUTORIZACAO}}': dadosTeste.autorizacao,
    '{{DATA_EMISSAO}}': dadosTeste.dataEmissao,
    '{{PERIODO_VEICULACAO}}': dadosTeste.periodoVeiculacao,
    '{{VALOR_TOTAL}}': dadosTeste.valorTotal,
    '{{VALOR_PRODUCAO}}': dadosTeste.valorProducao,
    '{{VALOR_VEICULACAO}}': dadosTeste.valorVeiculacao
  };

  let substituicoes = 0;
  
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      if (cell.value && typeof cell.value === 'string') {
        let valorOriginal = cell.value;
        let valorNovo = valorOriginal;
        
        for (const [placeholder, valor] of Object.entries(placeholders)) {
          if (valorNovo.includes(placeholder)) {
            valorNovo = valorNovo.replace(new RegExp(placeholder, 'g'), valor || '');
            substituicoes++;
          }
        }
        
        if (valorNovo !== valorOriginal) {
          console.log(`   ${cell.address}: "${valorOriginal.substring(0, 50)}" => "${valorNovo.substring(0, 50)}"`);
          cell.value = valorNovo;
        }
      }
    });
  });
  
  console.log(`\n✅ Total de ${substituicoes} substituições realizadas\n`);

  // 4. GERAR BUFFER DO EXCEL
  console.log('💾 Gerando buffer do Excel...');
  const excelBuffer = await workbook.xlsx.writeBuffer();
  console.log(`✅ Buffer gerado: ${excelBuffer.length} bytes\n`);
  
  // 5. SALVAR EXCEL TEMPORÁRIO (para visualização)
  console.log('💾 Salvando Excel temporário...');
  const excelTempPath = path.join(__dirname, 'TESTE_CONTRATO.xlsx');
  await fs.writeFile(excelTempPath, excelBuffer);
  console.log(`✅ Excel salvo: ${excelTempPath}\n`);

  // 6. CONVERTER PARA PDF USANDO O EXCELSERVICEV2
  console.log('📄 Convertendo Excel para PDF usando ExcelServiceV2...');
  
  const excelService = require('../services/excelServiceV2');
  const pdfBuffer = await excelService.convertExcelToPDF(excelBuffer);
  
  const pdfPath = path.join(__dirname, 'TESTE_CONTRATO.pdf');
  await fs.writeFile(pdfPath, pdfBuffer);
  
  console.log(`✅ PDF gerado: ${pdfPath}\n`);

  // 7. ESTATÍSTICAS FINAIS
  console.log('========================================');
  console.log('📊 RESUMO:');
  console.log(`   - Template: CONTRATO.xlsx`);
  console.log(`   - Worksheet: ${worksheet.name}`);
  console.log(`   - Células mescladas: ${worksheet._merges.length}`);
  console.log(`   - Substituições: ${substituicoes}`);
  console.log(`   - Excel gerado: TESTE_CONTRATO.xlsx`);
  console.log(`   - PDF gerado: TESTE_CONTRATO.pdf`);
  console.log('========================================\n');
  
  console.log('✅ Conversão concluída!');
  console.log('📂 Abra o arquivo TESTE_CONTRATO.pdf para visualizar');
}

convertExcelToPDF()
  .then(() => {
    console.log('\n✨ Script executado com sucesso!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Erro na conversão:', err);
    process.exit(1);
  });
