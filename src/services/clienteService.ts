// @ts-nocheck
// src/services/clienteService.ts
import Cliente from '../models/Cliente';
import Aluguel from '../models/Aluguel';
import logger from '../config/logger';
import path from 'path';
import { deleteFileFromR2 } from '../middlewares/uploadMiddleware';
import AppError from '../utils/AppError';

interface ClienteData {
    nome: string;
    email?: string;
    telefone?: string;
    cnpj?: string | null;
    responsavel?: string;
    segmento?: string;
    logo_url?: string;
}

interface PaginationParams {
    page?: number;
    limit?: number;
}

interface PaginatedResult {
    data: any[];
    pagination: {
        totalDocs: number;
        totalPages: number;
        currentPage: number;
        limit: number;
    };
}

const createCliente = async (clienteData: ClienteData, file: any, empresa: string) => {
    logger.info(`[ClienteService] Tentando criar cliente para empresa ${empresaId}.`);
    
    if (!clienteData.nome) {
        throw new AppError('O nome do cliente é obrigatório.', 400);
    }

    const dadosParaSalvar: any = { ...clienteData, empresa: empresaId };

    if (file) {
        logger.info(`[ClienteService] Ficheiro recebido (logo): ${file.key}`);
        dadosParaSalvar.logo_url = path.basename(file.key);
    } else {
        delete dadosParaSalvar.logo_url;
    }

    if (dadosParaSalvar.cnpj !== undefined && dadosParaSalvar.cnpj !== null && String(dadosParaSalvar.cnpj).trim() === '') {
        dadosParaSalvar.cnpj = null;
    }

    const novoCliente = new Cliente(dadosParaSalvar);

    try {
        logger.debug(`[ClienteService] Tentando salvar novo cliente ${dadosParaSalvar.nome} no DB.`);
        await novoCliente.save();
        logger.info(`[ClienteService] Cliente ${novoCliente.nome} (ID: ${novoCliente._id}) criado com sucesso para empresa ${empresaId}.`);

        return novoCliente.toJSON();
    } catch (error: any) {
        logger.error(`[ClienteService] Erro Mongoose/DB ao criar cliente: ${error.message}`, { stack: error.stack, code: error.code, keyValue: error.keyValue });

        if (error.code === 11000 && error.keyPattern && error.keyPattern.cnpj === 1) {
            throw new AppError(`Já existe um cliente com este CNPJ (${error.keyValue.cnpj}) na sua empresa.`, 409);
        }
        
        if (error instanceof AppError) throw error; 
        throw new AppError(`Erro interno ao criar cliente: ${error.message}`, 500);
    }
};

const updateCliente = async (id: string, clienteData: ClienteData, file: any, empresa: string) => {
    logger.info(`[ClienteService] Tentando atualizar cliente ID ${id} para empresa ${empresaId}.`);

    let clienteAntigo: any;
    try {
        logger.debug(`[ClienteService] Buscando cliente antigo ID ${id} para verificação.`);
        clienteAntigo = await Cliente.findOne({ _id: id, empresa: empresaId });
        if (!clienteAntigo) {
            throw new AppError('Cliente não encontrado.', 404);
        }
        logger.debug(`[ClienteService] Cliente antigo ${clienteAntigo.nome} (ID: ${id}) encontrado.`);
    } catch (error: any) {
        if (error instanceof AppError) throw error; 
        logger.error(`[ClienteService] Erro Mongoose/DB ao buscar cliente antigo ID ${id}: ${error.message}`, { stack: error.stack });
        throw new AppError(`Erro interno ao buscar cliente para atualização: ${error.message}`, 500);
    }

    const dadosParaAtualizar: any = { ...clienteData };
    let logoAntigoKeyCompleta: string | null = null;

    if (file) {
        logoAntigoKeyCompleta = clienteAntigo.logo_url ? `${process.env.R2_FOLDER_NAME || 'inmidia-uploads-sistema'}/${clienteAntigo.logo_url}` : null;
        dadosParaAtualizar.logo_url = path.basename(file.key);
    } else if (dadosParaAtualizar.hasOwnProperty('logo_url') && dadosParaAtualizar.logo_url === '') {
        logoAntigoKeyCompleta = clienteAntigo.logo_url ? `${process.env.R2_FOLDER_NAME || 'inmidia-uploads-sistema'}/${clienteAntigo.logo_url}` : null;
        dadosParaAtualizar.logo_url = null;
    } else {
        delete dadosParaAtualizar.logo_url;
    }

    if (dadosParaAtualizar.cnpj !== undefined && dadosParaAtualizar.cnpj !== null && String(dadosParaAtualizar.cnpj).trim() === '') {
        dadosParaAtualizar.cnpj = null;
    }

    try {
        const clienteAtualizadoDoc = await Cliente.findByIdAndUpdate(id, dadosParaAtualizar, { new: true, runValidators: true });

        if (!clienteAtualizadoDoc) {
            throw new AppError('Cliente não encontrado durante a atualização.', 404);
        }
        logger.info(`[ClienteService] Cliente ID ${id} atualizado com sucesso no DB.`);

        if (logoAntigoKeyCompleta && (!file || logoAntigoKeyCompleta !== file.key)) {
            try {
                await deleteFileFromR2(logoAntigoKeyCompleta);
                logger.info(`[ClienteService] Logo antigo ${logoAntigoKeyCompleta} excluído com sucesso do R2.`);
            } catch (deleteError: any) {
                logger.error(`[ClienteService] Falha NÃO CRÍTICA ao excluir logo antigo ${logoAntigoKeyCompleta} do R2:`, deleteError);
            }
        }

        return clienteAtualizadoDoc.toJSON();

    } catch (error: any) {
        logger.error(`[ClienteService] Erro Mongoose/DB ao atualizar cliente ID ${id}: ${error.message}`, { stack: error.stack, code: error.code, keyValue: error.keyValue });

        if (error.code === 11000 && error.keyPattern && error.keyPattern.cnpj === 1) {
            throw new AppError(`Já existe outro cliente com este CNPJ (${error.keyValue.cnpj}) na sua empresa.`, 409);
        }
        
        if (error instanceof AppError) throw error;
        throw new AppError(`Erro interno ao atualizar cliente: ${error.message}`, 500);
    }
};

const getAllClientes = async (empresaId: string, queryParams: PaginationParams): Promise<PaginatedResult> => {
    logger.info(`[ClienteService] Buscando todos os clientes para empresa ${empresaId}.`);
    
    const { page = 1, limit = 1000 } = queryParams;
    const pageInt = parseInt(String(page), 10);
    const limitInt = parseInt(String(limit), 10);
    const skip = (pageInt - 1) * limitInt;
    
    try {
        const query = { empresa: empresaId };

        const [clientes, totalDocs] = await Promise.all([
            Cliente.find(query)
                .select('nome email telefone cnpj responsavel segmento logo_url')
                .sort({ nome: 1 })
                .skip(skip)
                .limit(limitInt)
                .lean() 
                .exec(),
            Cliente.countDocuments(query)
        ]);

        logger.info(`[ClienteService] Encontrados ${clientes.length} clientes (Total: ${totalDocs}) para empresa ${empresaId}.`);

        const totalPages = Math.ceil(totalDocs / limitInt);
        const pagination = { totalDocs, totalPages, currentPage: pageInt, limit: limitInt };

        return { data: clientes, pagination };

    } catch (error: any) {
        logger.error(`[ClienteService] Erro Mongoose/DB ao buscar todos os clientes: ${error.message}`, { stack: error.stack });
        throw new AppError(`Erro interno ao buscar clientes: ${error.message}`, 500);
    }
};

const getClienteById = async (id: string, empresa: string) => {
    logger.info(`[ClienteService] Buscando cliente ID ${id} para empresa ${empresaId}.`);
    try {
        const cliente = await Cliente.findOne({ _id: id, empresa: empresaId })
                                      .lean()
                                      .exec();

        if (!cliente) {
            throw new AppError('Cliente não encontrado.', 404);
        }
        
        logger.info(`[ClienteService] Cliente ${cliente.nome} (ID: ${id}) encontrado.`);
        return cliente;
    } catch (error: any) {
        logger.error(`[ClienteService] Erro Mongoose/DB ao buscar cliente por ID ${id}: ${error.message}`, { stack: error.stack });
        if (error instanceof AppError) throw error;
        throw new AppError(`Erro interno ao buscar cliente: ${error.message}`, 500);
    }
};

const deleteCliente = async (id: string, empresa: string) => {
    logger.info(`[ClienteService] Tentando apagar cliente ID ${id} para empresa ${empresaId}.`);

    try {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const aluguelExistente = await Aluguel.findOne({
            cliente: id,
            empresa: empresaId,
            data_fim: { $gte: hoje }
        }).lean();

        if (aluguelExistente) {
            throw new AppError('Não é possível apagar um cliente com alugueis ativos ou agendados.', 409);
        }
        
        const clienteApagado = await Cliente.findOneAndDelete({ _id: id, empresa: empresaId });

        if (!clienteApagado) {
            throw new AppError('Cliente não encontrado.', 404);
        }
        logger.info(`[ClienteService] Cliente ${clienteApagado.nome} (ID: ${id}) apagado com sucesso do DB.`);

        if (clienteApagado.logo_url) {
            const logoKeyCompleta = `${process.env.R2_FOLDER_NAME || 'inmidia-uploads-sistema'}/${clienteApagado.logo_url}`;
            try {
                await deleteFileFromR2(logoKeyCompleta);
                logger.info(`[ClienteService] Logo ${logoKeyCompleta} excluído com sucesso do R2.`);
            } catch (deleteError: any) {
                logger.error(`[ClienteService] Falha NÃO CRÍTICA ao excluir logo ${logoKeyCompleta} do R2 para cliente apagado ID ${id}:`, deleteError);
            }
        }

    } catch (error: any) {
        logger.error(`[ClienteService] Erro Mongoose/DB ao apagar cliente ID ${id}: ${error.message}`, { stack: error.stack, code: error.code });
        if (error instanceof AppError) throw error;
        throw new AppError(`Erro interno ao apagar cliente: ${error.message}`, 500);
    }
};

export {
    createCliente,
    updateCliente,
    getAllClientes,
    getClienteById,
    deleteCliente
};



