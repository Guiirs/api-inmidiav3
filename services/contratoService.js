// services/contratoService.js
const Contrato = require('../models/Contrato');
const PropostaInterna = require('../models/PropostaInterna');
const Empresa = require('../models/Empresa');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');
const pdfService = require('./pdfService'); // Importa o novo serviço de PDF

class ContratoService {

    /**
     * Cria um Contrato a partir de uma PI
     */
    async create(piId, empresaId) {
        logger.info(`[ContratoService] Tentando criar contrato a partir da PI ${piId}`);
        
        try {
            // 1. Verifica se a PI existe e pertence à empresa
            const pi = await PropostaInterna.findOne({ _id: piId, empresa: empresaId }).lean();
            if (!pi) {
                throw new AppError('Proposta Interna (PI) não encontrada.', 404);
            }

            // 2. Verifica se já existe um contrato para esta PI
            const existe = await Contrato.findOne({ pi: piId, empresa: empresaId }).lean();
            if (existe) {
                throw new AppError('Um contrato para esta PI já foi gerado.', 409);
            }

            // 3. Cria o contrato
            const novoContrato = new Contrato({
                pi: pi._id,
                empresa: empresaId,
                cliente: pi.cliente,
                status: 'rascunho'
            });

            await novoContrato.save();
            
            // Popula os dados para o retorno
            await novoContrato.populate([
                { path: 'cliente', select: 'nome' },
                { path: 'pi', select: 'valorTotal dataInicio dataFim' }
            ]);

            return novoContrato.toJSON();

        } catch (error) {
            logger.error(`[ContratoService] Erro ao criar contrato: ${error.message}`, { stack: error.stack });
            if (error instanceof AppError) throw error;
            // Trata o erro de 'unique' do Mongoose de forma amigável
            if (error.code === 11000) {
                 throw new AppError('Um contrato para esta PI já foi gerado (Erro 11000).', 409);
            }
            throw new AppError(`Erro interno ao criar contrato: ${error.message}`, 500);
        }
    }

    // --- NOVO MÉTODO (CRUD - LISTAR) ---
    /**
     * Lista todos os Contratos (com paginação e filtros)
     */
    async getAll(empresaId, queryParams) {
        const { page = 1, limit = 10, sortBy = 'createdAt', order = 'desc', status, clienteId } = queryParams;

        const pageInt = parseInt(page, 10);
        const limitInt = parseInt(limit, 10);
        const skip = (pageInt - 1) * limitInt;
        const sortOrder = order === 'desc' ? -1 : 1;

        // Whitelist de campos ordenáveis
        const camposOrdenaveis = ['createdAt', 'updatedAt', 'status'];
        const campoOrdenacaoFinal = camposOrdenaveis.includes(sortBy) ? sortBy : 'createdAt';

        let query = { empresa: empresaId };
        if (status) query.status = status;
        if (clienteId) query.cliente = clienteId;
        
        try {
            const [contratos, totalDocs] = await Promise.all([
                Contrato.find(query)
                    // População seletiva: Traz apenas o necessário para a tabela
                    .populate('cliente', 'nome') 
                    .populate('pi', 'valorTotal dataInicio dataFim')
                    .sort({ [campoOrdenacaoFinal]: sortOrder })
                    .skip(skip)
                    .limit(limitInt)
                    .lean(),
                Contrato.countDocuments(query)
            ]);

            const totalPages = Math.ceil(totalDocs / limitInt);
            const pagination = { totalDocs, totalPages, currentPage: pageInt, limit: limitInt };

            return { data: contratos, pagination };
        } catch (error) {
            logger.error(`[ContratoService] Erro ao listar Contratos: ${error.message}`, { stack: error.stack });
            throw new AppError(`Erro interno ao listar contratos: ${error.message}`, 500);
        }
    }

    // --- NOVO MÉTODO (CRUD - BUSCAR) ---
    /**
     * Busca um Contrato pelo ID (com todos os dados populados)
     */
    async getById(contratoId, empresaId) {
        // Não usamos .lean() aqui para que o .toJSON() funcione no generatePDF
        const contrato = await Contrato.findOne({ _id: contratoId, empresa: empresaId })
            .populate('empresa') // Popula dados da empresa (para PDF)
            .populate({
                path: 'pi', // Popula a PI completa
                populate: {
                    path: 'cliente' // Popula o Cliente DENTRO da PI (para PDF)
                }
            });
            
        if (!contrato) {
            throw new AppError('Contrato não encontrado.', 404);
        }
        
        // Validação extra (caso o populate falhe)
        if (!contrato.pi || !contrato.cliente || !contrato.empresa) {
             throw new AppError('Dados associados ao contrato (PI, Cliente ou Empresa) não foram encontrados.', 404);
        }
        
        return contrato;
    }

    // --- NOVO MÉTODO (CRUD - ATUALIZAR) ---
    /**
     * Atualiza um Contrato (principalmente o status)
     */
    async update(contratoId, updateData, empresaId) {
        
        // --- CORREÇÃO DE SEGURANÇA (MASS ASSIGNMENT) ---
        // Desestruturamos APENAS os campos que o usuário PODE mudar.
        // O único campo mutável de um contrato, após criado, é o status.
        const { status } = updateData;

        const dadosParaAtualizar = { status };

        // Remove campos 'undefined'
        Object.keys(dadosParaAtualizar).forEach(key => 
            dadosParaAtualizar[key] === undefined && delete dadosParaAtualizar[key]
        );
        
        // Se nenhum dado válido foi enviado, não faz nada.
        if (Object.keys(dadosParaAtualizar).length === 0) {
             throw new AppError('Nenhum dado válido para atualização fornecido.', 400);
        }
        // --- FIM DA CORREÇÃO DE SEGURANÇA ---

        try {
            const contratoAtualizado = await Contrato.findOneAndUpdate(
                { _id: contratoId, empresa: empresaId },
                { $set: dadosParaAtualizar },
                { new: true, runValidators: true } // 'runValidators' valida o ENUM do status
            )
            .populate('cliente', 'nome') 
            .populate('pi', 'valorTotal dataInicio dataFim'); // Popula para o retorno

            if (!contratoAtualizado) {
                throw new AppError('Contrato não encontrado.', 404);
            }
            return contratoAtualizado.toJSON();

        } catch (error) {
            logger.error(`[ContratoService] Erro ao atualizar contrato ${contratoId}: ${error.message}`, { stack: error.stack });
            if (error instanceof AppError) throw error;
            throw new AppError(`Erro interno ao atualizar contrato: ${error.message}`, 500);
        }
    }
    
    // --- NOVO MÉTODO (CRUD - DELETAR) ---
    /**
     * Deleta um Contrato (se estiver em 'rascunho')
     */
    async delete(contratoId, empresaId) {
        try {
            // Regra de Negócio: Só permite deletar contratos em 'rascunho'
            const contrato = await Contrato.findOne({ _id: contratoId, empresa: empresaId }).lean();
            if (!contrato) {
                 throw new AppError('Contrato não encontrado.', 404);
            }
            if (contrato.status !== 'rascunho') {
                throw new AppError('Não é possível deletar um contrato que já está ativo, concluído ou cancelado.', 400);
            }

            // Deleta o contrato
            await Contrato.deleteOne({ _id: contratoId, empresa: empresaId });

        } catch (error) {
            logger.error(`[ContratoService] Erro ao deletar contrato ${contratoId}: ${error.message}`, { stack: error.stack });
            if (error instanceof AppError) throw error;
            throw new AppError(`Erro interno ao deletar contrato: ${error.message}`, 500);
        }
    }


    /**
     * Gera e envia o PDF do Contrato
     * (Refatorado para usar o novo método getById)
     */
    async generatePDF(contratoId, empresaId, res) {
        logger.debug(`[ContratoService] Gerando PDF para Contrato ${contratoId}. Buscando dados...`);
        try {
            // 1. Busca o contrato e todos os dados populados usando o novo método
            const contrato = await this.getById(contratoId, empresaId); 
            
            // As checagens de 'contrato', 'pi', 'cliente' já são feitas dentro do getById.

            // 2. Chamar o serviço de PDF
            // Usamos .toJSON() pois getById retorna um documento Mongoose completo
            pdfService.generateContrato_PDF(res, contrato.toJSON(), contrato.pi.toJSON(), contrato.pi.cliente.toJSON(), contrato.empresa.toJSON());

        } catch (error) {
            logger.error(`[ContratoService] Erro ao gerar PDF do Contrato ${contratoId}: ${error.message}`, { stack: error.stack });
            if (error instanceof AppError) throw error;
            throw new AppError(`Erro interno ao gerar PDF: ${error.message}`, 500);
        }
    }
}

module.exports = ContratoService;