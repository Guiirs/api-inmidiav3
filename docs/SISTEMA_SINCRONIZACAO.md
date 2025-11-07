# Sistema de Sincronização PI ↔ Aluguéis

## 📋 Visão Geral

Sistema robusto de sincronização automática entre Propostas Internas (PIs) e Aluguéis, garantindo que nunca haja dessincronia entre os dois sistemas.

## 🔑 Componentes Principais

### 1. **Código Único de Vinculação (`pi_code`)**
- Código UUID único gerado para cada PI
- Formato: `PI-{timestamp}-{random}` (ex: `PI-L8K9M2N3-A1B2C3`)
- Garante rastreabilidade e sincronização perfeita

### 2. **Campos Adicionados aos Models**

#### **Aluguel Model:**
```javascript
pi_code: String          // Código de vinculação com PI
proposta_interna: ObjectId  // Referência direta à PI
tipo: 'manual' | 'pi'    // Identifica origem do aluguel
```

#### **PropostaInterna Model:**
```javascript
pi_code: String (unique, required)  // Código único de sincronização
```

### 3. **PIService - Métodos Atualizados**

#### `_generatePICode()`
Gera código único para cada PI.

#### `_criarAlugueisParaPI(piId, piCode, clienteId, placaIds, ...)`
Cria aluguéis vinculados automaticamente com `pi_code`.

#### `create(piData, empresaId)`
- Gera `pi_code` único
- Salva PI com código
- Cria aluguéis vinculados

#### `update(piId, updateData, empresaId)`
- Usa `pi_code` para atualizar aluguéis
- Remove/adiciona aluguéis de placas alteradas
- Atualiza datas usando `pi_code`

#### `delete(piId, empresaId)`
- Remove TODOS os aluguéis usando `pi_code`
- Garantia de limpeza completa

### 4. **PISyncService - Sistema de Validação**

#### `syncPIsWithAlugueis()` - Roda a cada 30 minutos
Valida e corrige automaticamente:

**Verificações:**
1. ✅ Quantidade de aluguéis = quantidade de placas na PI
2. ✅ Datas dos aluguéis = datas da PI
3. ✅ Cliente/empresa dos aluguéis = cliente/empresa da PI
4. ✅ Todas as placas da PI têm aluguéis

**Correções Automáticas:**
- 🔧 Cria aluguéis faltantes
- 🔧 Remove aluguéis órfãos (placas removidas da PI)
- 🔧 Corrige datas desatualizadas
- 🔧 Corrige cliente/empresa incorretos

#### `cleanOrphanAlugueis()`
Remove aluguéis tipo 'pi' que não têm PI correspondente.

### 5. **Cron Job - Execução Automática**

**Frequência:** A cada 30 minutos

**Tarefas Executadas:**
1. Atualiza status de placas (baseado em aluguéis)
2. Atualiza status de PIs vencidas
3. **[NOVO]** Valida e sincroniza PIs com aluguéis
4. **[NOVO]** Remove aluguéis órfãos

## 🚀 Como Usar

### Criar Nova PI
```javascript
// O sistema automaticamente:
// 1. Gera pi_code único
// 2. Cria aluguéis vinculados
// 3. Todos os aluguéis têm pi_code, proposta_interna e tipo='pi'
```

### Editar PI
```javascript
// Adicionar placas: Cria novos aluguéis automaticamente
// Remover placas: Remove aluguéis usando pi_code
// Alterar datas: Atualiza TODOS os aluguéis usando pi_code
```

### Deletar PI
```javascript
// Remove TODOS os aluguéis usando pi_code
// Não deixa aluguéis órfãos
```

## 📊 Logs e Monitoramento

### Logs de Criação:
```
[PIService] Código de sincronização gerado: PI-L8K9M2N3-A1B2C3
[PIService] PI salva com sucesso. ID: xxx, Code: PI-L8K9M2N3-A1B2C3
[PIService] 5 aluguéis criados com sucesso para PI xxx
```

### Logs de Sincronização:
```
[PISyncService] 🔄 Iniciando validação PI ↔ Aluguéis...
[PISyncService] 📊 Validando 15 PIs ativas...
[PISyncService] ⚠️  PI xxx (PI-ABC123): 5 placas, 3 aluguéis
[PISyncService] 🔧 Criando 2 aluguéis faltantes para PI xxx
[PISyncService] ✅ 2 aluguéis criados
[PISyncService] ✅ Validação concluída!
```

## 🛠️ Scripts de Manutenção

### 1. Migrar PIs Antigas
```bash
node scripts/migrarPICode.js
```
Adiciona `pi_code` a PIs antigas que não têm.

### 2. Testar Sincronização
```bash
node scripts/testSincronizacao.js
```
Executa sincronização manualmente e mostra estatísticas.

### 3. Limpar Aluguéis Órfãos
```bash
node scripts/limparAlugueisOrfaos.js
```
Remove aluguéis sem PI correspondente.

## 🔒 Garantias do Sistema

1. **Nunca perde sincronização**: Validação automática a cada 30 minutos
2. **Recuperação automática**: Corrige inconsistências sem intervenção manual
3. **Rastreabilidade**: Cada aluguel vinculado à PI origem via `pi_code`
4. **Limpeza automática**: Remove aluguéis órfãos automaticamente
5. **Logs detalhados**: Todas as operações são registradas

## ⚡ Benefícios

- ✅ Zero dessincronia entre PIs e aluguéis
- ✅ Recuperação automática de erros
- ✅ Rastreamento completo de aluguéis
- ✅ Manutenção automática do banco
- ✅ Logs detalhados para auditoria
- ✅ Performance otimizada (índices em `pi_code`)

## 📈 Estatísticas em Tempo Real

O sistema registra automaticamente:
- PIs com problemas detectados
- Aluguéis criados automaticamente
- Aluguéis corrigidos
- Aluguéis órfãos removidos

## 🎯 Próxima Execução

O cron job é executado:
- **Imediatamente** na inicialização do servidor
- **A cada 30 minutos** automaticamente
- Logs em: `[CRON JOB] ⏰ Executando verificação agendada...`
