// services/aluguelService.js
const mongoose = require('mongoose'); // Necessário para transações e ObjectId
const Aluguel = require('../models/Aluguel'); // Modelo Aluguel Mongoose
const Placa = require('../models/Placa');     // Modelo Placa Mongoose
const Cliente = require('../models/Cliente'); // Modelo Cliente (para populate)

class AluguelService {
    constructor() {}

    /**
     * Obtém todos os alugueis para uma placa específica, retornando objetos simples.
     */
    async getAlugueisByPlaca(placa_id, empresa_id) {
        // Adiciona .lean() para performance
        return await Aluguel.find({ placa: placa_id, empresa: empresa_id })
                            .populate('cliente', 'nome logo_url') // Popula dados do cliente
                            .sort({ data_inicio: -1 })
                            .lean() // <-- Adicionado .lean()
                            .exec();
        // O resultado já será um array de objetos simples com 'id' (se toJSON global configurado)
        // e os campos populados do cliente.
    }

    /**
     * Cria um novo aluguel (reserva) para uma placa.
     */
    async createAluguel(aluguelData, empresa_id) {
        const { placa_id, cliente_id, data_inicio, data_fim } = aluguelData;
        const inicioDate = new Date(data_inicio);
        const fimDate = new Date(data_fim);

        if (fimDate <= inicioDate) {
            const error = new Error('A data final deve ser posterior à data inicial.');
            error.status = 400; throw error;
        }

        // Verifica conflitos de datas
        // Adiciona .lean() pois só precisamos saber se existe
        const conflictingAluguel = await Aluguel.findOne({
            placa: placa_id,
            empresa: empresa_id, // Garante que é da mesma empresa
            $or: [
                { data_inicio: { $lte: inicioDate }, data_fim: { $gte: inicioDate } },
                { data_inicio: { $lte: fimDate }, data_fim: { $gte: fimDate } },
                { data_inicio: { $gte: inicioDate }, data_fim: { $lte: fimDate } }
            ]
        }).lean().exec(); // <-- Adicionado .lean()

        if (conflictingAluguel) {
            const error = new Error('Esta placa já está reservada para este período. Verifique as datas.');
            error.status = 409; throw error;
        }

        // Usa transação Mongoose (como antes)
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            // Cria o aluguel (NÃO usar .lean())
            const [novoAluguelDoc] = await Aluguel.create([{
                placa: placa_id, cliente: cliente_id, data_inicio: inicioDate,
                data_fim: fimDate, empresa: empresa_id
            }], { session });

            // Verifica se está ativo hoje (como antes)
            const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
            const isAtivoHoje = (inicioDate <= hoje && fimDate >= hoje);

            // Atualiza a placa se ativo hoje (updateOne não precisa de .lean())
            if (isAtivoHoje) {
                await Placa.updateOne(
                    { _id: placa_id, empresa: empresa_id },
                    { $set: { disponivel: false } },
                    { session }
                );
            }

            await session.commitTransaction();
             // A transformação toJSON global (se configurada) tratará _id -> id na resposta
            return novoAluguelDoc;

        } catch (error) {
            await session.abortTransaction();
            console.error("Erro ao criar aluguel (transação abortada):", error);
            throw error;
        } finally {
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
            // 1. Encontra o aluguel
            // Adiciona .lean() pois só precisamos do placaId
            const aluguel = await Aluguel.findOne({ _id: aluguel_id, empresa: empresa_id })
                                         .select('placa') // Seleciona apenas placa
                                         .lean() // <-- Adicionado .lean()
                                         .session(session).exec();
            if (!aluguel) {
                const error = new Error('Aluguel não encontrado.');
                error.status = 404; throw error;
            }
            const placaId = aluguel.placa; // placaId é um ObjectId aqui

            // 2. Apaga o aluguel (deleteOne não precisa de .lean())
            const deleteResult = await Aluguel.deleteOne({ _id: aluguel_id }).session(session);
            if (deleteResult.deletedCount === 0) {
                 throw new Error('Aluguel não encontrado durante a exclusão.');
            }

            // 3. Verifica OUTROS alugueis ativos HOJE
            const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
            // Adiciona .lean() pois só precisamos saber se existe
            const outroAluguelAtivo = await Aluguel.findOne({
                placa: placaId, // Usa o ObjectId
                empresa: empresa_id,
                _id: { $ne: aluguel_id }, // Exclui o aluguel apagado
                data_inicio: { $lte: hoje },
                data_fim: { $gte: hoje }
            }).lean().session(session).exec(); // <-- Adicionado .lean()

            // 4. Se NÃO houver mais alugueis ativos, torna a placa disponível
            if (!outroAluguelAtivo) {
                // updateOne não precisa de .lean()
                await Placa.updateOne(
                    { _id: placaId, empresa: empresa_id },
                    { $set: { disponivel: true } },
                    { session }
                );
            }

            await session.commitTransaction();
            return { success: true, message: 'Aluguel cancelado com sucesso.' };

        } catch (error) {
            await session.abortTransaction();
            console.error("Erro ao deletar aluguel (transação abortada):", error);
             if (!error.status) error.status = 500;
            throw error;
        } finally {
            session.endSession();
        }
    }
}

module.exports = AluguelService;