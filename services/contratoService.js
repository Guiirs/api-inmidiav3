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
            return novoContrato.toJSON();

        } catch (error) {
            logger.error(`[ContratoService] Erro ao criar contrato: ${error.message}`, { stack: error.stack });
            if (error instanceof AppError) throw error;
            throw new AppError(`Erro interno ao criar contrato: ${error.message}`, 500);
        }
    }

    /**
     * Gera e envia o PDF do Contrato
     */
    async generatePDF(contratoId, empresaId, res) {
        logger.debug(`[ContratoService] Gerando PDF para Contrato ${contratoId}. Buscando dados...`);
        try {
            // 1. Busca o contrato e popula todos os dados necessários
            const contrato = await Contrato.findOne({ _id: contratoId, empresa: empresaId })
                .populate({
                    path: 'pi', // Popula a PI
                    populate: {
                        path: 'cliente' // Popula o Cliente DENTRO da PI
                    }
                })
                // --- ALTERAÇÃO AQUI ---
                // Removemos o select 'nome cnpj' para buscar TODOS os dados da empresa
                // (incluindo endereço, bairro, cidade, telefone)
                .populate('empresa'); 
                // ------------------------

            if (!contrato) {
                throw new AppError('Contrato não encontrado.', 404);
            }
            if (!contrato.pi) {
                 throw new AppError('PI associada ao contrato não encontrada.', 404);
            }
             if (!contrato.pi.cliente) {
                 throw new AppError('Cliente associado ao contrato não encontrado.', 404);
            }

            // 2. Chamar o serviço de PDF
            // 'contrato.empresa' agora contém todos os dados (nome, cnpj, endereco, etc.)
            pdfService.generateContrato_PDF(res, contrato.toJSON(), contrato.pi.toJSON(), contrato.pi.cliente.toJSON(), contrato.empresa.toJSON());

        } catch (error) {
            logger.error(`[ContratoService] Erro ao gerar PDF do Contrato ${contratoId}: ${error.message}`, { stack: error.stack });
            if (error instanceof AppError) throw error;
            throw new AppError(`Erro interno ao gerar PDF: ${error.message}`, 500);
        }
    }
}

module.exports = ContratoService;