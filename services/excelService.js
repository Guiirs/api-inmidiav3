// services/excelService.js
const ExcelJS = require('exceljs');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../config/logger');

// Caminho do template JSON
const TEMPLATE_PATH = path.join(__dirname, '..', 'docs', 'CONTRATO_cells.json');

class ExcelService {
    
    /**
     * Carrega o template CONTRATO_cells.json
     */
    async loadTemplate() {
        try {
            const raw = await fs.readFile(TEMPLATE_PATH, 'utf8');
            return JSON.parse(raw);
        } catch (error) {
            logger.error(`[ExcelService] Erro ao carregar template: ${error.message}`);
            throw new Error('Template de contrato não encontrado');
        }
    }

    /**
     * Substitui placeholders em um texto
     * Placeholders no formato {{NOME_CAMPO}}
     */
    replacePlaceholders(text, data) {
        if (!text || typeof text !== 'string') return text;
        
        let result = text;
        
        // Substitui cada placeholder pelos dados fornecidos
        Object.keys(data).forEach(key => {
            const placeholder = `{{${key}}}`;
            const value = data[key] || '';
            result = result.replace(new RegExp(placeholder, 'g'), value);
        });
        
        return result;
    }

    /**
     * Converte letra de coluna para número (A=1, B=2, etc)
     */
    colLetterToNumber(col) {
        let num = 0;
        for (let i = 0; i < col.length; i++) {
            num = num * 26 + (col.charCodeAt(i) - 64);
        }
        return num;
    }

    /**
     * Cria workbook Excel a partir do template JSON
     */
    async createWorkbookFromTemplate(templateData, replacementData) {
        const workbook = new ExcelJS.Workbook();

        for (const sheetData of templateData.sheets) {
            const ws = workbook.addWorksheet(sheetData.title);

            // Aplica larguras de colunas
            if (sheetData.column_dimensions) {
                for (const colKey in sheetData.column_dimensions) {
                    const width = sheetData.column_dimensions[colKey];
                    if (width) {
                        const index = this.colLetterToNumber(colKey);
                        ws.getColumn(index).width = width;
                    }
                }
            }

            // Aplica alturas de linhas
            if (sheetData.row_dimensions) {
                for (const rowKey in sheetData.row_dimensions) {
                    const height = sheetData.row_dimensions[rowKey];
                    if (height) {
                        ws.getRow(parseInt(rowKey)).height = height;
                    }
                }
            }

            // Preenche células e substitui placeholders
            for (const cellData of sheetData.cells) {
                const { coordinate, value, font, alignment, fill, border } = cellData;
                const cell = ws.getCell(coordinate);

                // Substitui placeholders no valor da célula
                const processedValue = this.replacePlaceholders(value, replacementData);
                cell.value = processedValue;

                // Aplica formatação de fonte
                if (font) {
                    cell.font = {
                        name: font.name || undefined,
                        size: font.size || undefined,
                        bold: font.bold || false,
                        italic: font.italic || false,
                        underline: font.underline ? true : false,
                        color: font.color && font.color !== 'Values must be of type <class \'str\'>' 
                            ? { argb: font.color } 
                            : undefined
                    };
                }

                // Aplica alinhamento
                if (alignment) {
                    cell.alignment = {
                        horizontal: alignment.horizontal || undefined,
                        vertical: alignment.vertical || undefined,
                        wrapText: alignment.wrap_text || false
                    };
                }

                // Aplica preenchimento (cor de fundo)
                if (fill && fill.fgColor && fill.fgColor !== '00000000') {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: fill.fgColor }
                    };
                }

                // Aplica bordas
                if (border) {
                    const toSide = (style) => {
                        if (!style || style === 'None') return undefined;
                        return { style: 'thin' };
                    };
                    
                    cell.border = {
                        top: toSide(border.top),
                        left: toSide(border.left),
                        bottom: toSide(border.bottom),
                        right: toSide(border.right)
                    };
                }
            }

            // Mescla células
            if (sheetData.merged_cells && Array.isArray(sheetData.merged_cells)) {
                sheetData.merged_cells.forEach(range => {
                    try {
                        ws.mergeCells(range);
                    } catch (err) {
                        logger.warn(`[ExcelService] Não foi possível mesclar: ${range}`);
                    }
                });
            }
        }

        return workbook;
    }

    /**
     * Prepara dados de substituição a partir de PI/Contrato
     */
    prepareReplacementData(pi, cliente, empresa, user) {
        const formatDate = (date) => {
            if (!date) return '';
            return new Date(date).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        };

        const formatMoney = (value) => {
            if (value === null || value === undefined) return 'R$ 0,00';
            return `R$ ${value.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
        };

        // Gera lista de placas
        const placasLista = pi.placas && pi.placas.length > 0
            ? pi.placas.map((p, idx) => {
                const codigo = p.numero_placa || p.codigo || `Placa ${idx + 1}`;
                const regiao = p.regiao?.nome || '';
                const local = p.nomeDaRua || '';
                return `${codigo} - ${regiao} ${local ? `(${local})` : ''}`;
            }).join('\n')
            : 'Nenhuma placa selecionada';

        return {
            // Empresa/Agência
            AGENCIA_NOME: empresa.nome || '',
            AGENCIA_ENDERECO: empresa.endereco || '',
            AGENCIA_BAIRRO: empresa.bairro || '',
            AGENCIA_CIDADE: empresa.cidade || '',
            AGENCIA_CNPJ: empresa.cnpj || '',
            AGENCIA_TELEFONE: empresa.telefone || '',

            // Cliente/Anunciante
            ANUNCIANTE_NOME: cliente.nome || '',
            ANUNCIANTE_ENDERECO: cliente.endereco || '',
            ANUNCIANTE_BAIRRO: cliente.bairro || '',
            ANUNCIANTE_CIDADE: cliente.cidade || '',
            ANUNCIANTE_CNPJ: cliente.cnpj || '',
            ANUNCIANTE_RESPONSAVEL: cliente.responsavel || '',
            ANUNCIANTE_TELEFONE: cliente.telefone || '',

            // Proposta/Contrato
            CONTRATO_NUMERO: pi._id?.toString() || '',
            PRODUTO: pi.produto || 'OUTDOOR',
            DATA_EMISSAO: formatDate(new Date()),
            PERIODO: pi.descricaoPeriodo || `${formatDate(pi.dataInicio)} a ${formatDate(pi.dataFim)}`,
            DATA_INICIO: formatDate(pi.dataInicio),
            DATA_FIM: formatDate(pi.dataFim),
            TIPO_PERIODO: pi.tipoPeriodo || 'mensal',
            
            // Valores
            VALOR_PRODUCAO: formatMoney(pi.valorProducao || 0),
            VALOR_VEICULACAO: formatMoney((pi.valorTotal || 0) - (pi.valorProducao || 0)),
            VALOR_TOTAL: formatMoney(pi.valorTotal || 0),
            
            // Outros
            FORMA_PAGAMENTO: pi.formaPagamento || 'A combinar',
            CONTATO_ATENDIMENTO: user ? `${user.nome} ${user.sobrenome}` : '',
            SEGMENTO: cliente.segmento || '',
            DESCRICAO: pi.descricao || '',
            
            // Placas
            PLACAS_LISTA: placasLista,
            QUANTIDADE_PLACAS: pi.placas?.length || 0
        };
    }

    /**
     * Gera arquivo Excel para PI/Contrato
     */
    async generateContratoExcel(pi, cliente, empresa, user) {
        logger.info(`[ExcelService] Gerando contrato Excel para PI ${pi._id}`);

        try {
            // 1. Carrega template
            const template = await this.loadTemplate();

            // 2. Prepara dados de substituição
            const replacementData = this.prepareReplacementData(pi, cliente, empresa, user);

            // 3. Cria workbook com dados substituídos
            const workbook = await this.createWorkbookFromTemplate(template, replacementData);

            // 4. Gera buffer do Excel
            const buffer = await workbook.xlsx.writeBuffer();

            logger.info(`[ExcelService] Contrato Excel gerado com sucesso para PI ${pi._id}`);
            return buffer;

        } catch (error) {
            logger.error(`[ExcelService] Erro ao gerar contrato Excel: ${error.message}`, { stack: error.stack });
            throw error;
        }
    }

    /**
     * Converte Excel para PDF usando Puppeteer
     */
    async convertExcelToPDF(excelBuffer) {
        const puppeteer = require('puppeteer');
        
        logger.info('[ExcelService] Convertendo Excel para PDF...');

        try {
            // 1. Carrega o Excel para extrair dados
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(excelBuffer);
            const worksheet = workbook.getWorksheet(1);

            // 2. Gera HTML do Excel
            let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page {
            size: A4 landscape;
            margin: 10mm;
        }
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
        }
        td {
            padding: 4px 6px;
            border: 1px solid #ccc;
            vertical-align: top;
            min-height: 20px;
        }
        .bold { font-weight: bold; }
        .wrap { white-space: pre-wrap; }
    </style>
</head>
<body>
    <table>
`;

            // 3. Itera sobre as linhas e células
            worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
                html += '        <tr>\n';
                
                const maxCol = worksheet.columnCount || 10;
                for (let colNum = 1; colNum <= maxCol; colNum++) {
                    const cell = row.getCell(colNum);
                    const value = cell.value || '';
                    
                    let cellClass = '';
                    let style = '';
                    
                    // Aplica formatação de fonte
                    if (cell.font) {
                        if (cell.font.bold) cellClass += ' bold';
                        if (cell.font.color && cell.font.color.argb) {
                            const color = cell.font.color.argb.substring(2); // Remove alpha
                            style += `color: #${color};`;
                        }
                        if (cell.font.size) {
                            style += `font-size: ${cell.font.size * 0.75}pt;`;
                        }
                    }
                    
                    // Aplica cor de fundo
                    if (cell.fill && cell.fill.fgColor && cell.fill.fgColor.argb) {
                        const bgColor = cell.fill.fgColor.argb.substring(2);
                        if (bgColor !== '000000' && bgColor !== 'FFFFFF') {
                            style += `background-color: #${bgColor};`;
                        }
                    }
                    
                    // Alinhamento
                    if (cell.alignment) {
                        if (cell.alignment.horizontal) {
                            style += `text-align: ${cell.alignment.horizontal};`;
                        }
                        if (cell.alignment.wrapText) {
                            cellClass += ' wrap';
                        }
                    }
                    
                    html += `            <td class="${cellClass}" style="${style}">${value}</td>\n`;
                }
                
                html += '        </tr>\n';
            });

            html += `    </table>
</body>
</html>`;

            // 4. Usa Puppeteer para gerar PDF
            const browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu'
                ]
            });
            
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });
            
            const pdfBuffer = await page.pdf({
                format: 'A4',
                landscape: true,
                printBackground: true,
                margin: {
                    top: '10mm',
                    right: '10mm',
                    bottom: '10mm',
                    left: '10mm'
                }
            });
            
            await browser.close();
            
            logger.info(`[ExcelService] PDF gerado com sucesso (${pdfBuffer.length} bytes)`);
            return pdfBuffer;

        } catch (error) {
            logger.error(`[ExcelService] Erro ao converter Excel para PDF: ${error.message}`, { error });
            throw new Error(`Erro na conversão Excel→PDF: ${error.message}`);
        }
    }

    /**
     * Gera contrato direto em PDF (Excel + Conversão)
     */
    async generateContratoPDF(pi, cliente, empresa, user) {
        logger.info(`[ExcelService] Gerando contrato PDF para PI ${pi._id}`);
        
        try {
            // 1. Gera Excel
            const excelBuffer = await this.generateContratoExcel(pi, cliente, empresa, user);
            
            // 2. Converte para PDF
            const pdfBuffer = await this.convertExcelToPDF(excelBuffer);
            
            return pdfBuffer;
        } catch (error) {
            logger.error(`[ExcelService] Erro ao gerar PDF: ${error.message}`);
            throw error;
        }
    }

    /**
     * Gera nome do arquivo
     */
    generateFilename(pi, cliente, tipo = 'excel') {
        const clienteNome = (cliente.nome || 'Cliente').replace(/\s+/g, '_');
        const piId = pi._id?.toString().substring(0, 8) || 'PI';
        const ext = tipo === 'excel' ? 'xlsx' : 'pdf';
        return `CONTRATO_${piId}_${clienteNome}.${ext}`;
    }
}

module.exports = new ExcelService();
