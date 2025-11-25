# PISystemGen

Sistema avançado para geração automática de Propostas Internas (PI) em Excel e PDF.

## 📋 Visão Geral

Subsistema orquestrado para geração de documentos de contrato a partir de templates Excel, com suporte a:
- ✅ Preenchimento automático baseado em schema
- ✅ Mapeamento inteligente de células
- ✅ Conversão Excel → PDF com fidelidade visual
- ✅ Processamento em background com status tracking
- ✅ Formatação automática de dados (CNPJ, telefone, moeda, etc)

## 🏗️ Arquitetura

```
PISystemGen/
├── generator.js          # Core: Gera buffers Excel/PDF
├── jobManager.js         # Gerencia jobs assíncronos
├── controller.js         # Handlers HTTP
├── routes.js             # Rotas Express
├── test-schema-generator.js  # Suite de testes
└── tmp/                  # Arquivos temporários
```

### Dependências

```
services/
├── excelServiceV2.js     # Motor de geração Excel/PDF (schema-based)
└── schemaLoader.js       # Carrega e interpreta CONTRATO_cells.json

Schema/
├── CONTRATO.xlsx         # Template base
├── CONTRATO_cells.json   # Análise completa do template (7305 células)
└── placeholder_mapping.json  # Mapeamento de campos → células
```

## 🚀 Como Usar

### 1. API Endpoints

#### Gerar PI (Background)
```bash
POST /api/v1/pi-gen/generate
Content-Type: application/json

{
  "contratoId": "60a7...",
  "background": true
}

Response 202:
{
  "ok": true,
  "jobId": "job_1699..."
}
```

#### Gerar PI (Síncrono)
```bash
POST /api/v1/pi-gen/generate
Content-Type: application/json

{
  "contratoId": "60a7...",
  "background": false
}

Response 200: <PDF file>
```

#### Consultar Status
```bash
GET /api/v1/pi-gen/status/:jobId

Response 200:
{
  "ok": true,
  "job": {
    "jobId": "job_1699...",
    "status": "done",
    "contratoId": "60a7...",
    "resultPath": "/path/to/file.pdf",
    "resultUrl": "https://s3.../file.pdf"
  }
}
```

### 2. Uso Programático

```javascript
const generator = require('./PISystemGen/generator');

// Gerar Excel
const excelBuffer = await generator.generateExcelBufferFromContrato(
  contratoId,
  empresaId,
  user
);

// Gerar PDF
const pdfBuffer = await generator.generatePDFBufferFromContrato(
  contratoId,
  empresaId,
  user,
  { timeoutMs: 60000 }
);
```

## 🔧 Schema System

### Schema Loader

O `schemaLoader.js` analisa o `CONTRATO_cells.json` e fornece:

```javascript
const schemaLoader = require('./services/schemaLoader');

await schemaLoader.loadSchema();

// Buscar células por placeholder
const cells = schemaLoader.getCellsByPlaceholder('CLIENTE_NOME');
// => [{ address: 'B8', row: 8, col: 2, originalValue: '...' }]

// Buscar célula específica
const cell = schemaLoader.getCellByAddress('H1');

// Estatísticas
const stats = schemaLoader.getStats();
// => { totalCells: 7305, totalPlaceholders: 25, ... }
```

### Placeholder Mapping

O `placeholder_mapping.json` define o mapeamento de dados → células:

```json
{
  "mappings": {
    "CLIENTE_NOME": {
      "cells": ["B8"],
      "description": "Razão social do cliente",
      "format": "text"
    },
    "VALOR_TOTAL": {
      "cells": ["B28"],
      "description": "Valor total do contrato",
      "format": "currency"
    }
  },
  "placasTable": {
    "startRow": 40,
    "columns": { ... }
  }
}
```

### Formatos Suportados

- `text` - Texto simples
- `cnpj` - Formata CNPJ/CPF (XX.XXX.XXX/XXXX-XX)
- `phone` - Formata telefone ((XX) XXXXX-XXXX)
- `date` - Data (DD/MM/YYYY)
- `currency` - Moeda (R$ X.XXX,XX)

## 🧪 Testes

Execute a suite de testes completa:

```bash
node PISystemGen/test-schema-generator.js
```

Testes incluídos:
1. ✅ Schema Loader - Carregamento e indexação
2. ✅ Placeholder Mapping - Validação de mapeamentos
3. ✅ Geração de Excel - Output completo
4. ✅ Geração de PDF - Conversão com Puppeteer

Outputs de teste são salvos em `test-outputs/`

## 📊 Job Manager

### Estados de Job

- `queued` - Job aguardando processamento
- `running` - Processamento em andamento
- `done` - Concluído com sucesso
- `failed` - Falha no processamento

### Persistência

Jobs são salvos no MongoDB usando o model `PiGenJob`:

```javascript
{
  jobId: String,
  type: 'generate_pdf',
  contratoId: ObjectId,
  empresaId: ObjectId,
  status: String,
  resultPath: String,
  resultUrl: String,
  error: String,
  createdAt: Date,
  updatedAt: Date
}
```

## 🎯 Fluxo de Geração

```
1. Request → controller.postGenerate()
2. Criar Job → jobManager.startJobGeneratePDF()
3. Salvar Job (status: queued) → MongoDB
4. Processamento assíncrono:
   a. Atualizar status → running
   b. generator.generatePDFBufferFromContrato()
      i. ExcelService.generateContratoExcel()
         - Carregar schema + mapping
         - Preencher células usando schema
         - Preencher tabela de placas
      ii. ExcelService.convertExcelToPDF()
         - Gerar HTML do Excel
         - Puppeteer → PDF
   c. Salvar arquivo local → tmp/
   d. Upload → S3 (opcional)
   e. Atualizar Job (status: done, resultPath, resultUrl)
5. Retornar jobId ou PDF direto
```

## ⚙️ Configuração

### Variáveis de Ambiente

```env
# Timeout de conversão PDF (ms)
PDF_TIMEOUT=60000

# Storage (opcional)
AWS_S3_BUCKET=my-bucket
AWS_REGION=us-east-1
```

### Personalização de Template

Para atualizar o template:

1. Edite `Schema/CONTRATO.xlsx`
2. Adicione placeholders no formato `{{NOME_CAMPO}}`
3. Execute análise (se necessário)
4. Atualize `Schema/placeholder_mapping.json`
5. Teste com `test-schema-generator.js`

## 📝 Notas Técnicas

### Performance

- Schema carregado em memória (cache)
- Mapeamento indexado para lookup O(1)
- Preenchimento direto de células (não percorre toda planilha)
- Processamento em background para requisições longas

### Escalabilidade

- Job manager atual: in-memory
- **Produção recomendada**: Bull + Redis para fila distribuída
- Upload S3 configurável para storage externo
- Cleanup automático de arquivos temporários

### Limitações

- Puppeteer requer recursos significativos (memória)
- Conversão PDF tem timeout configurável
- Templates muito complexos podem afetar performance
- Células mescladas são preservadas mas requerem cuidado

## 🔗 Integração

### Frontend

```javascript
// Gerar em background
const response = await fetch('/api/v1/pi-gen/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ contratoId, background: true })
});

const { jobId } = await response.json();

// Polling de status
const checkStatus = async () => {
  const res = await fetch(`/api/v1/pi-gen/status/${jobId}`);
  const { job } = await res.json();
  
  if (job.status === 'done') {
    window.open(job.resultUrl);
  } else if (job.status === 'failed') {
    alert('Erro: ' + job.error);
  } else {
    setTimeout(checkStatus, 2000);
  }
};

checkStatus();
```

## 📚 Referências

- [ExcelJS Documentation](https://github.com/exceljs/exceljs)
- [Puppeteer PDF Generation](https://pptr.dev/#?product=Puppeteer&show=api-pagepdfoptions)
- Template base: `Schema/CONTRATO.xlsx`
- Análise completa: `Schema/CONTRATO_cells.json` (7305 células)

---

**Versão**: 2.1.0 (Schema-Based)  
**Última atualização**: 10 de Novembro de 2025

