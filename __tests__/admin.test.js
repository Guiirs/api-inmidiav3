// __tests__/admin.test.js

const request = require('supertest');
const app = require('../server'); // O seu server.js
const db = require('../config/database'); // Sua instância do Knex
const bcrypt = require('bcrypt');

describe('Rotas de Administração (/admin)', () => {
    let adminToken;
    let userToken;
    let empresaId;
    let adminUserId;
    let regularUserId;

    // Setup: Criar uma empresa, um utilizador admin e um utilizador comum
    beforeAll(async () => {
        // Limpar tabelas na ordem correta (filhos primeiro)
        await db('alugueis').del();
        await db('placas').del();
        await db('clientes').del();
        await db('regioes').del();
        await db('users').del();
        await db('empresas').del();

        // 1. Criar Empresa
        const [novaEmpresa] = await db('empresas').insert({
            nome: 'Empresa Teste Admin',
            cnpj: '00.000.000/0001-00',
            api_key_hash: 'hash_teste_admin',
            api_key_prefix: 'pref_admin'
        }).returning('id');
        empresaId = (typeof novaEmpresa === 'object') ? novaEmpresa.id : novaEmpresa;

        // 2. Criar Utilizador Admin
        const adminPassword = 'passwordAdmin123';
        const adminHashedPassword = await bcrypt.hash(adminPassword, 10);
        const [adminUser] = await db('users').insert({
            username: 'admin_tester',
            email: 'admin@test.com',
            password: adminHashedPassword,
            nome: 'Admin',
            sobrenome: 'Tester',
            role: 'admin',
            empresa_id: empresaId
        }).returning('id');
        adminUserId = (typeof adminUser === 'object') ? adminUser.id : adminUser;

        // 3. Criar Utilizador Comum
        const userPassword = 'passwordUser123';
        const userHashedPassword = await bcrypt.hash(userPassword, 10);
        const [regularUser] = await db('users').insert({
            username: 'user_tester',
            email: 'user@test.com',
            password: userHashedPassword,
            nome: 'User',
            sobrenome: 'Tester',
            role: 'user',
            empresa_id: empresaId
        }).returning('id');
        regularUserId = (typeof regularUser === 'object') ? regularUser.id : regularUser;

        // 4. Fazer login com ambos para obter tokens
        const adminLogin = await request(app)
            .post('/auth/login')
            .send({ email: 'admin@test.com', password: adminPassword });
        adminToken = adminLogin.body.token;

        const userLogin = await request(app)
            .post('/auth/login')
            .send({ email: 'user@test.com', password: userPassword });
        userToken = userLogin.body.token;
    });

    // --- Testes para GET /admin/users ---
    describe('GET /admin/users', () => {
        it('deve retornar 403 (Forbidden) para um utilizador comum', async () => {
            const response = await request(app)
                .get('/admin/users')
                .set('Authorization', `Bearer ${userToken}`); // Usa token de utilizador comum
            
            expect(response.statusCode).toBe(403);
            expect(response.body.message).toContain('Apenas administradores');
        });

        it('deve retornar 200 (OK) e a lista de utilizadores para um admin', async () => {
            const response = await request(app)
                .get('/admin/users')
                .set('Authorization', `Bearer ${adminToken}`); // Usa token de admin
            
            expect(response.statusCode).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
            expect(response.body.length).toBe(2); // O admin e o utilizador comum
            expect(response.body[0].username).toBe('admin_tester');
        });
    });

    // --- Testes para POST /admin/users ---
    describe('POST /admin/users', () => {
        it('deve retornar 403 (Forbidden) ao tentar criar utilizador como utilizador comum', async () => {
            const response = await request(app)
                .post('/admin/users')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    username: 'novo_user_fail',
                    email: 'novo_fail@test.com',
                    password: 'password123',
                    nome: 'Novo',
                    sobrenome: 'Fail'
                });
            
            expect(response.statusCode).toBe(403);
        });

        it('deve retornar 201 (Created) ao criar utilizador como admin', async () => {
            const response = await request(app)
                .post('/admin/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    username: 'novo_user_ok',
                    email: 'novo_ok@test.com',
                    password: 'password123',
                    nome: 'Novo',
                    sobrenome: 'OK',
                    role: 'user'
                });
            
            expect(response.statusCode).toBe(201);
            expect(response.body.username).toBe('novo_user_ok');
            expect(response.body.role).toBe('user');
        });

        it('deve retornar 409 (Conflict) se o email ou username já existir', async () => {
            const response = await request(app)
                .post('/admin/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    username: 'user_tester', // Username duplicado
                    email: 'outro@test.com',
                    password: 'password123',
                    nome: 'Duplicado',
                    sobrenome: 'Teste'
                });
            
            expect(response.statusCode).toBe(409); // Conflito
            expect(response.body.message).toContain('username ou email');
        });
    });

    // --- Testes para PUT /admin/users/:id/role ---
    describe('PUT /admin/users/:id/role', () => {
        it('deve retornar 403 (Forbidden) ao tentar alterar role como utilizador comum', async () => {
            const response = await request(app)
                .put(`/admin/users/${regularUserId}/role`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ role: 'admin' });
            
            expect(response.statusCode).toBe(403);
        });

        it('deve retornar 200 (OK) ao alterar role como admin', async () => {
            const response = await request(app)
                .put(`/admin/users/${regularUserId}/role`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: 'admin' });
            
            expect(response.statusCode).toBe(200);
            expect(response.body.message).toContain('atualizado com sucesso');

            // Verifica se a role foi realmente mudada no DB
            const updatedUser = await db('users').where({ id: regularUserId }).first();
            expect(updatedUser.role).toBe('admin');
        });
    });

    // --- Testes para DELETE /admin/users/:id ---
    describe('DELETE /admin/users/:id', () => {
        it('deve retornar 403 (Forbidden) ao tentar apagar como utilizador comum', async () => {
            const response = await request(app)
                .delete(`/admin/users/${adminUserId}`)
                .set('Authorization', `Bearer ${userToken}`);
            
            expect(response.statusCode).toBe(403);
        });

        it('deve retornar 400 (Bad Request) ao tentar apagar a si próprio como admin', async () => {
            const response = await request(app)
                .delete(`/admin/users/${adminUserId}`) // Admin tentando apagar a si mesmo
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(response.statusCode).toBe(400);
            expect(response.body.message).toContain('própria conta');
        });

        it('deve retornar 204 (No Content) ao apagar outro utilizador como admin', async () => {
            const response = await request(app)
                .delete(`/admin/users/${regularUserId}`) // Admin apagando o utilizador comum
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(response.statusCode).toBe(204);

            // Verifica se o utilizador foi realmente apagado
            const deletedUser = await db('users').where({ id: regularUserId }).first();
            expect(deletedUser).toBeUndefined();
        });
    });

});