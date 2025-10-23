// __tests__/regioes.test.js

const request = require('supertest');
const app = require('../server'); // Importa a app (server.js)
const db = require('../config/database'); // Importa o Knex

describe('Rotas de Regiões', () => {
    let token;
    let empresaId;
    let regiaoId;

    // Antes de todos os testes: criar uma empresa e um utilizador, e fazer login
    beforeAll(async () => {
        // Limpa tabelas relevantes (ordem importa devido a chaves estrangeiras)
        await db('placas').del();
        await db('regioes').del();
        await db('users').del();
        await db('empresas').del();

        // 1. Cria uma empresa de teste (agora retorna fullApiKey)
        // Nota: O serviço de empresa agora precisa de mais campos
        const empresaAdminUser = {
            username: 'regiaotester',
            password: 'password123',
            email: 'regiao@test.com',
            nome: 'Regiao',
            sobrenome: 'Tester'
        };
        const empresaData = {
            nome_empresa: 'Empresa Teste Regiao',
            cnpj: '11.111.111/0001-11',
            adminUser: empresaAdminUser
        };
        // Precisamos do serviço para registar corretamente (ou simular no DB)
        // Para simplificar o teste, vamos inserir diretamente no DB
        const [novaEmpresa] = await db('empresas').insert({
             nome: empresaData.nome_empresa,
             cnpj: empresaData.cnpj,
             api_key_hash: 'hash_teste_regiao', // Valor fictício
             api_key_prefix: 'pref_regiao' // Valor fictício
        }).returning('id');
        empresaId = (typeof novaEmpresa === 'object') ? novaEmpresa.id : novaEmpresa;

        // 2. Cria utilizador admin associado
        const hashedPassword = await require('bcrypt').hash(empresaAdminUser.password, 10);
        await db('users').insert({
             ...empresaAdminUser,
             password: hashedPassword,
             empresa_id: empresaId,
             role: 'admin'
        });

        // 3. Faz login para obter o token
        const loginResponse = await request(app)
            .post('/auth/login')
            .send({
                email: 'regiao@test.com', // Login agora usa email
                password: 'password123'
            });

        token = loginResponse.body.token; // Guarda o token
    });

    // Limpa a tabela de regiões antes de cada teste
    beforeEach(async () => {
        await db('placas').del(); // Limpa placas também
        await db('regioes').del();
    });

    it('deve criar uma nova região com sucesso', async () => {
        const response = await request(app)
            .post('/regioes')
            .set('Authorization', `Bearer ${token}`) // Usa o token
            .send({
                nome: 'Região Central'
            });

        expect(response.statusCode).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.nome).toBe('Região Central');
        expect(response.body.empresa_id).toBe(empresaId);

        regiaoId = response.body.id; // Guarda para outros testes
    });

    it('não deve criar uma região sem token', async () => {
        const response = await request(app)
            .post('/regioes')
            .send({ nome: 'Região Proibida' });

        expect(response.statusCode).toBe(401); // Token não fornecido
    });

    it('não deve criar uma região com nome duplicado', async () => {
         // Cria a primeira região
         await request(app)
            .post('/regioes')
            .set('Authorization', `Bearer ${token}`)
            .send({ nome: 'Região Duplicada' });

         // Tenta criar de novo com o mesmo nome
        const response = await request(app)
            .post('/regioes')
            .set('Authorization', `Bearer ${token}`)
            .send({ nome: 'Região Duplicada' });

        expect(response.statusCode).toBe(409); // Conflito
    });

    it('deve listar todas as regiões da empresa', async () => {
         // Cria duas regiões
         await db('regioes').insert([
            { nome: 'Região A', empresa_id: empresaId },
            { nome: 'Região B', empresa_id: empresaId }
         ]);

        const response = await request(app)
            .get('/regioes')
            .set('Authorization', `Bearer ${token}`);

        expect(response.statusCode).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
        expect(response.body.length).toBe(2);
        expect(response.body[0].nome).toBe('Região A'); // Knex ordena por ID por padrão se não especificado
    });

    it('deve atualizar uma região existente', async () => {
         // Cria uma região para atualizar
         const [novaRegiao] = await db('regioes').insert({
             nome: 'Região Antiga',
             empresa_id: empresaId
         }).returning('id');
        const idParaAtualizar = (typeof novaRegiao === 'object') ? novaRegiao.id : novaRegiao;

        const response = await request(app)
            .put(`/regioes/${idParaAtualizar}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ nome: 'Região Atualizada' });

        expect(response.statusCode).toBe(200);
        expect(response.body.nome).toBe('Região Atualizada');
    });

    it('deve apagar uma região que não está em uso', async () => {
        // Cria uma região para apagar
         const [novaRegiao] = await db('regioes').insert({
             nome: 'Região Para Apagar',
             empresa_id: empresaId
         }).returning('id');
         const idParaApagar = (typeof novaRegiao === 'object') ? novaRegiao.id : novaRegiao;

        const response = await request(app)
            .delete(`/regioes/${idParaApagar}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.statusCode).toBe(204); // No Content
    });

    it('não deve apagar uma região que está em uso por uma placa', async () => {
         // Cria uma região
         const [novaRegiao] = await db('regioes').insert({
             nome: 'Região Em Uso',
             empresa_id: empresaId
         }).returning('id');
         const idRegiaoEmUso = (typeof novaRegiao === 'object') ? novaRegiao.id : novaRegiao;

         // Cria uma placa usando essa região
         await db('placas').insert({
            id_placa: 'teste-placa-regiao',
            numero_placa: 'TESTE-REG',
            coordenadas: '0,0',
            nomeDaRua: 'Rua Teste',
            tamanho: '1x1',
            regiao_id: idRegiaoEmUso,
            empresa_id: empresaId
         });

         // Tenta apagar a região
        const response = await request(app)
            .delete(`/regioes/${idRegiaoEmUso}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.statusCode).toBe(400); // Bad Request
        expect(response.body.message).toContain('está a ser utilizada por uma ou mais placas');
    });

});