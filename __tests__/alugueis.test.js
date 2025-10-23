// __tests__/alugueis.test.js

const request = require('supertest');
const app = require('../server');
const db = require('../config/database');

describe('Rotas de Alugueis (/alugueis)', () => {
    let adminToken;
    let empresaId;
    let clienteId;
    let regiaoId;
    let placaIdDisponivel; // Placa que começará disponível
    let placaIdJaAlugada; // Placa que terá um aluguel inicial
    let aluguelId;

    // Função auxiliar para datas
    const getDateString = (offsetDays = 0) => {
        const date = new Date();
        date.setDate(date.getDate() + offsetDays);
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
    };

    // Setup: Cria empresa, admin, cliente, região, placas e faz login
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
            nome: 'Empresa Teste Aluguel',
            cnpj: '44.555.666/0001-77',
            api_key_hash: 'hash_teste_aluguel',
            api_key_prefix: 'pref_aluguel'
        }).returning('id');
        empresaId = (typeof novaEmpresa === 'object') ? novaEmpresa.id : novaEmpresa;

        // Cria Admin
        const adminPassword = 'passwordAdminAluguel';
        const adminHashedPassword = await require('bcrypt').hash(adminPassword, 10);
        await db('users').insert({
            username: 'admin_aluguel',
            email: 'admin_aluguel@test.com',
            password: adminHashedPassword,
            nome: 'Admin',
            sobrenome: 'Aluguel',
            role: 'admin',
            empresa_id: empresaId
        });

        // Cria Cliente
        const [novoCliente] = await db('clientes').insert({
            nome: 'Cliente Teste Aluguel',
            empresa_id: empresaId
        }).returning('id');
        clienteId = (typeof novoCliente === 'object') ? novoCliente.id : novoCliente;

        // Cria Região
        const [novaRegiao] = await db('regioes').insert({
            nome: 'Região Teste Aluguel',
            empresa_id: empresaId
        }).returning('id');
        regiaoId = (typeof novaRegiao === 'object') ? novaRegiao.id : novaRegiao;

        // Cria Placas
        const [placaDisp] = await db('placas').insert({
            id_placa: 'uuid-teste-aluguel-disp',
            numero_placa: 'ALUG-DISP',
            disponivel: true, // Começa disponível
            regiao_id: regiaoId,
            empresa_id: empresaId
        }).returning('id');
        placaIdDisponivel = (typeof placaDisp === 'object') ? placaDisp.id : placaDisp;

        const [placaAlug] = await db('placas').insert({
            id_placa: 'uuid-teste-aluguel-alug',
            numero_placa: 'ALUG-ALUG',
            disponivel: false, // Começa indisponível (simulando aluguel)
            regiao_id: regiaoId,
            empresa_id: empresaId
        }).returning('id');
        placaIdJaAlugada = (typeof placaAlug === 'object') ? placaAlug.id : placaAlug;

        // Cria um aluguel inicial para a placa 'placaIdJaAlugada'
        await db('alugueis').insert({
            placa_id: placaIdJaAlugada,
            cliente_id: clienteId,
            data_inicio: getDateString(-5), // Começou há 5 dias
            data_fim: getDateString(5),    // Termina em 5 dias
            empresa_id: empresaId
        });


        // Login Admin
        const adminLogin = await request(app)
            .post('/auth/login')
            .send({ email: 'admin_aluguel@test.com', password: adminPassword });
        adminToken = adminLogin.body.token;
    });

    // Limpa alugueis antes de cada teste e reseta placa disponível
    beforeEach(async () => {
        await db('alugueis').whereNot({ placa_id: placaIdJaAlugada }).del(); // Apaga alugueis exceto o inicial da placa já alugada
        await db('placas').where({ id: placaIdDisponivel }).update({ disponivel: true });
    });

    // --- Testes para POST /alugueis ---
    describe('POST /alugueis', () => {
        it('deve criar um aluguel futuro e manter a placa disponível', async () => {
            const dataInicio = getDateString(1); // Amanhã
            const dataFim = getDateString(10); // Daqui a 10 dias

            const response = await request(app)
                .post('/alugueis')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    placa_id: placaIdDisponivel,
                    cliente_id: clienteId,
                    data_inicio: dataInicio,
                    data_fim: dataFim
                });

            expect(response.statusCode).toBe(201);
            expect(response.body).toHaveProperty('id');

            // Verifica se a placa CONTINUA disponível (pois o aluguel é futuro)
            const placa = await db('placas').where({ id: placaIdDisponivel }).first();
            expect(placa.disponivel).toBe(true);

            aluguelId = response.body.id;
        });

         it('deve criar um aluguel que começa hoje e marcar placa como indisponível', async () => {
            const dataInicio = getDateString(0); // Hoje
            const dataFim = getDateString(5);

            const response = await request(app)
                .post('/alugueis')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    placa_id: placaIdDisponivel,
                    cliente_id: clienteId,
                    data_inicio: dataInicio,
                    data_fim: dataFim
                });

            expect(response.statusCode).toBe(201);
            
            // Verifica se a placa ficou indisponível
            const placa = await db('placas').where({ id: placaIdDisponivel }).first();
            expect(placa.disponivel).toBe(false);
        });

        it('deve retornar 409 (Conflict) se tentar alugar placa já alugada no período', async () => {
            // Usa a placa que já tem um aluguel de -5 a +5 dias
            const response = await request(app)
                .post('/alugueis')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    placa_id: placaIdJaAlugada, // Placa já alugada
                    cliente_id: clienteId,
                    data_inicio: getDateString(0), // Tenta alugar hoje (sobrepõe)
                    data_fim: getDateString(10)
                });

            expect(response.statusCode).toBe(409);
            expect(response.body.message).toContain('já está reservada');
        });

        it('deve retornar 400 (Bad Request) se data_fim for <= data_inicio', async () => {
            const response = await request(app)
                .post('/alugueis')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    placa_id: placaIdDisponivel,
                    cliente_id: clienteId,
                    data_inicio: getDateString(5),
                    data_fim: getDateString(3) // Fim antes do início
                });
            
            expect(response.statusCode).toBe(400);
            expect(response.body.message).toContain('posterior à data inicial');
        });
        
         it('deve retornar 401 (Unauthorized) se não houver token', async () => {
             const response = await request(app)
                .post('/alugueis')
                .send({
                    placa_id: placaIdDisponivel,
                    cliente_id: clienteId,
                    data_inicio: getDateString(1),
                    data_fim: getDateString(10)
                });
             expect(response.statusCode).toBe(401);
        });
    });

    // --- Testes para GET /alugueis/placa/:placaId ---
    describe('GET /alugueis/placa/:placaId', () => {
        it('deve retornar a lista de alugueis para uma placa', async () => {
            // Cria um aluguel passado e um futuro para a placa disponível
            await db('alugueis').insert([
                { placa_id: placaIdDisponivel, cliente_id: clienteId, data_inicio: getDateString(-10), data_fim: getDateString(-5), empresa_id: empresaId },
                { placa_id: placaIdDisponivel, cliente_id: clienteId, data_inicio: getDateString(1), data_fim: getDateString(5), empresa_id: empresaId }
            ]);

            const response = await request(app)
                .get(`/alugueis/placa/${placaIdDisponivel}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.statusCode).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
            expect(response.body.length).toBe(2);
            // Ordenado por data_inicio desc
            expect(new Date(response.body[0].data_inicio).getDate()).toBe(new Date(getDateString(1)).getDate());
        });
        
         it('deve retornar 401 (Unauthorized) se não houver token', async () => {
             const response = await request(app).get(`/alugueis/placa/${placaIdDisponivel}`);
             expect(response.statusCode).toBe(401);
        });
    });

    // --- Testes para DELETE /alugueis/:id ---
    describe('DELETE /alugueis/:id', () => {
        let aluguelFuturoId;
        let aluguelAtivoId;

        beforeEach(async () => {
            // Cria um aluguel futuro
            const [alugFuturo] = await db('alugueis').insert({
                placa_id: placaIdDisponivel, cliente_id: clienteId, data_inicio: getDateString(5),
                data_fim: getDateString(10), empresa_id: empresaId
            }).returning('id');
            aluguelFuturoId = (typeof alugFuturo === 'object') ? alugFuturo.id : alugFuturo;

            // Cria um aluguel ativo (e marca placa como indisponível)
             await db('placas').where({id: placaIdDisponivel}).update({ disponivel: false });
             const [alugAtivo] = await db('alugueis').insert({
                 placa_id: placaIdDisponivel, cliente_id: clienteId, data_inicio: getDateString(-2),
                 data_fim: getDateString(2), empresa_id: empresaId
             }).returning('id');
            aluguelAtivoId = (typeof alugAtivo === 'object') ? alugAtivo.id : alugAtivo;
        });

        it('deve apagar um aluguel futuro e manter a placa indisponível (devido ao ativo)', async () => {
            const response = await request(app)
                .delete(`/alugueis/${aluguelFuturoId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.statusCode).toBe(200);

            // Verifica se foi apagado do DB
            const deletedAluguel = await db('alugueis').where({ id: aluguelFuturoId }).first();
            expect(deletedAluguel).toBeUndefined();

            // Verifica se a placa CONTINUA indisponível (por causa do aluguel ativo)
            const placa = await db('placas').where({ id: placaIdDisponivel }).first();
            expect(placa.disponivel).toBe(false);
        });

        it('deve apagar um aluguel ativo e tornar a placa disponível (se não houver outros)', async () => {
             // Apaga o aluguel futuro primeiro
             await db('alugueis').where({id: aluguelFuturoId}).del();

             // Tenta apagar o aluguel ativo
             const response = await request(app)
                 .delete(`/alugueis/${aluguelAtivoId}`)
                 .set('Authorization', `Bearer ${adminToken}`);

            expect(response.statusCode).toBe(200);

            // Verifica se a placa VOLTOU a ficar disponível
            const placa = await db('placas').where({ id: placaIdDisponivel }).first();
            expect(placa.disponivel).toBe(true);
        });
        
         it('deve retornar 401 (Unauthorized) se não houver token', async () => {
             const response = await request(app).delete(`/alugueis/${aluguelAtivoId}`);
             expect(response.statusCode).toBe(401);
        });
         
         it('deve retornar 404 (Not Found) se o aluguel não existir', async () => {
             const response = await request(app)
                 .delete('/alugueis/99999')
                 .set('Authorization', `Bearer ${adminToken}`);
             expect(response.statusCode).toBe(404);
         });
    });
});