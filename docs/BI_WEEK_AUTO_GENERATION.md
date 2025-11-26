# Geração Automática de Bi-Semanas

## 🎯 Sistema Automático

O sistema agora **gera automaticamente** todas as bi-semanas quando o servidor inicia!

### ✅ O que acontece ao iniciar o servidor?

1. **Conecta ao MongoDB**
2. **Verifica bi-semanas existentes**
3. **Gera automaticamente** para:
   - Ano atual (2025)
   - Ano seguinte (2026)
   - Ano após (2027)
4. **Pula anos que já têm bi-semanas**
5. **Servidor pronto para uso!**

### 📊 Logs ao Iniciar

```
[BiWeek Init] 🔄 Verificando bi-semanas no banco de dados...
[BiWeek Init] ✅ Ano 2025 já possui 26 bi-semanas cadastradas.
[BiWeek Init] 📅 Gerando bi-semanas para o ano 2026...
[BiWeek Init] ✅ 26 bi-semanas criadas para o ano 2026
[BiWeek Init] 📅 Gerando bi-semanas para o ano 2027...
[BiWeek Init] ✅ 26 bi-semanas criadas para o ano 2027
[BiWeek Init] 🎉 Inicialização de bi-semanas concluída com sucesso!
[BiWeek Init] 📊 Total: 78 bi-semanas cadastradas (78 ativas)
[BiWeek Init] 📅 Por ano: 2025: 26, 2026: 26, 2027: 26
[BiWeek Init] ✅ Sistema de bi-semanas pronto!
```

## 🔧 Gerar Manualmente (Opcional)

### Via Script

```bash
# Gerar bi-semanas para 2025
node scripts/generateBiWeeks.js 2025

# Gerar e sobrescrever existentes
node scripts/generateBiWeeks.js 2025 --force

# Gerar para ano atual (padrão)
node scripts/generateBiWeeks.js
```

**Saída do Script:**
```
🔧 ===== GERADOR DE BI-SEMANAS =====

📅 Ano: 2025
🔄 Modo: PRESERVAR EXISTENTES

📡 Conectando ao MongoDB...
✅ Conectado!

📅 Gerando bi-semanas para 2025...
📊 Total de bi-semanas geradas: 26

🔍 Preview das bi-semanas:

   Primeiras 3:
   ✅ 2025-01: 01/01/2025 a 14/01/2025 (14 dias)
   ✅ 2025-02: 15/01/2025 a 28/01/2025 (14 dias)
   ✅ 2025-03: 29/01/2025 a 11/02/2025 (14 dias)
   ... (20 bi-semanas intermediárias) ...

   Últimas 3:
   ✅ 2025-24: 16/11/2025 a 29/11/2025 (14 dias)
   ✅ 2025-25: 30/11/2025 a 13/12/2025 (14 dias)
   ✅ 2025-26: 14/12/2025 a 31/12/2025 (18 dias)

💾 Salvando no banco de dados...
✅ 26 bi-semanas criadas com sucesso!

🔍 Validando integridade...
✅ Validação passou! Bi-semanas estão corretas:
   • Todas com ~14 dias: ✅
   • Sem gaps (sequenciais): ✅
   • Cobrem ano completo: ✅

📊 Estatísticas:
   • Bi-semanas de 2025: 26
   • Total no banco: 26
   • Anos cadastrados: 2025

✅ Concluído com sucesso!
```

### Via API

```bash
# Gerar calendário via API
POST /api/v1/bi-weeks/generate
Authorization: Bearer <admin-token>

{
  "ano": 2025,
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
  "message": "Calendário de 2025 gerado com sucesso."
}
```

## 📅 Estrutura das Bi-Semanas

Cada ano tem **26 bi-semanas** (52 semanas ÷ 2):

```
2025-01: 01/01/2025 - 14/01/2025  (14 dias)
2025-02: 15/01/2025 - 28/01/2025  (14 dias)
2025-03: 29/01/2025 - 11/02/2025  (14 dias)
...
2025-24: 16/11/2025 - 29/11/2025  (14 dias)
2025-25: 30/11/2025 - 13/12/2025  (14 dias)
2025-26: 14/12/2025 - 31/12/2025  (18 dias) ⚠️ Última é maior
```

### ⚠️ Nota sobre a Última Bi-Semana
A última bi-semana do ano pode ter mais de 14 dias para cobrir até 31/12. Isso é normal e esperado.

## 🔍 Consultar Bi-Semanas

### Listar Todas
```bash
GET /api/v1/bi-weeks?ano=2025
```

### Buscar por Data
```bash
GET /api/v1/bi-weeks/find-by-date?date=2025-03-15
```

**Resposta:**
```json
{
  "success": true,
  "bi_week": {
    "bi_week_id": "2025-06",
    "ano": 2025,
    "numero": 6,
    "start_date": "2025-03-12T00:00:00.000Z",
    "end_date": "2025-03-25T23:59:59.999Z",
    "descricao": "Bi-Semana 6 de 2025"
  }
}
```

### Anos Disponíveis
```bash
GET /api/v1/bi-weeks/years
```

**Resposta:**
```json
{
  "success": true,
  "years": [2025, 2026, 2027]
}
```

## 🚀 Como Usar no Sistema

### 1. Criar Aluguel com Bi-Semanas

```javascript
POST /api/v1/alugueis/
{
  "placa_id": "...",
  "cliente_id": "...",
  "bi_week_ids": ["2025-01", "2025-02"]  // Usa os IDs gerados automaticamente
}
```

### 2. Verificar Disponibilidade

```javascript
GET /api/v1/alugueis/bi-week/2025-01/disponiveis
```

### 3. Gerar Relatórios

```javascript
GET /api/v1/alugueis/bi-week/2025-01/relatorio
```

## ✅ Vantagens do Sistema Automático

1. **Sem Configuração Manual** - Bi-semanas são criadas automaticamente
2. **Sempre Atualizado** - Gera anos futuros automaticamente
3. **Sem Duplicação** - Pula anos que já existem
4. **Fail-Safe** - Se falhar, servidor continua normalmente
5. **Logs Claros** - Mostra exatamente o que foi criado

## 🎉 Pronto para Usar!

Simplesmente **inicie o servidor** e as bi-semanas estarão disponíveis:

```bash
npm start
```

Não precisa fazer nada mais! O sistema cuida de tudo automaticamente. 🚀
