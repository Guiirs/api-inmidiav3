// __tests__/alugueis.test.js

const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Empresa = require('../models/Empresa');
const User = require('../models/User');
const Cliente = require('../models/Cliente');
const Regiao = require('../models/Regiao');
const Placa = require('../models/Placa');
const Aluguel = require('../models/Aluguel');

describe('Rotas de Alugueis (/api/alugueis)', () => {
    let adminToken;
    let empresaId;
    let clienteId;
    let regiaoId;
    let placaIdDisponivel;
    let placaIdJaAlugada;
    let aluguelExistenteId;

    const getDateString = (offsetDays = 0) => {
        const date = new Date();
        date.setUTCDate(date.getUTCDate() + offsetDays);
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
    };

    const getDateObject = (offsetDays = 0) => {
        const date = new Date();
        date.setUTCHours(0, 0, 0, 0);
        date.setUTCDate(date.getUTCDate() + offsetDays);
        return date;
    };

    beforeAll(async () => {
        // Limpeza inicial
        await User.deleteMany({}); await Empresa.deleteMany({}); await Cliente.deleteMany({});
        await Regiao.deleteMany({}); await Placa.deleteMany({}); await Aluguel.deleteMany({});

        // Criação de entidades base
        const empresa = await Empresa.create({
            nome: 'Empresa Teste Aluguel', cnpj: '44.555.666/0001-77',
            api_key_hash: await bcrypt.hash('testkey_aluguel', 10), api_key_prefix: 'pref_aluguel'
        });
        empresaId = empresa._id;
        const adminPassword = 'passwordAdminAluguel';
        await User.create({
             username: 'admin_aluguel', email: 'admin_aluguel@test.com',
             password: await bcrypt.hash(adminPassword, 10),
             nome: 'Admin', sobrenome: 'Aluguel', role: 'admin', empresa: empresaId
         });
        const cliente = await Cliente.create({ nome: 'Cliente Teste Aluguel', empresa: empresaId });
        clienteId = cliente._id;
        const regiao = await Regiao.create({ nome: 'Região Teste Aluguel', empresa: empresaId });
        regiaoId = regiao._id;

        // Login
        const adminLogin = await request(app).post('/api/auth/login')
            .send({ email: 'admin_aluguel@test.com', password: adminPassword });
        if (adminLogin.status !== 200 || !adminLogin.body.token) { throw new Error('Login falhou no beforeAll.'); }
        adminToken = adminLogin.body.token;
        expect(adminToken).toBeDefined();
    });

    beforeEach(async () => {
        // Limpa coleções modificadas pelos testes
        await Placa.deleteMany({}); await Aluguel.deleteMany({});

        // Recria Placas e Aluguel inicial
        const placaDisp = await Placa.create({ numero_placa: 'ALUG-DISP', disponivel: true, regiao: regiaoId, empresa: empresaId });
        placaIdDisponivel = placaDisp._id;
        const placaAlug = await Placa.create({ numero_placa: 'ALUG-ALUG', disponivel: false, regiao: regiaoId, empresa: empresaId });
        placaIdJaAlugada = placaAlug._id;
        const aluguelInicial = await Aluguel.create({
            placa: placaIdJaAlugada, cliente: clienteId, data_inicio: getDateObject(-5), data_fim: getDateObject(5), empresa: empresaId
        });
        aluguelExistenteId = aluguelInicial._id;
    });

    describe('POST /api/alugueis', () => {
        it('deve criar um aluguel futuro e manter a placa disponível', async () => {
            const dataInicio = getDateString(1); const dataFim = getDateString(10);
            const response = await request(app).post('/api/alugueis').set('Authorization', `Bearer ${adminToken}`)
                .send({ placa_id: placaIdDisponivel.toString(), cliente_id: clienteId.toString(), data_inicio: dataInicio, data_fim: dataFim });
            expect(response.statusCode).toBe(201); expect(response.body).toHaveProperty('id');
            const placa = await Placa.findById(placaIdDisponivel); expect(placa).toBeDefined(); expect(placa.disponivel).toBe(true);
        });

         it('deve criar um aluguel que começa hoje e marcar placa como indisponível', async () => {
            const dataInicio = getDateString(0); const dataFim = getDateString(5);
            const response = await request(app).post('/api/alugueis').set('Authorization', `Bearer ${adminToken}`)
                .send({ placa_id: placaIdDisponivel.toString(), cliente_id: clienteId.toString(), data_inicio: dataInicio, data_fim: dataFim });
            expect(response.statusCode).toBe(201); expect(response.body).toHaveProperty('id');
            const placa = await Placa.findById(placaIdDisponivel); expect(placa).toBeDefined(); expect(placa.disponivel).toBe(false);
        });

        it('deve retornar 409 (Conflict) se tentar alugar placa já alugada no período', async () => {
            const response = await request(app).post('/api/alugueis').set('Authorization', `Bearer ${adminToken}`)
                .send({ placa_id: placaIdJaAlugada.toString(), cliente_id: clienteId.toString(), data_inicio: getDateString(0), data_fim: getDateString(10) });
            expect(response.statusCode).toBe(409); expect(response.body.message).toContain('já está reservada');
        });

         it('deve retornar 400 (Bad Request) se data_fim for <= data_inicio', async () => {
             const response = await request(app).post('/api/alugueis').set('Authorization', `Bearer ${adminToken}`)
                .send({ placa_id: placaIdDisponivel.toString(), cliente_id: clienteId.toString(), data_inicio: getDateString(5), data_fim: getDateString(3) });
             expect(response.statusCode).toBe(400); expect(response.body.message).toMatch(/posterior à data inicial/i);
        });

         it('deve retornar 401 (Unauthorized) se não houver token', async () => {
              const response = await request(app).post('/api/alugueis')
                 .send({ placa_id: placaIdDisponivel.toString(), cliente_id: clienteId.toString(), data_inicio: getDateString(1), data_fim: getDateString(10) });
              expect(response.statusCode).toBe(401);
         });
    });

    describe('GET /api/alugueis/placa/:placaId', () => {
        it('deve retornar a lista de alugueis para uma placa', async () => {
            await Aluguel.create([
                { placa: placaIdDisponivel, cliente: clienteId, data_inicio: getDateObject(-10), data_fim: getDateObject(-5), empresa: empresaId },
                { placa: placaIdDisponivel, cliente: clienteId, data_inicio: getDateObject(1), data_fim: getDateObject(5), empresa: empresaId }
            ]);
            const response = await request(app).get(`/api/alugueis/placa/${placaIdDisponivel}`).set('Authorization', `Bearer ${adminToken}`);
            expect(response.statusCode).toBe(200); expect(response.body).toBeInstanceOf(Array); expect(response.body.length).toBe(2);
            expect(response.body[0]).toHaveProperty('id'); expect(response.body[0].cliente).toBeDefined();
            if (response.body[0].cliente) {
                 expect(response.body[0].cliente).toHaveProperty('id'); expect(response.body[0].cliente.nome).toBe('Cliente Teste Aluguel');
            } else { throw new Error('Cliente não foi populado na resposta da API'); }
             expect(new Date(response.body[0].data_inicio).toISOString().split('T')[0]).toBe(getDateString(1));
             expect(new Date(response.body[1].data_inicio).toISOString().split('T')[0]).toBe(getDateString(-10));
        });

         it('deve retornar 401 (Unauthorized) se não houver token', async () => {
              const response = await request(app).get(`/api/alugueis/placa/${placaIdDisponivel}`); expect(response.statusCode).toBe(401);
         });

         it('deve retornar 400 (Bad Request) se o ID da placa for inválido', async () => {
              const response = await request(app).get('/api/alugueis/placa/id-invalido').set('Authorization', `Bearer ${adminToken}`);
              expect(response.statusCode).toBe(400); expect(response.body.message).toContain('ID da placa inválido');
         });
    });

    describe('DELETE /api/alugueis/:id', () => {
        let aluguelFuturoId, aluguelAtivoId, placaIdParaDelete;
        beforeEach(async () => {
             const placaDelete = await Placa.create({ numero_placa: 'ALUG-DEL', disponivel: true, regiao: regiaoId, empresa: empresaId });
             placaIdParaDelete = placaDelete._id;
             const alugFuturo = await Aluguel.create({ placa: placaIdParaDelete, cliente: clienteId, data_inicio: getDateObject(5), data_fim: getDateObject(10), empresa: empresaId });
             aluguelFuturoId = alugFuturo._id;
             await Placa.findByIdAndUpdate(placaIdParaDelete, { disponivel: false });
             const alugAtivo = await Aluguel.create({ placa: placaIdParaDelete, cliente: clienteId, data_inicio: getDateObject(-2), data_fim: getDateObject(2), empresa: empresaId });
             aluguelAtivoId = alugAtivo._id;
        });

        it('deve apagar um aluguel futuro e manter a placa indisponível (devido ao ativo)', async () => {
            const response = await request(app).delete(`/api/alugueis/${aluguelFuturoId}`).set('Authorization', `Bearer ${adminToken}`);
            expect(response.statusCode).toBe(200); expect(response.body.message).toContain('cancelado com sucesso');
            const deletedAluguel = await Aluguel.findById(aluguelFuturoId); expect(deletedAluguel).toBeNull();
            const placa = await Placa.findById(placaIdParaDelete); expect(placa).toBeDefined(); expect(placa.disponivel).toBe(false);
        });

        it('deve apagar um aluguel ativo e tornar a placa disponível (se não houver outros)', async () => {
             await Aluguel.findByIdAndDelete(aluguelFuturoId);
             const response = await request(app).delete(`/api/alugueis/${aluguelAtivoId}`).set('Authorization', `Bearer ${adminToken}`);
            expect(response.statusCode).toBe(200);
            const deletedAluguel = await Aluguel.findById(aluguelAtivoId); expect(deletedAluguel).toBeNull();
            const placa = await Placa.findById(placaIdParaDelete); expect(placa).toBeDefined(); expect(placa.disponivel).toBe(true);
        });

        it('deve apagar um aluguel ativo mas manter a placa indisponível se houver outro aluguel ativo', async () => {
             const outroAluguelAtivo = await Aluguel.create({ placa: placaIdParaDelete, cliente: clienteId, data_inicio: getDateObject(-1), data_fim: getDateObject(1), empresa: empresaId });
             const response = await request(app).delete(`/api/alugueis/${aluguelAtivoId}`).set('Authorization', `Bearer ${adminToken}`);
            expect(response.statusCode).toBe(200);
             const placa = await Placa.findById(placaIdParaDelete); expect(placa).toBeDefined(); expect(placa.disponivel).toBe(false);
             await Aluguel.findByIdAndDelete(outroAluguelAtivo._id);
        });

         it('deve retornar 401 (Unauthorized) se não houver token', async () => {
              const response = await request(app).delete(`/api/alugueis/${aluguelAtivoId}`); expect(response.statusCode).toBe(401);
         });

         it('deve retornar 404 (Not Found) se o aluguel não existir', async () => {
              const idInexistente = new mongoose.Types.ObjectId();
              const response = await request(app).delete(`/api/alugueis/${idInexistente}`).set('Authorization', `Bearer ${adminToken}`);
              // <<< CORREÇÃO (Erro 3): Esperar 404 >>>
              expect(response.statusCode).toBe(404);
              // <<< FIM CORREÇÃO >>>
              expect(response.body.message).toContain('Aluguel não encontrado');
          });

         it('deve retornar 400 (Bad Request) se o ID do aluguel for inválido', async () => {
             const response = await request(app).delete('/api/alugueis/id-invalido').set('Authorization', `Bearer ${adminToken}`);
              expect(response.statusCode).toBe(400); expect(response.body.message).toContain('ID do aluguel inválido');
         });
    });
});
