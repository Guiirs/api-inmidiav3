// Script temporário para inspecionar o arquivo Excel
const ExcelJS = require('exceljs');
const path = require('path');

async function inspectExcel() {
    const filePath = path.join(__dirname, '../Schema/BI SEMANA 2026.xlsx');
    console.log('📂 Lendo arquivo:', filePath);
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    const sheet = workbook.worksheets[0];
    console.log('📄 Nome da planilha:', sheet.name);
    console.log('📊 Total de linhas:', sheet.rowCount);
    console.log('\n' + '='.repeat(80));
    console.log('PRIMEIRAS 10 LINHAS:');
    console.log('='.repeat(80) + '\n');
    
    for (let i = 1; i <= Math.min(10, sheet.rowCount); i++) {
        const row = sheet.getRow(i);
        console.log(`\n📌 Linha ${i}:`);
        
        // Mostrar valores de cada célula
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            console.log(`   Coluna ${colNumber} (${getColumnLetter(colNumber)}):`, {
                value: cell.value,
                type: typeof cell.value,
                text: cell.text
            });
        });
    }
}

function getColumnLetter(colNumber) {
    let letter = '';
    while (colNumber > 0) {
        const mod = (colNumber - 1) % 26;
        letter = String.fromCharCode(65 + mod) + letter;
        colNumber = Math.floor((colNumber - 1) / 26);
    }
    return letter;
}

inspectExcel().catch(console.error);
