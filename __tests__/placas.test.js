// __tests__/placas.test.js

const request = require('supertest');
const app = require('../server');
const db = require('../config/database');

describe('Rotas de Placas', () => {
    let token;
    let regiaoId;
    let placaId;

    // Antes de todos os testes, cria um utilizador, faz login para obter um token,
    // e cria uma região para ser usada nos testes das placas.
    beforeAll(async () => {
        // Limpa as tabelas para garantir um estado limpo
        await db('users').del();
        await db('regioes').del();

        // 1. Cria um utilizador de teste
        await request(app)
            .post('/auth/register')
            .send({
                username: 'placastester',
                password: 'password123',
                email: 'placas@test.com',
                nome: 'Placas',
                sobrenome: 'Tester'
            });

        // 2. Faz login para obter o token
        const loginResponse = await request(app)
            .post('/auth/login')
            .send({
                username: 'placastester',
                password: 'password123'
            });
        token = loginResponse.body.token; // Guarda o token para usar nos testes

        // 3. Cria uma região de teste
        const regiaoResponse = await db('regioes').insert({ nome: 'Região de Teste' }).returning('id');
        regiaoId = regiaoResponse[0].id;
    });

    // Antes de cada teste, limpa a tabela de placas
    beforeEach(async () => {
        await db('placas').del();
    });

    // Teste para a criação de uma placa
    it('deve criar uma nova placa com sucesso', async () => {
        const response = await request(app)
            .post('/placas')
            .set('Authorization', `Bearer ${token}`) // Usa o token de autenticação
            .send({
                numero_placa: 'TEST-001',
                coordenadas: '-3.74, -38.52',
                nomeDaRua: 'Rua de Teste',
                tamanho: '9x3m',
                regiao_id: regiaoId
            });

        expect(response.statusCode).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.numero_placa).toBe('TEST-001');
        
        // Guarda o ID da placa criada para usar em outros testes
        placaId = response.body.id;
    });

    // Teste para falha de criação sem token
    it('não deve criar uma placa sem um token de autenticação', async () => {
        const response = await request(app)
            .post('/placas')
            .send({
                numero_placa: 'TEST-002',
                coordenadas: '0,0',
                nomeDaRua: 'Rua Proibida',
                tamanho: '1x1m',
                regiao_id: regiaoId
            });

        expect(response.statusCode).toBe(401); // Unauthorized
    });

    // Teste para listar placas
    it('deve listar as placas existentes', async () => {
        // Cria uma placa primeiro
        await request(app)
            .post('/placas')
            .set('Authorization', `Bearer ${token}`)
            .send({
                numero_placa: 'LIST-001',
                coordenadas: '1,1',
                nomeDaRua: 'Rua da Listagem',
                tamanho: '2x2m',
                regiao_id: regiaoId
            });

        // Agora, tenta listar as placas
        const response = await request(app)
            .get('/placas')
            .set('Authorization', `Bearer ${token}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBeGreaterThan(0);
        expect(response.body.data[0].numero_placa).toBe('LIST-001');
    });

    // Teste para apagar uma placa
    it('deve apagar uma placa com sucesso', async () => {
        // Cria uma placa para apagar
        const placaCriada = await request(app)
            .post('/placas')
            .set('Authorization', `Bearer ${token}`)
            .send({
                numero_placa: 'DELETE-001',
                coordenadas: '2,2',
                nomeDaRua: 'Rua a ser Apagada',
                tamanho: '3x3m',
                regiao_id: regiaoId
            });
        
        const idParaApagar = placaCriada.body.id;

        // Tenta apagar a placa
        const response = await request(app)
            .delete(`/placas/${idParaApagar}`)
            .set('Authorization', `Bearer ${token}`);
            
        // Espera-se o status 204 (No Content), que indica sucesso sem corpo de resposta
        expect(response.statusCode).toBe(204);
    });
});