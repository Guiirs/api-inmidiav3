/**
 * Script para adicionar TODOS os placeholders faltantes no CONTRATO.xlsx
 * baseado na estrutura identificada
 */

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function adicionarPlaceholders() {
  // movido para scripts/template-tools -> precisa subir dois níveis para chegar no root BECKEND
  const templatePath = path.join(__dirname, '..', '..', 'CONTRATO.xlsx');
  const backupPath = path.join(__dirname, '..', '..', 'CONTRATO_BACKUP_BEFORE_FIX.xlsx');
  
  console.log('========================================');
  console.log('ADICIONANDO PLACEHOLDERS NO TEMPLATE');
  console.log('========================================\n');
  
  // Backup do arquivo atual
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(templatePath, backupPath);
    console.log(`✅ Backup criado: ${backupPath}\n`);
  }
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  const worksheet = workbook.getWorksheet(1);
  
  console.log('Adicionando/Corrigindo placeholders...\n');
  
  // MAPEAMENTO DE CÉLULAS -> PLACEHOLDERS
  const placeholders = [
    // Linha 1 - Anunciante (AF1 já tem "Anunciante:" - vamos adicionar o nome)
    { cell: 'AF1', value: 'Anunciante: {{CLIENTE_NOME}}' },
    
    // Linha 2 - Razão Social (H2 já tem parte do texto)
    // A célula H2 precisa ser atualizada manualmente pelo script anterior
    { cell: 'H2', value: 'Razão Social: {{AGENCIA_NOME}}' },
    { cell: 'AF2', value: 'Razão Social: {{CLIENTE_NOME}}' },
    
    // Linha 3 - Endereços
    { cell: 'H3', value: 'Endereço: {{AGENCIA_ENDERECO}}' },
    { cell: 'AF3', value: 'Endereço: {{CLIENTE_ENDERECO}}' },
    
    // Linha 6 - CNPJs
    { cell: 'H6', value: 'CNPJ/CPF: {{AGENCIA_CNPJ}}' },
    { cell: 'AF6', value: 'CNPJ: {{CLIENTE_CNPJ}}' },
    
    // Linha 7 - Telefone e Responsável (AF7 já tem "Responsável: ... Telefone:")
    { cell: 'AF7', value: 'Responsável: {{CLIENTE_RESPONSAVEL}}      Telefone: {{CLIENTE_TELEFONE}}' },
    
    // Linha 13 - Valores (células AR13, AW13)
    { cell: 'AR13', value: '{{VALOR_PRODUCAO}}' },
    { cell: 'AS13', value: '{{VALOR_PRODUCAO}}' },
    { cell: 'AT13', value: '{{VALOR_PRODUCAO}}' },
    { cell: 'AU13', value: '{{VALOR_PRODUCAO}}' },
    { cell: 'AV13', value: '{{VALOR_PRODUCAO}}' },
    { cell: 'AW13', value: '{{VALOR_VEICULACAO}}' },
    { cell: 'AX13', value: '{{VALOR_VEICULACAO}}' },
    { cell: 'AY13', value: '{{VALOR_VEICULACAO}}' },
    { cell: 'AZ13', value: '{{VALOR_VEICULACAO}}' },
    { cell: 'BA13', value: '{{VALOR_VEICULACAO}}' },
    
    // Linha 14 - Período de veiculação
    { cell: 'A14', value: '{{PERIODO_VEICULACAO}}' },
    
    // Linha 23 - Valor Total (AR23 já tem "VALOR TOTAL")
    { cell: 'AW23', value: '{{VALOR_TOTAL}}' },
    { cell: 'AX23', value: '{{VALOR_TOTAL}}' },
    { cell: 'AY23', value: '{{VALOR_TOTAL}}' },
    { cell: 'AZ23', value: '{{VALOR_TOTAL}}' },
    { cell: 'BA23', value: '{{VALOR_TOTAL}}' },
  ];
  
  let contador = 0;
  
  for (const ph of placeholders) {
    const cell = worksheet.getCell(ph.cell);
    const valorAnterior = cell.value || '(vazio)';
    
    // Preservar estilo da célula
    const style = {
      font: cell.font,
      alignment: cell.alignment,
      fill: cell.fill,
      border: cell.border,
      numFmt: cell.numFmt
    };
    
    // Atualizar valor
    cell.value = ph.value;
    
    // Restaurar estilo
    cell.font = style.font;
    cell.alignment = style.alignment;
    cell.fill = style.fill;
    cell.border = style.border;
    cell.numFmt = style.numFmt;
    
    console.log(`${ph.cell}: "${String(valorAnterior).substring(0, 50)}" => "${ph.value}"`);
    contador++;
  }
  
  console.log(`\n✅ Total de ${contador} células atualizadas`);
  
  // Salvar o arquivo
  await workbook.xlsx.writeFile(templatePath);
  console.log(`\n💾 Arquivo salvo: ${templatePath}`);
  
  console.log('\n========================================');
  console.log('PRÓXIMOS PASSOS:');
  console.log('1. Verifique o arquivo CONTRATO.xlsx');
  console.log('2. Reinicie o servidor');
  console.log('3. Teste o download: /api/v1/test-excel/690eb6b615404e19f281d603');
  console.log('========================================');
}

adicionarPlaceholders()
  .then(() => {
    console.log('\n✅ Placeholders adicionados com sucesso!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Erro ao adicionar placeholders:', err);
    process.exit(1);
  });