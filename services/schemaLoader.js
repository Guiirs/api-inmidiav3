/**
 * ===================================================
 * SCHEMA LOADER - Carrega e interpreta CONTRATO_cells.json
 * ===================================================
 * 
 * Este serviço carrega o schema do template CONTRATO.xlsx
 * e fornece métodos para localizar células e placeholders
 */

const fs = require('fs').promises;
const path = require('path');

class SchemaLoader {
  constructor() {
    this.schema = null;
    this.cellMap = new Map(); // address -> cell info
    this.placeholderMap = new Map(); // placeholder -> [cells]
  }

  /**
   * Carrega o schema CONTRATO_cells.json
   */
  async loadSchema() {
    if (this.schema) return this.schema;

    try {
      const schemaPath = path.join(__dirname, '../Schema/CONTRATO_cells.json');
      const content = await fs.readFile(schemaPath, 'utf8');
      this.schema = JSON.parse(content);

      // Indexar células por endereço
      this.schema.cells.forEach(cell => {
        this.cellMap.set(cell.address, cell);

        // Identificar placeholders na célula
        if (cell.value && typeof cell.value === 'string') {
          const placeholders = this.extractPlaceholders(cell.value);
          placeholders.forEach(ph => {
            if (!this.placeholderMap.has(ph)) {
              this.placeholderMap.set(ph, []);
            }
            this.placeholderMap.get(ph).push({
              address: cell.address,
              row: cell.row,
              col: cell.col,
              originalValue: cell.value
            });
          });
        }
      });

      console.log(`✅ Schema carregado: ${this.schema.cells.length} células`);
      console.log(`✅ Placeholders encontrados: ${this.placeholderMap.size}`);

      return this.schema;
    } catch (error) {
      console.error('Erro ao carregar schema:', error);
      throw error;
    }
  }

  /**
   * Extrai placeholders de uma string (formato {{NOME}})
   */
  extractPlaceholders(text) {
    const regex = /\{\{([A-Z_]+)\}\}/g;
    const placeholders = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      placeholders.push(match[1]);
    }
    return placeholders;
  }

  /**
   * Busca células por placeholder
   */
  getCellsByPlaceholder(placeholder) {
    return this.placeholderMap.get(placeholder) || [];
  }

  /**
   * Busca célula por endereço (ex: "A1")
   */
  getCellByAddress(address) {
    return this.cellMap.get(address);
  }

  /**
   * Busca células em uma região (ex: linhas 10-20)
   */
  getCellsInRange(startRow, endRow, startCol = null, endCol = null) {
    return this.schema.cells.filter(cell => {
      const rowMatch = cell.row >= startRow && cell.row <= endRow;
      if (startCol !== null && endCol !== null) {
        return rowMatch && cell.col >= startCol && cell.col <= endCol;
      }
      return rowMatch;
    });
  }

  /**
   * Retorna todas as células que contêm texto específico
   */
  searchCellsByContent(searchText) {
    return this.schema.cells.filter(cell => {
      if (cell.value && typeof cell.value === 'string') {
        return cell.value.toLowerCase().includes(searchText.toLowerCase());
      }
      return false;
    });
  }

  /**
   * Retorna estatísticas do schema
   */
  getStats() {
    return {
      totalCells: this.schema?.cells.length || 0,
      totalPlaceholders: this.placeholderMap.size,
      placeholders: Array.from(this.placeholderMap.keys()),
      template: this.schema?.template || 'N/A',
      analyzedAt: this.schema?.analyzedAt || 'N/A'
    };
  }

  /**
   * Retorna mapeamento completo de placeholders
   */
  getPlaceholderMapping() {
    const mapping = {};
    this.placeholderMap.forEach((cells, placeholder) => {
      mapping[placeholder] = cells.map(c => ({
        address: c.address,
        row: c.row,
        col: c.col,
        original: c.originalValue
      }));
    });
    return mapping;
  }

  /**
   * Valida se o template atual corresponde ao schema
   */
  async validateTemplate(templatePath) {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.getWorksheet(1);

    const errors = [];
    const warnings = [];

    // Verificar algumas células chave
    const sampleCells = this.schema.cells.slice(0, 100);
    
    for (const schemaCell of sampleCells) {
      const cell = worksheet.getCell(schemaCell.address);
      
      if (schemaCell.value && cell.value !== schemaCell.value) {
        warnings.push({
          address: schemaCell.address,
          expected: schemaCell.value,
          found: cell.value
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.slice(0, 10) // Limitar a 10 warnings
    };
  }
}

module.exports = new SchemaLoader();
