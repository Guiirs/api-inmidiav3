# InMidia - Sistema de Gestão de Mídia OOH

<div align="center">
  <img src="guiirs/inmidia-react/InMidia-React-6854b95e98580a652a6c50b567d234d55a0cbe6c/public/assets/img/logo 244.png" alt="Logo InMidia" width="200"/>
</div>
<br>

Um sistema full-stack (MERN) completo para gestão de mídia *Out-of-Home* (OOH). Esta aplicação permite o controlo de placas (outdoors), clientes, contratos de aluguer, propostas internas (PIs) e utilizadores.

Este repositório contém duas partes principais:
* `api-inmidiav3`: O servidor backend (API) construído em Node.js, Express e MongoDB.
* `inmidia-react`: O cliente frontend (Dashboard) construído em React e Vite.

---

## 🚀 Funcionalidades Principais

* **Dashboard:** Visão geral da saúde do negócio (pendente implementação).
* **Gestão de Placas:** CRUD completo para placas, incluindo geolocalização, imagens (upload para Cloudflare R2) e status de disponibilidade.
* **Gestão de Clientes:** Base de dados de clientes e seus responsáveis.
* **Gestão de Regiões:** Agrupamento de placas por regiões geográficas.
* **Propostas Internas (PIs):** Criação e gestão de propostas de aluguer, com seleção de placas disponíveis por período.
* **Gestão de Contratos:** Geração de contratos a partir de PIs aprovadas.
* **Mapa de Placas:** Visualização de todas as placas num mapa interativo (Leaflet).
* **Gestão de Utilizadores:** Controlo de acesso baseado em funções (admin, user).
* **Autenticação:** Sistema seguro baseado em JWT (Tokens).

## 🛠️ Tecnologias Utilizadas

Este projeto é um MERN Stack moderno com serviços adicionais.

| Área | Tecnologia | Propósito |
| :--- | :--- | :--- |
| **Frontend** | React | Biblioteca principal de UI |
| **Frontend** | Vite | Build tool e servidor de desenvolvimento |
| **Frontend** | React Router | Roteamento de páginas |
| **Frontend** | TanStack Query | Gestão de estado do servidor (data-fetching) |
| **Frontend** | React Hook Form | Gestão de formulários |
| **Frontend** | Axios | Cliente HTTP para a API |
| | | |
| **Backend** | Node.js | Ambiente de execução |
| **Backend** | Express | Framework principal da API |
| **Backend** | MongoDB | Base de dados (via Mongoose) |
| **Backend** | JWT | Autenticação segura |
| **Backend** | Multer & AWS-SDK | Upload de ficheiros para Cloudflare R2/S3 |
| **Backend** | Winston | Sistema de Logs da aplicação |

---

## 📂 Estrutura do Projeto

O projeto está dividido em duas pastas principais: