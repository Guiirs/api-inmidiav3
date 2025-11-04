# InMidia - Sistema de Gestão de Mídia OOH

<div align="center">
  <img src="guiirs/inmidia-react/InMidia-React-6854b95e98580a652a6c50b567d234d55a0cbe6c/public/assets/img/logo 244.png" alt="Logo InMidia" width="200"/>
</div>

Um sistema **full-stack (MERN)** completo para **gestão de mídia Out-of-Home (OOH)**.  
Esta aplicação permite o controlo de placas (outdoors), clientes, contratos de aluguer, propostas internas (PIs) e utilizadores.

---

## 📦 Estrutura do Projeto

Este repositório contém duas partes principais:

- **`api-inmidiav3/`** → Servidor backend (API) construído com **Node.js, Express e MongoDB**  
- **`inmidia-react/`** → Cliente frontend (Dashboard) construído com **React e Vite**

---

## 🚀 Funcionalidades Principais

- **Dashboard:** visão geral da saúde do negócio *(pendente implementação)*  
- **Gestão de Placas:** CRUD completo, com geolocalização, upload para Cloudflare R2 e status de disponibilidade  
- **Gestão de Clientes:** base de dados de clientes e responsáveis  
- **Gestão de Regiões:** agrupamento de placas por regiões geográficas  
- **Propostas Internas (PIs):** criação e gestão de propostas com seleção de placas disponíveis por período  
- **Gestão de Contratos:** geração de contratos a partir de PIs aprovadas  
- **Mapa de Placas:** visualização de todas as placas num mapa interativo *(Leaflet)*  
- **Gestão de Utilizadores:** controlo de acesso baseado em funções *(admin, user)*  
- **Autenticação Segura:** baseada em **JWT (Tokens)**  

---

## 🛠️ Tecnologias Utilizadas

| Área | Tecnologia | Propósito |
|------|-------------|-----------|
| **Frontend** | React | Biblioteca principal de UI |
|  | Vite | Build tool e servidor de desenvolvimento |
|  | React Router | Roteamento de páginas |
|  | TanStack Query | Gestão de estado do servidor (data-fetching) |
|  | React Hook Form | Gestão de formulários |
|  | Axios | Cliente HTTP para a API |
| **Backend** | Node.js | Ambiente de execução |
|  | Express | Framework principal da API |
|  | MongoDB | Base de dados (via Mongoose) |
|  | JWT | Autenticação segura |
|  | Multer & AWS-SDK | Upload para Cloudflare R2/S3 |
|  | Winston | Sistema de logs da aplicação |

---

## 📂 Estrutura das Pastas

/
├── 📁 api-inmidiav3/ # Backend (API Node.js)
│ ├── config/ # Configurações (DB, logger, etc.)
│ ├── controllers/ # Lógica de negócio
│ ├── middlewares/ # Autenticação, tratamento de erros
│ ├── models/ # Schemas Mongoose (Placa, Cliente, User, etc.)
│ ├── routes/ # Rotas da API
│ ├── services/ # Interação com DB
│ ├── utils/ # Funções utilitárias (AppError, etc.)
│ ├── .env.example # Exemplo de variáveis de ambiente
│ └── server.js # Ponto de entrada
│
└── 📁 inmidia-react/ # Frontend (React + Vite)
├── public/ # Assets estáticos
├── src/
│ ├── components/ # Componentes reutilizáveis
│ ├── context/ # Contexto (autenticação)
│ ├── hooks/ # Hooks customizados
│ ├── layouts/ # Estruturas de página
│ ├── pages/ # Páginas principais (Dashboard, Clientes, etc.)
│ ├── services/ # Configuração do Axios
│ ├── App.jsx # Rotas principais
│ └── main.jsx # Ponto de entrada
└── vite.config.js # Configuração do Vite

yaml
Copiar código

---

## 🏁 Como Começar

### 📋 Pré-requisitos

- Node.js **v18+**
- npm
- Instância do **MongoDB** (local ou MongoDB Atlas)
- *(Opcional)* credenciais de um bucket **S3/Cloudflare R2**

---

### ⚙️ 1. Configurar o Backend (API)

```bash
# Acesse a pasta da API
cd api-inmidiav3

# Instale as dependências
npm install

# Copie o .env de exemplo
cp .env.example .env

# Edite o .env com suas credenciais
nano .env

# Inicie o servidor
npm run dev
A API ficará disponível em http://localhost:5000 (ou a porta definida no .env).

💻 2. Configurar o Frontend (React)
bash
Copiar código
# Acesse a pasta do frontend
cd inmidia-react

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
A aplicação React ficará disponível em http://localhost:3000 (ou porta do Vite).

🔑 Variáveis de Ambiente (.env)
Use o arquivo de exemplo em
guiirs/api-inmidiav3/api-inmidiav3-8cff9b6d75b43816638ae9e29b22386654a1afbe/.env.example como base.

ini
Copiar código
# Configurações do Servidor
NODE_ENV=development
PORT=5000

# Conexão com a Base de Dados
MONGO_URI=mongodb://... # Sua string de conexão

# Segurança (JWT)
JWT_SECRET=aminhasecretmuitosegura
JWT_EXPIRES_IN=30d

# Cloudflare R2 / S3
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
R2_BUCKET_NAME=...
R2_PUBLIC_URL=https://seubucket.public.url/

# Admin inicial
ADMIN_EMAIL=admin@exemplo.com
ADMIN_PASSWORD=admin123
🗺️ Principais Rotas da API
Método	Endpoint	Descrição
POST	/api/v1/auth/login	Login de utilizador
POST	/api/v1/auth/register	Registo de empresa
GET	/api/v1/placas	Lista todas as placas
GET	/api/v1/placas/disponiveis	Lista placas disponíveis
POST	/api/v1/placas	Cria uma nova placa
GET	/api/v1/clientes	Lista todos os clientes
POST	/api/v1/clientes	Cria um novo cliente
GET	/api/v1/regioes	Lista regiões
GET	/api/v1/pis	Lista propostas internas
POST	/api/v1/pis	Cria nova PI
GET	/api/v1/users	Lista utilizadores (Admin)

📄 Licença
Este projeto é privado no momento.
(Pode ser alterado para licença MIT caso seja tornado open-source.)

<div align="center"> Feito com ❤️ por <b>InMidia</b> — Sistema de Gestão de Mídia OOH. </div> ```