/**
 * ===================================================
 * EXCEL SERVICE v2 - REPLICA CONTRATO.xlsx
 * ===================================================
 * 
 * Este serviço COPIA o template CONTRATO.xlsx e
 * preenche com os dados da PI, mantendo o layout EXATO
 * 
 * V2.1 - Agora usa Schema Loader para mapeamento inteligente
 */

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs').promises;
const puppeteer = require('puppeteer');
const schemaLoader = require('./schemaLoader');

class ExcelServiceV2 {
  
  constructor() {
    this.mappingCache = null;
  }

  /**
   * Carrega o mapeamento de placeholders
   */
  async loadMapping() {
    if (this.mappingCache) return this.mappingCache;
    
    try {
      const mappingPath = path.join(__dirname, '../Schema/placeholder_mapping.json');
      const content = await fs.readFile(mappingPath, 'utf8');
      this.mappingCache = JSON.parse(content);
      return this.mappingCache;
    } catch (error) {
      console.warn('Mapeamento não encontrado, usando modo fallback');
      return null;
    }
  }

  /**
   * Gera Excel COPIANDO o template CONTRATO.xlsx
   * e preenchendo com dados reais da PI
   * 
   * ESTRATÉGIA V2.1: Usar schema loader para mapeamento inteligente
   */
  async generateContratoExcel(pi, cliente, empresa, user) {
    try {
      console.log('=== GERANDO EXCEL V2.1 (SCHEMA-BASED) ===');
      
      // 1. Carregar schema e mapeamento
      await schemaLoader.loadSchema();
      const mapping = await this.loadMapping();
      
      // 2. Carregar template CONTRATO.xlsx
      const templatePath = path.join(__dirname, '../Schema/CONTRATO.xlsx');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(templatePath);
      
      const worksheet = workbook.getWorksheet(1);
      console.log(`Template carregado: ${worksheet.name}`);
      console.log(`Células mescladas no template: ${worksheet.model.merges.length}`);
      
      // 3. Preparar dados
      const dados = this.prepareData(pi, cliente, empresa, user);
      console.log('Dados preparados:', Object.keys(dados));
      
      // 4. Preencher usando schema (mais eficiente)
      if (mapping) {
        this.fillUsingSchema(worksheet, dados, mapping);
      } else {
        // Fallback para método antigo
        this.replaceValues(worksheet, dados);
      }
      
      // 5. Preencher tabela de placas
      if (pi.placas && pi.placas.length > 0) {
        this.fillPlacasTable(worksheet, pi.placas, mapping);
      }
      
      // 6. Gerar buffer
      const buffer = await workbook.xlsx.writeBuffer();
      console.log(`Excel gerado: ${buffer.length} bytes`);
      console.log(`Células mescladas mantidas: ${worksheet.model.merges.length}`);
      
      return buffer;
      
    } catch (error) {
      console.error('Erro ao gerar Excel V2:', error);
      throw error;
    }
  }
  
  /**
   * Prepara dados da PI/Cliente/Empresa para preenchimento
   */
  prepareData(pi, cliente, empresa, user) {
    // Formatar datas
    const dataInicio = pi.dataInicio ? 
      new Date(pi.dataInicio).toLocaleDateString('pt-BR') : '';
    const dataFim = pi.dataFim ? 
      new Date(pi.dataFim).toLocaleDateString('pt-BR') : '';
    const dataEmissao = new Date().toLocaleDateString('pt-BR');
    
    // Montar endereço completo
    const endereco = [
      cliente.endereco,
      cliente.bairro,
      cliente.cidade
    ].filter(Boolean).join(' - ');
    
    // CNPJ e Telefones
    const cnpj = cliente.cnpj || cliente.cpf || '';
    const telefone = [
      cliente.telefoneComercial,
      cliente.telefoneContato
    ].filter(Boolean).join(' / ');
    
    return {
      // AGÊNCIA
      AGENCIA_NOME: empresa.nome || '',
      AGENCIA_CNPJ: empresa.cnpj || '',
      AGENCIA_ENDERECO: empresa.endereco || '',
      AGENCIA_TELEFONE: empresa.telefone || '',
      
      // CLIENTE/ANUNCIANTE
      CLIENTE_NOME: cliente.nome || '',
      CLIENTE_CNPJ: cnpj,
      CLIENTE_ENDERECO: endereco,
      CLIENTE_TELEFONE: telefone,
      CLIENTE_RESPONSAVEL: cliente.responsavel || '',
      CLIENTE_SEGMENTO: cliente.segmento || '',
      
      // CONTRATO/PI
      PI_CODE: pi.pi_code || '',
      TITULO: pi.descricao || cliente.nome || '',
      PRODUTO: pi.produto || 'OUTDOOR',
      PERIODO: pi.descricaoPeriodo || '',
      MES: this.getMesFromData(pi.dataInicio),
      FORMA_PAGAMENTO: pi.formaPagamento || 'BOLETO BANCÁRIO',
      SEGMENTO: cliente.segmento || '',
      CONTATO: user?.name || empresa.nome || '',
      AUTORIZACAO: pi.pi_code || '',
      DATA_EMISSAO: dataEmissao,
      DATA_INICIO: dataInicio,
      DATA_FIM: dataFim,
      PERIODO_VEICULACAO: `${dataInicio} até ${dataFim}`,
      
      // VALORES
      VALOR_TOTAL: pi.valorTotal || 0,
      VALOR_PRODUCAO: pi.valorProducao || 0,
      VALOR_VEICULACAO: (pi.valorTotal || 0) - (pi.valorProducao || 0),
      
      // PLACAS
      placas: pi.placas || [],
      totalPlacas: pi.placas?.length || 0,
      
      // OUTROS
      DESCRICAO: pi.descricao || '',
      OBSERVACOES: pi.observacoes || ''
    };
  }

  /**
   * Preenche worksheet usando o schema (método otimizado)
   */
  fillUsingSchema(worksheet, dados, mapping) {
    console.log('Preenchendo usando schema mapping...');
    let preenchidas = 0;

    // Percorrer mapeamentos
    Object.keys(mapping.mappings).forEach(key => {
      const config = mapping.mappings[key];
      const valor = dados[key];

      if (valor !== undefined && valor !== null && config.cells) {
        config.cells.forEach(cellAddress => {
          try {
            const cell = worksheet.getCell(cellAddress);
            
            // Aplicar formatação conforme tipo
            const valorFormatado = this.formatValue(valor, config.format);
            
            // Substituir placeholder ou definir valor diretamente
            if (cell.value && typeof cell.value === 'string' && cell.value.includes(`{{${key}}}`)) {
              cell.value = cell.value.replace(`{{${key}}}`, valorFormatado);
            } else {
              cell.value = valorFormatado;
            }
            
            preenchidas++;
            console.log(`${cellAddress}: ${key} = ${valorFormatado}`);
          } catch (err) {
            console.warn(`Erro ao preencher célula ${cellAddress}:`, err.message);
          }
        });
      }
    });

    console.log(`✅ ${preenchidas} células preenchidas usando schema`);
  }

  /**
   * Formata valor conforme tipo especificado
   */
  formatValue(value, format) {
    if (value === null || value === undefined) return '';

    switch (format) {
      case 'currency':
        return this.formatMoney(value);
      case 'date':
        return value; // Já vem formatado
      case 'cnpj':
        return this.formatCNPJ(value);
      case 'phone':
        return this.formatPhone(value);
      case 'text':
      default:
        return String(value);
    }
  }

  /**
   * Formata CNPJ/CPF
   */
  formatCNPJ(value) {
    if (!value) return '';
    const cleaned = value.replace(/\D/g, '');
    
    if (cleaned.length === 11) {
      // CPF: 000.000.000-00
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (cleaned.length === 14) {
      // CNPJ: 00.000.000/0000-00
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    
    return value;
  }

  /**
   * Formata telefone
   */
  formatPhone(value) {
    if (!value) return '';
    const cleaned = value.replace(/\D/g, '');
    
    if (cleaned.length === 11) {
      // (00) 00000-0000
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (cleaned.length === 10) {
      // (00) 0000-0000
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    
    return value;
  }

  /**
   * Preenche tabela de placas dinamicamente
   */
  fillPlacasTable(worksheet, placas, mapping) {
    console.log(`Preenchendo tabela de placas: ${placas.length} placas`);
    
    if (!mapping?.placasTable) {
      console.warn('Configuração de tabela de placas não encontrada');
      return;
    }

    const config = mapping.placasTable;
    let currentRow = config.startRow;

    placas.forEach((placa, index) => {
      try {
        // Número sequencial
        if (config.columns.numero) {
          const cell = worksheet.getCell(currentRow, config.columns.numero.col);
          cell.value = index + 1;
        }

        // Código da placa
        if (config.columns.codigo) {
          const cell = worksheet.getCell(currentRow, config.columns.codigo.col);
          cell.value = placa.codigo || placa.codPlaca || '';
        }

        // Endereço
        if (config.columns.endereco) {
          const cell = worksheet.getCell(currentRow, config.columns.endereco.col);
          cell.value = placa.endereco || '';
        }

        // Bairro
        if (config.columns.bairro) {
          const cell = worksheet.getCell(currentRow, config.columns.bairro.col);
          cell.value = placa.bairro || '';
        }

        // Cidade
        if (config.columns.cidade) {
          const cell = worksheet.getCell(currentRow, config.columns.cidade.col);
          cell.value = placa.cidade || '';
        }

        // Valor
        if (config.columns.valor) {
          const cell = worksheet.getCell(currentRow, config.columns.valor.col);
          cell.value = placa.valor || 0;
          cell.numFmt = 'R$ #,##0.00';
        }

        // Observação
        if (config.columns.observacao) {
          const cell = worksheet.getCell(currentRow, config.columns.observacao.col);
          cell.value = placa.observacao || '';
        }

        currentRow++;
      } catch (err) {
        console.warn(`Erro ao preencher placa ${index + 1}:`, err.message);
      }
    });

    console.log(`✅ ${placas.length} placas preenchidas`);
  }
  
  /**
   * Substitui valores nas células SEM alterar estrutura/estilo
   * Percorre TODAS as células e substitui placeholders {{XXX}}
   */
  replaceValues(worksheet, dados) {
    console.log('Substituindo placeholders nas células...');
    
    // Mapeamento de placeholders para valores reais
    const placeholders = {
      // AGÊNCIA
      '{{AGENCIA_NOME}}': dados.agenciaNome,
      '{{AGENCIA_CNPJ}}': dados.agenciaCNPJ,
      '{{AGENCIA_ENDERECO}}': dados.agenciaEndereco,
      '{{AGENCIA_TELEFONE}}': dados.agenciaTelefone,
      
      // CLIENTE/ANUNCIANTE
      '{{CLIENTE_NOME}}': dados.clienteNome,
      '{{CLIENTE_CNPJ}}': dados.clienteCNPJ,
      '{{CLIENTE_ENDERECO}}': dados.clienteEndereco,
      '{{CLIENTE_TELEFONE}}': dados.clienteTelefone,
      '{{CLIENTE_RESPONSAVEL}}': dados.clienteResponsavel,
      '{{CLIENTE_SEGMENTO}}': dados.clienteSegmento,
      
      // CONTRATO/PI
      '{{PI_CODE}}': dados.piCode,
      '{{TITULO}}': dados.titulo,
      '{{PRODUTO}}': dados.produto,
      '{{PERIODO}}': dados.periodo,
      '{{MES}}': dados.mes,
      '{{FORMA_PAGAMENTO}}': dados.formaPagamento,
      '{{SEGMENTO}}': dados.segmento,
      '{{CONTATO}}': dados.contato,
      '{{AUTORIZACAO}}': dados.autorizacao,
      '{{DATA_EMISSAO}}': dados.dataEmissao,
      '{{DATA_INICIO}}': dados.dataInicio,
      '{{DATA_FIM}}': dados.dataFim,
      '{{PERIODO_VEICULACAO}}': dados.periodoVeiculacao,
      
      // VALORES
      '{{VALOR_TOTAL}}': this.formatMoney(dados.valorTotal),
      '{{VALOR_PRODUCAO}}': this.formatMoney(dados.valorProducao),
      '{{VALOR_VEICULACAO}}': this.formatMoney(dados.valorVeiculacao)
    };
    
    let substituicoes = 0;
    
    // Percorrer TODAS as células do worksheet
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        if (cell.value && typeof cell.value === 'string') {
          let valorOriginal = cell.value;
          let valorNovo = valorOriginal;
          
          // Substituir todos os placeholders encontrados na célula
          for (const [placeholder, valor] of Object.entries(placeholders)) {
            if (valorNovo.includes(placeholder)) {
              valorNovo = valorNovo.replace(new RegExp(placeholder, 'g'), valor || '');
              substituicoes++;
            }
          }
          
          // Se houve mudança, atualizar a célula
          if (valorNovo !== valorOriginal) {
            console.log(`${cell.address}: "${valorOriginal}" => "${valorNovo}"`);
            cell.value = valorNovo;
          }
        }
      });
    });
    
    console.log(`✅ Total de ${substituicoes} substituições realizadas`);
    
    if (substituicoes === 0) {
      console.warn('⚠️  NENHUM PLACEHOLDER ENCONTRADO!');
      console.warn('Execute: node scripts/add_placeholders_to_contrato.js');
      console.warn('Depois substitua CONTRATO.xlsx pelo arquivo gerado');
    }
  }
  
  /**
   * Formata valor monetário
   */
  formatMoney(value) {
    return parseFloat(value || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  
  /**
   * Extrai nome do mês da data
   */
  getMesFromData(dataStr) {
    if (!dataStr) return '';
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const data = new Date(dataStr);
    return meses[data.getMonth()];
  }
  
  /**
   * Converte Excel para PDF usando Puppeteer
   */
  async convertExcelToPDF(excelBuffer, options = {}) {
    console.log('=== CONVERTENDO EXCEL PARA PDF ===');

    const timeoutMs = typeof options.timeoutMs === 'number' ? options.timeoutMs : 60000; // default 60s
    let browser;
    const tempExcelPath = path.join(__dirname, '../temp_contrato.xlsx');

    const convertPromise = (async () => {
      try {
        // Salvar Excel temporariamente
        await fs.writeFile(tempExcelPath, excelBuffer);

        // Ler Excel e converter para HTML
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(tempExcelPath);
        const worksheet = workbook.getWorksheet(1);

        // Gerar HTML da planilha
        const html = this.generateHTMLFromWorksheet(worksheet);

        // Converter HTML para PDF
        browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
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

        // Limpar arquivo temporário
        try { await fs.unlink(tempExcelPath); } catch (e) { /* ignore */ }

        console.log(`PDF gerado: ${pdfBuffer.length} bytes`);
        return pdfBuffer;
      } catch (error) {
        console.error('Erro ao converter Excel para PDF:', error);
        throw error;
      }
    })();

    // Timeout wrapper
    const timeoutPromise = new Promise((_, reject) => {
      const t = setTimeout(() => {
        reject(new Error(`Timeout ao converter Excel para PDF após ${timeoutMs}ms`));
      }, timeoutMs);
      // If convertPromise finishes first, clear timeout
      convertPromise.finally(() => clearTimeout(t));
    });

    try {
      const pdfBuffer = await Promise.race([convertPromise, timeoutPromise]);
      return pdfBuffer;
    } finally {
      // Ensure browser is closed if opened
      try { if (browser) await browser.close(); } catch (e) { /* ignore */ }
      // Try to remove temp file in case of error/timeout
      try { await fs.unlink(tempExcelPath); } catch (e) { /* ignore */ }
    }
  }
  
  /**
   * Gera HTML a partir do worksheet
   * MELHORADO: Respeita células mescladas, formatação e estilo
   */
  generateHTMLFromWorksheet(worksheet) {
    const mergedCells = new Set();
    const mergedRanges = [];
    
    // Mapear células mescladas
    if (worksheet._merges) {
      Object.keys(worksheet._merges).forEach(key => {
        const merge = worksheet._merges[key];
        if (merge) {
          const parts = key.split(':');
          if (parts.length === 2) {
            mergedRanges.push({
              start: parts[0],
              end: parts[1],
              range: key
            });
            
            // Adicionar todas as células do merge ao set (exceto a primeira)
            const startCol = this.getColumnNumber(parts[0]);
            const startRow = parseInt(parts[0].match(/\d+/)[0]);
            const endCol = this.getColumnNumber(parts[1]);
            const endRow = parseInt(parts[1].match(/\d+/)[0]);
            
            for (let row = startRow; row <= endRow; row++) {
              for (let col = startCol; col <= endCol; col++) {
                if (row !== startRow || col !== startCol) {
                  mergedCells.add(`${this.getColumnLetter(col)}${row}`);
                }
              }
            }
          }
        }
      });
    }
    
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
            font-family: Calibri, Arial, sans-serif; 
            font-size: 9px;
            margin: 0;
            padding: 0;
          }
          table { 
            width: 100%; 
            border-collapse: collapse;
          }
          td { 
            border: 0.5px solid #000; 
            padding: 3px 5px; 
            vertical-align: middle;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .bold { font-weight: bold; }
          .center { text-align: center; }
          .right { text-align: right; }
        </style>
      </head>
      <body>
        <table>
    `;
    
    // Percorrer linhas
    worksheet.eachRow((row, rowNumber) => {
      html += '<tr>';
      
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const cellAddress = cell.address;
        
        // Pular células que fazem parte de um merge (exceto a primeira)
        if (mergedCells.has(cellAddress)) {
          return;
        }
        
        // Verificar se esta célula é o início de um merge
        let colspan = 1;
        let rowspan = 1;
        const mergeInfo = mergedRanges.find(m => m.start === cellAddress);
        
        if (mergeInfo) {
          const startCol = this.getColumnNumber(mergeInfo.start);
          const startRow = parseInt(mergeInfo.start.match(/\d+/)[0]);
          const endCol = this.getColumnNumber(mergeInfo.end);
          const endRow = parseInt(mergeInfo.end.match(/\d+/)[0]);
          
          colspan = endCol - startCol + 1;
          rowspan = endRow - startRow + 1;
        }
        
        // Extrair valor
        let value = cell.value || '';
        if (typeof value === 'object' && value.richText) {
          value = value.richText.map(t => t.text).join('');
        } else if (typeof value === 'object' && value.text) {
          value = value.text;
        }
        
        // Extrair estilos
        const styles = [];
        const classes = [];
        
        // Cor de fundo
        if (cell.fill?.fgColor?.argb) {
          const color = cell.fill.fgColor.argb.substring(2);
          styles.push(`background-color: #${color}`);
        }
        
        // Cor do texto
        if (cell.font?.color?.argb) {
          const color = cell.font.color.argb.substring(2);
          styles.push(`color: #${color}`);
        }
        
        // Negrito
        if (cell.font?.bold) {
          classes.push('bold');
        }
        
        // Tamanho da fonte
        if (cell.font?.size) {
          styles.push(`font-size: ${cell.font.size}px`);
        }
        
        // Alinhamento
        if (cell.alignment?.horizontal === 'center') {
          classes.push('center');
        } else if (cell.alignment?.horizontal === 'right') {
          classes.push('right');
        }
        
        const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
        const classAttr = classes.length > 0 ? ` class="${classes.join(' ')}"` : '';
        const colspanAttr = colspan > 1 ? ` colspan="${colspan}"` : '';
        const rowspanAttr = rowspan > 1 ? ` rowspan="${rowspan}"` : '';
        
        html += `<td${styleAttr}${classAttr}${colspanAttr}${rowspanAttr}>${value}</td>`;
      });
      
      html += '</tr>';
    });
    
    html += `
        </table>
      </body>
      </html>
    `;
    
    return html;
  }
  
  /**
   * Converte letra da coluna para número (A=1, B=2, ..., AA=27, etc)
   */
  getColumnNumber(cellAddress) {
    const match = cellAddress.match(/^([A-Z]+)/);
    if (!match) return 1;
    
    const letters = match[1];
    let num = 0;
    for (let i = 0; i < letters.length; i++) {
      num = num * 26 + (letters.charCodeAt(i) - 64);
    }
    return num;
  }
  
  /**
   * Converte número da coluna para letra (1=A, 2=B, ..., 27=AA, etc)
   */
  getColumnLetter(num) {
    let letter = '';
    while (num > 0) {
      const remainder = (num - 1) % 26;
      letter = String.fromCharCode(65 + remainder) + letter;
      num = Math.floor((num - 1) / 26);
    }
    return letter;
  }
  
  /**
   * Método all-in-one: gera Excel e converte para PDF
   */
  async generateContratoPDF(pi, cliente, empresa, user) {
    const excelBuffer = await this.generateContratoExcel(pi, cliente, empresa, user);
    const pdfBuffer = await this.convertExcelToPDF(excelBuffer);
    return pdfBuffer;
  }
  
  /**
   * Gera nome do arquivo para download
   */
  generateFilename(pi, cliente, type = 'excel') {
    const piCode = (pi.pi_code || 'SEM_CODIGO').replace(/[^a-zA-Z0-9]/g, '_');
    const clienteNome = (cliente.nome || 'Cliente').substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_');
    const dataHora = new Date().toISOString().split('T')[0];
    const ext = type === 'pdf' ? 'pdf' : 'xlsx';
    
    return `Contrato_${piCode}_${clienteNome}_${dataHora}.${ext}`;
  }
}

module.exports = new ExcelServiceV2();
