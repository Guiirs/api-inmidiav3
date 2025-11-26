// swaggerConfig.js
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Gerenciador de Placas InMidia',
      version: '1.0.0',
      description: 'Documentação interativa da API para o sistema de gerenciamento de placas publicitárias InMidia.',
    },
    servers: [
      {
        url: 'http://localhost:3000', // Certifique-se que a porta está correta
        description: 'Servidor de Desenvolvimento',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Insira o token JWT Bearer obtido no login (prefixado com "Bearer ")'
        }
      },
      schemas: {
        // --- [CORREÇÃO] ID atualizado para string ---
        Placa: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'O ID único da placa (ObjectId).', example: '60c72b2f9b1d8e001a8d0c1d' },
            numero_placa: { type: 'string', description: 'A numeração de identificação da placa.', example: 'CE-001' },
            coordenadas: { type: 'string', nullable: true, description: 'As coordenadas geográficas (lat,lng).', example: '-3.74, -38.52' },
            nomeDaRua: { type: 'string', nullable: true, description: 'O endereço onde a placa está localizada.', example: 'Av. Beira Mar, 1234' },
            tamanho: { type: 'string', nullable: true, description: 'As dimensões da placa.', example: '9x3m' },
            imagem: { type: 'string', nullable: true, description: 'O nome do arquivo de imagem (no R2).', example: 'imagem-12345.png' },
            regiao: { $ref: '#/components/schemas/Regiao' },
            empresa: { type: 'string', description: 'O ID da empresa (ObjectId).', example: '60c72b2f9b1d8e001a8d0c1c' },
            disponivel: { type: 'boolean', description: 'Indica se a placa está disponível.', example: true },
            createdAt: { type: 'string', format: 'date-time', description: 'Data de criação.'},
            updatedAt: { type: 'string', format: 'date-time', description: 'Data da última atualização.'},
          },
          required: ['numero_placa', 'regiao', 'empresa']
        },
        // --- [CORREÇÃO] ID atualizado para string ---
        Regiao: {
            type: 'object',
            properties: {
                id: { type: 'string', example: '60c72b2f9b1d8e001a8d0c1e' },
                nome: { type: 'string', example: 'Fortaleza' },
                empresa: { type: 'string', example: '60c72b2f9b1d8e001a8d0c1c' }
            },
            required: ['nome', 'empresa']
        },
        // --- [NOVO SCHEMA] Adicionado Cliente ---
        Cliente: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '60c72b2f9b1d8e001a8d0c1f' },
            nome: { type: 'string', example: 'Cliente Exemplo' },
            cnpj: { type: 'string', nullable: true, example: '12.345.678/0001-99' },
            telefone: { type: 'string', nullable: true, example: '(11) 98765-4321' },
            logo_url: { type: 'string', format: 'url', nullable: true },
            empresa: { type: 'string', example: '60c72b2f9b1d8e001a8d0c1c' }
          },
          required: ['nome', 'empresa']
        },
         // --- [NOVO SCHEMA] Adicionado Aluguel ---
        Aluguel: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '60c72b2f9b1d8e001a8d0c20' },
            placa: { type: 'string', description: 'ID da Placa', example: '60c72b2f9b1d8e001a8d0c1d' },
            cliente: { $ref: '#/components/schemas/Cliente' },
            empresa: { type: 'string', description: 'ID da Empresa', example: '60c72b2f9b1d8e001a8d0c1c' },
            data_inicio: { type: 'string', format: 'date', example: '2025-10-31' },
            data_fim: { type: 'string', format: 'date', example: '2025-11-30' }
          },
          required: ['placa', 'cliente', 'empresa', 'data_inicio', 'data_fim']
        },
         // --- [NOVO SCHEMA] Adicionado PropostaInterna (PI) ---
        PropostaInterna: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '60c72b2f9b1d8e001a8d0c21' },
            empresa: { type: 'string', example: '60c72b2f9b1d8e001a8d0c1c' },
            cliente: { $ref: '#/components/schemas/Cliente' },
            tipoPeriodo: { type: 'string', enum: ['quinzenal', 'mensal'], example: 'mensal' },
            dataInicio: { type: 'string', format: 'date-time', example: '2025-11-01T00:00:00.000Z' },
            dataFim: { type: 'string', format: 'date-time', example: '2025-11-30T00:00:00.000Z' },
            valorTotal: { type: 'number', format: 'float', example: 1500.50 },
            descricao: { type: 'string', example: 'Veiculação de campanha X na Placa Y.' },
            status: { type: 'string', enum: ['em_andamento', 'concluida', 'vencida'], example: 'em_andamento' }
          },
          required: ['empresa', 'cliente', 'tipoPeriodo', 'dataInicio', 'dataFim', 'valorTotal', 'descricao']
        },
        // --- [NOVO SCHEMA] Adicionado Contrato ---
        Contrato: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '60c72b2f9b1d8e001a8d0c22' },
            pi: { $ref: '#/components/schemas/PropostaInterna' },
            empresa: { type: 'string', example: '60c72b2f9b1d8e001a8d0c1c' },
            cliente: { $ref: '#/components/schemas/Cliente' },
            templateUsado: { type: 'string', example: 'default_v1' },
            status: { type: 'string', enum: ['rascunho', 'enviado', 'assinado'], example: 'rascunho' }
          },
          required: ['pi', 'empresa', 'cliente']
        },
        // --- [CORREÇÃO] ID atualizado para string ---
        Utilizador: { 
            type: 'object',
            properties: {
                id: { type: 'string', example: '60c72b2f9b1d8e001a8d0c1a' },
                username: { type: 'string', example: 'admin' },
                email: { type: 'string', format: 'email', example: 'admin@example.com' },
                nome: { type: 'string', example: 'Admin' },
                sobrenome: { type: 'string', example: 'Sistema' },
                role: { type: 'string', enum: ['user', 'admin'], example: 'admin' },
                empresaId: { type: 'string', example: '60c72b2f9b1d8e001a8d0c1c' },
                avatar_url: { type: 'string', format: 'url', nullable: true, description: 'URL para a imagem de avatar do utilizador.', example: 'https://example.com/avatar.png'}
            },
        },
        Error: { 
            type: 'object',
            properties: {
                message: { type: 'string', description: 'Uma mensagem descrevendo o erro.', example: 'Recurso não encontrado.' },
            },
            required: ['message']
        },
         // --- [CORREÇÃO] ID atualizado para string ---
         Empresa: {
             type: 'object',
             properties: {
                 id: { type: 'string', example: '60c72b2f9b1d8e001a8d0c1c' },
                 nome: { type: 'string', example: 'Minha Empresa OOH' },
                 api_key_prefix: { type: 'string', description: 'Prefixo da Chave de API (visível para admins).', example: 'emp_12a3' },
                 status_assinatura: { type: 'string', enum: ['active', 'inactive'], example: 'active' }
             }
         },
         DashboardSummary: {
            type: 'object',
            properties: {
                totalPlacas: { type: 'integer', example: 50 },
                placasDisponiveis: { type: 'integer', example: 35 },
                regiaoPrincipal: { type: 'string', nullable: true, example: 'Centro' }
            }
         },
         PlacasPorRegiao: {
             type: 'array',
             items: {
                 type: 'object',
                 properties: {
                     regiao: { type: 'string', example: 'Centro' },
                     total_placas: { type: 'integer', example: 15 }
                 }
             }
         },
         ValidationError: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Erro de validação.'},
              errors: {
                type: 'object',
                description: "Objeto { field: message } vindo do express-validator",
                example: { "nome": "O nome é obrigatório." }
              }
            }
         }
      }
    },
    paths: {
      // --- ROTAS DE EMPRESA (REGISTRO) ---
      "/empresas/register": {
        "post": {
          "tags": ["Empresa"],
          "summary": "Regista uma nova empresa e o seu utilizador administrador",
          // ... (requestBody existente) ...
          "responses": {
             "201": { "description": "Empresa e utilizador criados com sucesso." }, 
             "400": { "description": "Dados inválidos.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/ValidationError" } } } },
             "409": { "description": "Conflito (CNPJ, email ou username já existem).", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Error" } } } }
           }
        }
      },
      // --- ROTAS DE AUTENTICAÇÃO ---
      "/auth/login": { /* ... (rota existente) ... */ },
      "/auth/forgot-password": { /* ... (rota existente) ... */ },
      "/auth/reset-password/{token}": { /* ... (rota existente) ... */ },
      
      // --- ROTAS DE PLACAS ---
      // [CORREÇÃO] IDs atualizados para string
      "/placas": {
        "get": {
          "tags": ["Placas"],
          "summary": "Lista todas as placas com filtros, paginação e ordenação",
          "security": [{ "bearerAuth": [] }],
          "parameters": [
            { "name": "page", "in": "query", "schema": { "type": "integer", "default": 1 }, "description": "Número da página" },
            { "name": "limit", "in": "query", "schema": { "type": "integer", "default": 10 }, "description": "Itens por página" },
            { "name": "sortBy", "in": "query", "schema": { "type": "string", "enum": ["numero_placa", "nomeDaRua", "createdAt"], "default": "createdAt" }, "description": "Campo para ordenação" },
            { "name": "order", "in": "query", "schema": { "type": "string", "enum": ["asc", "desc"], "default": "desc" }, "description": "Ordem (asc ou desc)" },
            { "name": "search", "in": "query", "schema": { "type": "string" }, "description": "Termo de pesquisa por número ou rua" },
            { "name": "regiao_id", "in": "query", "schema": { "type": "string", "example": "60c72b2f9b1d8e001a8d0c1e" }, "description": "ID da região para filtrar (ObjectId)" },
            { "name": "disponivel", "in": "query", "schema": { "type": "boolean" }, "description": "Filtrar por disponibilidade (true ou false)" }
          ],
          "responses": {
             "200": { "description": "Lista de placas." },
             "401": {"description": "Não autenticado."} 
             }
        },
        "post": {
            "tags": ["Placas"], "summary": "Cria uma nova placa",
            "security": [{ "bearerAuth": [] }],
            "requestBody": {
                 "required": true,
                 "content": {
                     "multipart/form-data": { 
                         "schema": {
                             "type": "object",
                             "required": ["numero_placa", "regiao"],
                             "properties": {
                                 "numero_placa": { "type": "string" },
                                 "coordenadas": { "type": "string", "example": "-3.12, -38.45" },
                                 "nomeDaRua": { "type": "string" },
                                 "tamanho": { "type": "string", "example": "9x3m" },
                                 "regiao": { "type": "string", "description": "ID da Região (ObjectId)", "example": "60c72b2f9b1d8e001a8d0c1e" },
                                 "imagem": { "type": "string", "format": "binary", "description": "Ficheiro de imagem (opcional)" }
                             }
                         }
                     }
                 }
             },
            "responses": {
                 "201": { "description": "Placa criada.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Placa" } } } },
                 "400": { "description": "Dados inválidos.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/ValidationError" } } } },
                 "401": {"description": "Não autenticado."},
                 "409": { "description": "Placa com este número já existe nesta região.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Error" } } } }
            }
        }
      },
       "/placas/{id}": {
         "get": {
           "tags": ["Placas"], "summary": "Obtém os detalhes de uma placa específica",
           "security": [{ "bearerAuth": [] }],
           "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "example": "60c72b2f9b1d8e001a8d0c1d" } }],
           "responses": {
             "200": { "description": "Detalhes da placa.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Placa" } } } },
             "401": {"description": "Não autenticado."},
             "404": { "description": "Placa não encontrada.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Error" } } } }
           }
         },
         "put": {
           "tags": ["Placas"], "summary": "Atualiza uma placa existente",
           "security": [{ "bearerAuth": [] }],
           "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "example": "60c72b2f9b1d8e001a8d0c1d" } }],
           "requestBody": {
                "content": {
                    "multipart/form-data": { 
                        "schema": {
                            "type": "object",
                            "properties": {
                                 "numero_placa": { "type": "string" },
                                 "coordenadas": { "type": "string" },
                                 "nomeDaRua": { "type": "string" },
                                 "tamanho": { "type": "string" },
                                 "regiao": { "type": "string", "description": "ID da Região (ObjectId)", "example": "60c72b2f9b1d8e001a8d0c1e" },
                                 "disponivel": { "type": "boolean" },
                                 "imagem": { "type": "string", "format": "binary", "description": "Novo ficheiro de imagem (opcional)" }
                            }
                        }
                    }
                }
            },
           "responses": { /* ... (respostas existentes) ... */ }
         },
         "delete": {
           "tags": ["Placas"], "summary": "Apaga uma placa",
           "security": [{ "bearerAuth": [] }],
           "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "example": "60c72b2f9b1d8e001a8d0c1d" } }],
           "responses": { /* ... (respostas existentes) ... */ }
         }
       },
       "/placas/{id}/disponibilidade": {
           "patch": {
               "tags": ["Placas"], "summary": "Altera o estado de disponibilidade de uma placa",
               "security": [{ "bearerAuth": [] }],
               "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "example": "60c72b2f9b1d8e001a8d0c1d" } }],
               "responses": { /* ... (respostas existentes) ... */ }
           }
       },
        "/placas/locations": { /* ... (rota existente) ... */ },

      // --- ROTAS DE REGIÕES ---
      // [CORREÇÃO] IDs atualizados para string
      "/regioes": {
        "get": { /* ... (rota existente) ... */ },
        "post": { /* ... (rota existente) ... */ }
      },
      "/regioes/{id}": {
        "put": {
          "tags": ["Regiões"], "summary": "Atualiza o nome de uma região",
          "security": [{ "bearerAuth": [] }],
          "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "example": "60c72b2f9b1d8e001a8d0c1e" } }],
          "requestBody": { "required": true, "content": { "application/json": { "schema": { "type": "object", "required": ["nome"], "properties": { "nome": { "type": "string", "example": "Zona Sul Atualizada" } } } } } },
          "responses": { /* ... (respostas existentes) ... */ }
        },
        "delete": {
          "tags": ["Regiões"], "summary": "Apaga uma região",
          "security": [{ "bearerAuth": [] }],
          "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "example": "60c72b2f9b1d8e001a8d0c1e" } }],
          "responses": { /* ... (respostas existentes) ... */ }
        }
      },

      // --- [NOVO] ROTAS DE CLIENTES ---
      "/clientes": {
        "get": {
          "tags": ["Clientes"], "summary": "Lista todos os clientes da empresa",
          "security": [{ "bearerAuth": [] }],
          "responses": {
            "200": { "description": "Lista de clientes.", "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/Cliente" } } } } },
            "401": {"description": "Não autenticado."}
          }
        },
        "post": {
          "tags": ["Clientes"], "summary": "Cria um novo cliente",
          "security": [{ "bearerAuth": [] }],
          "requestBody": {
            "content": {
              "multipart/form-data": {
                "schema": {
                  "type": "object", "required": ["nome"],
                  "properties": {
                    "nome": { "type": "string" },
                    "cnpj": { "type": "string" },
                    "telefone": { "type": "string" },
                    "logo": { "type": "string", "format": "binary", "description": "Ficheiro de logo (opcional)" }
                  }
                }
              }
            }
          },
          "responses": {
            "201": { "description": "Cliente criado.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Cliente" } } } },
            "400": { "description": "Dados inválidos.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/ValidationError" } } } },
            "409": { "description": "Cliente com este CNPJ já existe.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Error" } } } }
          }
        }
      },
      "/clientes/{id}": {
        "get": {
          "tags": ["Clientes"], "summary": "Obtém os detalhes de um cliente",
          "security": [{ "bearerAuth": [] }],
          "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "example": "60c72b2f9b1d8e001a8d0c1f" } }],
          "responses": {
            "200": { "description": "Detalhes do cliente.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Cliente" } } } },
            "404": { "description": "Cliente não encontrado." }
          }
        },
        "put": {
          "tags": ["Clientes"], "summary": "Atualiza um cliente",
          "security": [{ "bearerAuth": [] }],
          "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "example": "60c72b2f9b1d8e001a8d0c1f" } }],
          "requestBody": { /* ... (similar ao POST) ... */ },
          "responses": { /* ... (similar ao POST) ... */ }
        },
        "delete": {
          "tags": ["Clientes"], "summary": "Apaga um cliente",
          "security": [{ "bearerAuth": [] }],
          "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "example": "60c72b2f9b1d8e001a8d0c1f" } }],
          "responses": {
            "204": { "description": "Cliente apagado." },
            "400": { "description": "Cliente possui aluguéis ativos/futuros." }
          }
        }
      },
      
      // --- [NOVO] ROTAS DE ALUGUÉIS ---
      "/alugueis": {
        "post": {
          "tags": ["Aluguéis"], "summary": "Cria um novo aluguel (reserva)",
          "security": [{ "bearerAuth": [] }],
          "requestBody": {
            "required": true,
            "content": { "application/json": { 
              "schema": {
                "type": "object",
                "required": ["placa_id", "cliente_id", "data_inicio", "data_fim"],
                "properties": {
                  "placa_id": { "type": "string", "example": "60c72b2f9b1d8e001a8d0c1d" },
                  "cliente_id": { "type": "string", "example": "60c72b2f9b1d8e001a8d0c1f" },
                  "data_inicio": { "type": "string", "format": "date", "example": "2025-11-01" },
                  "data_fim": { "type": "string", "format": "date", "example": "2025-11-30" }
                }
              }
            }}
          },
          "responses": {
            "201": { "description": "Aluguel criado.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Aluguel" } } } },
            "400": { "description": "Dados inválidos (ex: datas)." },
            "404": { "description": "Placa ou Cliente não encontrado." },
            "409": { "description": "Conflito de datas (placa já alugada)." }
          }
        }
      },
      "/alugueis/placa/{placaId}": {
        "get": {
          "tags": ["Aluguéis"], "summary": "Lista o histórico de aluguéis de uma placa",
          "security": [{ "bearerAuth": [] }],
          "parameters": [{ "name": "placaId", "in": "path", "required": true, "schema": { "type": "string", "example": "60c72b2f9b1d8e001a8d0c1d" } }],
          "responses": {
            "200": { "description": "Lista de aluguéis.", "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/Aluguel" } } } } }
          }
        }
      },
      "/alugueis/{id}": {
        "delete": {
          "tags": ["Aluguéis"], "summary": "Apaga (cancela) um aluguel",
          "security": [{ "bearerAuth": [] }],
          "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "example": "60c72b2f9b1d8e001a8d0c20" } }],
          "responses": {
            "200": { "description": "Aluguel cancelado com sucesso." },
            "404": { "description": "Aluguel não encontrado." }
          }
        }
      },

      // --- [NOVO] ROTAS DE PROPOSTAS INTERNAS (PIs) ---
      "/pis": {
        "get": {
          "tags": ["Propostas (PIs)"], "summary": "Lista todas as PIs da empresa (com filtros)",
          "security": [{ "bearerAuth": [] }],
          "parameters": [
            { "name": "page", "in": "query", "schema": { "type": "integer", "default": 1 } },
            { "name": "limit", "in": "query", "schema": { "type": "integer", "default": 10 } },
            { "name": "sortBy", "in": "query", "schema": { "type": "string", "default": "createdAt" } },
            { "name": "order", "in": "query", "schema": { "type": "string", "enum": ["asc", "desc"], "default": "desc" } },
            { "name": "status", "in": "query", "schema": { "type": "string", "enum": ["em_andamento", "concluida", "vencida"] } },
            { "name": "clienteId", "in": "query", "schema": { "type": "string", "example": "60c72b2f9b1d8e001a8d0c1f" } }
          ],
          "responses": {
            "200": { "description": "Lista de PIs e paginação." }
          }
        },
        "post": {
          "tags": ["Propostas (PIs)"], "summary": "Cria uma nova Proposta Interna (PI)",
          "security": [{ "bearerAuth": [] }],
          "requestBody": {
            "required": true,
            "content": { "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "clienteId": { "type": "string", "example": "60c72b2f9b1d8e001a8d0c1f" },
                  "tipoPeriodo": { "type": "string", "enum": ["quinzenal", "mensal"] },
                  "dataInicio": { "type": "string", "format": "date", "example": "2025-11-01" },
                  "dataFim": { "type": "string", "format": "date", "example": "2025-11-15" },
                  "valorTotal": { "type": "number", "example": 1500 },
                  "descricao": { "type": "string", "example": "Campanha Dia das Mães" }
                }
              }
            }}
          },
          "responses": {
            "201": { "description": "PI criada.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/PropostaInterna" } } } },
            "400": { "description": "Dados inválidos.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/ValidationError" } } } },
            "404": { "description": "Cliente não encontrado." }
          }
        }
      },
      "/pis/{id}": {
        "get": {
          "tags": ["Propostas (PIs)"], "summary": "Obtém os detalhes de uma PI",
          "security": [{ "bearerAuth": [] }],
          "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "example": "60c72b2f9b1d8e001a8d0c21" } }],
          "responses": {
            "200": { "description": "Detalhes da PI.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/PropostaInterna" } } } },
            "404": { "description": "PI não encontrada." }
          }
        },
        "put": {
          "tags": ["Propostas (PIs)"], "summary": "Atualiza uma PI",
          "security": [{ "bearerAuth": [] }],
          "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "example": "60c72b2f9b1d8e001a8d0c21" } }],
          "requestBody": { /* ... (similar ao POST) ... */ },
          "responses": { /* ... (similar ao POST) ... */ }
        },
        "delete": {
          "tags": ["Propostas (PIs)"], "summary": "Apaga uma PI",
          "security": [{ "bearerAuth": [] }],
          "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "example": "60c72b2f9b1d8e001a8d0c21" } }],
          "responses": {
            "204": { "description": "PI apagada." },
            "404": { "description": "PI não encontrada." }
          }
        }
      },
      "/pis/{id}/download": {
        "get": {
          "tags": ["Propostas (PIs)"], "summary": "Gera e faz o download do PDF da PI",
          "security": [{ "bearerAuth": [] }],
          "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "example": "60c72b2f9b1d8e001a8d0c21" } }],
          "responses": {
            "200": { "description": "Arquivo PDF da PI.", "content": { "application/pdf": { "schema": { "type": "string", "format": "binary" } } } },
            "404": { "description": "PI não encontrada." }
          }
        }
      },

      // --- [NOVO] ROTAS DE CONTRATOS ---
      "/contratos": {
        "post": {
          "tags": ["Contratos"], "summary": "Cria um novo Contrato a partir de uma PI",
          "security": [{ "bearerAuth": [] }],
          "requestBody": {
            "required": true,
            "content": { "application/json": {
              "schema": {
                "type": "object", "required": ["piId"],
                "properties": {
                  "piId": { "type": "string", "description": "ID da Proposta Interna (PI) vinculada", "example": "60c72b2f9b1d8e001a8d0c21" }
                }
              }
            }}
          },
          "responses": {
            "201": { "description": "Contrato criado.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Contrato" } } } },
            "404": { "description": "PI não encontrada." },
            "409": { "description": "Contrato para esta PI já existe." }
          }
        }
      },
      "/contratos/{id}/download": {
        "get": {
          "tags": ["Contratos"], "summary": "Gera e faz o download do PDF do Contrato",
          "security": [{ "bearerAuth": [] }],
          "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "example": "60c72b2f9b1d8e001a8d0c22" } }],
          "responses": {
            "200": { "description": "Arquivo PDF do Contrato.", "content": { "application/pdf": { "schema": { "type": "string", "format": "binary" } } } },
            "404": { "description": "Contrato não encontrado." }
          }
        }
      },

       // --- ROTAS DE UTILIZADOR ---
       "/user/me": { /* ... (rota existente) ... */ },
       "/user/me/empresa": { /* ... (rota existente) ... */ },
       
       // --- ROTAS DE RELATÓRIOS ---
       "/relatorios/placas-por-regiao": { /* ... (rota existente) ... */ },
       "/relatorios/dashboard-summary": { /* ... (rota existente) ... */ },
       
      // --- ROTAS DE ADMINISTRAÇÃO ---
      // [CORREÇÃO] IDs atualizados para string
      "/admin/users": {
        "get": { /* ... (rota existente) ... */ },
         "post": { /* ... (rota existente) ... */ }
      },
      "/admin/users/{id}": {
        "delete": {
          "tags": ["Administração"], "summary": "Apaga um utilizador (Apenas Admin)",
          "security": [{ "bearerAuth": [] }],
          "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "example": "60c72b2f9b1d8e001a8d0c1a" } }],
          "responses": { /* ... (respostas existentes) ... */ }
        }
      },
      "/admin/users/{id}/role": {
        "put": {
          "tags": ["Administração"], "summary": "Altera o nível de acesso de um utilizador (Apenas Admin)",
          "security": [{ "bearerAuth": [] }],
          "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "example": "60c72b2f9b1d8e001a8d0c1a" } }],
          "requestBody": { "required": true, "content": { "application/json": { "schema": { "type": "object", "required": ["role"], "properties": { "role": { "type": "string", "enum": ["user", "admin"] } } } } } },
          "responses": { /* ... (respostas existentes) ... */ }
        }
      },
       // --- ROTAS DA API PÚBLICA ---
       "/public/placas/disponiveis": { /* ... (rota existente, prefixo /api/v1/public/...) ... */ }
    }
  },
  apis: [], // Mantém vazio pois definimos 'paths' diretamente
};

const specs = swaggerJsdoc(options);

module.exports = specs;