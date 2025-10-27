// services/placaService.js

const Placa = require('../models/Placa');
const Regiao = require('../models/Regiao'); // Necessário para populate
const Aluguel = require('../models/Aluguel'); // Necessário para verificar alugueis
const Cliente = require('../models/Cliente'); // Necessário para populate no getById
const logger = require('../config/logger');
const path = require('path'); // <<< ADICIONADO: Módulo path para extrair nome do ficheiro >>>
const { deleteFileFromR2 } = require('../middlewares/uploadMiddleware'); // <<< ADICIONADO: Função para apagar ficheiro do R2 >>>


/**
 * Cria uma nova placa.
 * @param {object} placaData - Dados da placa.
 * @param {object} file - Ficheiro de imagem (opcional, do Multer/S3).
 * @param {string} empresaId - ID da empresa proprietária.
 * @returns {Promise<object>} - A nova placa criada.
 */
exports.createPlaca = async (placaData, file, empresaId) => {
    logger.info(`[PlacaService] Tentando criar placa para empresa ${empresaId}: ${JSON.stringify(placaData)}`);

    if (file) {
        logger.info(`[PlacaService] Ficheiro recebido: ${file.key}`);
        // <<< ALTERADO: Guardar apenas o nome base do ficheiro >>>
        placaData.imagem = path.basename(file.key);
        logger.info(`[PlacaService] Nome do ficheiro extraído para guardar: ${placaData.imagem}`);
    } else {
        // Garante que o campo imagem não fica com lixo se não houver ficheiro
        delete placaData.imagem;
    }

    // Associa a placa à empresa
    placaData.empresa = empresaId;

    // Validação de região (garante que existe e pertence à empresa)
    if (placaData.regiao) {
        const regiaoExistente = await Regiao.findOne({ _id: placaData.regiao, empresa: empresaId });
        if (!regiaoExistente) {
            logger.warn(`[PlacaService] Região ID ${placaData.regiao} inválida ou não pertence à empresa ${empresaId}.`);
            throw new Error('Região inválida.'); // Ou defina como null/undefined
            // placaData.regiao = undefined;
        }
    }

    const novaPlaca = new Placa(placaData);
    await novaPlaca.save();
    logger.info(`[PlacaService] Placa criada com sucesso: ID ${novaPlaca._id}`);
    // Retorna a placa populada com a região
    return await Placa.findById(novaPlaca._id).populate('regiao', 'nome');
};

/**
 * Atualiza uma placa existente.
 * @param {string} id - ID da placa a atualizar.
 * @param {object} placaData - Novos dados da placa.
 * @param {object} file - Novo ficheiro de imagem (opcional).
 * @param {string} empresaId - ID da empresa proprietária.
 * @returns {Promise<object>} - A placa atualizada.
 */
exports.updatePlaca = async (id, placaData, file, empresaId) => {
    logger.info(`[PlacaService] Tentando atualizar placa ID ${id} para empresa ${empresaId}: ${JSON.stringify(placaData)}`);

    // Busca a placa existente para verificar propriedade e imagem antiga
    const placaAntiga = await Placa.findOne({ _id: id, empresa: empresaId });
    if (!placaAntiga) {
        logger.warn(`[PlacaService] Placa ID ${id} não encontrada ou não pertence à empresa ${empresaId}.`);
        throw new Error('Placa não encontrada.');
    }

    let imagemAntigaKeyCompleta = null; // Guarda a key completa da imagem antiga (se existir) para apagar

    if (file) {
        logger.info(`[PlacaService] Novo ficheiro recebido para placa ID ${id}: ${file.key}`);
        // Guarda a key COMPLETA da imagem antiga para possível exclusão
        imagemAntigaKeyCompleta = placaAntiga.imagem ? `${process.env.R2_FOLDER_NAME || 'inmidia-uploads-sistema'}/${placaAntiga.imagem}` : null; //

        // <<< ALTERADO: Guardar apenas o nome base do ficheiro >>>
        placaData.imagem = path.basename(file.key); //
        logger.info(`[PlacaService] Nome do ficheiro extraído para guardar: ${placaData.imagem}`);

    } else if (placaData.hasOwnProperty('imagem') && placaData.imagem === '') {
        // Se 'imagem' veio explicitamente como string vazia, significa remover imagem
        logger.info(`[PlacaService] Remoção de imagem solicitada para placa ID ${id}`);
        // Guarda a key COMPLETA da imagem antiga para exclusão
        imagemAntigaKeyCompleta = placaAntiga.imagem ? `${process.env.R2_FOLDER_NAME || 'inmidia-uploads-sistema'}/${placaAntiga.imagem}` : null; //
        placaData.imagem = null; // Define como null para remover da BD
    } else {
        // Se não veio ficheiro novo nem pedido de remoção, mantém a imagem existente
        // Remove o campo 'imagem' do placaData para não o sobrescrever com undefined
        delete placaData.imagem;
    }


    // Validação de região (garante que existe e pertence à empresa)
    if (placaData.regiao) {
        const regiaoExistente = await Regiao.findOne({ _id: placaData.regiao, empresa: empresaId });
        if (!regiaoExistente) {
            logger.warn(`[PlacaService] Região ID ${placaData.regiao} inválida ou não pertence à empresa ${empresaId} durante atualização.`);
            throw new Error('Região inválida.'); // Ou remove o campo regiao de placaData
            // delete placaData.regiao;
        }
    } else if (placaData.hasOwnProperty('regiao') && !placaData.regiao) {
         // Se a região veio explicitamente vazia/nula, permite desassociar
         placaData.regiao = null;
    } else {
         // Se não veio região no update, remove o campo para não sobrescrever com undefined
         delete placaData.regiao;
    }

    // Atualiza a placa na base de dados
    const placaAtualizada = await Placa.findByIdAndUpdate(id, placaData, { new: true, runValidators: true }).populate('regiao', 'nome');

    if (!placaAtualizada) {
        // Este caso não deveria acontecer por causa da verificação inicial, mas é uma segurança extra
        logger.error(`[PlacaService] Falha ao atualizar placa ID ${id} após verificação inicial.`);
        throw new Error('Falha ao atualizar a placa.');
    }

    // Se uma nova imagem foi carregada ou a existente foi removida,
    // tenta apagar a imagem antiga do R2 DEPOIS de atualizar a BD com sucesso
    // Verifica se imagemAntigaKeyCompleta existe E se ela é diferente da nova key (se houver nova key)
    if (imagemAntigaKeyCompleta && (!file || imagemAntigaKeyCompleta !== file.key)) {
        logger.info(`[PlacaService] Solicitando exclusão da imagem antiga: ${imagemAntigaKeyCompleta}`);
        try {
            // A função deleteFileFromR2 espera a Key completa (com pasta)
            await deleteFileFromR2(imagemAntigaKeyCompleta); //
            logger.info(`[PlacaService] Imagem antiga ${imagemAntigaKeyCompleta} excluída do R2.`);
        } catch (deleteError) {
            logger.error(`[PlacaService] Falha ao excluir imagem antiga ${imagemAntigaKeyCompleta} do R2:`, deleteError);
            // Não lançamos erro aqui para não reverter a atualização da BD, apenas registamos
        }
    }


    logger.info(`[PlacaService] Placa ID ${id} atualizada com sucesso.`);
    return placaAtualizada;
};


/**
 * Busca todas as placas de uma empresa com paginação, filtros e ordenação.
 * @param {string} empresaId - ID da empresa.
 * @param {object} queryParams - Parâmetros da query (page, limit, sortBy, order, regiao_id, disponivel, search).
 * @returns {Promise<object>} - Objeto com { data, pagination }.
 */
exports.getAllPlacas = async (empresaId, queryParams) => {
    logger.debug(`[PlacaService] Buscando placas para empresa ${empresaId} com query: ${JSON.stringify(queryParams)}`);
    const { page = 1, limit = 10, sortBy = 'createdAt', order = 'desc', regiao_id, disponivel, search } = queryParams;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'desc' ? -1 : 1;

    let query = { empresa: empresaId };

    if (regiao_id && regiao_id !== 'todas') {
        query.regiao = regiao_id;
    }
    if (disponivel === 'true' || disponivel === 'false') {
        query.disponivel = disponivel === 'true';
    }
    if (search) {
        // Busca por número da placa OU nome da rua (case-insensitive)
        const searchRegex = new RegExp(search, 'i');
        query.$or = [
            { numero_placa: searchRegex },
            { nomeDaRua: searchRegex }
        ];
    }

    // Busca as placas e o total de documentos
    const [placas, totalDocs] = await Promise.all([
        Placa.find(query)
            .populate('regiao', 'nome') // Popula nome da região
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(), // Usa lean para performance e facilitar adição de campos
        Placa.countDocuments(query)
    ]);

     // Busca e adiciona informações do aluguel ativo APÓS buscar as placas
     const hoje = new Date();
     const placaIds = placas.map(p => p._id);

     // Busca todos os alugueis ativos para as placas encontradas nesta página
     const alugueisAtivos = await Aluguel.find({
         placa: { $in: placaIds },
         empresa: empresaId,
         data_inicio: { $lte: hoje },
         data_fim: { $gte: hoje }
     }).populate('cliente', 'nome').lean(); // Popula nome do cliente

     // Mapeia os alugueis por ID da placa para acesso rápido
     const aluguelMap = alugueisAtivos.reduce((map, aluguel) => {
         map[aluguel.placa.toString()] = aluguel;
         return map;
     }, {});

     // Adiciona informações do aluguel aos objetos das placas
     const placasComAluguel = placas.map(placa => {
         const aluguel = aluguelMap[placa._id.toString()];
         if (aluguel && aluguel.cliente) {
             placa.cliente_nome = aluguel.cliente.nome;
             placa.aluguel_data_fim = aluguel.data_fim;
         }
         return placa;
     });


    const totalPages = Math.ceil(totalDocs / parseInt(limit));
    const pagination = {
        totalDocs,
        totalPages,
        currentPage: parseInt(page),
        limit: parseInt(limit)
    };

    logger.debug(`[PlacaService] Encontradas ${placasComAluguel.length} placas na página ${page}. Total: ${totalDocs}`);
    return { data: placasComAluguel, pagination };
};

/**
 * Busca uma placa específica pelo ID.
 * @param {string} id - ID da placa.
 * @param {string} empresaId - ID da empresa proprietária.
 * @returns {Promise<object>} - A placa encontrada.
 */
exports.getPlacaById = async (id, empresaId) => {
    logger.debug(`[PlacaService] Buscando placa ID ${id} para empresa ${empresaId}`);
    // Encontra a placa e popula o nome da região
    const placa = await Placa.findOne({ _id: id, empresa: empresaId })
                              .populate('regiao', 'nome') // Popula o campo 'regiao' e seleciona apenas o campo 'nome'
                              .lean(); // Usa lean para performance

    if (!placa) {
        logger.warn(`[PlacaService] Placa ID ${id} não encontrada ou não pertence à empresa ${empresaId}.`);
        throw new Error('Placa não encontrada.');
    }

     // Busca o aluguel ativo para esta placa, se aplicável
     // Não precisa converter para objeto simples porque já usamos .lean()
     if (!placa.disponivel) {
         const hoje = new Date();
         const aluguelAtivo = await Aluguel.findOne({
             placa: placa._id,
             empresa: empresaId,
             data_inicio: { $lte: hoje },
             data_fim: { $gte: hoje }
         }).populate('cliente', 'nome').lean(); // Popula o nome do cliente

         if (aluguelAtivo && aluguelAtivo.cliente) {
             placa.cliente_nome = aluguelAtivo.cliente.nome;
             placa.aluguel_data_fim = aluguelAtivo.data_fim;
         }
     }

    logger.debug(`[PlacaService] Placa ID ${id} encontrada.`);
    return placa;
};


/**
 * Apaga uma placa.
 * @param {string} id - ID da placa a apagar.
 * @param {string} empresaId - ID da empresa proprietária.
 * @returns {Promise<void>}
 */
exports.deletePlaca = async (id, empresaId) => {
    logger.info(`[PlacaService] Tentando apagar placa ID ${id} para empresa ${empresaId}`);

    // Verifica se a placa está alugada atualmente
    const hoje = new Date();
    const aluguelAtivo = await Aluguel.findOne({
        placa: id,
        empresa: empresaId,
        data_inicio: { $lte: hoje },
        data_fim: { $gte: hoje }
    });

    if (aluguelAtivo) {
        logger.warn(`[PlacaService] Tentativa de apagar placa ${id} que está atualmente alugada.`);
        throw new Error('Não é possível apagar uma placa que está alugada.');
    }

    // Encontra e apaga a placa
    const placaApagada = await Placa.findOneAndDelete({ _id: id, empresa: empresaId });

    if (!placaApagada) {
        logger.warn(`[PlacaService] Placa ID ${id} não encontrada ou não pertence à empresa ${empresaId} para exclusão.`);
        throw new Error('Placa não encontrada.');
    }

    // Se a placa tinha imagem, tenta apagar do R2
    if (placaApagada.imagem) {
        // Monta a Key completa (pasta + nome do ficheiro)
        const imagemKeyCompleta = `${process.env.R2_FOLDER_NAME || 'inmidia-uploads-sistema'}/${placaApagada.imagem}`; //
        logger.info(`[PlacaService] Solicitando exclusão da imagem ${imagemKeyCompleta} do R2 para placa apagada ID ${id}.`);
        try {
            await deleteFileFromR2(imagemKeyCompleta); //
            logger.info(`[PlacaService] Imagem ${imagemKeyCompleta} excluída do R2.`);
        } catch (deleteError) {
            logger.error(`[PlacaService] Falha ao excluir imagem ${imagemKeyCompleta} do R2 para placa apagada ID ${id}:`, deleteError);
            // Não lançamos erro aqui, a placa já foi apagada da BD
        }
    }

    // Opcional: Apagar histórico de alugueis desta placa?
    // try {
    //    const deleteResult = await Aluguel.deleteMany({ placa: id, empresa: empresaId });
    //    logger.info(`[PlacaService] Histórico de ${deleteResult.deletedCount} alugueis apagado para placa ID ${id}.`);
    // } catch (errorAluguel) {
    //    logger.error(`[PlacaService] Erro ao apagar histórico de alugueis para placa ID ${id}:`, errorAluguel);
    // }


    logger.info(`[PlacaService] Placa ID ${id} apagada com sucesso.`);
};

/**
 * Alterna a disponibilidade de uma placa (manutenção).
 * @param {string} id - ID da placa.
 * @param {string} empresaId - ID da empresa proprietária.
 * @returns {Promise<object>} - A placa com o status atualizado.
 */
exports.toggleDisponibilidade = async (id, empresaId) => {
    logger.info(`[PlacaService] Tentando alternar disponibilidade da placa ID ${id} para empresa ${empresaId}`);
    const placa = await Placa.findOne({ _id: id, empresa: empresaId });

    if (!placa) {
        logger.warn(`[PlacaService] Placa ID ${id} não encontrada ou não pertence à empresa ${empresaId} para alternar disponibilidade.`);
        throw new Error('Placa não encontrada.');
    }

    // Verifica se está alugada atualmente
    const hoje = new Date();
    const aluguelAtivo = await Aluguel.findOne({
        placa: id,
        empresa: empresaId,
        data_inicio: { $lte: hoje },
        data_fim: { $gte: hoje }
    });

    // Só permite colocar em manutenção (disponivel=false) se NÃO estiver alugada
    // Se está disponível (true) e existe aluguel ativo -> ERRO
    if (placa.disponivel && aluguelAtivo) {
        logger.warn(`[PlacaService] Tentativa de colocar placa ${id} em manutenção enquanto está alugada.`);
        throw new Error('Não é possível colocar uma placa alugada em manutenção.');
    }
    // Se está indisponível (false) e queremos torná-la disponível (true) -> OK
    // Se está disponível (true) e não há aluguel ativo -> OK (colocar em manutenção)

    // Alterna o status
    placa.disponivel = !placa.disponivel;
    await placa.save();
    logger.info(`[PlacaService] Disponibilidade da placa ID ${id} alternada para ${placa.disponivel}.`);

    // Retorna a placa atualizada populada para consistência com outras rotas
    return await Placa.findById(id).populate('regiao', 'nome').lean();
};

/**
 * Busca todas as localizações de placas (ID, número, rua, coordenadas) para uma empresa.
 * @param {string} empresaId - ID da empresa.
 * @returns {Promise<Array<object>>} - Array de objetos com { _id, numero_placa, nomeDaRua, coordenadas }.
 */
exports.getAllPlacaLocations = async (empresaId) => {
    logger.debug(`[PlacaService] Buscando localizações de placas para empresa ${empresaId}`);
    const locations = await Placa.find(
        { empresa: empresaId, coordenadas: { $ne: null, $ne: "" } }, // Filtra apenas as que têm coordenadas
        '_id numero_placa nomeDaRua coordenadas' // Seleciona apenas os campos necessários
    ).lean(); // Usa .lean() para retornar objetos JS simples, mais rápido

    logger.debug(`[PlacaService] Encontradas ${locations.length} localizações de placas.`);
    return locations;
};