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
      // {
      //   url: 'https://sua-api-de-producao.com', // Adicione a URL de produção
      //   description: 'Servidor de Produção',
      // }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Insira o token JWT Bearer obtido no login (prefixado com "Bearer ")' // Descrição melhorada
        }
      },
      schemas: {
        // --- Schemas Existentes ---
        Placa: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'O ID único da placa (gerado pelo DB).', example: 1 },
            id_placa: { type: 'string', format: 'uuid', description: 'Identificador único UUID da placa.', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' },
            numero_placa: { type: 'string', description: 'A numeração de identificação da placa.', example: 'CE-001' },
            coordenadas: { type: 'string', nullable: true, description: 'As coordenadas geográficas (lat,lng).', example: '-3.74, -38.52' },
            nomeDaRua: { type: 'string', nullable: true, description: 'O endereço onde a placa está localizada.', example: 'Av. Beira Mar, 1234' },
            tamanho: { type: 'string', nullable: true, description: 'As dimensões da placa.', example: '9x3m' },
            imagem: { type: 'string', nullable: true, description: 'O caminho relativo para a imagem da placa.', example: '/uploads/imagem-12345.png' },
            regiao_id: { type: 'integer', description: 'O ID da região à qual a placa pertence.', example: 2 },
            empresa_id: { type: 'integer', description: 'O ID da empresa à qual a placa pertence.', example: 1 },
            disponivel: { type: 'boolean', description: 'Indica se a placa está disponível.', example: true },
            created_at: { type: 'string', format: 'date-time', description: 'Data de criação.'},
            updated_at: { type: 'string', format: 'date-time', description: 'Data da última atualização.'},
            // Adiciona a propriedade 'regiao' que vem do JOIN
            regiao: { type: 'string', description: 'Nome da região (obtido via JOIN).', example: 'Centro', readOnly: true }
          },
          required: ['id_placa', 'numero_placa', 'regiao_id', 'empresa_id'] // Campos obrigatórios no DB
        },
        Regiao: {
            type: 'object',
            properties: {
                id: { type: 'integer', example: 1 },
                nome: { type: 'string', example: 'Fortaleza' },
                empresa_id: { type: 'integer', example: 1 }
            },
            required: ['nome', 'empresa_id']
        },
        Utilizador: { // Schema ligeiramente ajustado
            type: 'object',
            properties: {
                id: { type: 'integer', example: 1 },
                username: { type: 'string', example: 'admin' },
                email: { type: 'string', format: 'email', example: 'admin@example.com' },
                nome: { type: 'string', example: 'Admin' },
                sobrenome: { type: 'string', example: 'Sistema' },
                role: { type: 'string', enum: ['user', 'admin'], example: 'admin' },
                empresa_id: { type: 'integer', example: 1 },
                avatar_url: { type: 'string', format: 'url', nullable: true, description: 'URL para a imagem de avatar do utilizador.', example: 'https://example.com/avatar.png'}
            },
            // 'password' não deve ser retornado
        },
        Error: { // Schema de Erro Genérico
            type: 'object',
            properties: {
                message: { type: 'string', description: 'Uma mensagem descrevendo o erro.', example: 'Recurso não encontrado.' },
                // Opcional: Adicionar mais detalhes, como um código de erro interno
                // code: { type: 'string', example: 'ERR_NOT_FOUND' }
            },
            required: ['message']
        },
        // --- Novos Schemas ---
         Empresa: {
             type: 'object',
             properties: {
                 id: { type: 'integer', example: 1 },
                 nome: { type: 'string', example: 'Minha Empresa OOH' },
                 api_key: { type: 'string', description: 'Chave de API para integrações (visível apenas para admins).', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' },
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
         // Schema para resposta de erro de validação (400)
         ValidationError: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Erro de validação.'},
              errors: {
                type: 'array',
                items: {
                  type: 'object',
                  description: "Pode ser um array de { field: message } ou o formato do express-validator",
                  example: [{ "nome": "O nome é obrigatório." }]
                }
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
             "201": { "description": "Empresa e utilizador criados com sucesso." }, // Adicionar schema de resposta se houver
             "400": { "description": "Dados inválidos.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/ValidationError" } } } },
             "409": { "description": "Conflito (CNPJ, email ou username já existem).", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Error" } } } }
           }
        }
      },
      // --- ROTAS DE AUTENTICAÇÃO ---
      "/auth/login": {
        "post": {
          "tags": ["Autenticação"],
          "summary": "Autentica um utilizador (por email) e retorna um token JWT",
          // ... (requestBody existente, já usa email) ...
          "responses": {
             "200": { /* ... (schema de resposta já definido) ... */ },
             "401": { "description": "Credenciais inválidas.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Error" } } } },
             "429": { "description": "Muitas tentativas de login (Rate Limit)." } // Adicionado 429
          }
        }
      },
      "/auth/forgot-password": {
         "post": {
           "tags": ["Autenticação"],
           "summary": "Inicia o processo de recuperação de senha",
            // ... (requestBody existente) ...
           "responses": {
               "200": { "description": "Pedido de recuperação enviado (se o email existir)." },
               "429": { "description": "Muitas tentativas (Rate Limit)." }
            }
         }
       },
      "/auth/reset-password/{token}": {
         "post": {
           "tags": ["Autenticação"],
           "summary": "Define uma nova senha usando um token de recuperação",
            // ... (parâmetros e requestBody existentes) ...
           "responses": {
             "200": { "description": "Senha redefinida com sucesso." },
             "400": { "description": "Token inválido ou expirado.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Error" } } } },
             "429": { "description": "Muitas tentativas (Rate Limit)." }
           }
         }
       },
      // --- ROTAS DE PLACAS ---
      "/placas": {
        "get": {
          "tags": ["Placas"],
          "summary": "Lista todas as placas com filtros, paginação e ordenação",
          "security": [{ "bearerAuth": [] }],
          "parameters": [
            { "name": "page", "in": "query", "schema": { "type": "integer", "default": 1 }, "description": "Número da página" },
            { "name": "limit", "in": "query", "schema": { "type": "integer", "default": 10 }, "description": "Itens por página" },
            { "name": "sortBy", "in": "query", "schema": { "type": "string", "enum": ["id", "numero_placa", "nomeDaRua", "regiao"], "default": "id" }, "description": "Campo para ordenação" },
            { "name": "order", "in": "query", "schema": { "type": "string", "enum": ["asc", "desc"], "default": "desc" }, "description": "Ordem (asc ou desc)" },
            { "name": "search", "in": "query", "schema": { "type": "string" }, "description": "Termo de pesquisa por número ou rua" },
            { "name": "regiao_id", "in": "query", "schema": { "type": "integer" }, "description": "ID da região para filtrar" },
            { "name": "disponivel", "in": "query", "schema": { "type": "boolean" }, "description": "Filtrar por disponibilidade (true ou false)" }
          ],
          "responses": {
             "200": { "description": "Lista de placas.", "content": { "application/json": { "schema": { "type": "object", "properties": { "data": { "type": "array", "items": { "$ref": "#/components/schemas/Placa" } }, "pagination": { "type": "object", "properties": { "totalItems": {"type": "integer"}, "totalPages": {"type": "integer"}, "currentPage": {"type": "integer"}, "itemsPerPage": {"type": "integer"} } } } } } } },
             "401": {"description": "Não autenticado."} // Adicionado 401
             }
        },
        "post": {
            "tags": ["Placas"], "summary": "Cria uma nova placa",
            "security": [{ "bearerAuth": [] }],
            "requestBody": {
                 "required": true,
                 "content": {
                     "multipart/form-data": { // Indica que aceita form-data
                         "schema": {
                             "type": "object",
                             "required": ["numero_placa", "coordenadas", "nomeDaRua", "tamanho", "regiao_id"],
                             "properties": {
                                 "numero_placa": { "type": "string" },
                                 "coordenadas": { "type": "string" },
                                 "nomeDaRua": { "type": "string" },
                                 "tamanho": { "type": "string" },
                                 "regiao_id": { "type": "integer" },
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
           "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } }],
           "responses": {
             "200": { "description": "Detalhes da placa.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Placa" } } } },
             "401": {"description": "Não autenticado."},
             "404": { "description": "Placa não encontrada.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Error" } } } }
           }
         },
         "put": {
           "tags": ["Placas"], "summary": "Atualiza uma placa existente",
           "security": [{ "bearerAuth": [] }],
           "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } }],
           "requestBody": {
                "content": {
                    "multipart/form-data": { // Também aceita form-data para imagem
                        "schema": {
                            "type": "object",
                            "properties": {
                                 "numero_placa": { "type": "string" },
                                 "coordenadas": { "type": "string" },
                                 "nomeDaRua": { "type": "string" },
                                 "tamanho": { "type": "string" },
                                 "regiao_id": { "type": "integer" },
                                 "disponivel": { "type": "boolean" }, // Pode atualizar disponibilidade
                                 "imagem": { "type": "string", "format": "binary", "description": "Novo ficheiro de imagem (opcional)" }
                            }
                        }
                    }
                }
            },
           "responses": {
             "200": { "description": "Placa atualizada.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Placa" } } } },
             "400": { "description": "Dados inválidos.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/ValidationError" } } } },
             "401": {"description": "Não autenticado."},
             "404": { "description": "Placa não encontrada.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Error" } } } },
             "409": { "description": "Placa com este número já existe nesta região.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Error" } } } }
           }
         },
         "delete": {
           "tags": ["Placas"], "summary": "Apaga uma placa",
           "security": [{ "bearerAuth": [] }],
           "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } }],
           "responses": {
             "204": { "description": "Placa apagada com sucesso." },
             "401": {"description": "Não autenticado."},
             "404": { "description": "Placa não encontrada.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Error" } } } }
           }
         }
       },
       "/placas/{id}/disponibilidade": {
           "patch": {
               "tags": ["Placas"], "summary": "Altera o estado de disponibilidade de uma placa",
               "security": [{ "bearerAuth": [] }],
               "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } }],
               "responses": {
                 "200": { "description": "Disponibilidade alterada.", "content": {"application/json": {"schema": {"type": "object", "properties": {"message": {"type": "string"}, "disponivel": {"type": "boolean"}}}}}},
                 "401": {"description": "Não autenticado."},
                 "404": { "description": "Placa não encontrada.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Error" } } } }
               }
           }
       },
        "/placas/locations": {
             "get": { /* ... (definição já correta) ... */ }
         },
      // --- ROTAS DE REGIÕES ---
      "/regioes": {
        "get": {
          "tags": ["Regiões"], "summary": "Lista todas as regiões da empresa",
          "security": [{ "bearerAuth": [] }],
          "responses": {
            "200": { "description": "Lista de regiões.", "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/Regiao" } } } } },
             "401": {"description": "Não autenticado."}
          }
        },
        "post": {
          "tags": ["Regiões"], "summary": "Cria uma nova região",
          "security": [{ "bearerAuth": [] }],
          "requestBody": { "required": true, "content": { "application/json": { "schema": { "type": "object", "required": ["nome"], "properties": { "nome": { "type": "string", "example": "Zona Sul" } } } } } },
          "responses": {
             "201": { "description": "Região criada.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Regiao" } } } },
             "400": { "description": "Nome é obrigatório.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/ValidationError" } } } },
             "401": {"description": "Não autenticado."},
             "409": { "description": "Região com este nome já existe.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Error" } } } }
          }
        }
      },
      "/regioes/{id}": {
        "put": {
          "tags": ["Regiões"], "summary": "Atualiza o nome de uma região",
          "security": [{ "bearerAuth": [] }],
          "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } }],
          "requestBody": { "required": true, "content": { "application/json": { "schema": { "type": "object", "required": ["nome"], "properties": { "nome": { "type": "string", "example": "Zona Sul Atualizada" } } } } } },
          "responses": {
             "200": { "description": "Região atualizada.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Regiao" } } } },
             "400": { "description": "Nome é obrigatório.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/ValidationError" } } } },
             "401": {"description": "Não autenticado."},
             "404": { "description": "Região não encontrada.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Error" } } } },
             "409": { "description": "Região com este nome já existe.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Error" } } } }
          }
        },
        "delete": {
          "tags": ["Regiões"], "summary": "Apaga uma região",
          "security": [{ "bearerAuth": [] }],
          "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } }],
          "responses": {
             "204": { "description": "Região apagada com sucesso." },
             "400": { "description": "Não é possível apagar região em uso.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Error" } } } },
             "401": {"description": "Não autenticado."},
             "404": { "description": "Região não encontrada.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Error" } } } }
          }
        }
      },
       // --- ROTAS DE UTILIZADOR ---
       "/user/me": { /* ... (definição já correta) ... */ },
       "/user/me/empresa": { /* ... (definição já correta) ... */ },
       // --- ROTAS DE RELATÓRIOS ---
       "/relatorios/placas-por-regiao": { /* ... (definição já correta) ... */ },
       "/relatorios/dashboard-summary": { /* ... (definição já correta) ... */ },
      // --- ROTAS DE ADMINISTRAÇÃO ---
      "/admin/users": {
        "get": {
          "tags": ["Administração"], "summary": "Lista todos os utilizadores da empresa (Apenas Admin)",
          "security": [{ "bearerAuth": [] }],
          "responses": {
            "200": { "description": "Lista de utilizadores.", "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/Utilizador" } } } } },
            "401": {"description": "Não autenticado."},
            "403": { "description": "Acesso negado.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Error" } } } }
          }
        },
        // Adicionada rota POST para criar utilizador via admin
         "post": {
             "tags": ["Administração"],
             "summary": "Cria um novo utilizador na empresa (Apenas Admin)",
             "security": [{ "bearerAuth": [] }],
             "requestBody": {
                 "required": true,
                 "content": {
                     "application/json": {
                         "schema": {
                             "type": "object",
                             "required": ["username", "email", "password", "nome", "sobrenome"],
                             "properties": {
                                 "username": { "type": "string" },
                                 "email": { "type": "string", "format": "email" },
                                 "password": { "type": "string", "minLength": 6 },
                                 "nome": { "type": "string" },
                                 "sobrenome": { "type": "string" },
                                 "role": { "type": "string", "enum": ["user", "admin"], "default": "user" }
                             }
                         }
                     }
                 }
             },
             "responses": {
                 "201": { "description": "Utilizador criado.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Utilizador" } } } },
                 "400": { "description": "Dados inválidos.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/ValidationError" } } } },
                 "401": {"description": "Não autenticado."},
                 "403": { "description": "Acesso negado." },
                 "409": { "description": "Username ou email já existe.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Error" } } } }
             }
         }
      },
      "/admin/users/{id}": {
        "delete": {
          "tags": ["Administração"], "summary": "Apaga um utilizador (Apenas Admin)",
          "security": [{ "bearerAuth": [] }],
          "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } }],
          "responses": {
            "204": { "description": "Utilizador apagado com sucesso." },
            "400": { "description": "Não é possível apagar a própria conta.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Error" } } } },
            "401": {"description": "Não autenticado."},
            "403": { "description": "Acesso negado.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Error" } } } },
            "404": { "description": "Utilizador não encontrado.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Error" } } } }
          }
        }
      },
      "/admin/users/{id}/role": {
        "put": {
          "tags": ["Administração"], "summary": "Altera o nível de acesso de um utilizador (Apenas Admin)",
          "security": [{ "bearerAuth": [] }],
          "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } }],
          "requestBody": { "required": true, "content": { "application/json": { "schema": { "type": "object", "required": ["role"], "properties": { "role": { "type": "string", "enum": ["user", "admin"] } } } } } },
          "responses": {
            "200": { "description": "Nível de acesso atualizado.", "content": {"application/json": {"schema": {"type": "object", "properties": {"message": {"type": "string"}}}}}},
            "400": { "description": "Role inválida.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Error" } } } },
            "401": {"description": "Não autenticado."},
            "403": { "description": "Acesso negado.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Error" } } } },
            "404": { "description": "Utilizador não encontrado.", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Error" } } } }
          }
        }
      },
       // --- ROTAS DA API PÚBLICA ---
       "/api/v1/placas/disponiveis": { /* ... (definição já correta) ... */ }
    }
  },
  apis: [], // Mantém vazio pois definimos 'paths' diretamente
};

const specs = swaggerJsdoc(options);

module.exports = specs;