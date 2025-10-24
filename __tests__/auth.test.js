// __tests__/auth.test.js
const request = require('supertest');
const app = require('../server'); // Importa a aplicação Express
// Remova a importação do Knex: const db = require('../config/database');
const User = require('../models/User'); // Importa o modelo User do Mongoose
const Empresa = require('../models/Empresa'); // Importa o modelo Empresa
const bcrypt = require('bcrypt'); // Necessário para criar o hash da senha

describe('Rotas de Autenticação (/auth)', () => {
    let testEmpresa; // Variável para guardar a empresa de teste
    let testUserId; // Guarda o ID do utilizador criado

    // Antes de cada teste neste suite, cria uma empresa e um utilizador
    beforeEach(async () => {
        // Cria uma empresa de teste
        testEmpresa = await Empresa.create({
            nome: 'Empresa Teste Auth',
            cnpj: '99.999.999/0001-99', // CNPJ único para o teste
            api_key_hash: await bcrypt.hash('testkey', 10),
            api_key_prefix: 'test_auth'
        });

        // Cria um utilizador de teste associado à empresa
        const password = 'password123';
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            username: 'logintester',
            password: hashedPassword,
            email: 'login@test.com',
            nome: 'Login',
            sobrenome: 'User',
            role: 'user',
            empresa: testEmpresa._id // Associa à empresa criada
        });
        testUserId = user._id; // Guarda o ID
    });

    // Teste para a rota de login
    it('deve fazer login com um utilizador existente e retornar um token e dados do user', async () => {
        const response = await request(app)
            .post('/auth/login')
            .send({
                email: 'login@test.com', // Usa o email para login
                password: 'password123'
            });

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('user');
        expect(response.body.user).toHaveProperty('id'); // Verifica se o ID (mapeado de _id) está presente
        expect(response.body.user).toHaveProperty('username', 'logintester');
        expect(response.body.user).toHaveProperty('role', 'user');
        expect(response.body.user).toHaveProperty('empresa_id');
        expect(String(response.body.user.empresa_id)).toBe(String(testEmpresa._id)); // Compara IDs como string
        // Verifica se a senha NÃO foi retornada
        expect(response.body.user).not.toHaveProperty('password');
    });

    // Teste para login com credenciais inválidas (senha incorreta)
    it('não deve fazer login com uma password incorreta', async () => {
        const response = await request(app)
            .post('/auth/login')
            .send({
                email: 'login@test.com',
                password: 'wrongpassword' // Senha errada
            });

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toBe('Credenciais inválidas.');
    });

    // Teste para login com email inválido
     it('não deve fazer login com um email inexistente', async () => {
        const response = await request(app)
            .post('/auth/login')
            .send({
                email: 'nonexistent@test.com', // Email não existe
                password: 'password123'
            });

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toBe('Credenciais inválidas.');
    });

    // Teste para forgot/reset password (pode ser movido ou mantido aqui)
    describe('Recuperação de Senha', () => {
        it('deve solicitar recuperação de senha com sucesso (sem enviar email)', async () => {
            const response = await request(app)
                .post('/auth/forgot-password')
                .send({ email: 'login@test.com' });

            expect(response.statusCode).toBe(200);
            expect(response.body.message).toContain('Se uma conta com este e-mail existir');

            // Verifica se o token foi gerado no DB
            const user = await User.findById(testUserId);
            expect(user.resetToken).toBeDefined();
            expect(user.resetToken).not.toBeNull();
            expect(user.tokenExpiry).toBeDefined();
            expect(user.tokenExpiry).toBeInstanceOf(Date);
        });

        it('deve redefinir a senha com um token válido', async () => {
            // 1. Gera o token primeiro
            await request(app)
                .post('/auth/forgot-password')
                .send({ email: 'login@test.com' });

            // 2. Obtém o token do banco de dados
            const userWithToken = await User.findById(testUserId);
            const resetToken = userWithToken.resetToken;
            expect(resetToken).toBeTruthy(); // Garante que o token existe

            // 3. Tenta redefinir a senha
            const newPassword = 'newPassword123';
            const resetResponse = await request(app)
                .post(`/auth/reset-password/${resetToken}`)
                .send({ newPassword: newPassword });

            expect(resetResponse.statusCode).toBe(200);
            expect(resetResponse.body.message).toBe('Senha redefinida com sucesso!');

            // 4. Verifica se o token foi limpo no DB
            const userAfterReset = await User.findById(testUserId);
            expect(userAfterReset.resetToken).toBeNull();
            expect(userAfterReset.tokenExpiry).toBeNull();

            // 5. Tenta fazer login com a nova senha
            const loginResponse = await request(app)
                .post('/auth/login')
                .send({ email: 'login@test.com', password: newPassword });

            expect(loginResponse.statusCode).toBe(200);
            expect(loginResponse.body).toHaveProperty('token');
        });

         it('não deve redefinir a senha com um token inválido', async () => {
             const resetResponse = await request(app)
                .post(`/auth/reset-password/invalidtoken`)
                .send({ newPassword: 'anyPassword' });

             expect(resetResponse.statusCode).toBe(400);
             expect(resetResponse.body.message).toBe('Token de redefinição inválido ou expirado.');
         });

          it('não deve redefinir a senha com um token expirado', async () => {
             // 1. Gera token
             await request(app)
                 .post('/auth/forgot-password')
                 .send({ email: 'login@test.com' });
             const userWithToken = await User.findById(testUserId);
             const resetToken = userWithToken.resetToken;

             // 2. "Expira" o token no banco de dados (define data passada)
             await User.updateOne({ _id: testUserId }, { tokenExpiry: new Date(Date.now() - 2 * 60 * 60 * 1000) }); // 2 horas atrás

             // 3. Tenta redefinir
             const resetResponse = await request(app)
                .post(`/auth/reset-password/${resetToken}`)
                .send({ newPassword: 'anotherPassword' });

             expect(resetResponse.statusCode).toBe(400);
             expect(resetResponse.body.message).toBe('Token de redefinição inválido ou expirado.');
         });
    });

});