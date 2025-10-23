// services/aluguelService.js
const db = require('../config/database'); // Importa a instância do Knex

class AluguelService {
    constructor(db) {
        this.db = db;
    }

    /**
     * Obtém todos os alugueis (passados, presentes e futuros) para uma placa específica.
     */
    async getAlugueisByPlaca(placa_id, empresa_id) {
        // ... (código existente inalterado) ...
        return this.db('alugueis')
            .join('clientes', 'alugueis.cliente_id', 'clientes.id')
            .where('alugueis.placa_id', placa_id)
            .andWhere('alugueis.empresa_id', empresa_id)
            .select(
                'alugueis.id',
                'alugueis.data_inicio',
                'alugueis.data_fim',
                'clientes.nome as cliente_nome',
                'clientes.logo_url as cliente_logo'
            )
            .orderBy('alugueis.data_inicio', 'desc');
    }

    /**
     * Cria um novo aluguel (reserva) para uma placa.
     */
    async createAluguel(aluguelData, empresa_id) {
        const { placa_id, cliente_id, data_inicio, data_fim } = aluguelData;

        // 1. Verificar se as datas são válidas
        if (new Date(data_fim) <= new Date(data_inicio)) {
            const error = new Error('A data final deve ser posterior à data inicial.');
            error.status = 400;
            throw error;
        }

        // 2. Verificar conflitos de datas
        const conflictingAluguel = await this.db('alugueis')
            .where({ placa_id })
            .andWhere(function() {
                this.where(function() {
                    this.where('data_inicio', '<=', data_inicio).andWhere('data_fim', '>=', data_inicio);
                })
                .orWhere(function() {
                    this.where('data_inicio', '<=', data_fim).andWhere('data_fim', '>=', data_fim);
                })
                .orWhere(function() {
                    this.where('data_inicio', '>=', data_inicio).andWhere('data_fim', '<=', data_fim);
                });
            })
            .first();

        if (conflictingAluguel) {
            const error = new Error('Esta placa já está reservada para este período. Verifique as datas.');
            error.status = 409;
            throw error;
        }

        // 3. Usar uma transação para criar o aluguel E atualizar a placa
        return this.db.transaction(async (trx) => {
            const [novoAluguel] = await trx('alugueis').insert({
                placa_id,
                cliente_id,
                data_inicio,
                data_fim,
                empresa_id
            }).returning('*');

            // --- LÓGICA DE DISPONIBILIDADE ATUALIZADA ---
            // Verifica se o aluguel recém-criado está ATIVO HOJE.
            const hoje = new Date().toISOString().split('T')[0];
            const isAtivoHoje = (data_inicio <= hoje && data_fim >= hoje);

            // Se o aluguel começar hoje ou já tiver começado,
            // define a placa como indisponível.
            if (isAtivoHoje) {
                await trx('placas').where({ id: placa_id }).update({
                    disponivel: false
                });
            }
            // Se o aluguel for apenas no futuro, não mexemos na flag 'disponivel'.
            // Ela continua 'true' (disponível para manutenção manual).

            return novoAluguel;
        });
    }

    /**
     * Apaga um aluguel (cancela uma reserva).
     */
    async deleteAluguel(aluguel_id, empresa_id) {
        
        return this.db.transaction(async (trx) => {
            // 1. Encontra o aluguel para obter o placa_id
            const aluguel = await trx('alugueis').where({ id: aluguel_id, empresa_id }).first();
            if (!aluguel) {
                const error = new Error('Aluguel não encontrado.');
                error.status = 404;
                throw error;
            }

            // 2. Apaga o aluguel
            await trx('alugueis').where({ id: aluguel_id }).del();

            // --- LÓGICA DE DISPONIBILIDADE ATUALIZADA ---
            // Verifica se existem OUTROS alugueis ATIVOS HOJE para esta placa
            const hoje = new Date().toISOString().split('T')[0];
            const outroAluguelAtivo = await trx('alugueis')
                .where('placa_id', aluguel.placa_id)
                .andWhere('data_inicio', '<=', hoje)
                .andWhere('data_fim', '>=', hoje)
                .first(); // Procura por qualquer outro aluguel ativo

            // 4. Se NÃO houver mais alugueis ativos,
            // define a placa como 'disponível' (tira-a do modo "Alugada").
            if (!outroAluguelAtivo) {
                await trx('placas').where({ id: aluguel.placa_id }).update({
                    disponivel: true
                });
            }
            // Se houver outro aluguel ativo (cenário raro de sobreposição),
            // a placa continua indisponível.

            return { success: true, message: 'Aluguel cancelado com sucesso.' };
        });
    }
}

module.exports = AluguelService;