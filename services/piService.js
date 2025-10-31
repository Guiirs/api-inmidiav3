// services/piService.js
const PropostaInterna = require('../models/PropostaInterna');
const Cliente = require('../models/Cliente');
const User = require('../models/User'); // Para dados do gerador do PDF
const Empresa = require('../models/Empresa'); // Para dados do gerador do PDF
const AppError = require('../utils/AppError');
const logger = require('../config/logger');
const pdfService = require('./pdfService'); // Importa o novo serviço de PDF

class PIService {

    /**
     * Valida se o cliente pertence à empresa
     */
    async _validateCliente(clienteId, empresaId) {
        const cliente = await Cliente.findOne({ _id: clienteId, empresa: empresaId }).lean();
        if (!cliente) {
            throw new AppError('Cliente não encontrado ou não pertence à sua empresa.', 404);
        }
        return cliente;
    }

    /**
     * Cria uma nova PI
     */
    async create(piData, empresaId) {
        await this._validateCliente(piData.cliente, empresaId);

        const novaPI = new PropostaInterna({
            ...piData,
            empresa: empresaId,
            status: 'em_andamento' // Garante o status inicial
        });

        try {
            await novaPI.save();
            await novaPI.populate([
                { path: 'cliente', select: 'nome email telefone cnpj responsavel segmento' },
                { path: 'placas', select: 'codigo' } // Popula placas no retorno
            ]);
            return novaPI.toJSON();
        } catch (error) {
            logger.error(`[PIService] Erro ao criar PI: ${error.message}`, { stack: error.stack });
            throw new AppError(`Erro interno ao criar proposta: ${error.message}`, 500);
        }
    }

    /**
     * Busca uma PI pelo ID (Usado para o PDF)
     */
    async getById(piId, empresaId) {
        const pi = await PropostaInterna.findOne({ _id: piId, empresa: empresaId })
            .populate('cliente') // Popula todos os campos do cliente
            .populate({
                path: 'placas', // Popula as placas
                select: 'codigo tipo regiao', // Seleciona campos úteis
                populate: { path: 'regiao', select: 'nome' } // Popula a região dentro da placa
            })
            .lean();
            
        if (!pi) {
            throw new AppError('Proposta Interna (PI) não encontrada.', 404);
        }
        return pi;
    }

    /**
     * Lista todas as PIs (Usado pela tabela principal)
     */
    async getAll(empresaId, queryParams) {
        const { page = 1, limit = 10, sortBy = 'createdAt', order = 'desc', status, clienteId } = queryParams;

        const pageInt = parseInt(page, 10);
        const limitInt = parseInt(limit, 10);
        const skip = (pageInt - 1) * limitInt;
        const sortOrder = order === 'desc' ? -1 : 1;

        let query = { empresa: empresaId };
        if (status) query.status = status;
        if (clienteId) query.cliente = clienteId;
        
        try {
            const [pis, totalDocs] = await Promise.all([
                PropostaInterna.find(query)
                    // --- ALTERAÇÃO (CORREÇÃO) AQUI ---
                    // Selecionamos os campos novos para que o "Editar" funcione
                    .select('cliente tipoPeriodo dataInicio dataFim valorTotal status formaPagamento placas')
                    .populate({
                        path: 'cliente',
                        select: 'nome responsavel segmento' // Dados para o auto-fill do modal
                    })
                    // ---------------------------------
                    .sort({ [sortBy]: sortOrder })
                    .skip(skip)
                    .limit(limitInt)
                    .lean(),
                PropostaInterna.countDocuments(query)
            ]);

            const totalPages = Math.ceil(totalDocs / limitInt);
            const pagination = { totalDocs, totalPages, currentPage: pageInt, limit: limitInt };

            return { data: pis, pagination };
        } catch (error) {
            logger.error(`[PIService] Erro ao listar PIs: ${error.message}`, { stack: error.stack });
            throw new AppError(`Erro interno ao listar propostas: ${error.message}`, 500);
        }
    }

    /**
     * Atualiza uma PI
     */
    async update(piId, updateData, empresaId) {
        if (updateData.cliente) {
            await this._validateCliente(updateData.cliente, empresaId);
        }

        try {
            const piAtualizada = await PropostaInterna.findOneAndUpdate(
                { _id: piId, empresa: empresaId },
                { $set: updateData },
                { new: true, runValidators: true }
            )
            .populate([
                { path: 'cliente', select: 'nome email telefone cnpj responsavel segmento' },
                { path: 'placas', select: 'codigo' } // Popula placas no retorno
            ]);

            if (!piAtualizada) {
                throw new AppError('PI não encontrada.', 404);
            }
            return piAtualizada.toJSON();
        } catch (error) {
            logger.error(`[PIService] Erro ao atualizar PI ${piId}: ${error.message}`, { stack: error.stack });
           if (error instanceof AppError) throw error;
            throw new AppError(`Erro interno ao atualizar proposta: ${error.message}`, 500);
        }
    }

    /**
     * Deleta uma PI
     */
    async delete(piId, empresaId) {
        try {
          T // Adicionar verificação se a PI está vinculada a um contrato?
            // const contrato = await Contrato.findOne({ pi: piId, empresa: empresaId });
            // if (contrato) {
            //    throw new AppError('Não é possível apagar uma PI que já gerou um contrato.', 400);
            // }
            
            const result = await PropostaInterna.deleteOne({ _id: piId, empresa: empresaId });
            if (result.deletedCount === 0) {
                throw new AppError('PI não encontrada.', 404);
s           }
        } catch (error) {
            logger.error(`[PIService] Erro ao deletar PI ${piId}: ${error.message}`, { stack: error.stack });
            if (error instanceof AppError) throw error;
            throw new AppError(`Erro interno ao deletar proposta: ${error.message}`, 500);
        }
    }

    /**
     * Gera e envia o PDF da PI
     */
    async generatePDF(piId, empresaId, userId, res) {
       logger.debug(`[PIService] Gerando PDF para PI ${piId}. Buscando dados...`);
        try {
            // 1. Buscar todos os dados necessários
            const pi = await this.getById(piId, empresaId); 
            
            const [empresa, user] = await Promise.all([
                Empresa.findById(empresaId)
                       .select('nome cnpj endereco bairro cidade telefone') // <-- CORREÇÃO APLICADA
                       .lean(),
                User.findById(userId).lean()
            ]);

            if (!empresa || !user) {
                throw new AppError('Dados da empresa ou usuário não encontrados.', 404);
            }

            // 2. Chamar o serviço de PDF
            pdfService.generatePI_PDF(res, pi, pi.cliente, empresa, user);

s       } catch (error) {
            logger.error(`[PIService] Erro ao gerar PDF da PI ${piId}: ${error.message}`, { stack: error.stack });
            // Se o erro ocorrer antes do streaming, o errorHandler global pega
            if (error instanceof AppError) throw error;
            throw new AppError(`Erro interno ao gerar PDF: ${error.message}`, 500);
s       }
    }
    
    /**
     * [PARA O CRON JOB] Atualiza o status de PIs vencidas
     */
    static async updateVencidas() {
        const hoje = new Date();
        logger.info(`[PIService-Cron] Verificando PIs vencidas... (Data: ${hoje.toISOString()})`);
        
        try {
            const result = await PropostaInterna.updateMany(
                { 
                    status: 'em_andamento', 
                    dataFim: { $lt: hoje } 
                },
                { $set: { status: 'vencida' } }       );

            if (result.modifiedCount > 0) {
                logger.info(`[PIService-Cron] ${result.modifiedCount} PIs foram atualizadas para 'vencida'.`);
            }
        } catch (error) {
             logger.error(`[PIService-Cron] Erro ao atualizar status de PIs vencidas: ${error.message}`, { stack: error.stack });
        }
    }
}

module.exports = PIService;