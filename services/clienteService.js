// services/clienteService.js

const Cliente = require('../models/Cliente');
const Aluguel = require('../models/Aluguel'); // Necessário para verificar alugueis
const logger = require('../config/logger');
const path = require('path'); // <<< ADICIONADO: Módulo path para extrair nome do ficheiro >>>
const { deleteFileFromR2 } = require('../middlewares/uploadMiddleware'); // <<< ADICIONADO: Função para apagar ficheiro do R2 (assumindo que existe) >>>

/**
 * Cria um novo cliente.
 * @param {object} clienteData - Dados do cliente.
 * @param {object} file - Ficheiro de logo (opcional, do Multer/S3).
 * @param {string} empresaId - ID da empresa proprietária.
 * @returns {Promise<object>} - O novo cliente criado.
 */
exports.createCliente = async (clienteData, file, empresaId) => {
    logger.info(`[ClienteService] Tentando criar cliente para empresa ${empresaId}: ${JSON.stringify(clienteData)}`);

    if (file) {
        logger.info(`[ClienteService] Ficheiro recebido (logo): ${file.key}`);
        // <<< ALTERADO: Guardar apenas o nome base do ficheiro >>>
        clienteData.logo_url = path.basename(file.key);
        logger.info(`[ClienteService] Nome do ficheiro (logo) extraído para guardar: ${clienteData.logo_url}`);
    } else {
        // Garante que o campo logo não fica com lixo se não houver ficheiro
        delete clienteData.logo_url;
    }

    // Associa o cliente à empresa
    clienteData.empresa = empresaId;

    const novoCliente = new Cliente(clienteData);
    await novoCliente.save();
    logger.info(`[ClienteService] Cliente criado com sucesso: ID ${novoCliente._id}`);
    return novoCliente;
};

/**
 * Atualiza um cliente existente.
 * @param {string} id - ID do cliente a atualizar.
 * @param {object} clienteData - Novos dados do cliente.
 * @param {object} file - Novo ficheiro de logo (opcional).
 * @param {string} empresaId - ID da empresa proprietária.
 * @returns {Promise<object>} - O cliente atualizado.
 */
exports.updateCliente = async (id, clienteData, file, empresaId) => {
    logger.info(`[ClienteService] Tentando atualizar cliente ID ${id} para empresa ${empresaId}: ${JSON.stringify(clienteData)}`);

    // Busca o cliente existente para verificar propriedade e logo antigo
    const clienteAntigo = await Cliente.findOne({ _id: id, empresa: empresaId });
    if (!clienteAntigo) {
        logger.warn(`[ClienteService] Cliente ID ${id} não encontrado ou não pertence à empresa ${empresaId}.`);
        throw new Error('Cliente não encontrado.');
    }

    let logoAntigoKey = null; // Guarda a key completa do logo antigo (se existir) para apagar

    if (file) {
        logger.info(`[ClienteService] Novo ficheiro recebido (logo) para cliente ID ${id}: ${file.key}`);
        logoAntigoKey = clienteAntigo.logo_url ? `${process.env.R2_FOLDER_NAME || 'inmidia-uploads-sistema'}/${clienteAntigo.logo_url}` : null;

        // <<< ALTERADO: Guardar apenas o nome base do ficheiro >>>
        clienteData.logo_url = path.basename(file.key);
        logger.info(`[ClienteService] Nome do ficheiro (logo) extraído para guardar: ${clienteData.logo_url}`);

    } else if (clienteData.hasOwnProperty('logo_url') && clienteData.logo_url === '') {
        // Se 'logo_url' veio explicitamente como string vazia, significa remover logo
        logger.info(`[ClienteService] Remoção de logo solicitada para cliente ID ${id}`);
        logoAntigoKey = clienteAntigo.logo_url ? `${process.env.R2_FOLDER_NAME || 'inmidia-uploads-sistema'}/${clienteAntigo.logo_url}` : null;
        clienteData.logo_url = null; // Define como null para remover da BD
    } else {
        // Se não veio ficheiro novo nem pedido de remoção, mantém o logo existente
        // Remove o campo 'logo_url' do clienteData para não o sobrescrever com undefined
        delete clienteData.logo_url;
    }

    // Atualiza o cliente na base de dados
    const clienteAtualizado = await Cliente.findByIdAndUpdate(id, clienteData, { new: true, runValidators: true });

    if (!clienteAtualizado) {
        // Este caso não deveria acontecer por causa da verificação inicial, mas é uma segurança extra
        logger.error(`[ClienteService] Falha ao atualizar cliente ID ${id} após verificação inicial.`);
        throw new Error('Falha ao atualizar o cliente.');
    }

    // Se um novo logo foi carregado ou o existente foi removido,
    // tenta apagar o logo antigo do R2 DEPOIS de atualizar a BD com sucesso
    if (logoAntigoKey && logoAntigoKey !== (file ? file.key : null) ) {
        logger.info(`[ClienteService] Solicitando exclusão do logo antigo: ${logoAntigoKey}`);
        try {
            // A função deleteFileFromR2 espera apenas a Key completa
            await deleteFileFromR2(logoAntigoKey);
            logger.info(`[ClienteService] Logo antigo ${logoAntigoKey} excluído do R2.`);
        } catch (deleteError) {
            logger.error(`[ClienteService] Falha ao excluir logo antigo ${logoAntigoKey} do R2:`, deleteError);
            // Não lançamos erro aqui para não reverter a atualização da BD, apenas registamos
        }
    }

    logger.info(`[ClienteService] Cliente ID ${id} atualizado com sucesso.`);
    return clienteAtualizado;
};


/**
 * Busca todos os clientes de uma empresa.
 * @param {string} empresaId - ID da empresa.
 * @returns {Promise<Array<object>>} - Array de clientes.
 */
exports.getAllClientes = async (empresaId) => {
    logger.debug(`[ClienteService] Buscando todos os clientes para empresa ${empresaId}`);
    const clientes = await Cliente.find({ empresa: empresaId }).sort({ nome: 1 }); // Ordena por nome
    logger.debug(`[ClienteService] Encontrados ${clientes.length} clientes.`);
    return clientes;
};

/**
 * Busca um cliente específico pelo ID.
 * @param {string} id - ID do cliente.
 * @param {string} empresaId - ID da empresa proprietária.
 * @returns {Promise<object>} - O cliente encontrado.
 */
exports.getClienteById = async (id, empresaId) => {
    logger.debug(`[ClienteService] Buscando cliente ID ${id} para empresa ${empresaId}`);
    const cliente = await Cliente.findOne({ _id: id, empresa: empresaId });

    if (!cliente) {
        logger.warn(`[ClienteService] Cliente ID ${id} não encontrado ou não pertence à empresa ${empresaId}.`);
        throw new Error('Cliente não encontrado.');
    }

    logger.debug(`[ClienteService] Cliente ID ${id} encontrado.`);
    return cliente;
};

/**
 * Apaga um cliente.
 * @param {string} id - ID do cliente a apagar.
 * @param {string} empresaId - ID da empresa proprietária.
 * @returns {Promise<void>}
 */
exports.deleteCliente = async (id, empresaId) => {
    logger.info(`[ClienteService] Tentando apagar cliente ID ${id} para empresa ${empresaId}`);

    // Verifica se o cliente possui alugueis ativos ou futuros
    const hoje = new Date();
    const aluguelExistente = await Aluguel.findOne({
        cliente: id,
        empresa: empresaId,
        data_fim: { $gte: hoje } // Verifica se a data fim é hoje ou no futuro
    });

    if (aluguelExistente) {
        logger.warn(`[ClienteService] Tentativa de apagar cliente ${id} que possui alugueis ativos ou futuros.`);
        throw new Error('Não é possível apagar um cliente com alugueis ativos ou agendados.');
    }

    // Encontra e apaga o cliente
    const clienteApagado = await Cliente.findOneAndDelete({ _id: id, empresa: empresaId });

    if (!clienteApagado) {
        logger.warn(`[ClienteService] Cliente ID ${id} não encontrado ou não pertence à empresa ${empresaId} para exclusão.`);
        throw new Error('Cliente não encontrado.');
    }

    // Se o cliente tinha logo, tenta apagar do R2
    if (clienteApagado.logo_url) {
        const logoKey = `${process.env.R2_FOLDER_NAME || 'inmidia-uploads-sistema'}/${clienteApagado.logo_url}`;
        logger.info(`[ClienteService] Solicitando exclusão do logo ${logoKey} do R2 para cliente apagado ID ${id}.`);
        try {
            await deleteFileFromR2(logoKey);
            logger.info(`[ClienteService] Logo ${logoKey} excluído do R2.`);
        } catch (deleteError) {
            logger.error(`[ClienteService] Falha ao excluir logo ${logoKey} do R2 para cliente apagado ID ${id}:`, deleteError);
            // Não lançamos erro aqui, o cliente já foi apagado da BD
        }
    }

    // Opcional: Apagar histórico de alugueis *passados* deste cliente?
    // await Aluguel.deleteMany({ cliente: id, empresa: empresaId, data_fim: { $lt: hoje } });

    logger.info(`[ClienteService] Cliente ID ${id} apagado com sucesso.`);
};