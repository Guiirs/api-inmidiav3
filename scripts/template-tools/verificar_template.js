/**
 * Script para verificar quais placeholders existem no CONTRATO.xlsx
 * e mostrar onde deveriam estar os campos faltantes
 */

const ExcelJS = require('exceljs');
const path = require('path');

async function verificarTemplate() {
  // movido para scripts/template-tools -> precisa subir dois níveis para chegar no root BECKEND
  const templatePath = path.join(__dirname, '..', '..', 'CONTRATO.xlsx');
  
  console.log('========================================');
  console.log('VERIFICAÇÃO DO TEMPLATE CONTRATO.xlsx');
  console.log('========================================\n');
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  const worksheet = workbook.getWorksheet(1);
  
  console.log(`📄 Worksheet: ${worksheet.name}`);
  console.log(`📊 Dimensões: ${worksheet.rowCount} linhas\n`);
  
  // Placeholders que DEVERIAM existir
  const placeholdersEsperados = [
    '{{AGENCIA_NOME}}',
    '{{AGENCIA_CNPJ}}',
    '{{AGENCIA_ENDERECO}}',
    '{{AGENCIA_TELEFONE}}',
    '{{CLIENTE_NOME}}',
    '{{CLIENTE_CNPJ}}',
    '{{CLIENTE_ENDERECO}}',
    '{{CLIENTE_TELEFONE}}',
    '{{CLIENTE_RESPONSAVEL}}',
    '{{CLIENTE_SEGMENTO}}',
    '{{PI_CODE}}',
    '{{TITULO}}',
    '{{PRODUTO}}',
    '{{PERIODO}}',
    '{{MES}}',
    '{{FORMA_PAGAMENTO}}',
    '{{SEGMENTO}}',
    '{{CONTATO}}',
    '{{AUTORIZACAO}}',
    '{{DATA_EMISSAO}}',
    '{{DATA_INICIO}}',
    '{{DATA_FIM}}',
    '{{PERIODO_VEICULACAO}}',
    '{{VALOR_TOTAL}}',
    '{{VALOR_PRODUCAO}}',
    '{{VALOR_VEICULACAO}}'
  ];
  
  const placeholdersEncontrados = new Set();
  const celulasComTexto = [];
  
  // Analisar todas as células
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      const value = cell.value;
      
      if (value && typeof value === 'string') {
        // Verificar se contém placeholders
        placeholdersEsperados.forEach(ph => {
          if (value.includes(ph)) {
            placeholdersEncontrados.add(ph);
          }
        });
        
        // Guardar células com texto relevante
        const textoLower = value.toLowerCase();
        if (
          textoLower.includes('agência') ||
          textoLower.includes('agencia') ||
          textoLower.includes('cliente') ||
          textoLower.includes('anunciante') ||
          textoLower.includes('cnpj') ||
          textoLower.includes('telefone') ||
          textoLower.includes('endereço') ||
          textoLower.includes('endereco') ||
          textoLower.includes('valor') ||
          textoLower.includes('autorização') ||
          textoLower.includes('autorizacao') ||
          textoLower.includes('contrato') ||
          textoLower.includes('data') ||
          textoLower.includes('período') ||
          textoLower.includes('periodo') ||
          textoLower.includes('veiculação') ||
          textoLower.includes('veiculacao') ||
          textoLower.includes('total') ||
          textoLower.includes('produção') ||
          textoLower.includes('producao') ||
          textoLower.includes('outdoor') ||
          textoLower.includes('forma de pagamento')
        ) {
          celulasComTexto.push({
            endereco: cell.address,
            linha: rowNumber,
            coluna: colNumber,
            valor: value.substring(0, 100) // Limitar tamanho
          });
        }
      }
    });
  });
  
  // Relatório
  console.log('✅ PLACEHOLDERS ENCONTRADOS:');
  if (placeholdersEncontrados.size === 0) {
    console.log('   ❌ NENHUM PLACEHOLDER ENCONTRADO!\n');
  } else {
    placeholdersEncontrados.forEach(ph => {
      console.log(`   - ${ph}`);
    });
    console.log('');
  }
  
  console.log('❌ PLACEHOLDERS FALTANDO:');
  const faltando = placeholdersEsperados.filter(ph => !placeholdersEncontrados.has(ph));
  if (faltando.length === 0) {
    console.log('   ✅ Todos os placeholders estão presentes!\n');
  } else {
    faltando.forEach(ph => {
      console.log(`   - ${ph}`);
    });
    console.log('');
  }
  
  console.log('📍 CÉLULAS RELEVANTES (onde adicionar placeholders):');
  console.log('─'.repeat(80));
  celulasComTexto.forEach(c => {
    console.log(`${c.endereco.padEnd(6)} | Linha ${String(c.linha).padStart(3)} | ${c.valor}`);
  });
  console.log('─'.repeat(80));
  
  console.log('\n📋 ESTATÍSTICAS:');
  console.log(`   Total de placeholders esperados: ${placeholdersEsperados.length}`);
  console.log(`   Placeholders encontrados: ${placeholdersEncontrados.size}`);
  console.log(`   Placeholders faltando: ${faltando.length}`);
  console.log(`   Células relevantes encontradas: ${celulasComTexto.length}`);
  
  console.log('\n========================================');
}

verificarTemplate()
  .then(() => {
    console.log('✅ Verificação concluída!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erro na verificação:', err);
    process.exit(1);
  });