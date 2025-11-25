# 🚀 INSTALAÇÃO E CONFIGURAÇÃO - Sistema de Bi-Semanas

## ⚡ Instalação Rápida (5 minutos)

### Pré-requisitos
- ✅ MongoDB rodando
- ✅ Node.js instalado
- ✅ Backend já configurado e funcionando
- ✅ Frontend já configurado e funcionando

---

## 📦 Passo 1: Verificar Arquivos Criados

Os seguintes arquivos devem existir:

### Backend (8 arquivos)
```
BECKEND/
├── models/BiWeek.js                    ✅
├── services/biWeekService.js           ✅
├── controllers/biWeekController.js     ✅
├── routes/biWeeks.js                   ✅
├── validators/biWeekValidator.js       ✅
├── validators/aluguelValidator.js      ✅
├── scripts/importBiWeeks.js            ✅
└── docs/BI_WEEK_SYSTEM_GUIDE.md       ✅
```

### Frontend (2 arquivos)
```
REACT/src/
├── services/biWeekService.js          ✅
└── pages/BiWeeks/BiWeeksPage.jsx      ✅
```

---

## 🔧 Passo 2: Nenhuma Dependência Nova!

**Ótima notícia:** O sistema usa bibliotecas já instaladas:
- ✅ `mongoose` - Já instalado
- ✅ `express-validator` - Já instalado
- ✅ `exceljs` - **Já instalado!** ✅

Verificar se `exceljs` está no package.json:
```bash
cd BECKEND
npm list exceljs
```

Se não estiver instalado (improvável), instalar:
```bash
npm install exceljs
```

---

## 📊 Passo 3: Importar Calendário 2026

### 3.1 Verificar Arquivo Excel
```bash
# Windows
dir "BECKEND\Schema\BI SEMANA 2026.xlsx"

# O arquivo deve existir!
```

### 3.2 Executar Script de Importação
```bash
cd BECKEND
node scripts/importBiWeeks.js
```

**Saída esperada:**
```
🚀 Iniciando importação do calendário de Bi-Semanas...
🔌 Conectando ao MongoDB: mongodb://***@...
✅ Conectado ao MongoDB.

📂 Lendo arquivo Excel: E:\backstage\BECKEND\Schema\BI SEMANA 2026.xlsx
📄 Planilha encontrada: "Sheet1"
   Total de linhas: 27
📋 Cabeçalho detectado na linha 1
✅ Total de Bi-Semanas extraídas: 26

💾 Iniciando importação para o MongoDB...
   ✅ Inserido: 2026-01 (01/01/2026 - 14/01/2026)
   ✅ Inserido: 2026-02 (15/01/2026 - 28/01/2026)
   ... (24 linhas)
   ✅ Inserido: 2026-26 (17/12/2026 - 30/12/2026)

📊 Resumo da Importação:
   ✅ Inseridos: 26
   🔄 Atualizados: 0
   ❌ Erros: 0

✅ Importação concluída com sucesso!
🔌 Conexão com MongoDB fechada.
```

### 3.3 Verificar no MongoDB
```bash
# Via MongoDB Compass ou mongo shell
use inmidiav3
db.biweeks.countDocuments()
# Deve retornar: 26

db.biweeks.find({ ano: 2026 }).limit(3)
```

---

## 🖥️ Passo 4: Reiniciar Backend

### 4.1 Parar servidor (se estiver rodando)
```bash
# Ctrl + C no terminal do backend
```

### 4.2 Iniciar novamente
```bash
cd BECKEND
npm start
```

### 4.3 Verificar logs
Procure por:
```
[Routes BiWeeks] Rotas de Bi-Semanas registradas em /api/v1/bi-weeks
```

---

## 🌐 Passo 5: Testar API

### 5.1 Obter Token JWT
```bash
# Fazer login (via Postman/Insomnia ou curl)
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "sua_senha"
  }'
```

**Copie o `token` da resposta.**

### 5.2 Testar Endpoint de Calendário
```bash
curl -X GET http://localhost:5000/api/v1/bi-weeks/calendar?ano=2026 \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

**Resposta esperada (200 OK):**
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
      "ativo": true,
      ...
    },
    ...
  ]
}
```

---

## 🎨 Passo 6: Acessar Interface Admin

### 6.1 Iniciar Frontend (se não estiver rodando)
```bash
cd REACT
npm run dev
```

### 6.2 Fazer Login como Admin
1. Abrir navegador: `http://localhost:5173`
2. Login com usuário **admin**
3. Email/senha do admin

### 6.3 Acessar Página de Bi-Semanas
1. Menu lateral → **"Bi-Semanas"** (ícone de calendário)
2. Ou diretamente: `http://localhost:5173/bi-weeks`

**Você deve ver:**
- ✅ Tabela com 26 Bi-Semanas de 2026
- ✅ Filtro de ano (dropdown)
- ✅ Botões: "Gerar Calendário", "Nova Bi-Semana"

---

## 🧪 Passo 7: Testar Funcionalidades

### 7.1 Gerar Calendário de 2027
1. Clicar em **"Gerar Calendário"**
2. Selecionar ano: **2027**
3. Sobrescrever existentes: **Não**
4. Clicar em **"Gerar"**

**Resultado:**
- Toast de sucesso: "Calendário de 2027 gerado com sucesso!"
- Filtro de ano agora mostra: [2026, 2027]

### 7.2 Criar Bi-Semana Manual
1. Clicar em **"Nova Bi-Semana"**
2. Preencher:
   - ID: `2028-01`
   - Ano: `2028`
   - Número: `1`
   - Data Início: `2028-01-01`
   - Data Fim: `2028-01-14`
   - Descrição: `Teste de criação manual`
3. Clicar em **"Salvar"**

**Resultado:**
- Toast: "Bi-Semana criada com sucesso!"
- Nova linha aparece na tabela

### 7.3 Editar Bi-Semana
1. Clicar no ícone de **lápis** em qualquer linha
2. Modificar descrição
3. Clicar em **"Salvar"**

**Resultado:**
- Toast: "Bi-Semana atualizada com sucesso!"
- Descrição atualizada na tabela

### 7.4 Deletar Bi-Semana
1. Clicar no ícone de **lixeira** na Bi-Semana de teste (`2028-01`)
2. Confirmar exclusão

**Resultado:**
- Toast: "Bi-Semana deletada com sucesso!"
- Linha removida da tabela

---

## ✅ Passo 8: Ativar Validação (Opcional)

### 8.1 Via MongoDB (Mais Rápido)
```javascript
// MongoDB Shell ou Compass
use inmidiav3
db.empresas.updateMany(
  {},
  { $set: { enforce_bi_week_validation: false } }
)
// Define false (padrão) para todas as empresas
```

### 8.2 Via API (Recomendado)
```bash
# Obter ID da empresa
curl -X GET http://localhost:5000/api/v1/empresa \
  -H "Authorization: Bearer SEU_TOKEN"

# Ativar validação
curl -X PUT http://localhost:5000/api/v1/empresa/EMPRESA_ID \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "enforce_bi_week_validation": true }'
```

### 8.3 Testar Validação
```bash
# Tentar criar aluguel com datas NÃO alinhadas
curl -X POST http://localhost:5000/api/v1/alugueis \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "placa_id": "PLACA_ID_VALIDA",
    "cliente_id": "CLIENTE_ID_VALIDO",
    "data_inicio": "2026-01-05",
    "data_fim": "2026-01-19"
  }'
```

**Resposta esperada (400 Bad Request):**
```json
{
  "success": false,
  "message": "As datas do aluguel devem estar alinhadas...",
  "suggestion": {
    "start_date": "2026-01-01",
    "end_date": "2026-01-14"
  }
}
```

---

## 🎯 Checklist Final

### Backend
- [x] Arquivo Excel existe (`BI SEMANA 2026.xlsx`)
- [x] Script de importação executado com sucesso
- [x] MongoDB contém 26 Bi-Semanas de 2026
- [x] Backend reiniciado
- [x] Endpoint `/api/v1/bi-weeks/calendar` retorna 200 OK
- [x] Endpoint `/api/v1/bi-weeks/years` retorna [2026]

### Frontend
- [x] Página `/bi-weeks` acessível (apenas admin)
- [x] Tabela carrega Bi-Semanas de 2026
- [x] Filtro de ano funciona
- [x] Botão "Gerar Calendário" funciona
- [x] CRUD completo (criar, editar, deletar) funciona
- [x] Toasts de sucesso/erro aparecem

### Validação Opcional
- [x] Campo `enforce_bi_week_validation` existe em `Empresa`
- [x] Validação desabilitada por padrão (`false`)
- [x] Quando habilitada, rejeita datas não alinhadas
- [x] Mensagem de erro sugere datas corretas

---

## 🐛 Troubleshooting Rápido

### Problema: "Cannot find module 'exceljs'"
```bash
cd BECKEND
npm install exceljs
```

### Problema: "Bi-Semanas não aparecem na interface"
1. Verificar console do navegador (F12)
2. Verificar se usuário é **admin** (role: 'admin')
3. Verificar token JWT (não expirado)

### Problema: "404 Not Found em /api/v1/bi-weeks"
1. Verificar `BECKEND/server.js` tem linha:
   ```javascript
   app.use('/api/v1/bi-weeks', biWeekRoutes);
   ```
2. Reiniciar backend

### Problema: "Nenhuma Bi-Semana importada do Excel"
1. Verificar caminho do arquivo:
   ```bash
   node -e "console.log(require('path').join(__dirname, 'Schema', 'BI SEMANA 2026.xlsx'))"
   ```
2. Verificar se MongoDB está rodando
3. Verificar logs do script: `node scripts/importBiWeeks.js 2>&1 | tee log.txt`

---

## 📚 Documentação Completa

- **Guia de Uso:** `BECKEND/docs/BI_WEEK_SYSTEM_GUIDE.md`
- **Resumo da Implementação:** `BECKEND/docs/BI_WEEK_IMPLEMENTATION_SUMMARY.md`
- **Exemplos de Código:** `BECKEND/tests/biWeek.examples.js`

---

## 🎉 Sistema Pronto!

Se todos os checkpoints acima foram concluídos:
✅ **O sistema de Bi-Semanas está 100% operacional!**

### Próximos Passos Sugeridos:
1. Gerar calendário de 2027 e 2028
2. Testar validação em diferentes cenários
3. Customizar descrições de Bi-Semanas específicas
4. Adicionar link no menu principal (se desejado)
5. Deploy em produção

---

**Dúvidas?** Consulte o guia completo em `docs/BI_WEEK_SYSTEM_GUIDE.md`
