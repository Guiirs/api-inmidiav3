# 📁 Estrutura do Projeto API Backend

## 📂 Organização de Pastas

```
BECKEND/
│
├── 📋 Arquivos Raiz
│   ├── server.js              # Servidor principal da aplicação
│   ├── package.json           # Dependências e scripts do projeto
│   ├── .env                   # Variáveis de ambiente (não versionado)
│   ├── .env.example           # Exemplo de variáveis de ambiente
│   └── README.md              # Documentação principal
│
├── ⚙️ config/                 # Configurações
│   ├── config.js              # Configurações gerais
│   ├── dbMongo.js             # Conexão MongoDB
│   ├── logger.js              # Configuração de logs
│   ├── jest.config.js         # Configuração do Jest
│   ├── jest.setup.js          # Setup inicial dos testes
│   └── swaggerConfig.js       # Configuração do Swagger/API docs
│
├── 🎮 controllers/            # Controladores da aplicação
│   ├── adminController.js
│   ├── aluguelController.js
│   ├── authController.js
│   ├── biWeekController.js
│   ├── clienteController.js
│   ├── contratoController.js
│   ├── empresaController.js
│   ├── healthController.js
│   ├── piController.js
│   ├── placaController.js
│   ├── publicApiController.js
│   ├── regiaoController.js
│   ├── relatorioController.js
│   ├── scriptController.js
│   ├── sseController.js
│   ├── userController.js
│   ├── webhookController.js
│   └── whatsappController.js
│
├── 🗄️ models/                 # Modelos do banco de dados
│   ├── Aluguel.js
│   ├── BiWeek.js
│   ├── Cliente.js
│   └── ...
│
├── 🛡️ middlewares/            # Middlewares da aplicação
│   ├── adminAuthMiddleware.js
│   ├── apiKeyAuthMiddleware.js
│   ├── authMiddleware.js
│   ├── errorHandler.js
│   ├── rateLimitMiddleware.js
│   ├── sanitizeMiddleware.js
│   ├── socketAuthMiddleware.js
│   └── uploadMiddleware.js
│
├── 🛣️ routes/                 # Rotas da API
│
├── 🔧 services/               # Serviços e lógica de negócio
│
├── 🛠️ utils/                  # Utilitários e helpers
│
├── ✅ validators/             # Validadores de dados
│
├── 🧪 __tests__/              # Testes automatizados (Jest)
│   ├── api/                   # Testes de API
│   │   └── test-disponiveis-api.js
│   ├── placas/                # Testes de placas
│   │   ├── test-endpoint-placas.js
│   │   ├── test-placas-disponivel.js
│   │   └── test-placas-endpoint.js
│   ├── integration/           # Testes de integração
│   │   └── biWeek.examples.js
│   ├── scripts/               # Testes de scripts
│   └── alugueis.test.js       # Testes de aluguéis
│
├── 📜 scripts/                # Scripts utilitários
│   ├── diagnostics/           # Scripts de diagnóstico
│   │   └── diagnostico-completo.js
│   ├── standalone/            # Scripts independentes
│   │   └── script.js
│   ├── cleanup/               # Scripts de limpeza
│   ├── conversion/            # Scripts de conversão
│   ├── maintenance/           # Scripts de manutenção
│   ├── migrations/            # Scripts de migração
│   ├── ops/                   # Scripts de operações
│   ├── template-tools/        # Ferramentas de templates
│   ├── generateBiWeeks.js
│   ├── generateCalendar2026.js
│   ├── importBiWeeks.js
│   ├── initBiWeeks.js
│   ├── updateStatusJob.js
│   └── ...
│
├── 📚 docs/                   # Documentação do projeto
│   ├── API_EXCEL_GUIDE.md
│   ├── BI_WEEK_SYSTEM_GUIDE.md
│   ├── WHATSAPP_INTEGRATION_GUIDE.md
│   └── ...
│
├── 🗃️ db/                     # Arquivos relacionados ao banco
│   └── database/
│
├── 📊 Schema/                 # Schemas e estruturas de dados
│
├── 🖼️ public/                 # Arquivos públicos estáticos
│
├── 🤖 PISystemGen/            # Sistema gerador de PI
│
├── 📝 logs/                   # Logs da aplicação
│   └── scripts/               # Logs de scripts
│
├── 💾 backups/                # Backups do sistema
│
├── 🔄 temp/                   # Arquivos temporários
│   ├── test-outputs/          # Saídas de testes
│   └── save.mdrg              # Arquivo temporário
│
├── 💬 whatsapp-session/       # Sessão do WhatsApp
│
└── 🔒 .wwebjs_cache/          # Cache do WhatsApp Web.js

```

## 🎯 Principais Mudanças na Organização

### ✅ Arquivos Movidos:

1. **Testes consolidados em `__tests__/`**
   - `test-disponiveis-api.js` → `__tests__/api/`
   - `test-endpoint-placas.js` → `__tests__/placas/`
   - `test-placas-disponivel.js` → `__tests__/placas/`
   - `test-placas-endpoint.js` → `__tests__/placas/`
   - `tests/biWeek.examples.js` → `__tests__/integration/`

2. **Scripts organizados em `scripts/`**
   - `diagnostico-completo.js` → `scripts/diagnostics/`
   - `script.js` → `scripts/standalone/`

3. **Configurações centralizadas em `config/`**
   - `jest.config.js` → `config/`
   - `jest.setup.js` → `config/`
   - `swaggerConfig.js` → `config/`

4. **Arquivos temporários em `temp/`**
   - `save.mdrg` → `temp/`
   - `test-outputs/` → `temp/`

### 📝 Referências Atualizadas:

- ✅ `package.json` - comando test atualizado para usar `config/jest.config.js`
- ✅ `jest.config.js` - setupFiles atualizado para `config/jest.setup.js`
- ✅ `server.js` - import do swaggerConfig atualizado para `config/swaggerConfig`

## 🚀 Como Usar

### Executar Testes
```bash
npm test                    # Todos os testes
npm test api                # Apenas testes de API
npm test placas             # Apenas testes de placas
```

### Executar Scripts
```bash
node scripts/diagnostics/diagnostico-completo.js
node scripts/generateBiWeeks.js
```

### Iniciar Servidor
```bash
npm run dev                 # Desenvolvimento
npm start                   # Produção
```

## 📦 Estrutura Limpa

A raiz do projeto agora contém apenas:
- Arquivos de configuração essenciais (.env, .gitignore)
- Arquivos de gerenciamento (package.json, README.md)
- Arquivo principal (server.js)

Toda a lógica, testes, scripts e documentação estão organizados em suas respectivas pastas.

---

**Data da organização:** 26/11/2025
