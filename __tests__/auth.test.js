// __tests__/auth.test.js

// Importa o supertest para fazer requisições HTTP
const request = require('supertest');
// Importa a aplicação Express (precisaremos de a exportar de server.js)
const app = require('../server'); // Assumindo que server.js exportará o app
// Importa a instância do banco de dados para limpar os dados entre os testes
const db = require('../config/database');

// Descreve o conjunto de testes para a autenticação
describe('Rotas de Autenticação', () => {

    // Antes de cada teste, limpa a tabela de utilizadores para garantir um ambiente limpo
    beforeEach(async () => {
        await db('users').del();
    });

    // Teste para a rota de registo
    it('deve registar um novo utilizador com sucesso', async () => {
        const response = await request(app)
            .post('/auth/register')
            .send({
                username: 'testuser',
                password: 'password123',
                email: 'test@example.com',
                nome: 'Test',
                sobrenome: 'User'
            });

        // Espera-se que a resposta tenha o status 201 (Created)
        expect(response.statusCode).toBe(201);
        // Espera-se que a mensagem de sucesso seja retornada
        expect(response.body.message).toBe('Usuário registrado com sucesso!');
    });

    // Teste para a rota de login
    it('deve fazer login com um utilizador existente e retornar um token', async () => {
        // Primeiro, cria um utilizador para o teste de login
        await request(app)
            .post('/auth/register')
            .send({
                username: 'loginuser',
                password: 'password123',
                email: 'login@example.com',
                nome: 'Login',
                sobrenome: 'User'
            });

        // Agora, tenta fazer login com as mesmas credenciais
        const response = await request(app)
            .post('/auth/login')
            .send({
                username: 'loginuser',
                password: 'password123'
            });

        // Espera-se que o login seja bem-sucedido (status 200)
        expect(response.statusCode).toBe(200);
        // Espera-se que a resposta contenha um token
        expect(response.body).toHaveProperty('token');
    });

    // Teste para login com credenciais inválidas
    it('não deve fazer login com uma password incorreta', async () => {
        // Cria um utilizador
        await request(app)
            .post('/auth/register')
            .send({
                username: 'wrongpass',
                password: 'password123',
                email: 'wrongpass@example.com'
            });

        // Tenta fazer login com a password errada
        const response = await request(app)
            .post('/auth/login')
            .send({
                username: 'wrongpass',
                password: 'wrongpassword'
            });

        // Espera-se um erro de não autorizado (status 401)
        expect(response.statusCode).toBe(401);
        expect(response.body.message).toBe('Credenciais inválidas.');
    });
});