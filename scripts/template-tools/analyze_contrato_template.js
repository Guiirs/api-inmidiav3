/**
 * Script para analisar o template CONTRATO.xlsx
 * e mapear todas as células e seus valores
 */

const ExcelJS = require('exceljs');
const path = require('path');

async function analyzeTemplate() {
  console.log('========================================');
  console.log('ANALISANDO CONTRATO.xlsx');
  console.log('========================================\n');

  // movido para scripts/template-tools -> precisa subir dois níveis para chegar no root BECKEND
  const templatePath = path.join(__dirname, '..', '..', 'CONTRATO.xlsx');
  const workbook = new ExcelJS.Workbook();
  
  try {
    await workbook.xlsx.readFile(templatePath);
    
    const worksheet = workbook.getWorksheet(1);
    console.log(`Nome da planilha: ${worksheet.name}`);
    console.log(`Dimensões: ${worksheet.rowCount} linhas x ${worksheet.columnCount} colunas\n`);
    
    console.log('========================================');
    console.log('CÉLULAS COM CONTEÚDO:');
    console.log('========================================\n');
    
    const cellsData = [];
    
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        if (cell.value) {
          const cellAddress = cell.address;
          let value = cell.value;
          
          // Se for fórmula, pegar o resultado
          if (cell.formula) {
            value = `FORMULA: ${cell.formula}`;
          }
          // Se for rich text
          else if (cell.value.richText) {
            value = cell.value.richText.map(t => t.text).join('');
          }
          
          const cellInfo = {
            address: cellAddress,
            row: rowNumber,
            col: colNumber,
            value: value,
            type: cell.type,
            style: {
              font: cell.font,
              fill: cell.fill,
              alignment: cell.alignment,
              border: cell.border
            }
          };
          
          cellsData.push(cellInfo);
          
          console.log(`${cellAddress}: "${value}"`);
          if (cell.type === 'formula') {
            console.log(`  → Fórmula: ${cell.formula}`);
          }
        }
      });
    });
    
    console.log('\n========================================');
    console.log('MERGED CELLS (Células mescladas):');
    console.log('========================================\n');
    
    const mergedCells = [];
    worksheet.model.merges.forEach(merge => {
      console.log(`${merge}`);
      mergedCells.push(merge);
    });
    
    console.log('\n========================================');
    console.log('CÉLULAS QUE PARECEM SER PLACEHOLDERS:');
    console.log('========================================\n');
    
    const placeholders = cellsData.filter(cell => {
      const val = String(cell.value);
      return val.includes('{{') || val.includes('}}') || 
             val.includes('[') || val.includes(']') ||
             val.match(/^[A-Z_]+$/); // Palavras em maiúsculas
    });
    
    placeholders.forEach(cell => {
      console.log(`${cell.address}: "${cell.value}"`);
    });
    
    // Gerar JSON com mapeamento
    const outputPath = path.join(__dirname, '../CONTRATO_cells.json');
    const fs = require('fs');
    
    const mappingData = {
      template: 'CONTRATO.xlsx',
      analyzedAt: new Date().toISOString(),
      cells: cellsData.map(c => ({
        address: c.address,
        row: c.row,
        col: c.col,
        value: c.value,
        type: c.type
      })),
      mergedCells: mergedCells,
      placeholders: placeholders.map(c => ({
        address: c.address,
        currentValue: c.value
      }))
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(mappingData, null, 2), 'utf8');
    
    console.log('\n========================================');
    console.log('RESUMO:');
    console.log('========================================');
    console.log(`Total de células: ${cellsData.length}`);
    console.log(`Células mescladas: ${mergedCells.length}`);
    console.log(`Possíveis placeholders: ${placeholders.length}`);
    console.log(`\nArquivo JSON gerado: ${outputPath}`);
    
  } catch (error) {
    console.error('Erro ao ler template:', error.message);
    process.exit(1);
  }
}

analyzeTemplate();