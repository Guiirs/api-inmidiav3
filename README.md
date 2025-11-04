InMidia - Sistema de Gestão de Mídia OOH<div align="center"><img src="guiirs/inmidia-react/InMidia-React-6854b95e98580a652a6c50b567d234d55a0cbe6c/public/assets/img/logo 244.png" alt="Logo InMidia" width="200"/></div>Um sistema full-stack (MERN) completo para gestão de mídia Out-of-Home (OOH). Esta aplicação permite o controlo de placas (outdoors), clientes, contratos de aluguer, propostas internas (PIs) e utilizadores.Este repositório contém duas partes principais:api-inmidiav3: O servidor backend (API) construído em Node.js, Express e MongoDB.inmidia-react: O cliente frontend (Dashboard) construído em React e Vite.🚀 Funcionalidades PrincipaisDashboard: Visão geral da saúde do negócio (pendente implementação).Gestão de Placas: CRUD completo para placas, incluindo geolocalização, imagens (upload para Cloudflare R2) e status de disponibilidade.Gestão de Clientes: Base de dados de clientes e seus responsáveis.Gestão de Regiões: Agrupamento de placas por regiões geográficas.Propostas Internas (PIs): Criação e gestão de propostas de aluguer, com seleção de placas disponíveis por período.Gestão de Contratos: Geração de contratos a partir de PIs aprovadas.Mapa de Placas: Visualização de todas as placas num mapa interativo (Leaflet).Gestão de Utilizadores: Controlo de acesso baseado em funções (admin, user).Autenticação: Sistema seguro baseado em JWT (Tokens).🛠️ Tecnologias UtilizadasEste projeto é um MERN Stack moderno com serviços adicionais.ÁreaTecnologiaPropósitoFrontendReactBiblioteca principal de UIFrontendViteBuild tool e servidor de desenvolvimentoFrontendReact RouterRoteamento de páginasFrontendTanStack QueryGestão de estado do servidor (data-fetching)FrontendReact Hook FormGestão de formuláriosFrontendAxiosCliente HTTP para a APIBackendNode.jsAmbiente de execuçãoBackendExpressFramework principal da APIBackendMongoDBBase de dados (via Mongoose)BackendJWTAutenticação seguraBackendMulter & AWS-SDKUpload de ficheiros para Cloudflare R2/S3BackendWinstonSistema de Logs da aplicação📂 Estrutura do ProjetoO projeto está dividido em duas pastas principais:/
├── 📁 api-inmidiav3/        # O Backend (API Node.js)
│   ├── config/             # Configurações de DB, logger, etc.
│   ├── controllers/        # Lógica de negócio (o "C" do MVC)
│   ├── middlewares/        # Funções intermédias (autenticação, erros)
│   ├── models/             # Schemas do Mongoose (Placa, Cliente, User, etc.)
│   ├── routes/             # Definição das rotas da API
│   ├── services/           # Lógica de interação com a base de dados
│   ├── utils/              # Funções utilitárias (AppError)
│   ├── .env.example        # Ficheiro de exemplo de variáveis de ambiente
│   └── server.js           # Ponto de entrada da API
│
└── 📁 inmidia-react/        # O Frontend (React App)
    ├── public/             # Assets estáticos
    ├── src/
    │   ├── components/     # Componentes reutilizáveis (Modal, Sidebar, etc.)
    │   ├── context/        # Contexto React (Autenticação)
    │   ├── hooks/          # Hooks customizados (ex: useDebounce)
    │   ├── layouts/        # Estrutura da página (MainLayout)
    │   ├── pages/          # Páginas principais (Dashboard, Placas, Clientes)
    │   ├── services/       # Configuração do Axios (api.js)
    │   ├── App.jsx         # Componente principal e rotas
    │   └── main.jsx        # Ponto de entrada do React
    └── vite.config.js      # Configuração do Vite
🏁 Como ComeçarSiga estes passos para configurar e executar o projeto localmente.Pré-requisitosNode.js (v18 ou superior)npmUma instância do MongoDB (local ou na nuvem, como o MongoDB Atlas)(Opcional para Upload) Credenciais de um bucket S3 (como Cloudflare R2 ou AWS S3).1. Configurar o Backend (API)Bash# 1. Navegue para a pasta da API
cd api-inmidiav3

# 2. Instale as dependências
npm install

# 3. Crie o seu ficheiro .env
# Copie o .env.example para um novo ficheiro chamado .env
cp .env.example .env

# 4. Edite o .env com as suas credenciais
# (Veja a secção "Variáveis de Ambiente" abaixo)
nano .env

# 5. Inicie o servidor de desenvolvimento
npm run dev
O servidor backend estará a correr em http://localhost:5000 (ou a porta definida no seu .env).2. Configurar o Frontend (React)Bash# 1. (Num novo terminal) Navegue para a pasta do frontend
cd inmidia-react

# 2. Instale as dependências
npm install

# 3. Inicie o servidor de desenvolvimento (Vite)
npm run dev
O servidor frontend estará a correr em http://localhost:3000 (ou a porta que o Vite indicar).🔑 Variáveis de Ambiente (.env)Terá de preencher o ficheiro .env na pasta api-inmidiav3 para que a aplicação funcione. Use o guiirs/api-inmidiav3/api-inmidiav3-8cff9b6d75b43816638ae9e29b22386654a1afbe/.env.example como base:Ini, TOML# Configurações do Servidor
NODE_ENV=development
PORT=5000

# Conexão com a Base de Dados
MONGO_URI=mongodb://... (A sua connection string do MongoDB)

# Segurança (JWT)
JWT_SECRET=aminhasecretmuitosegura (MUDE ISTO para uma string aleatória longa)
JWT_EXPIRES_IN=30d

# Cloudflare R2 (ou S3) para Upload de Imagens
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_ENDPOINT=... (ex: https://<account_id>.r2.cloudflarestorage.com)
R2_BUCKET_NAME=...
R2_PUBLIC_URL=... (URL pública do seu bucket)

# Configurações do Admin (Opcional, para primeiro registo)
ADMIN_EMAIL=admin@exemplo.com
ADMIN_PASSWORD=admin123
🗺️ Rotas Principais da APIA API segue um padrão RESTful. As rotas principais estão protegidas e requerem autenticação.POST /api/v1/auth/login - Login de utilizadorPOST /api/v1/auth/register - Registo de empresa (público)GET /api/v1/placas - Lista todas as placasGET /api/v1/placas/disponiveis - Lista placas disponíveis por dataPOST /api/v1/placas - Cria uma nova placaGET /api/v1/clientes - Lista todos os clientesPOST /api/v1/clientes - Cria um novo clienteGET /api/v1/regioes - Lista todas as regiõesGET /api/v1/pis - Lista todas as Propostas InternasPOST /api/v1/pis - Cria uma nova PIGET /api/v1/users - Lista todos os utilizadores (Admin)📄 LicençaEste projeto é (atualmente) privado. (Pode alterar isto para MIT se for open-source).