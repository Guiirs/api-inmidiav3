// __tests__/clientes.test.js

const request = require('supertest');
const app = require('../server');
const db = require('../config/database');
const path = require('path');
const fs = require('fs');

describe('Rotas de Clientes (/clientes)', () => {
    let adminToken;
    let userToken; // Token de utilizador não-admin para testes de permissão
    let empresaId;
    let clienteId;

    // Setup: Cria empresa, admin e user comum, faz login
    beforeAll(async () => {
        // Limpar tabelas
        await db('alugueis').del();
        await db('placas').del();
        await db('clientes').del();
        await db('regioes').del();
        await db('users').del();
        await db('empresas').del();

        // Cria Empresa
        const [novaEmpresa] = await db('empresas').insert({
            nome: 'Empresa Teste Cliente',
            cnpj: '11.222.333/0001-44',
            api_key_hash: 'hash_teste_cliente',
            api_key_prefix: 'pref_cliente'
        }).returning('id');
        empresaId = (typeof novaEmpresa === 'object') ? novaEmpresa.id : novaEmpresa;

        // Cria Admin
        const adminPassword = 'passwordAdminCliente';
        const adminHashedPassword = await require('bcrypt').hash(adminPassword, 10);
        await db('users').insert({
            username: 'admin_cliente',
            email: 'admin_cliente@test.com',
            password: adminHashedPassword,
            nome: 'Admin',
            sobrenome: 'Cliente',
            role: 'admin',
            empresa_id: empresaId
        });

        // Cria User Comum
        const userPassword = 'passwordUserCliente';
        const userHashedPassword = await require('bcrypt').hash(userPassword, 10);
        await db('users').insert({
            username: 'user_cliente',
            email: 'user_cliente@test.com',
            password: userHashedPassword,
            nome: 'User',
            sobrenome: 'Cliente',
            role: 'user',
            empresa_id: empresaId
        });


        // Login Admin
        const adminLogin = await request(app)
            .post('/auth/login')
            .send({ email: 'admin_cliente@test.com', password: adminPassword });
        adminToken = adminLogin.body.token;

        // Login User Comum
        const userLogin = await request(app)
            .post('/auth/login')
            .send({ email: 'user_cliente@test.com', password: userPassword });
        userToken = userLogin.body.token;

        // Garante que a pasta de uploads de teste existe
        const testUploadsPath = path.join(__dirname, '..', 'public', 'uploads');
        if (!fs.existsSync(testUploadsPath)) {
            fs.mkdirSync(testUploadsPath, { recursive: true });
        }
    });

    // Limpa clientes antes de cada teste
    beforeEach(async () => {
        await db('clientes').del();
    });

    // --- Testes para POST /clientes ---
    describe('POST /clientes', () => {
        it('deve criar um novo cliente sem logo (como admin)', async () => {
            const response = await request(app)
                .post('/clientes')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    nome: 'Cliente A',
                    cnpj: '12.345.678/0001-99',
                    telefone: '11999998888'
                });

            expect(response.statusCode).toBe(201);
            expect(response.body).toHaveProperty('id');
            expect(response.body.nome).toBe('Cliente A');
            expect(response.body.cnpj).toBe('12.345.678/0001-99');
            expect(response.body.telefone).toBe('11999998888');
            expect(response.body.logo_url).toBeNull();
            expect(response.body.empresa_id).toBe(empresaId);

            clienteId = response.body.id; // Guarda para outros testes
        });

        it('deve criar um novo cliente com logo (como admin)', async () => {
            const logoPath = path.join(__dirname, 'test-logo-cliente.png');
            fs.writeFileSync(logoPath, 'dummy image data cliente'); // Cria ficheiro dummy

            const response = await request(app)
                .post('/clientes')
                .set('Authorization', `Bearer ${adminToken}`)
                .field('nome', 'Cliente B com Logo')
                .field('cnpj', '98.765.432/0001-11')
                .field('telefone', '21888887777')
                .attach('logo', logoPath); // Anexa o ficheiro

            expect(response.statusCode).toBe(201);
            expect(response.body.nome).toBe('Cliente B com Logo');
            expect(response.body.logo_url).toMatch(/^\/uploads\/imagem-\d+-\d+\.png$/);

            // Limpa ficheiro de teste
            fs.unlinkSync(logoPath);
            // Tenta apagar o ficheiro carregado para limpeza
            const uploadedFilename = response.body.logo_url.split('/').pop();
            const uploadedPath = path.join(__dirname, '..', 'public', 'uploads', uploadedFilename);
            if(fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
        });

        it('deve retornar 409 (Conflict) se o CNPJ já existir na mesma empresa', async () => {
            await db('clientes').insert({
                nome: 'Cliente CNPJ Existente',
                cnpj: '55.555.555/0001-55',
                empresa_id: empresaId
            });
            const response = await request(app)
                .post('/clientes')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    nome: 'Cliente Duplicado',
                    cnpj: '55.555.555/0001-55' // CNPJ repetido
                });

            expect(response.statusCode).toBe(409);
            expect(response.body.message).toContain('CNPJ já existe');
        });

        it('deve retornar 400 (Bad Request) se o nome estiver em falta', async () => {
            const response = await request(app)
                .post('/clientes')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ cnpj: '11.111.111/0001-11' }); // Sem nome

            expect(response.statusCode).toBe(400);
            expect(response.body.message).toContain('nome do cliente é obrigatório');
        });
        
        it('deve retornar 401 (Unauthorized) se não houver token', async () => {
             const response = await request(app)
                .post('/clientes')
                .send({ nome: 'Cliente Sem Token' });
             expect(response.statusCode).toBe(401);
        });
        
        // Embora adminAuth não esteja nas rotas de cliente, o authMiddleware já protege
        // it('deve retornar 403 (Forbidden) se for um utilizador comum', async () => {
        //     const response = await request(app)
        //         .post('/clientes')
        //         .set('Authorization', `Bearer ${userToken}`) // Usa token comum
        //         .send({ nome: 'Cliente User Comum' });
        //     expect(response.statusCode).toBe(403); // Ajustar se a permissão for diferente
        // });
    });

    // --- Testes para GET /clientes ---
    describe('GET /clientes', () => {
        it('deve retornar a lista de clientes da empresa (como admin)', async () => {
            await db('clientes').insert([
                { nome: 'Cliente X', empresa_id: empresaId },
                { nome: 'Cliente Y', empresa_id: empresaId }
            ]);

            const response = await request(app)
                .get('/clientes')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.statusCode).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
            expect(response.body.length).toBe(2);
            expect(response.body[0].nome).toBe('Cliente X'); // Ordenado por nome
        });
        
        it('deve retornar a lista de clientes da empresa (como user comum)', async () => {
             // Utilizadores comuns também devem poder listar clientes da sua empresa
             await db('clientes').insert({ nome: 'Cliente Z', empresa_id: empresaId });
             const response = await request(app)
                .get('/clientes')
                .set('Authorization', `Bearer ${userToken}`); // Usa token comum
            
             expect(response.statusCode).toBe(200);
             expect(response.body).toBeInstanceOf(Array);
        });

        it('deve retornar 401 (Unauthorized) se não houver token', async () => {
             const response = await request(app).get('/clientes');
             expect(response.statusCode).toBe(401);
        });
    });

    // --- Testes para DELETE /clientes/:id ---
    describe('DELETE /clientes/:id', () => {
        beforeEach(async () => {
            // Garante que existe um cliente para apagar
            const [novoCliente] = await db('clientes').insert({
                nome: 'Cliente Para Apagar',
                empresa_id: empresaId
            }).returning('id');
            clienteId = (typeof novoCliente === 'object') ? novoCliente.id : novoCliente;
        });

        it('deve apagar um cliente existente (como admin)', async () => {
            const response = await request(app)
                .delete(`/clientes/${clienteId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.statusCode).toBe(204);

            const deletedCliente = await db('clientes').where({ id: clienteId }).first();
            expect(deletedCliente).toBeUndefined();
        });

        it('deve retornar 404 (Not Found) se o cliente não existir', async () => {
            const response = await request(app)
                .delete('/clientes/99999')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.statusCode).toBe(404);
        });
        
         it('deve retornar 401 (Unauthorized) se não houver token', async () => {
             const response = await request(app).delete(`/clientes/${clienteId}`);
             expect(response.statusCode).toBe(401);
        });
        
        // Adicionar teste para verificar se user comum pode apagar? (Provavelmente não deveria)
        // it('deve retornar 403 (Forbidden) se for user comum', async () => { ... });
    });

    // TODO: Adicionar testes para PUT /clientes/:id (atualização)
    // Similar aos testes de POST, mas usando PUT e verificando a atualização e remoção de logo antigo.

});