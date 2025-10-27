// services/clienteService.js

const Cliente = require('../models/Cliente');
const Aluguel = require('../models/Aluguel'); // Necessário para verificar alugueis
const logger = require('../config/logger');
const path = require('path');
const { deleteFileFromR2 } = require('../middlewares/uploadMiddleware'); // Função para apagar ficheiro do R2

/**
 * Cria um novo cliente para uma empresa.
 * @param {object} clienteData - Dados do cliente (nome, cnpj?, telefone?).
 * @param {object} file - Ficheiro de logo (opcional, do Multer/S3).
 * @param {string} empresaId - ObjectId da empresa proprietária.
 * @returns {Promise<object>} - O novo cliente criado (documento Mongoose com 'id').
 * @throws {Error} - Lança erro com status 400, 409 ou 500.
 */
exports.createCliente = async (clienteData, file, empresaId) => {
    logger.info(`[ClienteService] Tentando criar cliente para empresa ${empresaId}.`);
    logger.debug(`[ClienteService] Dados recebidos: ${JSON.stringify(clienteData)}`);

    if (!clienteData.nome) {
        const error = new Error('O nome do cliente é obrigatório.');
        error.status = 400;
        logger.warn(`[ClienteService] Falha ao criar cliente: ${error.message}`);
        throw error;
    }

    const dadosParaSalvar = { ...clienteData, empresa: empresaId };

    if (file) {
        logger.info(`[ClienteService] Ficheiro recebido (logo): ${file.key}`);
        dadosParaSalvar.logo_url = path.basename(file.key);
        logger.debug(`[ClienteService] Nome do ficheiro (logo) extraído para guardar: ${dadosParaSalvar.logo_url}`);
    } else {
        delete dadosParaSalvar.logo_url;
    }

    if (dadosParaSalvar.cnpj !== undefined && dadosParaSalvar.cnpj !== null && String(dadosParaSalvar.cnpj).trim() === '') {
        logger.debug(`[ClienteService] CNPJ vazio recebido, definindo como null.`);
        dadosParaSalvar.cnpj = null;
    }

    const novoCliente = new Cliente(dadosParaSalvar);

    try {
        logger.debug(`[ClienteService] Tentando salvar novo cliente ${dadosParaSalvar.nome} no DB.`);
        await novoCliente.save();
        logger.info(`[ClienteService] Cliente ${novoCliente.nome} (ID: ${novoCliente._id}) criado com sucesso para empresa ${empresaId}.`);
        
        // <<< CORREÇÃO: Converte para objeto simples E mapeia _id -> id >>>
        const clienteParaRetornar = novoCliente.toJSON ? novoCliente.toJSON() : { ...novoCliente._doc };
        clienteParaRetornar.id = clienteParaRetornar._id ? clienteParaRetornar._id.toString() : undefined;
        delete clienteParaRetornar._id;
        delete clienteParaRetornar.__v; // Remove __v se existir
        
        return clienteParaRetornar; 
    } catch (error) {
        logger.error(`[ClienteService] Erro Mongoose/DB ao criar cliente: ${error.message}`, { stack: error.stack, code: error.code, keyValue: error.keyValue });

        if (error.code === 11000 && error.keyPattern && error.keyPattern.cnpj === 1) {
            const duplicateError = new Error(`Já existe um cliente com este CNPJ (${error.keyValue.cnpj}) na sua empresa.`);
            duplicateError.status = 409;
            throw duplicateError;
        }
        const serviceError = new Error(`Erro interno ao criar cliente: ${error.message}`);
        serviceError.status = 500;
        throw serviceError;
    }
};

/**
 * Atualiza um cliente existente.
 * @param {string} id - ObjectId do cliente a atualizar.
 * @param {object} clienteData - Novos dados do cliente (nome?, cnpj?, telefone?).
 * @param {object} file - Novo ficheiro de logo (opcional).
 * @param {string} empresaId - ObjectId da empresa proprietária.
 * @returns {Promise<object>} - O cliente atualizado (objeto simples com 'id').
 * @throws {Error} - Lança erro com status 404, 409 ou 500.
 */
exports.updateCliente = async (id, clienteData, file, empresaId) => {
    logger.info(`[ClienteService] Tentando atualizar cliente ID ${id} para empresa ${empresaId}.`);
    logger.debug(`[ClienteService] Dados recebidos: ${JSON.stringify(clienteData)}`);

    let clienteAntigo;
    try {
        logger.debug(`[ClienteService] Buscando cliente antigo ID ${id} para verificação.`);
        clienteAntigo = await Cliente.findOne({ _id: id, empresa: empresaId });
        if (!clienteAntigo) {
            const error = new Error('Cliente não encontrado.');
            error.status = 404;
            logger.warn(`[ClienteService] Falha ao atualizar: Cliente ID ${id} não encontrado ou não pertence à empresa ${empresaId}.`);
            throw error;
        }
        logger.debug(`[ClienteService] Cliente antigo ${clienteAntigo.nome} (ID: ${id}) encontrado.`);
    } catch (error) {
        if (error.status === 404) throw error;
        logger.error(`[ClienteService] Erro Mongoose/DB ao buscar cliente antigo ID ${id}: ${error.message}`, { stack: error.stack });
        const serviceError = new Error(`Erro interno ao buscar cliente para atualização: ${error.message}`);
        serviceError.status = 500;
        throw serviceError;
    }


    const dadosParaAtualizar = { ...clienteData };
    let logoAntigoKeyCompleta = null; 

    // Lógica para tratar o logo (nova imagem, remover imagem, manter imagem)
    if (file) {
        logger.info(`[ClienteService] Novo ficheiro recebido (logo) para cliente ID ${id}: ${file.key}`);
        logoAntigoKeyCompleta = clienteAntigo.logo_url ? `${process.env.R2_FOLDER_NAME || 'inmidia-uploads-sistema'}/${clienteAntigo.logo_url}` : null;
        dadosParaAtualizar.logo_url = path.basename(file.key);
        logger.debug(`[ClienteService] Nome do novo ficheiro (logo) extraído: ${dadosParaAtualizar.logo_url}`);
    } else if (dadosParaAtualizar.hasOwnProperty('logo_url') && dadosParaAtualizar.logo_url === '') {
        logger.info(`[ClienteService] Remoção de logo solicitada para cliente ID ${id}`);
        logoAntigoKeyCompleta = clienteAntigo.logo_url ? `${process.env.R2_FOLDER_NAME || 'inmidia-uploads-sistema'}/${clienteAntigo.logo_url}` : null;
        dadosParaAtualizar.logo_url = null; 
    } else {
        delete dadosParaAtualizar.logo_url; 
        logger.debug(`[ClienteService] Nenhuma alteração de logo para cliente ID ${id}.`);
    }

     if (dadosParaAtualizar.cnpj !== undefined && dadosParaAtualizar.cnpj !== null && String(dadosParaAtualizar.cnpj).trim() === '') {
        logger.debug(`[ClienteService] CNPJ vazio recebido na atualização, definindo como null.`);
        dadosParaAtualizar.cnpj = null;
    }

    try {
        // Atualiza o cliente na base de dados
        logger.debug(`[ClienteService] Tentando atualizar cliente ID ${id} no DB.`);
        const clienteAtualizadoDoc = await Cliente.findByIdAndUpdate(id, dadosParaAtualizar, { new: true, runValidators: true });

        if (!clienteAtualizadoDoc) {
             logger.error(`[ClienteService] Cliente ID ${id} não encontrado durante findByIdAndUpdate, apesar da verificação inicial.`);
             const error = new Error('Cliente não encontrado durante a atualização.');
             error.status = 404;
             throw error;
        }
        logger.info(`[ClienteService] Cliente ID ${id} atualizado com sucesso no DB.`);

        // Se um novo logo foi carregado OU o existente foi removido, tenta apagar o antigo do R2
        if (logoAntigoKeyCompleta && (!file || logoAntigoKeyCompleta !== file.key)) {
            logger.info(`[ClienteService] Solicitando exclusão do logo antigo do R2: ${logoAntigoKeyCompleta}`);
            try {
                await deleteFileFromR2(logoAntigoKeyCompleta);
                logger.info(`[ClienteService] Logo antigo ${logoAntigoKeyCompleta} excluído com sucesso do R2.`);
            } catch (deleteError) {
                logger.error(`[ClienteService] Falha NÃO CRÍTICA ao excluir logo antigo ${logoAntigoKeyCompleta} do R2:`, deleteError);
            }
        }

        // <<< CORREÇÃO: Converte para objeto simples E mapeia _id -> id >>>
        const clienteParaRetornar = clienteAtualizadoDoc.toJSON ? clienteAtualizadoDoc.toJSON() : { ...clienteAtualizadoDoc._doc };
        clienteParaRetornar.id = clienteParaRetornar._id ? clienteParaRetornar._id.toString() : undefined;
        delete clienteParaRetornar._id;
        delete clienteParaRetornar.__v;

        return clienteParaRetornar; 

    } catch (error) {
        logger.error(`[ClienteService] Erro Mongoose/DB ao atualizar cliente ID ${id}: ${error.message}`, { stack: error.stack, code: error.code, keyValue: error.keyValue });

        if (error.code === 11000 && error.keyPattern && error.keyPattern.cnpj === 1) {
            const duplicateError = new Error(`Já existe outro cliente com este CNPJ (${error.keyValue.cnpj}) na sua empresa.`);
            duplicateError.status = 409;
            throw duplicateError;
        }
        if (error.status === 404) throw error;
        const serviceError = new Error(`Erro interno ao atualizar cliente: ${error.message}`);
        serviceError.status = 500;
        throw serviceError;
    }
};

/**
 * Busca todos os clientes de uma empresa.
 * @param {string} empresaId - ObjectId da empresa.
 * @returns {Promise<Array<object>>} - Array de clientes (objetos simples com 'id').
 * @throws {Error} - Lança erro com status 500 em caso de falha na DB.
 */
exports.getAllClientes = async (empresaId) => {
    logger.info(`[ClienteService] Buscando todos os clientes para empresa ${empresaId}.`);
    try {
        const clientes = await Cliente.find({ empresa: empresaId })
                                      .sort({ nome: 1 }) 
                                      .lean() // <<< USA LEAN >>>
                                      .exec();
        logger.info(`[ClienteService] Encontrados ${clientes.length} clientes para empresa ${empresaId}.`);
        
        // <<< CORREÇÃO: Mapeamento manual _id -> id após .lean() >>>
        clientes.forEach(cliente => {
            cliente.id = cliente._id ? cliente._id.toString() : undefined;
            delete cliente._id;
        });
        
        return clientes;
    } catch (error) {
        logger.error(`[ClienteService] Erro Mongoose/DB ao buscar todos os clientes: ${error.message}`, { stack: error.stack });
        const serviceError = new Error(`Erro interno ao buscar clientes: ${error.message}`);
        serviceError.status = 500;
        throw serviceError;
    }
};

/**
 * Busca um cliente específico pelo ID, garantindo que pertence à empresa.
 * @param {string} id - ObjectId do cliente.
 * @param {string} empresaId - ObjectId da empresa proprietária.
 * @returns {Promise<object>} - O cliente encontrado (objeto simples com 'id').
 * @throws {Error} - Lança erro com status 404 ou 500.
 */
exports.getClienteById = async (id, empresaId) => {
    logger.info(`[ClienteService] Buscando cliente ID ${id} para empresa ${empresaId}.`);
    try {
        const cliente = await Cliente.findOne({ _id: id, empresa: empresaId })
                                     .lean() // <<< USA LEAN >>>
                                     .exec();

        if (!cliente) {
            const error = new Error('Cliente não encontrado.');
            error.status = 404;
            logger.warn(`[ClienteService] Cliente ID ${id} não encontrado ou não pertence à empresa ${empresaId}.`);
            throw error;
        }

        // <<< CORREÇÃO: Mapeamento manual _id -> id após .lean() >>>
        cliente.id = cliente._id ? cliente._id.toString() : undefined;
        delete cliente._id;

        logger.info(`[ClienteService] Cliente ${cliente.nome} (ID: ${id}) encontrado.`);
        return cliente;
    } catch (error) {
        if (error.status === 404) throw error;
        logger.error(`[ClienteService] Erro Mongoose/DB ao buscar cliente por ID ${id}: ${error.message}`, { stack: error.stack });
        const serviceError = new Error(`Erro interno ao buscar cliente: ${error.message}`);
        serviceError.status = 500;
        throw serviceError;
    }
};

/**
 * Apaga um cliente, verificando se não possui alugueis ativos ou futuros.
 * @param {string} id - ObjectId do cliente a apagar.
 * @param {string} empresaId - ObjectId da empresa proprietária.
 * @returns {Promise<void>}
 * @throws {Error} - Lança erro com status 409, 404 ou 500.
 */
exports.deleteCliente = async (id, empresaId) => {
    logger.info(`[ClienteService] Tentando apagar cliente ID ${id} para empresa ${empresaId}.`);

    try {
        // Verifica se o cliente possui alugueis ativos ou futuros
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0); 
        logger.debug(`[ClienteService] Verificando alugueis ativos/futuros para cliente ${id} (a partir de ${hoje.toISOString()}).`);
        const aluguelExistente = await Aluguel.findOne({
            cliente: id,
            empresa: empresaId,
            data_fim: { $gte: hoje } 
        }).lean(); 

        if (aluguelExistente) {
            const error = new Error('Não é possível apagar um cliente com alugueis ativos ou agendados.');
            error.status = 409; // Conflict
            logger.warn(`[ClienteService] Tentativa de apagar cliente ${id} falhou: ${error.message}`);
            throw error;
        }
        logger.debug(`[ClienteService] Nenhum aluguel ativo/futuro encontrado para cliente ${id}. Prosseguindo com a exclusão.`);

        // Encontra e apaga o cliente para obter o logo_url antes de apagar
        logger.debug(`[ClienteService] Tentando encontrar e apagar cliente ID ${id}.`);
        const clienteApagado = await Cliente.findOneAndDelete({ _id: id, empresa: empresaId });

        if (!clienteApagado) {
            const error = new Error('Cliente não encontrado.');
            error.status = 404;
            logger.warn(`[ClienteService] Cliente ID ${id} não encontrado ou não pertence à empresa ${empresaId} para exclusão.`);
            throw error;
        }
        logger.info(`[ClienteService] Cliente ${clienteApagado.nome} (ID: ${id}) apagado com sucesso do DB.`);

        // Se o cliente tinha logo, tenta apagar do R2
        if (clienteApagado.logo_url) {
            const logoKeyCompleta = `${process.env.R2_FOLDER_NAME || 'inmidia-uploads-sistema'}/${clienteApagado.logo_url}`;
            logger.info(`[ClienteService] Solicitando exclusão do logo ${logoKeyCompleta} do R2 para cliente apagado ID ${id}.`);
            try {
                await deleteFileFromR2(logoKeyCompleta);
                logger.info(`[ClienteService] Logo ${logoKeyCompleta} excluído com sucesso do R2.`);
            } catch (deleteError) {
                logger.error(`[ClienteService] Falha NÃO CRÍTICA ao excluir logo ${logoKeyCompleta} do R2 para cliente apagado ID ${id}:`, deleteError);
            }
        }

    } catch (error) {
        if (error.status === 409 || error.status === 404) throw error;
        logger.error(`[ClienteService] Erro Mongoose/DB ao apagar cliente ID ${id}: ${error.message}`, { stack: error.stack, code: error.code });
        const serviceError = new Error(`Erro interno ao apagar cliente: ${error.message}`);
        serviceError.status = 500;
        throw serviceError;
    }
};