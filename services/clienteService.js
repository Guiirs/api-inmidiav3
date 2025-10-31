// services/clienteService.js

const Cliente = require('../models/Cliente');
const Aluguel = require('../models/Aluguel'); 
const logger = require('../config/logger');
const path = require('path');
const { deleteFileFromR2 } = require('../middlewares/uploadMiddleware'); 
const AppError = require('../utils/AppError'); // [MELHORIA] Importa AppError

/**
 * Cria um novo cliente para uma empresa.
 * @param {object} clienteData - Dados do cliente (nome, cnpj?, telefone?).
 * (Nota: clienteData agora também pode conter responsavel, segmento, etc.)
 * @param {object} file - Ficheiro de logo (opcional, do Multer/S3).
 * @param {string} empresaId - ObjectId da empresa proprietária.
 * @returns {Promise<object>} - O novo cliente criado (objeto simples com 'id').
 * @throws {AppError} - Lança erro com status 400, 409 ou 500.
 */
const createCliente = async (clienteData, file, empresaId) => {
    logger.info(`[ClienteService] Tentando criar cliente para empresa ${empresaId}.`);
    
    if (!clienteData.nome) {
        // [MELHORIA] Usa AppError
        throw new AppError('O nome do cliente é obrigatório.', 400);
    }

    // 'dadosParaSalvar' incluirá automaticamente os novos campos (responsavel, segmento)
    const dadosParaSalvar = { ...clienteData, empresa: empresaId };

    if (file) {
        logger.info(`[ClienteService] Ficheiro recebido (logo): ${file.key}`);
        dadosParaSalvar.logo_url = path.basename(file.key);
    } else {
        delete dadosParaSalvar.logo_url;
    }

    // Limpa CNPJ se vazio para evitar problemas com índice sparse unique
    if (dadosParaSalvar.cnpj !== undefined && dadosParaSalvar.cnpj !== null && String(dadosParaSalvar.cnpj).trim() === '') {
        dadosParaSalvar.cnpj = null;
    }

    const novoCliente = new Cliente(dadosParaSalvar);

    try {
        logger.debug(`[ClienteService] Tentando salvar novo cliente ${dadosParaSalvar.nome} no DB.`);
        await novoCliente.save();
        logger.info(`[ClienteService] Cliente ${novoCliente.nome} (ID: ${novoCliente._id}) criado com sucesso para empresa ${empresaId}.`);

        // Usa toJSON() para aplicar a transformação global (_id -> id)
        return novoCliente.toJSON();
    } catch (error) {
        logger.error(`[ClienteService] Erro Mongoose/DB ao criar cliente: ${error.message}`, { stack: error.stack, code: error.code, keyValue: error.keyValue });

        // Trata erro de CNPJ duplicado
        if (error.code === 11000 && error.keyPattern && error.keyPattern.cnpj === 1) {
            // [MELHORIA] Usa AppError
            throw new AppError(`Já existe um cliente com este CNPJ (${error.keyValue.cnpj}) na sua empresa.`, 409);
        }
        
        // [MELHORIA] Relança AppErrors ou lança 500
        if (error instanceof AppError) throw error; 
        throw new AppError(`Erro interno ao criar cliente: ${error.message}`, 500);
    }
};

/**
 * Atualiza um cliente existente.
 * @param {string} id - ObjectId do cliente a atualizar.
 * @param {object} clienteData - Novos dados do cliente (nome?, cnpj?, telefone?, responsavel?, segmento?).
 * @param {object} file - Novo ficheiro de logo (opcional).
 * @param {string} empresaId - ObjectId da empresa proprietária.
 * @returns {Promise<object>} - O cliente atualizado (objeto simples com 'id').
 * @throws {AppError} - Lança erro com status 404, 409 ou 500.
 */
const updateCliente = async (id, clienteData, file, empresaId) => {
    logger.info(`[ClienteService] Tentando atualizar cliente ID ${id} para empresa ${empresaId}.`);

    let clienteAntigo;
    try {
        // Busca o cliente existente para verificar propriedade e logo antigo
        logger.debug(`[ClienteService] Buscando cliente antigo ID ${id} para verificação.`);
        clienteAntigo = await Cliente.findOne({ _id: id, empresa: empresaId });
        if (!clienteAntigo) {
            // [MELHORIA] Usa AppError
            throw new AppError('Cliente não encontrado.', 404);
        }
        logger.debug(`[ClienteService] Cliente antigo ${clienteAntigo.nome} (ID: ${id}) encontrado.`);
    } catch (error) {
        // [MELHORIA] Se for um AppError (404, etc.), relança.
        if (error instanceof AppError) throw error; 
        
        // Trata erros de busca como 500
        logger.error(`[ClienteService] Erro Mongoose/DB ao buscar cliente antigo ID ${id}: ${error.message}`, { stack: error.stack });
        throw new AppError(`Erro interno ao buscar cliente para atualização: ${error.message}`, 500);
    }

    // 'dadosParaAtualizar' incluirá automaticamente os novos campos (responsavel, segmento)
    const dadosParaAtualizar = { ...clienteData };
    let logoAntigoKeyCompleta = null; 

    // Lógica para tratar o logo (mantida)
    if (file) {
        logoAntigoKeyCompleta = clienteAntigo.logo_url ? `${process.env.R2_FOLDER_NAME || 'inmidia-uploads-sistema'}/${clienteAntigo.logo_url}` : null;
        dadosParaAtualizar.logo_url = path.basename(file.key);
    } else if (dadosParaAtualizar.hasOwnProperty('logo_url') && dadosParaAtualizar.logo_url === '') {
        logoAntigoKeyCompleta = clienteAntigo.logo_url ? `${process.env.R2_FOLDER_NAME || 'inmidia-uploads-sistema'}/${clienteAntigo.logo_url}` : null;
        dadosParaAtualizar.logo_url = null; 
    } else {
        delete dadosParaAtualizar.logo_url; 
    }

    // Limpa CNPJ se vazio (mantido)
     if (dadosParaAtualizar.cnpj !== undefined && dadosParaAtualizar.cnpj !== null && String(dadosParaAtualizar.cnpj).trim() === '') {
        dadosParaAtualizar.cnpj = null;
    }

    try {
        // Atualiza o cliente na base de dados
        const clienteAtualizadoDoc = await Cliente.findByIdAndUpdate(id, dadosParaAtualizar, { new: true, runValidators: true });

        if (!clienteAtualizadoDoc) {
             // [MELHORIA] Usa AppError
             throw new AppError('Cliente não encontrado durante a atualização.', 404);
        }
        logger.info(`[ClienteService] Cliente ID ${id} atualizado com sucesso no DB.`);

        // Se uma nova imagem foi carregada OU a existente foi removida, tenta apagar a antiga do R2
        if (logoAntigoKeyCompleta && (!file || logoAntigoKeyCompleta !== file.key)) {
            try {
                await deleteFileFromR2(logoAntigoKeyCompleta);
                logger.info(`[ClienteService] Logo antigo ${logoAntigoKeyCompleta} excluído com sucesso do R2.`);
            } catch (deleteError) {
                logger.error(`[ClienteService] Falha NÃO CRÍTICA ao excluir logo antigo ${logoAntigoKeyCompleta} do R2:`, deleteError);
            }
        }

        // Usa toJSON() para aplicar a transformação global (_id -> id)
        return clienteAtualizadoDoc.toJSON();

    } catch (error) {
        logger.error(`[ClienteService] Erro Mongoose/DB ao atualizar cliente ID ${id}: ${error.message}`, { stack: error.stack, code: error.code, keyValue: error.keyValue });

        // Trata erro de CNPJ duplicado
        if (error.code === 11000 && error.keyPattern && error.keyPattern.cnpj === 1) {
            // [MELHORIA] Usa AppError
            throw new AppError(`Já existe outro cliente com este CNPJ (${error.keyValue.cnpj}) na sua empresa.`, 409);
        }
        
        // [MELHORIA] Relança AppErrors (400/404/409) ou lança 500
        if (error instanceof AppError) throw error;
        throw new AppError(`Erro interno ao atualizar cliente: ${error.message}`, 500);
    }
};

/**
 * Busca todos os clientes de uma empresa.
 * @param {string} empresaId - ObjectId da empresa.
 * @returns {Promise<Array<object>>} - Array de clientes (objetos simples com 'id').
 * @throws {AppError} - Lança erro com status 500 em caso de falha na DB.
 */
const getAllClientes = async (empresaId) => {
    logger.info(`[ClienteService] Buscando todos os clientes para empresa ${empresaId}.`);
    try {
        // --- ALTERAÇÃO APLICADA (Etapa 3 do Plano) ---
        // Adicionamos .select() para garantir que o frontend (PIModalForm)
        // receba os campos 'responsavel' e 'segmento'.
        // Também incluímos os campos que a tabela ClientesPage usa.
        const clientes = await Cliente.find({ empresa: empresaId })
            .select('nome email telefone cnpj responsavel segmento logo_url')
            .sort({ nome: 1 })
            .lean() 
            .exec();
        // ------------------------------------------

        logger.info(`[ClienteService] Encontrados ${clientes.length} clientes para empresa ${empresaId}.`);

        // [MELHORIA] Removido mapeamento manual redundante.

        return clientes;
    } catch (error) {
        logger.error(`[ClienteService] Erro Mongoose/DB ao buscar todos os clientes: ${error.message}`, { stack: error.stack });
        // [MELHORIA] Usa AppError
        throw new AppError(`Erro interno ao buscar clientes: ${error.message}`, 500);
    }
};

/**
 * Busca um cliente específico pelo ID, garantindo que pertence à empresa.
 * @param {string} id - ObjectId do cliente.
 * @param {string} empresaId - ObjectId da empresa proprietária.
 * @returns {Promise<object>} - O cliente encontrado (objeto simples com 'id').
 * @throws {AppError} - Lança erro com status 404 ou 500.
 */
const getClienteById = async (id, empresaId) => {
    logger.info(`[ClienteService] Buscando cliente ID ${id} para empresa ${empresaId}.`);
    try {
        // [MELHORIA] A busca por ID deve popular todos os dados,
        // mas como estamos usando .lean(), vamos selecionar tudo por agora.
        // Se precisarmos de dados do PDF aqui, teríamos que popular
        const cliente = await Cliente.findOne({ _id: id, empresa: empresaId })
                                      .lean()
                                      .exec();

        if (!cliente) {
            // [MELHORIA] Usa AppError
            throw new AppError('Cliente não encontrado.', 404);
        }

        // [MELHORIA] Removido mapeamento manual redundante.

        logger.info(`[ClienteService] Cliente ${cliente.nome} (ID: ${id}) encontrado.`);
        return cliente;
    } catch (error) {
        logger.error(`[ClienteService] Erro Mongoose/DB ao buscar cliente por ID ${id}: ${error.message}`, { stack: error.stack });
        // [MELHORIA] Relança AppErrors (404) ou lança 500
        if (error instanceof AppError) throw error;
        throw new AppError(`Erro interno ao buscar cliente: ${error.message}`, 500);
    }
};

/**
 * Apaga um cliente, verificando se não possui alugueis ativos ou futuros.
 * @param {string} id - ObjectId do cliente a apagar.
 * @param {string} empresaId - ObjectId da empresa proprietária.
 * @returns {Promise<void>}
 * @throws {AppError} - Lança erro com status 409, 404 ou 500.
 */
const deleteCliente = async (id, empresaId) => {
    logger.info(`[ClienteService] Tentando apagar cliente ID ${id} para empresa ${empresaId}.`);

    try {
        // Verifica se o cliente possui alugueis ativos ou futuros (lógica mantida)
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const aluguelExistente = await Aluguel.findOne({
            cliente: id,
            empresa: empresaId,
            data_fim: { $gte: hoje }
        }).lean();

        if (aluguelExistente) {
            // [MELHORIA] Usa AppError
            throw new AppError('Não é possível apagar um cliente com alugueis ativos ou agendados.', 409); 
        }
        
        // --- NOTA ---
        // Se 'Aluguel' for substituído por 'PropostaInterna', a lógica acima deve mudar.
        // Por agora, mantemos a verificação de 'Aluguel'
        // ----------------

        // Encontra e apaga o cliente para obter o logo_url antes de apagar
        const clienteApagado = await Cliente.findOneAndDelete({ _id: id, empresa: empresaId });

        if (!clienteApagado) {
            // [MELHORIA] Usa AppError
            throw new AppError('Cliente não encontrado.', 404);
        }
        logger.info(`[ClienteService] Cliente ${clienteApagado.nome} (ID: ${id}) apagado com sucesso do DB.`);

        // Se o cliente tinha logo, tenta apagar do R2 (lógica mantida)
        if (clienteApagado.logo_url) {
            const logoKeyCompleta = `${process.env.R2_FOLDER_NAME || 'inmidia-uploads-sistema'}/${clienteApagado.logo_url}`;
            try {
                await deleteFileFromR2(logoKeyCompleta);
                logger.info(`[ClienteService] Logo ${logoKeyCompleta} excluído com sucesso do R2.`);
            } catch (deleteError) {
                logger.error(`[ClienteService] Falha NÃO CRÍTICA ao excluir logo ${logoKeyCompleta} do R2 para cliente apagado ID ${id}:`, deleteError);
            }
        }

    } catch (error) {
        logger.error(`[ClienteService] Erro Mongoose/DB ao apagar cliente ID ${id}: ${error.message}`, { stack: error.stack, code: error.code });
        // [MELHORIA] Relança AppErrors (409, 404) ou lança 500
        if (error instanceof AppError) throw error;
        throw new AppError(`Erro interno ao apagar cliente: ${error.message}`, 500);
    }
};


// --- ALTERAÇÃO AQUI (Refatoração) ---
// Exporta todas as funções num único objeto no final do ficheiro
module.exports = {
    createCliente,
    updateCliente,
    getAllClientes,
    getClienteById,
    deleteCliente
};