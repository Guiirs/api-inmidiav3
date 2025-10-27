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
 * @returns {Promise<object>} - O novo cliente criado (documento Mongoose).
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
        // Guarda apenas o nome base do ficheiro
        dadosParaSalvar.logo_url = path.basename(file.key);
        logger.debug(`[ClienteService] Nome do ficheiro (logo) extraído para guardar: ${dadosParaSalvar.logo_url}`);
    } else {
        // Garante que logo_url não seja 'undefined' ou lixo
        delete dadosParaSalvar.logo_url;
    }

    // Limpa CNPJ se vazio para evitar problemas com índice sparse unique
    if (dadosParaSalvar.cnpj !== undefined && dadosParaSalvar.cnpj !== null && String(dadosParaSalvar.cnpj).trim() === '') {
        logger.debug(`[ClienteService] CNPJ vazio recebido, definindo como null.`);
        dadosParaSalvar.cnpj = null;
    }

    const novoCliente = new Cliente(dadosParaSalvar);

    try {
        logger.debug(`[ClienteService] Tentando salvar novo cliente ${dadosParaSalvar.nome} no DB.`);
        await novoCliente.save();
        logger.info(`[ClienteService] Cliente ${novoCliente.nome} (ID: ${novoCliente._id}) criado com sucesso para empresa ${empresaId}.`);
        // O mapeamento _id -> id deve ocorrer globalmente
        return novoCliente; // Retorna o documento Mongoose completo
    } catch (error) {
        // Log detalhado do erro
        logger.error(`[ClienteService] Erro Mongoose/DB ao criar cliente: ${error.message}`, { stack: error.stack, code: error.code, keyValue: error.keyValue });

        // Trata erro de CNPJ duplicado (considerando o índice composto e sparse)
        if (error.code === 11000 && error.keyPattern && error.keyPattern.cnpj === 1) {
            const duplicateError = new Error(`Já existe um cliente com este CNPJ (${error.keyValue.cnpj}) na sua empresa.`);
            duplicateError.status = 409;
            throw duplicateError;
        }
        // Re-lança outros erros (podem ser validação do Mongoose ou conexão) como 500
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
 * @returns {Promise<object>} - O cliente atualizado (documento Mongoose).
 * @throws {Error} - Lança erro com status 404, 409 ou 500.
 */
exports.updateCliente = async (id, clienteData, file, empresaId) => {
    logger.info(`[ClienteService] Tentando atualizar cliente ID ${id} para empresa ${empresaId}.`);
    logger.debug(`[ClienteService] Dados recebidos: ${JSON.stringify(clienteData)}`);

    let clienteAntigo;
    try {
        // Busca o cliente existente para verificar propriedade e logo antigo
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
        // Se já for 404, relança
        if (error.status === 404) throw error;
        // Loga e relança outros erros de busca como 500
        logger.error(`[ClienteService] Erro Mongoose/DB ao buscar cliente antigo ID ${id}: ${error.message}`, { stack: error.stack });
        const serviceError = new Error(`Erro interno ao buscar cliente para atualização: ${error.message}`);
        serviceError.status = 500;
        throw serviceError;
    }


    const dadosParaAtualizar = { ...clienteData };
    let logoAntigoKeyCompleta = null; // Guarda a key completa do logo antigo (se existir) para apagar

    // Lógica para tratar o logo (nova imagem, remover imagem, manter imagem)
    if (file) {
        logger.info(`[ClienteService] Novo ficheiro recebido (logo) para cliente ID ${id}: ${file.key}`);
        // Guarda a key COMPLETA da imagem antiga para possível exclusão
        logoAntigoKeyCompleta = clienteAntigo.logo_url ? `${process.env.R2_FOLDER_NAME || 'inmidia-uploads-sistema'}/${clienteAntigo.logo_url}` : null;
        // Guarda apenas o nome base do novo ficheiro
        dadosParaAtualizar.logo_url = path.basename(file.key);
        logger.debug(`[ClienteService] Nome do novo ficheiro (logo) extraído: ${dadosParaAtualizar.logo_url}`);
    } else if (dadosParaAtualizar.hasOwnProperty('logo_url') && dadosParaAtualizar.logo_url === '') {
        // Se 'logo_url' veio explicitamente como string vazia, significa remover logo
        logger.info(`[ClienteService] Remoção de logo solicitada para cliente ID ${id}`);
        // Guarda a key COMPLETA da imagem antiga para exclusão
        logoAntigoKeyCompleta = clienteAntigo.logo_url ? `${process.env.R2_FOLDER_NAME || 'inmidia-uploads-sistema'}/${clienteAntigo.logo_url}` : null;
        dadosParaAtualizar.logo_url = null; // Define como null para remover da BD
    } else {
        // Se não veio ficheiro novo nem pedido de remoção, mantém o logo existente
        delete dadosParaAtualizar.logo_url; // Remove para não sobrescrever com undefined
        logger.debug(`[ClienteService] Nenhuma alteração de logo para cliente ID ${id}.`);
    }

    // Limpa CNPJ se vazio
     if (dadosParaAtualizar.cnpj !== undefined && dadosParaAtualizar.cnpj !== null && String(dadosParaAtualizar.cnpj).trim() === '') {
        logger.debug(`[ClienteService] CNPJ vazio recebido na atualização, definindo como null.`);
        dadosParaAtualizar.cnpj = null;
    }

    try {
        // Atualiza o cliente na base de dados
        logger.debug(`[ClienteService] Tentando atualizar cliente ID ${id} no DB.`);
        const clienteAtualizado = await Cliente.findByIdAndUpdate(id, dadosParaAtualizar, { new: true, runValidators: true });

        // findByIdAndUpdate retorna null se não encontrar, mas já verificamos antes
        if (!clienteAtualizado) {
            // Este caso é redundante devido à verificação inicial, mas serve como segurança
             logger.error(`[ClienteService] Cliente ID ${id} não encontrado durante findByIdAndUpdate, apesar da verificação inicial.`);
             const error = new Error('Cliente não encontrado durante a atualização.');
             error.status = 404;
             throw error;
        }
        logger.info(`[ClienteService] Cliente ID ${id} atualizado com sucesso no DB.`);

        // Se um novo logo foi carregado OU o existente foi removido,
        // tenta apagar o logo antigo do R2 DEPOIS de atualizar a BD com sucesso
        // Verifica se a key antiga existe E se ela é diferente da nova key (se existir nova key)
        if (logoAntigoKeyCompleta && (!file || logoAntigoKeyCompleta !== file.key)) {
            logger.info(`[ClienteService] Solicitando exclusão do logo antigo do R2: ${logoAntigoKeyCompleta}`);
            try {
                // A função deleteFileFromR2 espera a Key completa (com pasta)
                await deleteFileFromR2(logoAntigoKeyCompleta);
                logger.info(`[ClienteService] Logo antigo ${logoAntigoKeyCompleta} excluído com sucesso do R2.`);
            } catch (deleteError) {
                // Loga o erro mas não impede a resposta de sucesso da atualização do cliente
                logger.error(`[ClienteService] Falha NÃO CRÍTICA ao excluir logo antigo ${logoAntigoKeyCompleta} do R2:`, deleteError);
            }
        }

        // O mapeamento _id -> id deve ocorrer globalmente
        return clienteAtualizado; // Retorna o documento Mongoose atualizado

    } catch (error) {
        // Log detalhado do erro
        logger.error(`[ClienteService] Erro Mongoose/DB ao atualizar cliente ID ${id}: ${error.message}`, { stack: error.stack, code: error.code, keyValue: error.keyValue });

        // Trata erro de CNPJ duplicado
        if (error.code === 11000 && error.keyPattern && error.keyPattern.cnpj === 1) {
            const duplicateError = new Error(`Já existe outro cliente com este CNPJ (${error.keyValue.cnpj}) na sua empresa.`);
            duplicateError.status = 409;
            throw duplicateError;
        }
        // Relança erros 404 ou outros como 500
        if (error.status === 404) throw error;
        const serviceError = new Error(`Erro interno ao atualizar cliente: ${error.message}`);
        serviceError.status = 500;
        throw serviceError;
    }
};

/**
 * Busca todos os clientes de uma empresa.
 * @param {string} empresaId - ObjectId da empresa.
 * @returns {Promise<Array<object>>} - Array de clientes (objetos simples).
 * @throws {Error} - Lança erro com status 500 em caso de falha na DB.
 */
exports.getAllClientes = async (empresaId) => {
    logger.info(`[ClienteService] Buscando todos os clientes para empresa ${empresaId}.`);
    try {
        const clientes = await Cliente.find({ empresa: empresaId })
                                      .sort({ nome: 1 }) // Ordena por nome
                                      .lean() // Retorna objetos simples
                                      .exec();
        logger.info(`[ClienteService] Encontrados ${clientes.length} clientes para empresa ${empresaId}.`);
        // O mapeamento _id -> id deve ocorrer globalmente
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
 * @returns {Promise<object>} - O cliente encontrado (objeto simples).
 * @throws {Error} - Lança erro com status 404 ou 500.
 */
exports.getClienteById = async (id, empresaId) => {
    logger.info(`[ClienteService] Buscando cliente ID ${id} para empresa ${empresaId}.`);
    try {
        const cliente = await Cliente.findOne({ _id: id, empresa: empresaId })
                                     .lean() // Retorna objeto simples
                                     .exec();

        if (!cliente) {
            const error = new Error('Cliente não encontrado.');
            error.status = 404;
            logger.warn(`[ClienteService] Cliente ID ${id} não encontrado ou não pertence à empresa ${empresaId}.`);
            throw error;
        }

        logger.info(`[ClienteService] Cliente ${cliente.nome} (ID: ${id}) encontrado.`);
        // O mapeamento _id -> id deve ocorrer globalmente
        return cliente;
    } catch (error) {
        // Se já for 404, relança
        if (error.status === 404) throw error;
        // Loga e relança outros erros como 500
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
        hoje.setHours(0, 0, 0, 0); // Zera a hora para comparar apenas a data
        logger.debug(`[ClienteService] Verificando alugueis ativos/futuros para cliente ${id} (a partir de ${hoje.toISOString()}).`);
        const aluguelExistente = await Aluguel.findOne({
            cliente: id,
            empresa: empresaId,
            data_fim: { $gte: hoje } // Verifica se a data fim é hoje ou no futuro
        }).lean(); // lean() é suficiente, só precisamos saber se existe

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
                // Loga o erro mas não impede a conclusão da operação principal
                logger.error(`[ClienteService] Falha NÃO CRÍTICA ao excluir logo ${logoKeyCompleta} do R2 para cliente apagado ID ${id}:`, deleteError);
            }
        }

        // Opcional: Apagar histórico de alugueis *passados* deste cliente?
        // try {
        //    logger.debug(`[ClienteService] Tentando apagar alugueis passados para cliente ${id}.`);
        //    const deleteResult = await Aluguel.deleteMany({ cliente: id, empresa: empresaId, data_fim: { $lt: hoje } });
        //    logger.info(`[ClienteService] ${deleteResult.deletedCount} alugueis passados apagados para cliente ID ${id}.`);
        // } catch (errorAluguel) {
        //    logger.error(`[ClienteService] Erro ao apagar histórico de alugueis passados para cliente ID ${id}:`, errorAluguel);
        //    // Não lançar erro aqui, pois o cliente já foi apagado
        // }

    } catch (error) {
        // Se for 409 ou 404, relança
        if (error.status === 409 || error.status === 404) throw error;
        // Loga e relança outros erros como 500
        logger.error(`[ClienteService] Erro Mongoose/DB ao apagar cliente ID ${id}: ${error.message}`, { stack: error.stack, code: error.code });
        const serviceError = new Error(`Erro interno ao apagar cliente: ${error.message}`);
        serviceError.status = 500;
        throw serviceError;
    }
};

// Exporta as funções individualmente (se o controller as importa assim)
// Se o controller importa a classe, exporte a classe: module.exports = ClienteService;