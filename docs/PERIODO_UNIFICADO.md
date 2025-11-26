# SISTEMA DE PERÍODOS UNIFICADO

**Data da Implementação:** 25/11/2025  
**Versão:** 2.1  
**Status:** ✅ Backend 100% | ✅ Frontend PI 100% | ⚠️ Frontend Aluguel Pendente

---

## 📋 ÍNDICE

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Estrutura de Dados](#estrutura-de-dados)
4. [Componentes Implementados](#componentes-implementados)
5. [Migração de Dados](#migração-de-dados)
6. [Guia de Uso](#guia-de-uso)
7. [Próximos Passos](#próximos-passos)

---

## 🎯 VISÃO GERAL

### Objetivo

Unificar o sistema de períodos do projeto para suportar **dois tipos de locação**:

1. **Bi-semana (Quinzenal)**: Períodos de 14 dias alinhados ao calendário de bi-semanas (02, 04, 06... 52)
2. **Locação Customizada**: Períodos personalizados com data inicial e final escolhidas pelo usuário

### Motivação

**Problemas do Sistema Anterior:**
- Lógica duplicada em vários arquivos (bi_week_ids, data_inicio/data_fim)
- Inconsistência entre Aluguéis e PIs
- Difícil manutenção e extensão
- Validações espalhadas pelo código

**Benefícios do Novo Sistema:**
- ✅ Código centralizado em `PeriodService`
- ✅ Schema reutilizável para todos os models
- ✅ Validações consistentes
- ✅ Fácil adicionar novos tipos de período no futuro
- ✅ API padronizada (backend e frontend)

---

## 🏗️ ARQUITETURA

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                            │
├─────────────────────────────────────────────────────────────┤
│  PeriodSelector Component (React)                          │
│  ↓ usa types/period.js                                     │
│  ↓ integra com react-query                                 │
└─────────────────────────────────────────────────────────────┘
                            ↕ API
┌─────────────────────────────────────────────────────────────┐
│                         BACKEND                             │
├─────────────────────────────────────────────────────────────┤
│  Controllers (Aluguel, PI, Relatórios)                     │
│    ↓                                                        │
│  Validators (Validação de entrada)                         │
│    ↓                                                        │
│  Services (AluguelService, PIService)                      │
│    ↓ usa PeriodService                                     │
│  PeriodService (Lógica centralizada)                       │
│    ↓ usa utils/periodTypes.js                             │
│  Models (Aluguel, PropostaInterna)                         │
│    ↓ usa createPeriodSchema()                             │
│  MongoDB                                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 ESTRUTURA DE DADOS

### Novo Formato Padronizado

```javascript
{
  // Tipo de período
  periodType: 'bi-week' | 'custom',
  
  // Datas sempre presentes
  startDate: Date,  // Data de início
  endDate: Date,    // Data de fim
  
  // Apenas para bi-week
  biWeekIds: ['2025-02', '2025-04', ...],  // IDs string
  biWeeks: [ObjectId, ObjectId, ...]       // Referências
}
```

### Comparação: Formato Antigo vs Novo

| Aspecto | Formato Antigo | Formato Novo |
|---------|----------------|--------------|
| **Tipo** | Implícito (baseado em campos) | Explícito (`periodType`) |
| **Datas** | `data_inicio`, `data_fim` | `startDate`, `endDate` |
| **Bi-weeks** | `bi_week_ids`, `bi_weeks` | `biWeekIds`, `biWeeks` |
| **Validação** | Espalhada | Centralizada |
| **Conversão** | Manual | Automática |

### Enum de Tipos

```javascript
const PeriodType = {
    BI_WEEK: 'bi-week',    // Quinzenal
    CUSTOM: 'custom'        // Personalizado
};
```

---

## 🔧 COMPONENTES IMPLEMENTADOS

### 1. Backend

#### `utils/periodTypes.js`
**Responsabilidade:** Definições de tipos, schemas e validações base

**Exports:**
- `PeriodType` - Enum de tipos
- `createPeriodSchema()` - Factory para schema embedado
- `validatePeriod()` - Validador de período
- `normalizePeriodInput()` - Conversor de formato antigo
- `formatPeriodDisplay()` - Formatador para exibição

**Exemplo de Uso:**
```javascript
const { createPeriodSchema } = require('../utils/periodTypes');

const MySchema = new Schema({
  myField: String,
  ...createPeriodSchema(),  // Adiciona todos os campos de período
  status: String
});
```

#### `services/periodService.js`
**Responsabilidade:** Lógica de negócio centralizada para períodos

**Métodos Principais:**
- `processPeriodInput(input)` - Processa entrada e retorna formato padronizado
- `calculateDatesFromBiWeeks(biWeekIds)` - Calcula datas a partir de bi-weeks
- `checkBiWeekAlignment(startDate, endDate)` - Verifica alinhamento com bi-weeks
- `validateBiWeekContinuity(biWeeks)` - Valida continuidade
- `periodsOverlap(period1, period2)` - Verifica sobreposição
- `calculateDurationInDays(start, end)` - Calcula duração

**Exemplo de Uso:**
```javascript
const PeriodService = require('../services/periodService');

// Processar entrada (suporta formato antigo e novo)
const period = await PeriodService.processPeriodInput({
  bi_week_ids: ['2025-02', '2025-04']
});
// Retorna: { periodType: 'bi-week', startDate: Date, endDate: Date, ... }
```

#### `models/Aluguel.js` ✅ ATUALIZADO
**Mudanças:**
- ✅ Adicionado `...createPeriodSchema()` para novos campos
- ✅ Campos antigos marcados como `required: false` (compatibilidade)
- ✅ Novos índices para `periodType`, `startDate`, `endDate`
- ✅ Mantido índices antigos para compatibilidade

#### `models/PropostaInterna.js` ✅ ATUALIZADO
**Mudanças:**
- ✅ Adicionado `...createPeriodSchema()` para novos campos
- ✅ `tipoPeriodo` agora é opcional (usa `periodType`)
- ✅ `dataInicio`/`dataFim` opcionais (usa `startDate`/`endDate`)
- ✅ Novos índices

### 2. Frontend

#### `types/period.js`
**Responsabilidade:** Tipos, validações e helpers para frontend

**Exports:**
- `PeriodType` - Enum (sincronizado com backend)
- `PeriodTypeLabels` - Labels amigáveis
- `validatePeriod()` - Validador client-side
- `formatPeriodDisplay()` - Formatador
- `convertOldFormatToNew()` - Conversor
- `createEmptyPeriod()` - Factory
- `periodsOverlap()` - Verificador de sobreposição

#### `components/PeriodSelector/PeriodSelector.jsx` ✅ IMPLEMENTADO
**Responsabilidade:** Componente React para seleção de períodos

**Features:**
- ✅ Seleção de tipo (bi-week vs custom)
- ✅ Seletor de ano para bi-weeks
- ✅ Grid interativo de bi-semanas
- ✅ Botão "Selecionar Todas"
- ✅ Campos de data para custom
- ✅ Cálculo automático de duração
- ✅ Validação em tempo real
- ✅ Resumo visual do período
- ✅ Responsivo

**Props:**
```javascript
<PeriodSelector
  value={periodData}           // Período atual
  onChange={handleChange}      // Callback de mudança
  errors={validationErrors}    // Erros de validação
  disabled={false}             // Desabilitar componente
  showDuration={true}          // Mostrar duração
/>
```

**Exemplo de Integração:**
```jsx
import PeriodSelector from '../../components/PeriodSelector/PeriodSelector';

function MyForm() {
  const [period, setPeriod] = useState({
    periodType: 'custom',
    startDate: '',
    endDate: '',
    biWeekIds: []
  });

  return (
    <PeriodSelector
      value={period}
      onChange={setPeriod}
      errors={{}}
    />
  );
}
```

### 3. Scripts

#### `scripts/migratePeriods.js` ✅ IMPLEMENTADO
**Responsabilidade:** Migrar dados antigos para novo formato

**Uso:**
```bash
# Simular migração (não altera dados)
node scripts/migratePeriods.js --dry-run

# Executar migração real
node scripts/migratePeriods.js --execute
```

**O que faz:**
- ✅ Detecta formato antigo
- ✅ Converte para novo formato
- ✅ Mantém campos antigos (compatibilidade)
- ✅ Estatísticas detalhadas
- ✅ Modo dry-run seguro

---

## 🔄 MIGRAÇÃO DE DADOS

### Status da Migração

| Item | Status | Detalhes |
|------|--------|----------|
| Script criado | ✅ | `scripts/migratePeriods.js` |
| Teste dry-run | ✅ | **CONCLUÍDO** - 25/11/2025 |
| Migração Aluguéis | ✅ | **CONCLUÍDO** - 1 aluguel migrado |
| Migração PIs | ✅ | **CONCLUÍDO** - 0 PIs encontradas |
| Validação | ✅ | **CONCLUÍDO** - 0 erros |

### Processo de Migração

**1. Backup**
```bash
# Fazer backup do MongoDB
mongodump --uri="mongodb://..." --out=backup-$(date +%Y%m%d)
```

**2. Dry-Run**
```bash
cd BECKEND
node scripts/migratePeriods.js --dry-run
```

Verificar output:
- ✅ Todos os registros detectados?
- ✅ Tipos corretos atribuídos?
- ✅ Erros = 0?

**3. Execução**
```bash
node scripts/migratePeriods.js --execute
```

**4. Validação**
```javascript
// No MongoDB Compass ou mongo shell
db.alugueis.find({ periodType: null }).count()  // Deve ser 0
db.propostaInternas.find({ periodType: null }).count()  // Deve ser 0
```

### Compatibilidade

**⚠️ IMPORTANTE:** O sistema mantém **retrocompatibilidade** durante a transição:

- ✅ Campos antigos mantidos (`data_inicio`, `data_fim`, `bi_week_ids`)
- ✅ API antiga ainda funciona
- ✅ Novos registros salvam em ambos os formatos
- ✅ Leitura aceita formato antigo ou novo

Após 100% de migração + testes completos, os campos antigos podem ser removidos.

---

## 📖 GUIA DE USO

### Backend - Criar Aluguel com Período

```javascript
// services/aluguelService.js (exemplo de integração)
const PeriodService = require('./periodService');

async createAluguel(data) {
  // 1. Processar período
  const period = await PeriodService.processPeriodInput({
    periodType: data.periodType,      // 'bi-week' ou 'custom'
    startDate: data.startDate,
    endDate: data.endDate,
    biWeekIds: data.biWeekIds
  });

  // 2. Criar aluguel com período padronizado
  const aluguel = new Aluguel({
    placa: data.placa_id,
    cliente: data.cliente_id,
    empresa: data.empresa_id,
    ...period  // Spread dos campos de período
  });

  // 3. Salvar
  await aluguel.save();
  return aluguel;
}
```

### Frontend - Usar PeriodSelector em Formulário

```jsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import PeriodSelector from '../../components/PeriodSelector/PeriodSelector';
import { validatePeriod, convertNewFormatToOld } from '../../types/period';

function AluguelForm() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [period, setPeriod] = useState({
    periodType: 'custom',
    startDate: '',
    endDate: '',
    biWeekIds: []
  });
  const [periodErrors, setPeriodErrors] = useState({});

  const onSubmit = async (data) => {
    // Validar período
    const validation = validatePeriod(period);
    if (!validation.valid) {
      setPeriodErrors({ periodType: validation.errors.join(', ') });
      return;
    }

    // Converter para formato API (se necessário)
    const apiData = {
      ...data,
      ...convertNewFormatToOld(period)  // Compatibilidade com API antiga
    };

    // Enviar para API
    await createAluguel(apiData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Outros campos */}
      <input {...register('placa_id')} />
      <input {...register('cliente_id')} />

      {/* Seletor de Período */}
      <PeriodSelector
        value={period}
        onChange={setPeriod}
        errors={periodErrors}
      />

      <button type="submit">Criar Aluguel</button>
    </form>
  );
}
```

---

## ⏭️ PRÓXIMOS PASSOS

### Fase 1: Integração Backend ✅ CONCLUÍDO

| Tarefa | Arquivo | Status | Data |
|--------|---------|--------|------|
| Integrar PeriodService em AluguelService | `services/aluguelService.js` | ✅ CONCLUÍDO | 25/11/2025 |
| Integrar PeriodService em PIService | `services/piService.js` | ✅ CONCLUÍDO | 25/11/2025 |
| Atualizar aluguelValidator | `validators/aluguelValidator.js` | ✅ CONCLUÍDO | 25/11/2025 |
| Atualizar piValidator | `validators/piValidator.js` | ✅ CONCLUÍDO | 25/11/2025 |
| Atualizar aluguelController | `controllers/aluguelController.js` | ✅ CONCLUÍDO | 25/11/2025 |
| Atualizar piController | `controllers/piController.js` | ✅ CONCLUÍDO | 25/11/2025 |

### Fase 2: Integração Frontend ✅ CONCLUÍDO

| Tarefa | Arquivo | Status | Data |
|--------|---------|--------|------|
| Criar componente PeriodSelector | `components/PeriodSelector/PeriodSelector.jsx` | ✅ CONCLUÍDO | 25/11/2025 |
| Integrar PeriodSelector em PIForm | `components/PIModalForm/Pages/Page1Cliente.jsx` | ✅ CONCLUÍDO | 25/11/2025 |
| Atualizar lógica do formulário PI | `components/PIModalForm/system/usePIFormLogic.js` | ✅ CONCLUÍDO | 25/11/2025 |
| Ajustar envio de dados em PIsPage | `pages/PIs/PIsPage.jsx` | ✅ CONCLUÍDO | 25/11/2025 |
| Criar types/period.js | `types/period.js` | ✅ CONCLUÍDO | 25/11/2025 |
| Criar biWeekService | `services/biWeekService.js` | ✅ CONCLUÍDO | 25/11/2025 |
| Integrar PeriodSelector em AluguelForm | `pages/PlacaDetailsPage/*.jsx` | ⚠️ TODO | - |
| Atualizar filtros de busca | `pages/Placas/*.jsx` | ⚠️ TODO | - |
| Atualizar relatórios | `pages/Relatorios/*.jsx` | ⚠️ TODO | - |

### Fase 3: Testes e Migração ✅ CONCLUÍDO

| Tarefa | Status | Data |
|--------|--------|------|
| Executar migration dry-run | ✅ CONCLUÍDO | 25/11/2025 |
| Executar migration produção | ✅ CONCLUÍDO | 25/11/2025 |
| Validar dados migrados | ✅ CONCLUÍDO | 25/11/2025 |
| Testar criação de aluguel bi-week | ⚠️ TODO | - |
| Testar criação de aluguel custom | ⚠️ TODO | - |
| Testar criação de PI | ⚠️ TODO | - |
| Testar conflitos de datas | ⚠️ TODO | - |
| Testar relatórios | ⚠️ TODO | - |
| Remover código antigo (após 100% migração) | ⚠️ TODO | - |

**Resumo da Migração Executada:**
- 1 aluguel migrado com sucesso (tipo: custom)
- 0 PIs encontradas para migração
- 0 erros durante a migração
- Campos antigos mantidos para compatibilidade

### Fase 4: Otimizações

- [ ] Cache de bi-weeks no frontend
- [ ] Pré-visualização de períodos
- [ ] Sugestões inteligentes de períodos
- [ ] Histórico de períodos mais usados
- [ ] Analytics de uso de períodos

---

## 📞 SUPORTE

**Dúvidas sobre implementação:**
- Consulte `utils/periodTypes.js` para tipos e validações
- Veja `services/periodService.js` para lógica de negócio
- Exemplo de uso: `components/PeriodSelector/PeriodSelector.jsx`

**Problemas na migração:**
- Execute `--dry-run` primeiro
- Verifique logs em `logs/`
- Mantenha backup do banco

**Contribuindo:**
- Siga padrões estabelecidos em `periodTypes.js`
- Atualize esta documentação ao fazer mudanças
- Adicione testes para novos recursos

---

## 📝 RESUMO DA IMPLEMENTAÇÃO - 25/11/2025

### ✅ Concluído

**Backend (100% Implementado)**
1. ✅ **Arquitetura Base**
   - `utils/periodTypes.js` - Tipos, schemas e validações
   - `services/periodService.js` - Lógica de negócio centralizada
   - `models/Aluguel.js` - Schema atualizado com novos campos
   - `models/PropostaInterna.js` - Schema atualizado com novos campos

2. ✅ **Integração Completa**
   - `validators/aluguelValidator.js` - Validações para ambos os formatos
   - `validators/piValidator.js` - Validações para ambos os formatos
   - `services/aluguelService.js` - Usa PeriodService
   - `services/piService.js` - Usa PeriodService
   - `controllers/aluguelController.js` - Comentários atualizados
   - `controllers/piController.js` - Comentários atualizados

3. ✅ **Migração de Dados**
   - Script `scripts/migratePeriods.js` criado e testado
   - Dry-run executado com sucesso
   - Migração real concluída (1 aluguel, 0 PIs)
   - 0 erros durante todo o processo

**Frontend - Propostas Internas (100% Implementado)**
1. ✅ **Componente PeriodSelector**
   - `components/PeriodSelector/PeriodSelector.jsx` - Componente completo
   - `components/PeriodSelector/PeriodSelector.css` - Estilização
   - Suporta modo bi-week (seleção visual de bi-semanas)
   - Suporta modo custom (datas personalizadas)
   - Validação em tempo real
   - Cálculo automático de duração

2. ✅ **Integração PI Form**
   - `components/PIModalForm/Pages/Page1Cliente.jsx` - PeriodSelector integrado
   - `components/PIModalForm/system/usePIFormLogic.js` - Lógica atualizada
   - `pages/PIs/PIsPage.jsx` - onModalSubmit atualizado
   - Conversão automática formato legado → novo
   - Envio de ambos os formatos para compatibilidade

3. ✅ **Services e Types**
   - `services/biWeekService.js` - Serviço completo para bi-semanas
   - `types/period.js` - Types, validações e helpers
   - `services/api.js` - Endpoints de PI mantidos compatíveis

### ⚠️ Pendente

**Frontend - Aluguéis (0% Implementado)**
1. ⚠️ Integrar `PeriodSelector` em formulário de Aluguel
2. ⚠️ Atualizar lógica de criação de Aluguel
3. ⚠️ Atualizar filtros de placas disponíveis
4. ⚠️ Atualizar visualização de aluguéis

**Frontend - Outras Áreas**
1. ⚠️ Atualizar filtros de busca por período
2. ⚠️ Atualizar relatórios para usar novos campos
3. ⚠️ Dashboard com visualização de bi-semanas

**Testes**
1. ⚠️ Testar criação de PI com bi-weeks
2. ⚠️ Testar criação de PI custom
3. ⚠️ Testar edição de PI existente
4. ⚠️ Testar conflitos de período
5. ⚠️ Validação completa em produção

### 🎯 Próxima Ação Recomendada

**Prioridade Alta:** Testar Sistema PI
- O frontend de PI está 100% integrado com novo sistema
- Backend mantém compatibilidade total
- Testar criação e edição de PIs com bi-weeks
- Validar se placas estão sendo reservadas corretamente

**Prioridade Média:** Integração Aluguéis
- Sistema PI pode servir como referência
- Estrutura já está preparada (PeriodSelector reutilizável)

---

**Última Atualização:** 25/11/2025 - 21:30  
**Autor:** Sistema Automatizado  
**Versão:** 2.1.0
