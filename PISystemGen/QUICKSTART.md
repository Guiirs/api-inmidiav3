# Quick Start - Gerador de PI v2.1

Guia rápido de 5 minutos para começar a usar o gerador de PI.

## 🚀 Setup Rápido

### 1. Validar Instalação (30 segundos)

```bash
cd BECKEND
node PISystemGen/validate-template.js
```

✅ Deve mostrar: "Template está VÁLIDO e pronto para uso!"

### 2. Executar Testes (2 minutos)

```bash
node PISystemGen/test-schema-generator.js
```

✅ Deve gerar arquivos em `test-outputs/`

### 3. Testar API (1 minuto)

```bash
# Iniciar servidor
npm start

# Em outro terminal, gerar PDF
curl -X POST http://localhost:5000/api/v1/pi-gen/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{"contratoId": "ID_VALIDO", "background": false}' \
  --output test.pdf
```

## 📖 Uso Básico

### Via API

**Background (recomendado para produção):**
```javascript
// Frontend
const response = await fetch('/api/v1/pi-gen/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    contratoId: '60a7...',
    background: true 
  })
});

const { jobId } = await response.json();

// Polling
const checkStatus = async () => {
  const res = await fetch(`/api/v1/pi-gen/status/${jobId}`);
  const { job } = await res.json();
  
  if (job.status === 'done') {
    window.open(job.resultUrl || job.resultPath);
  } else if (job.status !== 'failed') {
    setTimeout(checkStatus, 2000);
  }
};

checkStatus();
```

**Síncrono (para testes):**
```javascript
// Download direto
const response = await fetch('/api/v1/pi-gen/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    contratoId: '60a7...',
    background: false 
  })
});

const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'contrato.pdf';
a.click();
```

### Via Código

```javascript
// Backend
const generator = require('./PISystemGen/generator');

// Excel
const excelBuffer = await generator.generateExcelBufferFromContrato(
  contratoId,
  empresaId,
  user
);

// PDF
const pdfBuffer = await generator.generatePDFBufferFromContrato(
  contratoId,
  empresaId,
  user
);

// Salvar arquivo
const fs = require('fs').promises;
await fs.writeFile('contrato.pdf', pdfBuffer);
```

## 🎨 Customização Rápida

### Adicionar Campo

**1. Mapping (`Schema/placeholder_mapping.json`):**
```json
{
  "mappings": {
    "NOVO_CAMPO": {
      "cells": ["C20"],
      "format": "text"
    }
  }
}
```

**2. Template (`Schema/CONTRATO.xlsx`):**
- Célula C20: `{{NOVO_CAMPO}}`

**3. Dados (`services/excelServiceV2.js`):**
```javascript
prepareData(pi, cliente, empresa, user) {
  return {
    // ... existentes
    NOVO_CAMPO: pi.novoCampo || 'Padrão'
  };
}
```

**4. Testar:**
```bash
node PISystemGen/validate-template.js
```

## 🔧 Troubleshooting Rápido

### "Schema não encontrado"
```bash
# Verificar arquivo
ls -la BECKEND/Schema/CONTRATO_cells.json

# Se não existir, o sistema usa fallback
```

### "Placeholder não substituído"
```bash
# Validar template
node PISystemGen/validate-template.js

# Verificar mapping
cat BECKEND/Schema/placeholder_mapping.json | grep "PLACEHOLDER_NAME"
```

### "Timeout ao gerar PDF"
```javascript
// Aumentar timeout
const pdfBuffer = await generator.generatePDFBufferFromContrato(
  contratoId,
  empresaId,
  user,
  { timeoutMs: 120000 } // 2 minutos
);
```

## 📊 Comandos Úteis

```bash
# Validar template
node PISystemGen/validate-template.js

# Rodar testes
node PISystemGen/test-schema-generator.js

# Ver estatísticas do schema
node -e "
const loader = require('./services/schemaLoader');
loader.loadSchema().then(() => {
  console.log(loader.getStats());
});
"

# Listar jobs no MongoDB
mongo inmidiav3 --eval "db.pigenjobs.find().sort({createdAt: -1}).limit(10)"

# Limpar jobs antigos
mongo inmidiav3 --eval "db.pigenjobs.deleteMany({createdAt: {\$lt: new Date(Date.now() - 86400000)}})"

# Limpar arquivos temporários
find PISystemGen/tmp -type f -mtime +1 -delete
```

## 📚 Documentação Completa

- **Uso detalhado**: `PISystemGen/MIGRATION_GUIDE.md`
- **Arquitetura**: `PISystemGen/README.md`
- **Implementação**: `docs/PI_GENERATOR_V2.1_COMPLETE.md`

## 💡 Dicas

1. **Use background=true** para produção (não bloqueia)
2. **Implemente polling** no frontend para status
3. **Configure timeout** adequado ao tamanho dos contratos
4. **Monitore jobs** periodicamente no MongoDB
5. **Limpe arquivos** temporários regularmente

## ⚡ Performance

- ✅ Schema cached em memória
- ✅ Lookup O(1) de células
- ✅ ~90% mais rápido que v2.0
- ✅ Baixo uso de memória

## 🎯 Exemplos Reais

### Integração React

```jsx
function GerarContratoButton({ contratoId }) {
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  
  const gerar = async () => {
    const res = await fetch('/api/v1/pi-gen/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contratoId, background: true })
    });
    
    const { jobId } = await res.json();
    setJobId(jobId);
    checkStatus(jobId);
  };
  
  const checkStatus = async (id) => {
    const res = await fetch(`/api/v1/pi-gen/status/${id}`);
    const { job } = await res.json();
    setStatus(job.status);
    
    if (job.status === 'done') {
      window.open(job.resultUrl);
    } else if (job.status !== 'failed') {
      setTimeout(() => checkStatus(id), 2000);
    }
  };
  
  return (
    <button onClick={gerar} disabled={status === 'running'}>
      {status === 'running' ? 'Gerando...' : 'Gerar PDF'}
    </button>
  );
}
```

### Integração Node.js

```javascript
const express = require('express');
const router = express.Router();
const generator = require('./PISystemGen/generator');

router.get('/contrato/:id/pdf', async (req, res) => {
  try {
    const contratoId = req.params.id;
    const empresaId = req.user.empresaId;
    
    const pdfBuffer = await generator.generatePDFBufferFromContrato(
      contratoId,
      empresaId,
      req.user
    );
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=contrato.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

---

**Pronto para usar!** 🎉

Para mais detalhes, consulte a documentação completa em `PISystemGen/README.md`
