# Guia de Migração e Uso - Gerador PI v2.1

## 📋 O que mudou?

### Versão Anterior (v2.0)
- ❌ Percorria **todas** as células da planilha buscando placeholders
- ❌ Lento para templates grandes
- ❌ Sem mapeamento estruturado
- ❌ Difícil manutenção

### Versão Nova (v2.1 - Schema-Based)
- ✅ Usa schema pré-analisado (`CONTRATO_cells.json`)
- ✅ Mapeamento direto célula → dado
- ✅ Performance otimizada (O(1) lookup)
- ✅ Fácil customização via JSON
- ✅ Fallback automático se schema não disponível

## 🚀 Como Começar

### 1. Testar o Sistema

Execute a suite de testes para validar a instalação:

```bash
cd BECKEND
node PISystemGen/test-schema-generator.js
```

Saída esperada:
```
╔═══════════════════════════════════════════════════════╗
║   TESTE DO GERADOR DE PI COM SCHEMA                   ║
╚═══════════════════════════════════════════════════════╝

=== TESTE 1: Schema Loader ===
✅ Schema carregado: 7305 células
✅ Placeholders encontrados: 25

=== TESTE 2: Geração de Excel ===
✅ Excel gerado: test-outputs/test_contrato_1699....xlsx

=== TESTE 3: Geração de PDF ===
✅ PDF gerado: test-outputs/test_contrato_1699....pdf

╔═══════════════════════════════════════════════════════╗
║   RESUMO DOS TESTES                                   ║
╚═══════════════════════════════════════════════════════╝

✅ PASSOU - schema Loader
✅ PASSOU - placeholder Mapping
✅ PASSOU - excel Generation
✅ PASSOU - pdf Generation

Resultado: 4/4 testes passaram
```

### 2. Usar via API

#### Gerar PI em Background

```bash
curl -X POST http://localhost:5000/api/v1/pi-gen/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "contratoId": "60a7c8b9f123456789abcdef",
    "background": true
  }'
```

Resposta:
```json
{
  "ok": true,
  "jobId": "job_1699123456789_1234"
}
```

#### Consultar Status

```bash
curl http://localhost:5000/api/v1/pi-gen/status/job_1699123456789_1234 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Resposta:
```json
{
  "ok": true,
  "job": {
    "jobId": "job_1699123456789_1234",
    "type": "generate_pdf",
    "status": "done",
    "contratoId": "60a7c8b9f123456789abcdef",
    "resultPath": "/path/to/PISystemGen/tmp/abc123.pdf",
    "resultUrl": "https://s3.../abc123.pdf",
    "createdAt": "2025-11-10T12:00:00.000Z",
    "updatedAt": "2025-11-10T12:00:05.000Z"
  }
}
```

#### Download Direto (Síncrono)

```bash
curl -X POST http://localhost:5000/api/v1/pi-gen/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "contratoId": "60a7c8b9f123456789abcdef",
    "background": false
  }' \
  --output contrato.pdf
```

### 3. Usar Programaticamente

```javascript
const ExcelService = require('./services/excelServiceV2');
const generator = require('./PISystemGen/generator');

// Método 1: Gerar apenas Excel
async function gerarExcel(contratoId) {
  const buffer = await generator.generateExcelBufferFromContrato(
    contratoId,
    empresaId,
    user
  );
  
  // Salvar ou enviar
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=contrato.xlsx');
  res.send(buffer);
}

// Método 2: Gerar PDF diretamente
async function gerarPDF(contratoId) {
  const buffer = await generator.generatePDFBufferFromContrato(
    contratoId,
    empresaId,
    user,
    { timeoutMs: 60000 } // Timeout configurável
  );
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=contrato.pdf');
  res.send(buffer);
}

// Método 3: Usar Job Manager (recomendado)
async function gerarPDFBackground(contratoId) {
  const jobId = await jobManager.startJobGeneratePDF(
    contratoId,
    empresaId,
    user
  );
  
  return { jobId };
}
```

## 🎨 Customizar Template

### 1. Adicionar Novo Campo

**Passo 1**: Editar `Schema/placeholder_mapping.json`

```json
{
  "mappings": {
    "NOVO_CAMPO": {
      "cells": ["C10"],
      "description": "Descrição do campo",
      "format": "text"
    }
  }
}
```

**Passo 2**: Editar `Schema/CONTRATO.xlsx`

Adicione o placeholder `{{NOVO_CAMPO}}` na célula C10

**Passo 3**: Atualizar `excelServiceV2.js`

```javascript
prepareData(pi, cliente, empresa, user) {
  return {
    // ... campos existentes
    NOVO_CAMPO: pi.novoCampo || 'Valor padrão'
  };
}
```

**Passo 4**: Testar

```bash
node PISystemGen/test-schema-generator.js
```

### 2. Modificar Formatação

Edite `Schema/placeholder_mapping.json`:

```json
{
  "mappings": {
    "VALOR_TOTAL": {
      "cells": ["B28"],
      "format": "currency"  // ou "text", "date", "cnpj", "phone"
    }
  }
}
```

Formatos disponíveis:
- `text` - Texto simples
- `currency` - R$ 1.234,56
- `date` - DD/MM/YYYY
- `cnpj` - XX.XXX.XXX/XXXX-XX
- `phone` - (XX) XXXXX-XXXX

### 3. Adicionar Nova Formatação

Edite `services/excelServiceV2.js`:

```javascript
formatValue(value, format) {
  switch (format) {
    case 'currency':
      return this.formatMoney(value);
    case 'percentage':  // NOVO!
      return `${(value * 100).toFixed(2)}%`;
    // ... outros casos
  }
}
```

## 🔧 Troubleshooting

### Problema: "Schema não encontrado"

**Causa**: Arquivo `Schema/CONTRATO_cells.json` não existe

**Solução**:
```bash
# Verificar se arquivo existe
ls -la BECKEND/Schema/CONTRATO_cells.json

# Se não existir, o sistema usa fallback (modo antigo)
# Para gerar novo schema, analise o template CONTRATO.xlsx
```

### Problema: "Placeholder não substituído"

**Causa**: Mapeamento não configurado

**Solução**:
1. Verifique `Schema/placeholder_mapping.json`
2. Certifique-se que o placeholder está em `CONTRATO.xlsx`
3. Execute teste para validar

### Problema: "Timeout ao gerar PDF"

**Causa**: Puppeteer demorou muito

**Solução**:
```javascript
// Aumentar timeout
const buffer = await generator.generatePDFBufferFromContrato(
  contratoId,
  empresaId,
  user,
  { timeoutMs: 120000 } // 2 minutos
);
```

### Problema: "Job fica em 'running'"

**Causa**: Processo travou

**Solução**:
```javascript
// Verificar logs
tail -f logs/combined.log

// Limpar jobs antigos no MongoDB
db.pigenjobs.deleteMany({ 
  status: 'running',
  updatedAt: { $lt: new Date(Date.now() - 3600000) } // 1h atrás
});
```

## 📊 Monitoramento

### Verificar Status de Jobs

```javascript
const PiGenJob = require('./models/PiGenJob');

// Jobs ativos
const activeJobs = await PiGenJob.find({
  status: { $in: ['queued', 'running'] }
}).sort({ createdAt: -1 });

// Jobs finalizados recentes
const recentJobs = await PiGenJob.find({
  status: 'done',
  createdAt: { $gt: new Date(Date.now() - 86400000) } // últimas 24h
});

// Taxa de falha
const stats = await PiGenJob.aggregate([
  {
    $group: {
      _id: '$status',
      count: { $sum: 1 }
    }
  }
]);
```

### Métricas de Performance

```javascript
const schemaLoader = require('./services/schemaLoader');

// Estatísticas do schema
const stats = schemaLoader.getStats();
console.log(`Células indexadas: ${stats.totalCells}`);
console.log(`Placeholders ativos: ${stats.totalPlaceholders}`);

// Tempo de geração
const start = Date.now();
const buffer = await ExcelService.generateContratoExcel(...);
console.log(`Tempo de geração: ${Date.now() - start}ms`);
```

## 🔐 Segurança

### Validação de Input

```javascript
// controller.js
async function postGenerate(req, res, next) {
  const { contratoId } = req.body;
  
  // Validar contratoId
  if (!mongoose.Types.ObjectId.isValid(contratoId)) {
    return res.status(400).json({ error: 'Invalid contratoId' });
  }
  
  // Verificar permissão
  const contrato = await Contrato.findOne({
    _id: contratoId,
    empresa: req.user.empresaId
  });
  
  if (!contrato) {
    return res.status(404).json({ error: 'Contrato not found' });
  }
  
  // ... continuar
}
```

### Limpeza de Arquivos Temporários

```bash
# Criar cron job para limpeza
# Adicionar ao crontab:
0 2 * * * find /path/to/PISystemGen/tmp -mtime +1 -delete
```

## 📚 Próximos Passos

1. ✅ Sistema base implementado
2. ✅ Testes automatizados
3. ✅ Documentação completa
4. 🔄 Implementar fila Redis + Bull (produção)
5. 🔄 Dashboard de monitoramento
6. 🔄 Notificações de conclusão
7. 🔄 Cache de templates
8. 🔄 Suporte a múltiplos templates

## 💡 Dicas de Otimização

### 1. Cache de Schema

```javascript
// O schema já é cacheado automaticamente
// Mas você pode pré-carregar na inicialização do servidor

// server.js
const schemaLoader = require('./services/schemaLoader');
app.listen(PORT, async () => {
  await schemaLoader.loadSchema();
  console.log('Schema pré-carregado!');
});
```

### 2. Pool de Puppeteer

Para múltiplas conversões simultâneas:

```javascript
// services/puppeteerPool.js
const puppeteer = require('puppeteer');

class PuppeteerPool {
  constructor(size = 3) {
    this.pool = [];
    this.size = size;
  }
  
  async getBrowser() {
    if (this.pool.length < this.size) {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox']
      });
      this.pool.push(browser);
      return browser;
    }
    return this.pool[Math.floor(Math.random() * this.pool.length)];
  }
}

module.exports = new PuppeteerPool(3);
```

### 3. Compressão de PDFs

```bash
npm install pdfkit-compress

# Ou usar ghostscript
gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook \
   -dNOPAUSE -dQUIET -dBATCH -sOutputFile=output.pdf input.pdf
```

---

**Dúvidas?** Consulte o [README.md](./README.md) ou os testes em `test-schema-generator.js`
