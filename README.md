# 🧠 InMidia - Sistema de Gestão de Mídia OOH

<div align="center">
  <img src="./public/InMidia logo png.png" alt="Logo InMidia" width="200"/>
</div>

<p align="center">
  <strong>Plataforma full-stack MERN para gestão de mídia Out-of-Home (OOH)</strong><br/>
  Controle de placas, clientes, contratos, propostas internas (PIs) e utilizadores.
</p>

---

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js" alt="Node.js"/>
  <img src="https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React"/>
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express"/>
  <img src="https://img.shields.io/badge/MongoDB-Database-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB"/>
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite"/>
  <img src="https://img.shields.io/badge/Status-Em%20Desenvolvimento-yellow?style=for-the-badge" alt="Status"/>
</p>

---

## 🖥️ Preview do Sistema

<div align="center">
  <img src="./public/dashboard.jpeg" alt="Preview do Dashboard" width="90%"/>
  <p><em>Exemplo do dashboard de gestão de mídia</em></p>
</div>

---

## 🚀 Funcionalidades Principais

✅ **Dashboard:** visão geral da saúde do negócio *(em desenvolvimento)*  
✅ **Gestão de Placas:** CRUD completo com geolocalização e upload para Cloudflare R2  
✅ **Gestão de Clientes:** base de dados e responsáveis  
✅ **Gestão de Regiões:** agrupamento de placas por área  
✅ **Propostas Internas (PIs):** criação, aprovação e histórico  
✅ **Contratos:** geração automática a partir de PIs  
✅ **Mapa Interativo:** visualização via **Leaflet**  
✅ **Controle de Acesso:** roles (admin, user)  
✅ **Autenticação JWT:** sistema seguro com tokens  

---

## 🛠️ Tecnologias Utilizadas

| Área | Tecnologia | Logo | Propósito |
|------|-------------|------|-----------|
| **Frontend** | React | <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" width="28"/> | Biblioteca principal de UI |
|  | Vite | <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vite/vite-original.svg" width="28"/> | Build tool e servidor de desenvolvimento |
|  | React Router | <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" width="28"/> | Navegação entre páginas |
|  | TanStack Query | 🧩 | Gestão de estado assíncrono |
|  | React Hook Form | 🪶 | Manipulação de formulários |
|  | Axios | 🌐 | Comunicação HTTP com a API |
| **Backend** | Node.js | <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" width="28"/> | Ambiente de execução |
|  | Express | <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/express/express-original.svg" width="28"/> | Framework da API |
|  | MongoDB | <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg" width="28"/> | Base de dados |
|  | JWT | 🔒 | Autenticação segura |
|  | Multer + AWS SDK | ☁️ | Upload para Cloudflare R2 / S3 |
|  | Winston | 🧾 | Sistema de logs |

---

---

## 🧰 Como Rodar o Projeto

### 1️⃣ Pré-requisitos

- [Node.js](https://nodejs.org/) **v18+**
- npm
- Instância **MongoDB** (local ou Atlas)
- *(Opcional)* Bucket **S3/Cloudflare R2**

---

### 2️⃣ Configurar o Backend

```bash
cd api-inmidiav3
npm install
cp .env.example .env
nano .env
npm run dev
API: http://localhost:5000

3️⃣ Configurar o Frontend
bash
Copiar código
cd inmidia-react
npm install
npm run dev
Frontend: http://localhost:3000

🔑 Variáveis de Ambiente
Use como base o arquivo
guiirs/api-inmidiav3/api-inmidiav3-8cff9b6d75b43816638ae9e29b22386654a1afbe/.env.example

ini
Copiar código
# Servidor
NODE_ENV=development
PORT=5000

# Banco de Dados
MONGO_URI=mongodb://...

# JWT
JWT_SECRET=aminhasecretmuitosegura
JWT_EXPIRES_IN=30d

# Uploads (Cloudflare R2 / S3)
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
R2_BUCKET_NAME=...
R2_PUBLIC_URL=https://meu-bucket.cdn/
```

---

## 🔑 Variáveis de Ambiente
```bash
# Admin Inicial
ADMIN_EMAIL=admin@exemplo.com
ADMIN_PASSWORD=admin123
🗺️ Rotas Principais da API
Método	Endpoint	Descrição
POST	/api/v1/auth/login	Login de utilizador
POST	/api/v1/auth/register	Registro de empresa
GET	/api/v1/placas	Lista todas as placas
GET	/api/v1/placas/disponiveis	Lista placas disponíveis
POST	/api/v1/placas	Cria uma nova placa
GET	/api/v1/clientes	Lista todos os clientes
POST	/api/v1/clientes	Cria um novo cliente
GET	/api/v1/regioes	Lista regiões
GET	/api/v1/pis	Lista PIs (Propostas Internas)
POST	/api/v1/pis	Cria nova PI
GET	/api/v1/users	Lista utilizadores (Admin)

```

---
## 👥 Autores & Contribuidores

| Nome | Função | GitHub |
|------|---------|--------|
| **Guilherme Farias** | Desenvolvedor Full Stack / Arquiteto do Sistema | [@Guiirs](https://github.com/Guiirs) |
| *Colaborações futuras* | — | — |

💡 **Contribuições são bem-vindas!**  
Abra uma *issue* ou envie um *pull request* com melhorias.

---

## 🪪 Licença

Este projeto é **privado** atualmente.  
Futuramente poderá ser licenciado sob **MIT License**.

---

<div align="center">
  <sub>Feito com ❤️ por <strong>InMidia</strong> — Sistema de Gestão de Mídia OOH.</sub><br/>
  <sub>© 2025 — Todos os direitos reservados.</sub>
</div>
