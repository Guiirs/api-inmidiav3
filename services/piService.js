// services/piService.js
const PropostaInterna = require('../models/PropostaInterna');
const Cliente = require('../models/Cliente');
const User = require('../models/User'); // Para dados do gerador do PDF
const Empresa = require('../models/Empresa'); // Para dados do gerador do PDF
const Placa = require('../models/Placa');
const Aluguel = require('../models/Aluguel'); // Para criar aluguéis automaticamente
const AppError = require('../utils/AppError');
const logger = require('../config/logger');
const pdfService = require('./pdfService'); // Importa o novo serviço de PDF
const PeriodService = require('./periodService'); // [PERÍODO UNIFICADO] Service centralizado
const { v4: uuidv4 } = require('uuid'); // Para gerar códigos únicos

class PIService {

    /**
     * Gera um código único para sincronização PI ↔ Aluguéis
     */
    _generatePICode() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `PI-${timestamp}-${random}`.toUpperCase();
    }

    /**
     * Cria aluguéis automaticamente para as placas da PI
     * [PERÍODO UNIFICADO] Recebe objeto period completo
     */
    async _criarAlugueisParaPI(piId, piCode, clienteId, placaIds, period, empresaId) {
        if (!placaIds || placaIds.length === 0) {
            logger.debug(`[PIService] Nenhuma placa para criar aluguéis`);
            return;
        }

        // Garante que clienteId é um ObjectId, não um objeto populado
        const clienteIdFinal = clienteId?._id || clienteId;

        logger.info(`[PIService] Criando ${placaIds.length} aluguéis para PI ${piId} (Code: ${piCode})`);

        const alugueis = placaIds.map(placaId => ({
            placa: placaId,
            cliente: clienteIdFinal,
            empresa: empresaId,
            // [PERÍODO UNIFICADO] Novos campos
            periodType: period.periodType,
            startDate: period.startDate,
            endDate: period.endDate,
            biWeekIds: period.biWeekIds,
            biWeeks: period.biWeeks ? period.biWeeks.map(bw => bw._id) : [],
            // [LEGADO] Mantido para compatibilidade
            data_inicio: period.startDate,
            data_fim: period.endDate,
            bi_week_ids: period.biWeekIds,
            bi_weeks: period.biWeeks ? period.biWeeks.map(bw => bw._id) : [],
            // PI sync
            pi_code: piCode,
            proposta_interna: piId,
            tipo: 'pi'
        }));

        try {
            const alugueisCreated = await Aluguel.insertMany(alugueis);
            logger.info(`[PIService] ${alugueisCreated.length} aluguéis criados com sucesso para PI ${piId}`);
            
            // NOTA: Não modificamos o campo 'disponivel' das placas aqui
            // A disponibilidade é gerenciada pela verificação de conflitos de datas
            // O campo 'disponivel: false' é reservado para manutenção manual
            
            return alugueisCreated;
        } catch (error) {
            logger.error(`[PIService] Erro ao criar aluguéis para PI ${piId}: ${error.message}`);
            throw new AppError(`Erro ao criar aluguéis: ${error.message}`, 500);
        }
    }

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
     * [PERÍODO UNIFICADO] Processa período usando PeriodService
     */
    async create(piData, empresaId) {
        logger.info(`[PIService] Criando PI para empresa ${empresaId}`);
        logger.debug(`[PIService] piData recebido: ${JSON.stringify(piData, null, 2)}`);
        logger.debug(`[PIService] Placas recebidas: ${piData.placas?.length || 0} placas - ${JSON.stringify(piData.placas)}`);
        
        // Valida o cliente antes de criar.
        // Note que piData.cliente é o ID.
        await this._validateCliente(piData.cliente, empresaId);

        // [PERÍODO UNIFICADO] Processar período usando PeriodService
        let period;
        try {
            logger.debug('[PIService] Processando período com PeriodService...');
            period = await PeriodService.processPeriodInput(piData);
            
            logger.info(`[PIService] Período processado: Tipo=${period.periodType}`);
            logger.info(`[PIService] Datas: ${PeriodService.formatDate(period.startDate)} - ${PeriodService.formatDate(period.endDate)}`);
            if (period.biWeekIds && period.biWeekIds.length > 0) {
                logger.info(`[PIService] Bi-semanas: ${period.biWeekIds.join(', ')}`);
            }
        } catch (periodError) {
            logger.error(`[PIService] Erro ao processar período: ${periodError.message}`);
            throw periodError; // PeriodService já lança AppError
        }

        // Gera código único de sincronização
        const piCode = this._generatePICode();
        logger.info(`[PIService] Código de sincronização gerado: ${piCode}`);

        const novaPI = new PropostaInterna({
            ...piData,
            empresa: empresaId,
            pi_code: piCode,
            status: 'em_andamento', // Garante o status inicial
            // [PERÍODO UNIFICADO] Novos campos
            periodType: period.periodType,
            startDate: period.startDate,
            endDate: period.endDate,
            biWeekIds: period.biWeekIds,
            biWeeks: period.biWeeks ? period.biWeeks.map(bw => bw._id) : [],
            // [LEGADO] Mantido para compatibilidade
            dataInicio: period.startDate,
            dataFim: period.endDate,
            tipoPeriodo: period.periodType === 'bi-week' ? 'quinzenal' : 'customizado'
        });

        logger.debug(`[PIService] Documento PI antes de salvar: ${JSON.stringify(novaPI.toObject(), null, 2)}`);

        try {
            await novaPI.save();
            
            logger.info(`[PIService] PI salva com sucesso. ID: ${novaPI._id}, Code: ${piCode}, Placas no documento: ${novaPI.placas?.length || 0}`);
            
            // Criar aluguéis automaticamente para as placas
            if (novaPI.placas && novaPI.placas.length > 0) {
                await this._criarAlugueisParaPI(
                    novaPI._id,
                    piCode,
                    novaPI.cliente,
                    novaPI.placas,
                    period, // [PERÍODO UNIFICADO] Passa objeto period completo
                    empresaId
                );
            }
            
            await novaPI.populate([
                { path: 'cliente', select: 'nome email telefone cnpj responsavel segmento' },
                { path: 'placas', select: 'numero_placa nomeDaRua' } // Popula placas no retorno
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
                select: 'numero_placa codigo tipo regiao nomeDaRua tamanho', // Incluído nomeDaRua e tamanho para o PDF
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

        // Whitelist para campos de ordenação.
        const camposOrdenaveis = ['createdAt', 'updatedAt', 'dataInicio', 'dataFim', 'valorTotal', 'status'];
        const campoOrdenacaoFinal = camposOrdenaveis.includes(sortBy) ? sortBy : 'createdAt';

        let query = { empresa: empresaId };
        if (status) query.status = status;
        if (clienteId) query.cliente = clienteId;
        
        try {
            const [pis, totalDocs] = await Promise.all([
                PropostaInterna.find(query)
                    // Selecionamos os campos novos para que o "Editar" funcione
                    .select('cliente tipoPeriodo dataInicio dataFim valorTotal status formaPagamento placas descricao') // Adicionado 'descricao'
                    .populate({
                        path: 'cliente',
                        select: 'nome responsavel segmento' // Dados para o auto-fill do modal
                    })
                    .sort({ [campoOrdenacaoFinal]: sortOrder })
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
     * [PERÍODO UNIFICADO] Processa período se fornecido
     */
    async update(piId, updateData, empresaId) {
        if (updateData.cliente) {
            await this._validateCliente(updateData.cliente, empresaId);
        }

        // Busca a PI atual para comparar as placas
        const piAtual = await PropostaInterna.findOne({ _id: piId, empresa: empresaId }).lean();
        if (!piAtual) {
            throw new AppError('PI não encontrada.', 404);
        }

        const placasAntigas = piAtual.placas?.map(p => p.toString()) || [];
        const placasNovas = updateData.placas?.map(p => p.toString()) || [];

        // [PERÍODO UNIFICADO] Processar período se fornecido
        let period = null;
        const hasPeriodUpdate = updateData.periodType || updateData.startDate || updateData.endDate || 
                                updateData.biWeekIds || updateData.dataInicio || updateData.dataFim;
        
        if (hasPeriodUpdate) {
            try {
                logger.debug('[PIService] Processando novo período com PeriodService...');
                period = await PeriodService.processPeriodInput(updateData);
                
                logger.info(`[PIService] Novo período processado: Tipo=${period.periodType}`);
                logger.info(`[PIService] Datas: ${PeriodService.formatDate(period.startDate)} - ${PeriodService.formatDate(period.endDate)}`);
            } catch (periodError) {
                logger.error(`[PIService] Erro ao processar período: ${periodError.message}`);
                throw periodError;
            }
        }

        // <-- CORREÇÃO CRÍTICA DE SEGURANÇA (MASS ASSIGNMENT) -->
        // Desestruture explicitamente APENAS os campos que podem ser atualizados.
        const {
            cliente,
            tipoPeriodo,
            dataInicio,
            dataFim,
            valorTotal,
            descricao,
            placas,
            formaPagamento
            // Note que 'status' e 'empresa' não estão aqui de propósito.
        } = updateData;

        // Crie um objeto limpo para a atualização
        const dadosParaAtualizar = {
            cliente,
            valorTotal,
            descricao,
            placas,
            formaPagamento
        };

        // [PERÍODO UNIFICADO] Adiciona campos de período se processado
        if (period) {
            dadosParaAtualizar.periodType = period.periodType;
            dadosParaAtualizar.startDate = period.startDate;
            dadosParaAtualizar.endDate = period.endDate;
            dadosParaAtualizar.biWeekIds = period.biWeekIds;
            dadosParaAtualizar.biWeeks = period.biWeeks ? period.biWeeks.map(bw => bw._id) : [];
            // [LEGADO] Compatibilidade
            dadosParaAtualizar.dataInicio = period.startDate;
            dadosParaAtualizar.dataFim = period.endDate;
            dadosParaAtualizar.tipoPeriodo = period.periodType === 'bi-week' ? 'quinzenal' : 'customizado';
        }

        // Remove quaisquer chaves 'undefined'
        Object.keys(dadosParaAtualizar).forEach(key => 
            dadosParaAtualizar[key] === undefined && delete dadosParaAtualizar[key]
        );
        // <-- FIM DA CORREÇÃO DE SEGURANÇA -->

        try {
            const piAtualizada = await PropostaInterna.findOneAndUpdate(
                { _id: piId, empresa: empresaId },
                { $set: dadosParaAtualizar }, // <-- SEGURO
                { new: true, runValidators: true }
            )
            .populate([
                { path: 'cliente', select: 'nome email telefone cnpj responsavel segmento' },
                { path: 'placas', select: 'numero_placa nomeDaRua' } // Popula placas no retorno
            ]);

            if (!piAtualizada) {
                throw new AppError('PI não encontrada.', 404);
            }

            // Extrai o ID do cliente (pode vir populado do banco)
            const clienteId = piAtualizada.cliente?._id || piAtualizada.cliente;

            // Gerenciar aluguéis quando as placas mudam
            if (updateData.placas) {
                const placasRemovidas = placasAntigas.filter(p => !placasNovas.includes(p));
                const placasAdicionadas = placasNovas.filter(p => !placasAntigas.includes(p));

                logger.debug(`[PIService] Update PI: ${placasRemovidas.length} placas removidas, ${placasAdicionadas.length} placas adicionadas`);

                // Remove aluguéis das placas removidas usando pi_code para garantir consistência
                if (placasRemovidas.length > 0) {
                    const deleted = await Aluguel.deleteMany({
                        pi_code: piAtualizada.pi_code,
                        placa: { $in: placasRemovidas }
                    });
                    logger.info(`[PIService] ${deleted.deletedCount} aluguéis removidos (pi_code: ${piAtualizada.pi_code})`);
                }

                // Cria aluguéis para placas adicionadas
                if (placasAdicionadas.length > 0) {
                    // [PERÍODO UNIFICADO] Usa período da PI atualizada
                    const periodParaAlugueis = {
                        periodType: piAtualizada.periodType || 'custom',
                        startDate: piAtualizada.startDate || piAtualizada.dataInicio,
                        endDate: piAtualizada.endDate || piAtualizada.dataFim,
                        biWeekIds: piAtualizada.biWeekIds || piAtualizada.bi_week_ids || [],
                        biWeeks: piAtualizada.biWeeks || []
                    };
                    
                    await this._criarAlugueisParaPI(
                        piId,
                        piAtualizada.pi_code,
                        clienteId,
                        placasAdicionadas,
                        periodParaAlugueis, // [PERÍODO UNIFICADO] Passa objeto period
                        empresaId
                    );
                }
            }

            // [PERÍODO UNIFICADO] Se as datas mudaram, atualiza todos os aluguéis usando pi_code
            if (period) {
                const updated = await Aluguel.updateMany(
                    {
                        pi_code: piAtualizada.pi_code
                    },
                    {
                        $set: {
                            // Novos campos
                            periodType: period.periodType,
                            startDate: period.startDate,
                            endDate: period.endDate,
                            biWeekIds: period.biWeekIds,
                            biWeeks: period.biWeeks ? period.biWeeks.map(bw => bw._id) : [],
                            // Legado
                            data_inicio: period.startDate,
                            data_fim: period.endDate,
                            bi_week_ids: period.biWeekIds,
                            bi_weeks: period.biWeeks ? period.biWeeks.map(bw => bw._id) : []
                        }
                    }
                );
                logger.info(`[PIService] ${updated.modifiedCount} aluguéis atualizados para PI ${piId} (pi_code: ${piAtualizada.pi_code})`);
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
            // Busca a PI antes de deletar para pegar as placas
            const pi = await PropostaInterna.findOne({ _id: piId, empresa: empresaId }).lean();
            
            if (!pi) {
                throw new AppError('PI não encontrada.', 404);
            }

            // Adicionar verificação se a PI está vinculada a um contrato?
            // const contrato = await Contrato.findOne({ pi: piId, empresa: empresaId });
            // if (contrato) {
            //    throw new AppError('Não é possível apagar uma PI que já gerou um contrato.', 400);
            // }
            
            const placas = pi.placas || [];
            
            const result = await PropostaInterna.deleteOne({ _id: piId, empresa: empresaId });
            
            if (result.deletedCount === 0) {
                throw new AppError('PI não encontrada.', 404);
            }

            // Remove todos os aluguéis associados a esta PI usando pi_code para garantir consistência
            const alugueisRemovidos = await Aluguel.deleteMany({
                pi_code: pi.pi_code
            });
            logger.info(`[PIService] PI ${piId} deletada. ${alugueisRemovidos.deletedCount} aluguéis removidos (pi_code: ${pi.pi_code})`);
            
            // NOTA: Não modificamos o campo 'disponivel' das placas ao deletar
            // O campo 'disponivel' é apenas para manutenção manual
            // A disponibilidade real é calculada pela verificação de conflitos de datas
            
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

        } catch (error) {
            logger.error(`[PIService] Erro ao gerar PDF da PI ${piId}: ${error.message}`, { stack: error.stack });
            // Se o erro ocorrer antes do streaming, o errorHandler global pega
            if (error instanceof AppError) throw error;
            throw new AppError(`Erro interno ao gerar PDF: ${error.message}`, 500);
        }
    }
    
    /**
     * [PARA O CRON JOB] Atualiza o status de PIs vencidas
     */
    static async updateVencidas() {
        const hoje = new Date();
        logger.info(`[PIService-Cron] Verificando PIs vencidas... (Data: ${hoje.toISOString()})`);
        
        try {
            // Buscar PIs que venceram
            const pisVencidas = await PropostaInterna.find({
                status: 'em_andamento',
                dataFim: { $lt: hoje }
            }).lean();

            if (pisVencidas.length === 0) {
                return;
            }

            logger.info(`[PIService-Cron] ${pisVencidas.length} PIs vencidas encontradas.`);

            // Atualizar status para 'vencida'
            const result = await PropostaInterna.updateMany(
                { 
                    status: 'em_andamento', 
                    dataFim: { $lt: hoje }
                },
                { $set: { status: 'vencida' } }
            );

            logger.info(`[PIService-Cron] ${result.modifiedCount} PIs foram atualizadas para 'vencida'.`);
        } catch (error) {
             logger.error(`[PIService-Cron] Erro ao atualizar status de PIs vencidas: ${error.message}`, { stack: error.stack });
        }
    }
}

module.exports = PIService;