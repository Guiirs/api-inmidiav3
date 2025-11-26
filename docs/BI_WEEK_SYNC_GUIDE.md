# API - Sistema Sincronizado com Bi-Semanas

## 📋 Sumário
O sistema agora está **100% sincronizado com bi-semanas (quinzenas de 14 dias)**. Todas as operações de aluguel trabalham diretamente com os períodos padronizados do mercado outdoor.

## 🎯 Como Funciona

### 1. Bi-Semanas (BiWeek)
- Cada bi-semana tem **14 dias** de duração
- Identificadas por formato `YYYY-NN` (ex: `2025-01`, `2025-02`)
- Ano tem 26 bi-semanas (52 semanas / 2)
- Sistema ajusta automaticamente datas para alinhar com bi-semanas

### 2. Criar Aluguel

#### Opção 1: Usando bi_week_ids (RECOMENDADO)
```json
POST /api/v1/alugueis/
Authorization: Bearer <token>

{
  "placa_id": "65abc123...",
  "cliente_id": "65def456...",
  "bi_week_ids": ["2025-01", "2025-02", "2025-03"]
}
```

**Vantagens:**
- ✅ Automaticamente calcula data_inicio e data_fim
- ✅ Sempre alinhado com períodos de bi-semanas
- ✅ Sem risco de erro de alinhamento
- ✅ Mais simples e direto

#### Opção 2: Usando datas (com auto-alinhamento)
```json
POST /api/v1/alugueis/
Authorization: Bearer <token>

{
  "placa_id": "65abc123...",
  "cliente_id": "65def456...",
  "data_inicio": "2025-01-05",
  "data_fim": "2025-02-10"
}
```

**O sistema automaticamente:**
1. Encontra as bi-semanas que cobrem esse período
2. Ajusta as datas para os limites das bi-semanas
3. Vincula o aluguel às bi-semanas corretas

**Resposta:**
```json
{
  "id": "65xyz789...",
  "placa": { "id": "65abc123...", "numero_placa": "PLACA-001" },
  "cliente": { "id": "65def456...", "nome": "Cliente Teste" },
  "data_inicio": "2025-01-01T00:00:00.000Z",  // Ajustado!
  "data_fim": "2025-02-28T23:59:59.999Z",      // Ajustado!
  "bi_week_ids": ["2025-01", "2025-02", "2025-03"],
  "bi_weeks": [
    {
      "bi_week_id": "2025-01",
      "start_date": "2025-01-01",
      "end_date": "2025-01-14"
    },
    {
      "bi_week_id": "2025-02",
      "start_date": "2025-01-15",
      "end_date": "2025-01-28"
    },
    {
      "bi_week_id": "2025-03",
      "start_date": "2025-01-29",
      "end_date": "2025-02-11"
    }
  ]
}
```

### 3. Buscar Aluguéis por Bi-Semana

```http
GET /api/v1/alugueis/bi-week/2025-01
Authorization: Bearer <token>
```

**Resposta:**
```json
[
  {
    "id": "65xyz789...",
    "placa": { "numero_placa": "PLACA-001" },
    "cliente": { "nome": "Cliente A" },
    "data_inicio": "2025-01-01",
    "data_fim": "2025-01-28",
    "bi_week_ids": ["2025-01", "2025-02"]
  }
]
```

### 4. Buscar Placas Disponíveis em uma Bi-Semana

```http
GET /api/v1/alugueis/bi-week/2025-01/disponiveis
Authorization: Bearer <token>
```

**Resposta:**
```json
[
  {
    "id": "65abc123...",
    "numero_placa": "PLACA-002",
    "regiao": { "nome": "Centro" },
    "disponivel": true
  },
  {
    "id": "65abc456...",
    "numero_placa": "PLACA-003",
    "regiao": { "nome": "Zona Sul" },
    "disponivel": true
  }
]
```

### 5. Relatório de Ocupação por Bi-Semana

```http
GET /api/v1/alugueis/bi-week/2025-01/relatorio
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "bi_week": {
    "id": "2025-01",
    "numero": 1,
    "ano": 2025,
    "periodo": "01/01/2025 - 14/01/2025",
    "descricao": "Bi-Semana 1 de 2025"
  },
  "estatisticas": {
    "total_placas": 100,
    "placas_alugadas": 75,
    "placas_disponiveis": 25,
    "taxa_ocupacao": "75.00%"
  },
  "alugueis": [...],
  "placas_disponiveis": [...]
}
```

## 🔧 Gerenciar Bi-Semanas

### Gerar Calendário de um Ano

```http
POST /api/v1/bi-weeks/generate
Authorization: Bearer <admin-token>

{
  "ano": 2025,
  "overwrite": false
}
```

### Listar Bi-Semanas

```http
GET /api/v1/bi-weeks?ano=2025&ativo=true
Authorization: Bearer <token>
```

### Buscar Bi-Semana por Data

```http
GET /api/v1/bi-weeks/by-date?date=2025-03-15
Authorization: Bearer <token>
```

## 📊 Fluxo de Trabalho Recomendado

### 1. Setup Inicial (Apenas uma vez)
```bash
# Gerar calendário de bi-semanas para o ano atual
POST /api/v1/bi-weeks/generate { "ano": 2025 }
```

### 2. Criar Aluguel
```bash
# Opção A: Direto com bi-semanas (recomendado)
POST /api/v1/alugueis/
{
  "placa_id": "...",
  "cliente_id": "...",
  "bi_week_ids": ["2025-05", "2025-06"]
}

# Opção B: Com datas (auto-alinhamento)
POST /api/v1/alugueis/
{
  "placa_id": "...",
  "cliente_id": "...",
  "data_inicio": "2025-03-01",
  "data_fim": "2025-03-28"
}
```

### 3. Consultar Disponibilidade
```bash
# Ver placas disponíveis na próxima bi-semana
GET /api/v1/alugueis/bi-week/2025-06/disponiveis
```

### 4. Gerar Relatórios
```bash
# Relatório completo de ocupação
GET /api/v1/alugueis/bi-week/2025-06/relatorio
```

## 💡 Dicas Importantes

### ✅ Boas Práticas
- **Use bi_week_ids sempre que possível** - É mais confiável e direto
- **Gere calendário no início do ano** - Garante que todas as bi-semanas estão disponíveis
- **Consulte disponibilidade antes de criar aluguel** - Evita conflitos

### ⚠️ Atenção
- Datas fornecidas são **automaticamente ajustadas** para alinhar com bi-semanas
- Um aluguel pode abranger **múltiplas bi-semanas**
- Bi-semanas são **sequenciais e sem gaps** (sistema valida)

### 🔍 Debugging
Se um aluguel não for criado como esperado:
1. Verifique se as bi-semanas existem no banco
2. Use `/bi-weeks/by-date` para encontrar a bi-semana correta
3. Consulte `/bi-week/:id/disponiveis` para ver se a placa está livre

## 📝 Exemplos Práticos

### Exemplo 1: Aluguel de 1 Mês (2 bi-semanas)
```json
POST /api/v1/alugueis/
{
  "placa_id": "65abc123...",
  "cliente_id": "65def456...",
  "bi_week_ids": ["2025-01", "2025-02"]
}
```
✅ Cria aluguel de 01/01 a 28/01 (28 dias, 2 quinzenas)

### Exemplo 2: Aluguel de 3 Meses (6 bi-semanas)
```json
POST /api/v1/alugueis/
{
  "placa_id": "65abc123...",
  "cliente_id": "65def456...",
  "bi_week_ids": ["2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06"]
}
```
✅ Cria aluguel de 01/01 a 11/04 (~3 meses)

### Exemplo 3: Aluguel com Datas Aproximadas
```json
POST /api/v1/alugueis/
{
  "placa_id": "65abc123...",
  "cliente_id": "65def456...",
  "data_inicio": "2025-02-05",  // Meio da bi-semana
  "data_fim": "2025-03-20"       // Meio de outra bi-semana
}
```
✅ Sistema ajusta automaticamente para:
- data_inicio: 2025-01-29 (início da bi-semana 03)
- data_fim: 2025-03-24 (fim da bi-semana 06)
- bi_week_ids: ["2025-03", "2025-04", "2025-05", "2025-06"]

## 🚀 Migration de Dados Antigos

Se você tem aluguéis antigos sem bi-semanas vinculadas:

```javascript
// Script para migrar aluguéis existentes
const Aluguel = require('./models/Aluguel');
const BiWeekHelpers = require('./utils/biWeekHelpers');

async function migrateOldAlugueis() {
  const alugueis = await Aluguel.find({ bi_week_ids: { $exists: false } });
  
  for (const aluguel of alugueis) {
    const biWeeks = await BiWeekHelpers.findBiWeeksInRange(
      aluguel.data_inicio,
      aluguel.data_fim
    );
    
    aluguel.bi_weeks = biWeeks.map(bw => bw._id);
    aluguel.bi_week_ids = biWeeks.map(bw => bw.bi_week_id);
    await aluguel.save();
  }
  
  console.log(`Migrados ${alugueis.length} aluguéis`);
}
```

## 📚 Referências

- **Model BiWeek**: `models/BiWeek.js`
- **Service BiWeek**: `services/biWeekService.js`
- **Helpers**: `utils/biWeekHelpers.js`
- **AluguelService**: `services/aluguelService.js` (métodos com bi-semanas)
- **Controller**: `controllers/aluguelController.js`
- **Routes**: `routes/aluguelRoutes.js`

## 🧪 Testar

Execute o script de teste:
```bash
cd BECKEND
node scripts/testBiWeekSync.js
```

Isso vai:
- ✅ Gerar calendário de 2025
- ✅ Validar helpers de bi-semanas
- ✅ Testar alinhamento de períodos
- ✅ Validar sequências
- ✅ Confirmar que tudo está funcionando
