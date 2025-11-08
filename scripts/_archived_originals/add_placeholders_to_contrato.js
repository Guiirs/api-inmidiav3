/**
 * Script para adicionar placeholders ao CONTRATO.xlsx
 * mantendo TODO o estilo/layout original
 */

const ExcelJS = require('exceljs');
const path = require('path');

async function addPlaceholders() {
  console.log('========================================');
  console.log('ADICIONANDO PLACEHOLDERS AO CONTRATO.xlsx');
  console.log('========================================\n');

  const templatePath = path.join(__dirname, '../CONTRATO.xlsx');
  const outputPath = path.join(__dirname, '../CONTRATO_COM_PLACEHOLDERS.xlsx');
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  
  const worksheet = workbook.getWorksheet(1);
  console.log(`Template carregado: ${worksheet.name}\n`);
  
  // Mapeamento de valores estáticos -> placeholders
  const replacements = {
    // AGÊNCIA (colunas H-AE, linhas 1-7)
    'Agência: FUTURE OUTDOOR': 'Agência: {{AGENCIA_NOME}}',
    'CNPJ: 07.292.563/0001-09': 'CNPJ: {{AGENCIA_CNPJ}}',
    'Endereço: Av. Santos Dumont, 2277 - Sala 913 - Aldeota, Fortaleza - CE, 60150-161': 'Endereço: {{AGENCIA_ENDERECO}}',
    'Telefone: 85 3237.3305': 'Telefone: {{AGENCIA_TELEFONE}}',
    
    // ANUNCIANTE (colunas AF-BA, linhas 1-7)
    'Anunciante: Mix Mateus': 'Anunciante: {{CLIENTE_NOME}}',
    'CNPJ/CPF: 07.216.469/0001-30': 'CNPJ/CPF: {{CLIENTE_CNPJ}}',
    'Endereço: R. Osvaldo Cruz, 1000 - Centro, Fortaleza - CE - 60.125-150': 'Endereço: {{CLIENTE_ENDERECO}}',
    
    // LINHA 8 (títulos/cabeçalhos)
    'Título': '{{TITULO}}',
    'OUTDOOR': '{{PRODUTO}}',
    'BISEMANA 26': '{{PERIODO}}',
    'BOLETO BANCÁRIO': '{{FORMA_PAGAMENTO}}',
    
    // LINHA 9-10 (duplicados)
    'Data emissão: 18/06/2025': 'Data emissão: {{DATA_EMISSAO}}',
    'Autorização Nº:': 'Autorização Nº: {{AUTORIZACAO}}',
    
    // LINHA 11
    'Período de veiculação: BISEMANA 26': 'Período de veiculação: {{PERIODO_VEICULACAO}}',
    
    // OBSERVAÇÕES/VALORES
    'VALOR PRODUÇÃO: R$ ': 'VALOR PRODUÇÃO: R$ {{VALOR_PRODUCAO}}',
    'VENCIMENTO VEICULAÇÃO: 25/06/2025  VALOR VEICULAÇÃO: R$  - Faturamento pelo líquido, sem emissão de NF.': 
      'VENCIMENTO VEICULAÇÃO: {{DATA_FIM}}  VALOR VEICULAÇÃO: R$ {{VALOR_VEICULACAO}} - Faturamento pelo líquido, sem emissão de NF.',
    'CONTRATO:': 'CONTRATO: {{PI_CODE}}'
  };
  
  let contador = 0;
  
  // Percorrer TODAS as células e substituir valores
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      if (cell.value && typeof cell.value === 'string') {
        // Verificar se o valor atual deve ser substituído
        for (const [original, placeholder] of Object.entries(replacements)) {
          if (cell.value.includes(original)) {
            const novoValor = cell.value.replace(original, placeholder);
            console.log(`${cell.address}: "${cell.value}" => "${novoValor}"`);
            cell.value = novoValor;
            contador++;
            break;
          }
        }
      }
    });
  });
  
  console.log(`\n${contador} substituições realizadas`);
  
  // Salvar novo arquivo
  await workbook.xlsx.writeFile(outputPath);
  
  console.log(`\n✅ Arquivo salvo: ${outputPath}`);
  console.log('\nPRÓXIMOS PASSOS:');
  console.log('1. Revise o arquivo CONTRATO_COM_PLACEHOLDERS.xlsx');
  console.log('2. Ajuste os placeholders conforme necessário');
  console.log('3. Renomeie para CONTRATO.xlsx (substitua o original)');
  console.log('4. Execute novamente o teste de geração');
}

addPlaceholders().catch(console.error);
