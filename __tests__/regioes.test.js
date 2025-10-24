// __tests__/regioes.test.js

const request = require('supertest');
const app = require('../server'); // Importa a app (server.js)
const mongoose = require('mongoose'); // Necessário para ObjectId
const Empresa = require('../models/Empresa');
const User = require('../models/User');
const Regiao = require('../models/Regiao');
const Placa = require('../models/Placa');
const bcrypt = require('bcrypt');

describe('Rotas de Regiões (/regioes)', () => {
    let token;        // Token JWT do utilizador admin
    let empresaId;    // ObjectId da empresa de teste
    let regiaoId;     // ID ('id' mapeado) de uma região criada nos testes

    // Antes de todos os testes: criar empresa e utilizador admin, fazer login
    beforeAll(async () => {
        // Limpeza inicial (opcional, pois jest.setup.js já limpa)
        await User.deleteMany({});
        await Empresa.deleteMany({});

        // 1. Calcula o hash da API key
        const apiKeyHash = await bcrypt.hash('testkey_regiao', 10);

        // 2. Define empresaData com TODOS os campos obrigatórios
        const empresaData = {
            nome: 'Empresa Teste Regiao',          // <-- Campo obrigatório
            cnpj: '11.111.111/0001-11',         // <-- Campo obrigatório
            api_key_hash: apiKeyHash,           // <-- Campo obrigatório
            api_key_prefix: 'pref_regiao'       // <-- Campo obrigatório
        };

        // 3. Cria a empresa de teste usando Mongoose
        const novaEmpresa = await Empresa.create(empresaData); // Agora passa o objeto completo
        empresaId = novaEmpresa._id; // Guarda o ObjectId

        // 4. Cria utilizador admin associado
        const adminPassword = 'password123';
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await User.create({
             username: 'regiaotester',
             password: hashedPassword,
             email: 'regiao@test.com',
             nome: 'Regiao',
             sobrenome: 'Tester',
             empresa: empresaId, // Associa à empresa
             role: 'admin'
        });

        // 5. Faz login via API para obter o token
        const loginResponse = await request(app)
            .post('/auth/login')
            .send({
                email: 'regiao@test.com', // Login usa email
                password: adminPassword
            });
        token = loginResponse.body.token; // Guarda o token
        expect(token).toBeDefined(); // Garante que o login funcionou
    });

    // Limpa Placas e Regiões antes de cada teste específico desta suite
    beforeEach(async () => {
        await Placa.deleteMany({});
        await Regiao.deleteMany({});
    });

    it('deve criar uma nova região com sucesso', async () => {
        const response = await request(app)
            .post('/regioes')
            .set('Authorization', `Bearer ${token}`)
            .send({ nome: 'Região Central' });

        expect(response.statusCode).toBe(201);
        // <<< CORREÇÃO AQUI >>>
        expect(response.body).toHaveProperty('id'); // Verifica a propriedade 'id' mapeada
        expect(response.body.nome).toBe('Região Central');
        expect(String(response.body.empresa)).toBe(String(empresaId));

        regiaoId = response.body.id; // Guarda o 'id' mapeado
    });

    it('não deve criar uma região sem token', async () => {
        const response = await request(app)
            .post('/regioes')
            .send({ nome: 'Região Proibida' });

        expect(response.statusCode).toBe(401); // Unauthorized
    });

    it('não deve criar uma região com nome duplicado na mesma empresa', async () => {
         // Cria a primeira região via API
         await request(app)
            .post('/regioes')
            .set('Authorization', `Bearer ${token}`)
            .send({ nome: 'Região Duplicada' });

         // Tenta criar de novo com o mesmo nome
        const response = await request(app)
            .post('/regioes')
            .set('Authorization', `Bearer ${token}`)
            .send({ nome: 'Região Duplicada' });

        expect(response.statusCode).toBe(409); // Conflict
        expect(response.body.message).toContain('Já existe uma região com este nome');
    });

    it('deve listar todas as regiões da empresa', async () => {
         // Cria duas regiões diretamente no DB para este teste
         await Regiao.create([
            { nome: 'Região A', empresa: empresaId },
            { nome: 'Região B', empresa: empresaId }
         ]);

        const response = await request(app)
            .get('/regioes')
            .set('Authorization', `Bearer ${token}`);

        expect(response.statusCode).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
        expect(response.body.length).toBe(2);
        // O serviço ordena por nome ascendente
        expect(response.body[0].nome).toBe('Região A');
        expect(response.body[1].nome).toBe('Região B');
        // A resposta da lista também terá 'id' se a transformação global estiver ativa
        expect(response.body[0]).toHaveProperty('id'); // <<< CORREÇÃO AQUI >>>
        expect(String(response.body[0].empresa)).toBe(String(empresaId));
    });

    it('deve atualizar uma região existente', async () => {
         // Cria uma região diretamente no DB para atualizar
         const regiaoAntiga = await Regiao.create({
             nome: 'Região Antiga',
             empresa: empresaId
         });
        // Usa o ObjectId real para a URL
        const idParaAtualizar = regiaoAntiga._id;

        const response = await request(app)
            .put(`/regioes/${idParaAtualizar}`) // URL usa o _id
            .set('Authorization', `Bearer ${token}`)
            .send({ nome: 'Região Atualizada' });

        expect(response.statusCode).toBe(200);
        expect(response.body.nome).toBe('Região Atualizada');
        // <<< CORREÇÃO AQUI >>>
        // Compara o 'id' mapeado na resposta com o ObjectId original (convertido para string)
        expect(String(response.body.id)).toBe(String(idParaAtualizar));
    });

     it('não deve atualizar uma região com nome duplicado', async () => {
         // Cria duas regiões
          const regiao1 = await Regiao.create({ nome: 'Nome Original 1', empresa: empresaId });
          await Regiao.create({ nome: 'Nome Existente 2', empresa: empresaId });

          // Tenta atualizar regiao1 para ter o nome da regiao2
          const response = await request(app)
            .put(`/regioes/${regiao1._id}`) // URL usa o _id
            .set('Authorization', `Bearer ${token}`)
            .send({ nome: 'Nome Existente 2' }); // Nome duplicado

        expect(response.statusCode).toBe(409);
        expect(response.body.message).toContain('Já existe uma região com este nome');
    });

    it('deve apagar uma região que não está em uso', async () => {
        // Cria uma região diretamente no DB para apagar
        const regiaoParaApagar = await Regiao.create({
             nome: 'Região Para Apagar',
             empresa: empresaId
         });
         const idParaApagar = regiaoParaApagar._id; // Usa _id para a URL

        const response = await request(app)
            .delete(`/regioes/${idParaApagar}`) // URL usa o _id
            .set('Authorization', `Bearer ${token}`);

        expect(response.statusCode).toBe(204); // No Content

        // Verifica no DB usando _id
        const deletedRegiao = await Regiao.findById(idParaApagar);
        expect(deletedRegiao).toBeNull();
    });

    it('não deve apagar uma região que está em uso por uma placa', async () => {
         // Cria uma região
         const regiaoEmUso = await Regiao.create({
             nome: 'Região Em Uso',
             empresa: empresaId
         });
         const idRegiaoEmUso = regiaoEmUso._id; // Usa _id

         // Cria uma placa usando essa região (diretamente no DB)
         await Placa.create({
            numero_placa: 'TESTE-REG-USO',
            regiao: idRegiaoEmUso, // Referencia o _id
            empresa: empresaId
         });

         // Tenta apagar a região via API
        const response = await request(app)
            .delete(`/regioes/${idRegiaoEmUso}`) // URL usa o _id
            .set('Authorization', `Bearer ${token}`);

        expect(response.statusCode).toBe(400); // Bad Request (ou 409 Conflict)
        expect(response.body.message).toContain('está a ser utilizada por uma ou mais placas');

         // Verifica no DB usando _id
         const notDeletedRegiao = await Regiao.findById(idRegiaoEmUso);
         expect(notDeletedRegiao).not.toBeNull();
    });

     it('deve retornar 404 ao tentar apagar uma região inexistente', async () => {
         const idInexistente = new mongoose.Types.ObjectId(); // Gera um ObjectId válido mas não existente
         const response = await request(app)
            .delete(`/regioes/${idInexistente}`) // URL usa o _id
            .set('Authorization', `Bearer ${token}`);

        expect(response.statusCode).toBe(404);
        expect(response.body.message).toContain('Região não encontrada');
     });

});