# 📅 Sistema de Calendário de Bi-Semanas - Guia Completo

## 📋 Visão Geral

Este sistema implementa a gestão de **Bi-Semanas (períodos de 14 dias)** conforme o padrão do mercado outdoor brasileiro. Permite:

- ✅ Importação automática de calendário a partir de Excel
- ✅ Geração automática de calendário para qualquer ano
- ✅ CRUD completo via API REST
- ✅ Interface administrativa visual (React)
- ✅ Validação **opcional** de datas em aluguéis/PIs

---

## 🚀 Setup Inicial

### 1. Importar Calendário de 2026 do Excel

```bash
cd BECKEND
node scripts/importBiWeeks.js
```

**O que acontece:**
- Lê o arquivo `BECKEND/Schema/BI SEMANA 2026.xlsx`
- Importa todas as Bi-Semanas para a collection `biweeks` no MongoDB
- Insere ou atualiza (upsert) registros existentes

**Saída esperada:**
```
🚀 Iniciando importação do calendário de Bi-Semanas...
📂 Lendo arquivo Excel: E:\backstage\BECKEND\Schema\BI SEMANA 2026.xlsx
✅ Total de Bi-Semanas extraídas: 26
💾 Iniciando importação para o MongoDB...
   ✅ Inserido: 2026-01 (01/01/2026 - 14/01/2026)
   ...
📊 Resumo da Importação:
   ✅ Inseridos: 26
   🔄 Atualizados: 0
   ❌ Erros: 0
```

---

## 🔧 API Endpoints

Base URL: `http://localhost:5000/api/v1/bi-weeks`

### 📖 Consulta (Usuários Autenticados)

#### 1. Listar Calendário
```http
GET /calendar?ano=2026&ativo=true
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "success": true,
  "count": 26,
  "data": [
    {
      "_id": "...",
      "bi_week_id": "2026-01",
      "ano": 2026,
      "numero": 1,
      "start_date": "2026-01-01T00:00:00.000Z",
      "end_date": "2026-01-14T23:59:59.999Z",
      "descricao": "Bi-Semana 1 de 2026",
      "ativo": true
    }
  ]
}
```

#### 2. Listar Anos Disponíveis
```http
GET /years
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "success": true,
  "data": [2026, 2027, 2028]
}
```

#### 3. Buscar por Data
```http
GET /find-by-date?date=2026-03-15
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "bi_week_id": "2026-06",
    "start_date": "2026-03-12T00:00:00.000Z",
    "end_date": "2026-03-25T23:59:59.999Z"
  }
}
```

#### 4. Validar Período
```http
POST /validate
Authorization: Bearer <token>
Content-Type: application/json

{
  "start_date": "2026-01-01",
  "end_date": "2026-01-14"
}
```

**Resposta (Válido):**
```json
{
  "success": true,
  "valid": true,
  "message": "Período válido: 1 Bi-Semana(s) completa(s).",
  "biWeeks": [...]
}
```

**Resposta (Inválido):**
```json
{
  "success": true,
  "valid": false,
  "message": "As datas não estão alinhadas com os limites das Bi-Semanas cadastradas.",
  "suggestion": {
    "start_date": "2026-01-01",
    "end_date": "2026-01-14"
  }
}
```

### 🔒 Administração (Apenas Admin)

#### 5. Criar Bi-Semana
```http
POST /
Authorization: Bearer <token_admin>
Content-Type: application/json

{
  "bi_week_id": "2027-01",
  "ano": 2027,
  "numero": 1,
  "start_date": "2027-01-01",
  "end_date": "2027-01-14",
  "descricao": "Primeira quinzena de 2027"
}
```

#### 6. Atualizar Bi-Semana
```http
PUT /:id
Authorization: Bearer <token_admin>
Content-Type: application/json

{
  "descricao": "Nova descrição",
  "ativo": false
}
```

#### 7. Deletar Bi-Semana
```http
DELETE /:id
Authorization: Bearer <token_admin>
```

#### 8. Gerar Calendário Automático
```http
POST /generate
Authorization: Bearer <token_admin>
Content-Type: application/json

{
  "ano": 2027,
  "overwrite": false
}
```

**Resposta:**
```json
{
  "success": true,
  "created": 26,
  "skipped": 0,
  "total": 26,
  "message": "Calendário de 2027 gerado com sucesso."
}
```

---

## 🎯 Ativação da Validação de Bi-Semana

### Por Padrão: DESATIVADO

O sistema permite datas flexíveis por padrão. Para **forçar** validação:

### 1. Via API (Atualizar Empresa)
```http
PUT /api/v1/empresa/:empresaId
Content-Type: application/json

{
  "enforce_bi_week_validation": true
}
```

### 2. Via MongoDB (Direto)
```javascript
db.empresas.updateOne(
  { _id: ObjectId("...") },
  { $set: { enforce_bi_week_validation: true } }
)
```

### Como Funciona

Quando `enforce_bi_week_validation: true`:

1. **Ao criar aluguel:** Sistema valida se `data_inicio` e `data_fim` estão **exatamente** alinhadas com Bi-Semanas cadastradas
2. **Se inválido:** Retorna erro 400 com sugestão de datas corretas
3. **Se válido:** Permite criação do aluguel

**Exemplo de Erro:**
```json
{
  "success": false,
  "message": "As datas do aluguel devem estar alinhadas com os períodos de Bi-Semana (14 dias) cadastrados.",
  "details": "As datas não estão alinhadas com os limites das Bi-Semanas cadastradas.",
  "suggestion": {
    "start_date": "2026-01-01",
    "end_date": "2026-01-14"
  },
  "bi_weeks_found": [...]
}
```

---

## 🖥️ Interface Administrativa (Frontend)

### Acessar

1. Faça login como **admin**
2. No menu lateral, clique em **"Bi-Semanas"** (ícone de calendário)
3. URL: `http://localhost:5173/bi-weeks`

### Funcionalidades

#### 📋 Visualizar Calendário
- Tabela mostrando todas as Bi-Semanas
- Filtro por ano (dropdown)
- Mostra: ID, Número, Datas, Descrição, Status

#### ➕ Criar Bi-Semana Manual
1. Clique em **"Nova Bi-Semana"**
2. Preencha:
   - **ID** (ex: 2026-01)
   - **Ano** (2026-2100)
   - **Número** (1-26)
   - **Data Início**
   - **Data Fim**
   - **Descrição** (opcional)
   - **Status** (Ativo/Inativo)
3. Clique em **"Salvar"**

#### ✏️ Editar Bi-Semana
1. Clique no ícone de **lápis** na linha desejada
2. Modifique os campos
3. Clique em **"Salvar"**

#### 🗑️ Deletar Bi-Semana
1. Clique no ícone de **lixeira**
2. Confirme a exclusão

#### ⚡ Gerar Calendário Automático
1. Clique em **"Gerar Calendário"**
2. Selecione o **ano** (ex: 2027)
3. Escolha se deseja **sobrescrever** Bi-Semanas existentes:
   - **Não:** Mantém as existentes, cria apenas as faltantes
   - **Sim:** Substitui todas as Bi-Semanas do ano
4. Clique em **"Gerar"**

**Resultado:**
- Sistema cria automaticamente 26 Bi-Semanas (períodos de 14 dias) para o ano
- Ajusta o último período para não ultrapassar 31/12

---

## 📊 Estrutura de Dados (MongoDB)

### Collection: `biweeks`

```javascript
{
  _id: ObjectId("..."),
  bi_week_id: "2026-01",        // Formato: YYYY-NN
  ano: 2026,                     // Número do ano
  numero: 1,                     // 1-26 (número sequencial no ano)
  start_date: ISODate("2026-01-01T00:00:00.000Z"),
  end_date: ISODate("2026-01-14T23:59:59.999Z"),
  descricao: "Bi-Semana 1 de 2026",
  ativo: true,
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

### Índices

```javascript
// Garantir unicidade
{ bi_week_id: 1 } unique: true
{ ano: 1, numero: 1 } unique: true

// Performance
{ start_date: 1, end_date: 1 }
{ ativo: 1 }
```

---

## 🔍 Casos de Uso

### Caso 1: Empresa quer usar apenas Bi-Semanas
```javascript
// 1. Ativar validação
db.empresas.updateOne(
  { nome: "Empresa X" },
  { $set: { enforce_bi_week_validation: true } }
)

// 2. Criar aluguel (via API)
POST /api/v1/alugueis
{
  "placa_id": "...",
  "cliente_id": "...",
  "data_inicio": "2026-01-01",  // Deve coincidir com início de Bi-Semana
  "data_fim": "2026-01-14"       // Deve coincidir com fim de Bi-Semana
}
// ✅ Sucesso: Datas alinhadas
```

### Caso 2: Empresa quer flexibilidade total
```javascript
// 1. Manter validação desativada (padrão)
enforce_bi_week_validation: false

// 2. Criar aluguel com qualquer período
POST /api/v1/alugueis
{
  "placa_id": "...",
  "cliente_id": "...",
  "data_inicio": "2026-03-05",  // Data aleatória
  "data_fim": "2026-03-19"       // Período de 14 dias mas não alinhado
}
// ✅ Sucesso: Validação desabilitada, aceita qualquer data
```

### Caso 3: Verificar Bi-Semana de uma data específica
```javascript
// Frontend (React)
import { findBiWeekByDate } from './services/biWeekService';

const biWeek = await findBiWeekByDate('2026-08-15');
console.log(biWeek);
// Output: { bi_week_id: "2026-16", start_date: "...", end_date: "..." }
```

---

## 🛠️ Manutenção

### Adicionar Calendário de Novo Ano

**Opção 1: Via Interface Admin**
1. Acesse `/bi-weeks`
2. Clique em **"Gerar Calendário"**
3. Digite o ano (ex: 2028)
4. Clique em **"Gerar"**

**Opção 2: Via API**
```bash
curl -X POST http://localhost:5000/api/v1/bi-weeks/generate \
  -H "Authorization: Bearer <token_admin>" \
  -H "Content-Type: application/json" \
  -d '{"ano": 2028, "overwrite": false}'
```

**Opção 3: Via Script Node.js**
```javascript
const BiWeek = require('./models/BiWeek');

// Conectar ao MongoDB...

const biWeeks = BiWeek.generateCalendar(2028);
await BiWeek.insertMany(biWeeks);
```

### Ajustes Manuais

Se um ano específico tiver períodos diferentes (ex: ano bissexto, feriados especiais):

1. Acesse a interface admin
2. Edite as Bi-Semanas manualmente
3. Ajuste datas de início/fim conforme necessário

---

## 📝 Logs e Debug

### Backend (Node.js)
```bash
# Ver logs de validação
grep "BiWeekService" BECKEND/logs/combined.log

# Ver logs de importação
node scripts/importBiWeeks.js 2>&1 | tee import.log
```

### Frontend (React)
```javascript
// Console do navegador
localStorage.debug = 'api:*';
// Recarregue a página para ver logs detalhados
```

---

## ⚠️ Troubleshooting

### Erro: "Bi-Semana não encontrada para a data X"
**Causa:** Calendário não foi gerado para aquele ano  
**Solução:** Gerar calendário via interface ou API

### Erro: "Datas não alinhadas com Bi-Semanas"
**Causa:** Empresa tem `enforce_bi_week_validation: true` mas datas não coincidem  
**Solução:** 
1. Usar o endpoint `/validate` para ver sugestão de datas corretas
2. Ajustar datas no frontend para coincidir com limites de Bi-Semana

### Erro: "Formato de bi_week_id inválido"
**Causa:** Formato deve ser `YYYY-NN` (ex: 2026-01)  
**Solução:** Corrigir formato

---

## 🎓 Conceitos Importantes

### O que é uma Bi-Semana?
- Período de **14 dias consecutivos**
- Padrão do mercado outdoor brasileiro
- Usado para **veiculação de campanhas publicitárias**
- 26 Bi-Semanas por ano (52 semanas / 2)

### Por que o sistema é flexível?
- Nem todas as empresas seguem o padrão de Bi-Semana rigidamente
- Algumas preferem períodos customizados
- Por isso, a validação é **opcional** (flag `enforce_bi_week_validation`)

### Validação é Retroativa?
**Não.** A validação só se aplica a **novos aluguéis** criados após ativar a flag. Aluguéis existentes não são afetados.

---

## 📚 Arquivos Criados/Modificados

### Backend
- ✅ `BECKEND/models/BiWeek.js` - Modelo do MongoDB
- ✅ `BECKEND/services/biWeekService.js` - Lógica de negócio
- ✅ `BECKEND/controllers/biWeekController.js` - Controllers da API
- ✅ `BECKEND/routes/biWeeks.js` - Rotas da API
- ✅ `BECKEND/validators/biWeekValidator.js` - Validações
- ✅ `BECKEND/validators/aluguelValidator.js` - Validação de aluguel com Bi-Semana
- ✅ `BECKEND/scripts/importBiWeeks.js` - Script de importação do Excel
- ✅ `BECKEND/models/Empresa.js` - Adicionado campo `enforce_bi_week_validation`
- ✅ `BECKEND/routes/aluguelRoutes.js` - Integrada validação de Bi-Semana
- ✅ `BECKEND/server.js` - Registradas rotas `/api/v1/bi-weeks`

### Frontend
- ✅ `REACT/src/services/biWeekService.js` - Service para chamadas API
- ✅ `REACT/src/pages/BiWeeks/BiWeeksPage.jsx` - Interface administrativa
- ✅ `REACT/src/App.jsx` - Rota `/bi-weeks` registrada
- ✅ `REACT/src/components/Sidebar/Sidebar.jsx` - Link no menu lateral

---

## 🚀 Próximos Passos

1. ✅ Testar importação do Excel 2026
2. ✅ Acessar interface administrativa
3. ⬜ Gerar calendário de 2027/2028 para testes
4. ⬜ Testar validação de aluguéis com `enforce_bi_week_validation: true`
5. ⬜ Documentar casos de uso específicos da empresa

---

**Sistema implementado e pronto para uso! 🎉**
