
/**
 * Recriar CONTRATO.xlsx a partir de CONTRATO_cells.json usando ExcelJS.
 *
 * Passos para usar:
 * 1) Instale dependências:
 *      npm install exceljs
 *
 * 2) Coloque este arquivo (recreate_CONTRATO_node.js) e CONTRATO_cells.json no mesmo diretório.
 *
 * 3) Executar:
 *      node recreate_CONTRATO_node.js
 *
 * 4) Será gerado:
 *      RECREATED_CONTRATO.xlsx
 */

const ExcelJS = require('exceljs');
const fs = require('fs');

async function recreateFromJSON(jsonPath, outPath) {
    const raw = fs.readFileSync(jsonPath, 'utf8');
    const workbookData = JSON.parse(raw);

    const workbook = new ExcelJS.Workbook();

    for (const sheet of workbookData.sheets) {
        const ws = workbook.addWorksheet(sheet.title);

        // Column widths
        if (sheet.column_dimensions) {
            for (const colKey in sheet.column_dimensions) {
                const width = sheet.column_dimensions[colKey];
                if (width) {
                    const colNumber = ExcelJS.utils ? ExcelJS.utils.colLetterToNumber(colKey) : null;
                    // exceljs doesn't have colLetterToNumber, so let's convert manually:
                    const index = colKey.toUpperCase().charCodeAt(0) - 64;
                    ws.getColumn(index).width = width;
                }
            }
        }

        // Row heights
        if (sheet.row_dimensions) {
            for (const rowKey in sheet.row_dimensions) {
                const height = sheet.row_dimensions[rowKey];
                if (height) {
                    ws.getRow(parseInt(rowKey)).height = height;
                }
            }
        }

        // Cells
        for (const cell of sheet.cells) {
            const { coordinate, value, font, alignment, fill, border } = cell;
            const c = ws.getCell(coordinate);
            c.value = value;

            if (font) {
                c.font = {
                    name: font.name || undefined,
                    size: font.size || undefined,
                    bold: font.bold || false,
                    italic: font.italic || false,
                    underline: font.underline ? true : false,
                    color: font.color ? { argb: font.color } : undefined
                };
            }

            if (alignment) {
                c.alignment = {
                    horizontal: alignment.horizontal || undefined,
                    vertical: alignment.vertical || undefined,
                    wrapText: alignment.wrap_text || false
                };
            }

            if (fill && fill.fgColor) {
                c.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: fill.fgColor }
                };
            }

            if (border) {
                const toSide = (style) => style && style !== 'None' ? { style: 'thin' } : undefined;
                c.border = {
                    top: toSide(border.top),
                    left: toSide(border.left),
                    bottom: toSide(border.bottom),
                    right: toSide(border.right)
                };
            }
        }

        // Merged cells
        if (sheet.merged_cells) {
            sheet.merged_cells.forEach(range => {
                try {
                    ws.mergeCells(range);
                } catch {}
            });
        }
    }

    await workbook.xlsx.writeFile(outPath);
    console.log("Arquivo gerado:", outPath);
}

recreateFromJSON('CONTRATO_cells.json', 'RECREATED_CONTRATO.xlsx');
