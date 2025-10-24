// services/aluguelService.js
const mongoose = require('mongoose'); // Necessário para transações
const Aluguel = require('../models/Aluguel'); // Modelo Aluguel Mongoose
const Placa = require('../models/Placa');     // Modelo Placa Mongoose
const Cliente = require('../models/Cliente'); // Modelo Cliente (para populate)

class AluguelService {
    // constructor não precisa mais do 'db'
    constructor() {}

    /**
     * Obtém todos os alugueis (passados, presentes e futuros) para uma placa específica.
     */
    async getAlugueisByPlaca(placa_id, empresa_id) {
        // Busca alugueis filtrando por placa e empresa
        return await Aluguel.find({ placa: placa_id, empresa: empresa_id })
                            // Popula os campos 'nome' e 'logo_url' do documento Cliente referenciado
                            .populate('cliente', 'nome logo_url')
                            // Ordena por data de início descendente
                            .sort({ data_inicio: -1 }) // -1 para descendente
                            .exec();
    }

    /**
     * Cria um novo aluguel (reserva) para uma placa.
     */
    async createAluguel(aluguelData, empresa_id) {
        const { placa_id, cliente_id, data_inicio, data_fim } = aluguelData;

        // Converte strings de data para objetos Date para comparação e salvamento
        const inicioDate = new Date(data_inicio);
        const fimDate = new Date(data_fim);

        // 1. Verificar se as datas são válidas (fim > início)
        if (fimDate <= inicioDate) {
            const error = new Error('A data final deve ser posterior à data inicial.');
            error.status = 400; // Bad Request
            throw error;
        }

        // 2. Verificar conflitos de datas usando operadores MongoDB
        // Procura por qualquer aluguel existente para a mesma placa que se sobreponha ao período desejado
        const conflictingAluguel = await Aluguel.findOne({
            placa: placa_id, // Mesma placa
            empresa: empresa_id, // Garante que é da mesma empresa (segurança extra)
            $or: [ // Verifica sobreposição:
                // 1. Novo aluguel começa durante um existente
                { data_inicio: { $lte: inicioDate }, data_fim: { $gte: inicioDate } },
                // 2. Novo aluguel termina durante um existente
                { data_inicio: { $lte: fimDate }, data_fim: { $gte: fimDate } },
                // 3. Novo aluguel envolve completamente um existente
                { data_inicio: { $gte: inicioDate }, data_fim: { $lte: fimDate } }
            ]
        }).exec();

        if (conflictingAluguel) {
            const error = new Error('Esta placa já está reservada para este período. Verifique as datas.');
            error.status = 409; // Conflict
            throw error;
        }

        // 3. Usar uma transação Mongoose para criar o aluguel E atualizar a placa
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            // Cria o novo aluguel dentro da sessão
            const [novoAluguelDoc] = await Aluguel.create([{
                placa: placa_id,
                cliente: cliente_id,
                data_inicio: inicioDate, // Salva como Date
                data_fim: fimDate,       // Salva como Date
                empresa: empresa_id
            }], { session });

            // --- LÓGICA DE DISPONIBILIDADE ATUALIZADA ---
            // Verifica se o aluguel recém-criado está ATIVO HOJE.
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0); // Zera hora para comparar apenas a data
            const isAtivoHoje = (inicioDate <= hoje && fimDate >= hoje);

            // Se o aluguel estiver ativo hoje, define a placa como indisponível
            if (isAtivoHoje) {
                await Placa.updateOne(
                    { _id: placa_id, empresa: empresa_id }, // Garante que pertence à empresa
                    { $set: { disponivel: false } },
                    { session } // Inclui na transação
                );
            }
            // Se o aluguel for apenas no futuro, não mexemos na flag 'disponivel'.

            // Confirma a transação
            await session.commitTransaction();
            return novoAluguelDoc; // Retorna o documento Mongoose criado

        } catch (error) {
            // Se algo der errado, aborta a transação
            await session.abortTransaction();
            console.error("Erro ao criar aluguel (transação abortada):", error);
            // Re-lança o erro para o errorHandler
            throw error;
        } finally {
            // Sempre termina a sessão
            session.endSession();
        }
    }

    /**
     * Apaga um aluguel (cancela uma reserva).
     */
    async deleteAluguel(aluguel_id, empresa_id) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            // 1. Encontra o aluguel para obter o placa_id e verificar posse
            const aluguel = await Aluguel.findOne({ _id: aluguel_id, empresa: empresa_id }).session(session).exec();
            if (!aluguel) {
                const error = new Error('Aluguel não encontrado.');
                error.status = 404; // Not Found
                throw error;
            }
            const placaId = aluguel.placa; // Guarda o ID da placa associada

            // 2. Apaga o aluguel dentro da sessão
            const deleteResult = await Aluguel.deleteOne({ _id: aluguel_id }).session(session);

            // Verificação extra (embora findOne já tenha verificado)
            if (deleteResult.deletedCount === 0) {
                 throw new Error('Aluguel não encontrado durante a exclusão.'); // Deve ter sido pego antes
            }

            // --- LÓGICA DE DISPONIBILIDADE ATUALIZADA ---
            // Verifica se existem OUTROS alugueis ATIVOS HOJE para esta placa
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0); // Zera hora

            const outroAluguelAtivo = await Aluguel.findOne({
                placa: placaId,
                empresa: empresa_id, // Garante que é da mesma empresa
                _id: { $ne: aluguel_id }, // Exclui o aluguel que acabamos de apagar
                data_inicio: { $lte: hoje },
                data_fim: { $gte: hoje }
            }).session(session).exec(); // Executa dentro da mesma sessão

            // 4. Se NÃO houver mais alugueis ativos hoje,
            // define a placa como 'disponível'.
            if (!outroAluguelAtivo) {
                await Placa.updateOne(
                    { _id: placaId, empresa: empresa_id }, // Garante que pertence à empresa
                    { $set: { disponivel: true } },
                    { session } // Inclui na transação
                );
            }
            // Se houver outro aluguel ativo, a placa continua indisponível.

            // Confirma a transação
            await session.commitTransaction();
            return { success: true, message: 'Aluguel cancelado com sucesso.' };

        } catch (error) {
            // Se algo der errado, aborta a transação
            await session.abortTransaction();
            console.error("Erro ao deletar aluguel (transação abortada):", error);
            // Re-lança o erro (já deve ter status 404 ou 400 se for o caso)
             if (!error.status) error.status = 500; // Garante um status se for um erro inesperado
            throw error;
        } finally {
            // Sempre termina a sessão
            session.endSession();
        }
    }
}

module.exports = AluguelService;