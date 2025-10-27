// services/placaService.js

const Placa = require('../models/Placa');
const Regiao = require('../models/Regiao'); // Necessário para populate e validação
const Aluguel = require('../models/Aluguel'); // Necessário para verificar alugueis e popular
const Cliente = require('../models/Cliente'); // Necessário para populate no getById e getAll
const logger = require('../config/logger');
const path = require('path');
const { deleteFileFromR2 } = require('../middlewares/uploadMiddleware'); // Função para apagar ficheiro do R2

/**
 * Cria uma nova placa.
 * @param {object} placaData - Dados da placa (numero_placa, coordenadas?, nomeDaRua?, tamanho?, regiao?).
 * @param {object} file - Ficheiro de imagem (opcional, do Multer/S3).
 * @param {string} empresaId - ObjectId da empresa proprietária.
 * @returns {Promise<object>} - A nova placa criada (documento Mongoose populado com região).
 * @throws {Error} - Lança erro com status 400, 404, 409 ou 500.
 */
exports.createPlaca = async (placaData, file, empresaId) => {
    logger.info(`[PlacaService] Tentando criar placa para empresa ${empresaId}.`);
    logger.debug(`[PlacaService] Dados recebidos: ${JSON.stringify(placaData)}`);

    // Validação básica (complementa express-validator)
    if (!placaData.numero_placa || !placaData.regiao) {
        const error = new Error('Número da placa e região são obrigatórios.');
        error.status = 400;
        logger.warn(`[PlacaService] Falha ao criar placa: ${error.message}`);
        throw error;
    }

    const dadosParaSalvar = { ...placaData, empresa: empresaId };

    if (file) {
        logger.info(`[PlacaService] Ficheiro recebido: ${file.key}`);
        dadosParaSalvar.imagem = path.basename(file.key); // Guarda só o nome base
        logger.debug(`[PlacaService] Nome do ficheiro extraído para guardar: ${dadosParaSalvar.imagem}`);
    } else {
        delete dadosParaSalvar.imagem; // Garante que não fica lixo
    }

    try {
        // Validação de região (garante que existe e pertence à empresa)
        logger.debug(`[PlacaService] Validando região ID ${dadosParaSalvar.regiao} para empresa ${empresaId}.`);
        const regiaoExistente = await Regiao.findOne({ _id: dadosParaSalvar.regiao, empresa: empresaId }).lean();
        if (!regiaoExistente) {
            const error = new Error(`Região ID ${dadosParaSalvar.regiao} inválida ou não pertence à empresa ${empresaId}.`);
            error.status = 404; // Not Found (ou 400 Bad Request)
            logger.warn(`[PlacaService] Falha ao criar placa: ${error.message}`);
            throw error;
        }
        logger.debug(`[PlacaService] Região ${regiaoExistente.nome} (ID: ${dadosParaSalvar.regiao}) validada.`);

        const novaPlaca = new Placa(dadosParaSalvar);

        logger.debug(`[PlacaService] Tentando salvar nova placa ${dadosParaSalvar.numero_placa} no DB.`);
        await novaPlaca.save();
        logger.info(`[PlacaService] Placa ${novaPlaca.numero_placa} (ID: ${novaPlaca._id}) criada com sucesso para empresa ${empresaId}.`);

        // Retorna a placa populada com a região após salvar
        logger.debug(`[PlacaService] Buscando placa ${novaPlaca._id} com populate da região.`);
        const placaPopulada = await Placa.findById(novaPlaca._id).populate('regiao', 'nome'); // Popula nome da região
        if (!placaPopulada) {
            // Pouco provável, mas adiciona segurança
            logger.error(`[PlacaService] ERRO INESPERADO: Placa ${novaPlaca._id} não encontrada imediatamente após save.`);
            throw new Error('Erro ao buscar placa recém-criada.'); // Leva a um 500
        }
        return placaPopulada; // Retorna o documento Mongoose populado

    } catch (error) {
        // Log detalhado do erro
        logger.error(`[PlacaService] Erro Mongoose/DB ao criar placa: ${error.message}`, { stack: error.stack, code: error.code, keyValue: error.keyValue });

        // Trata erro de índice único (placa duplicada na mesma região/empresa)
        if (error.code === 11000) {
            const duplicateError = new Error(`Já existe uma placa com o número '${placaData.numero_placa}' nesta região.`);
            duplicateError.status = 409;
            throw duplicateError;
        }
        // Relança erros 400/404 já definidos ou outros como 500
        if (error.status === 400 || error.status === 404) throw error;
        const serviceError = new Error(`Erro interno ao criar placa: ${error.message}`);
        serviceError.status = 500;
        throw serviceError;
    }
};

/**
 * Atualiza uma placa existente.
 * @param {string} id - ObjectId da placa a atualizar.
 * @param {object} placaData - Novos dados da placa.
 * @param {object} file - Novo ficheiro de imagem (opcional).
 * @param {string} empresaId - ObjectId da empresa proprietária.
 * @returns {Promise<object>} - A placa atualizada (documento Mongoose populado).
 * @throws {Error} - Lança erro com status 404, 400, 409 ou 500.
 */
exports.updatePlaca = async (id, placaData, file, empresaId) => {
    logger.info(`[PlacaService] Tentando atualizar placa ID ${id} para empresa ${empresaId}.`);
    logger.debug(`[PlacaService] Novos dados: ${JSON.stringify(placaData)}`);

    let placaAntiga;
    try {
        // Busca a placa existente para verificar propriedade e imagem antiga
        logger.debug(`[PlacaService] Buscando placa antiga ID ${id} para verificação.`);
        placaAntiga = await Placa.findOne({ _id: id, empresa: empresaId });
        if (!placaAntiga) {
            const error = new Error('Placa não encontrada.');
            error.status = 404;
            logger.warn(`[PlacaService] Falha ao atualizar: Placa ID ${id} não encontrada ou não pertence à empresa ${empresaId}.`);
            throw error;
        }
        logger.debug(`[PlacaService] Placa antiga ${placaAntiga.numero_placa} (ID: ${id}) encontrada.`);
    } catch (error) {
        if (error.status === 404) throw error;
        logger.error(`[PlacaService] Erro Mongoose/DB ao buscar placa antiga ID ${id}: ${error.message}`, { stack: error.stack });
        const serviceError = new Error(`Erro interno ao buscar placa para atualização: ${error.message}`);
        serviceError.status = 500;
        throw serviceError;
    }

    const dadosParaAtualizar = { ...placaData };
    let imagemAntigaKeyCompleta = null; // Guarda a key completa da imagem antiga (se existir) para apagar

    // Lógica para tratar a imagem (nova, remover, manter)
    if (file) {
        logger.info(`[PlacaService] Novo ficheiro recebido para placa ID ${id}: ${file.key}`);
        imagemAntigaKeyCompleta = placaAntiga.imagem ? `${process.env.R2_FOLDER_NAME || 'inmidia-uploads-sistema'}/${placaAntiga.imagem}` : null;
        dadosParaAtualizar.imagem = path.basename(file.key);
        logger.debug(`[PlacaService] Nome do novo ficheiro extraído: ${dadosParaAtualizar.imagem}`);
    } else if (dadosParaAtualizar.hasOwnProperty('imagem') && dadosParaAtualizar.imagem === '') {
        logger.info(`[PlacaService] Remoção de imagem solicitada para placa ID ${id}`);
        imagemAntigaKeyCompleta = placaAntiga.imagem ? `${process.env.R2_FOLDER_NAME || 'inmidia-uploads-sistema'}/${placaAntiga.imagem}` : null;
        dadosParaAtualizar.imagem = null; // Remove da BD
    } else {
        delete dadosParaAtualizar.imagem; // Mantém a existente
        logger.debug(`[PlacaService] Nenhuma alteração de imagem para placa ID ${id}.`);
    }

    try {
        // Validação de região (se foi alterada)
        if (dadosParaAtualizar.regiao && String(dadosParaAtualizar.regiao) !== String(placaAntiga.regiao)) {
             logger.debug(`[PlacaService] Validando nova região ID ${dadosParaAtualizar.regiao} para empresa ${empresaId}.`);
             const regiaoExistente = await Regiao.findOne({ _id: dadosParaAtualizar.regiao, empresa: empresaId }).lean();
             if (!regiaoExistente) {
                const error = new Error(`Região ID ${dadosParaAtualizar.regiao} inválida ou não pertence à empresa ${empresaId}.`);
                error.status = 404; // Ou 400 Bad Request
                logger.warn(`[PlacaService] Falha ao atualizar placa: ${error.message}`);
                throw error;
             }
             logger.debug(`[PlacaService] Nova região ${regiaoExistente.nome} validada.`);
        } else if (dadosParaAtualizar.hasOwnProperty('regiao') && !dadosParaAtualizar.regiao) {
             // Permite desassociar região (definir como null)
             dadosParaAtualizar.regiao = null;
             logger.debug(`[PlacaService] Região desassociada da placa ID ${id}.`);
        } else if (!dadosParaAtualizar.hasOwnProperty('regiao')) {
            // Se não veio região no update, remove o campo para não sobrescrever
            delete dadosParaAtualizar.regiao;
        }

        // Atualiza a placa na base de dados
        logger.debug(`[PlacaService] Tentando atualizar placa ID ${id} no DB com dados: ${JSON.stringify(dadosParaAtualizar)}`);
        // runValidators: true -> Garante que validações do schema Mongoose são executadas (ex: required)
        // new: true -> Retorna o documento *após* a atualização
        const placaAtualizada = await Placa.findByIdAndUpdate(id, dadosParaAtualizar, { new: true, runValidators: true }).populate('regiao', 'nome');

        if (!placaAtualizada) {
            // Redundante, mas seguro
             logger.error(`[PlacaService] Placa ID ${id} não encontrada durante findByIdAndUpdate, apesar da verificação inicial.`);
             const error = new Error('Placa não encontrada durante a atualização.');
             error.status = 404;
             throw error;
        }
        logger.info(`[PlacaService] Placa ID ${id} atualizada com sucesso no DB.`);

        // Se uma nova imagem foi carregada OU a existente foi removida, tenta apagar a antiga do R2
        if (imagemAntigaKeyCompleta && (!file || imagemAntigaKeyCompleta !== file.key)) {
            logger.info(`[PlacaService] Solicitando exclusão da imagem antiga do R2: ${imagemAntigaKeyCompleta}`);
            try {
                await deleteFileFromR2(imagemAntigaKeyCompleta);
                logger.info(`[PlacaService] Imagem antiga ${imagemAntigaKeyCompleta} excluída com sucesso do R2.`);
            } catch (deleteError) {
                logger.error(`[PlacaService] Falha NÃO CRÍTICA ao excluir imagem antiga ${imagemAntigaKeyCompleta} do R2:`, deleteError);
            }
        }

        return placaAtualizada; // Retorna o documento Mongoose atualizado e populado

    } catch (error) {
        // Log detalhado do erro
        logger.error(`[PlacaService] Erro Mongoose/DB ao atualizar placa ID ${id}: ${error.message}`, { stack: error.stack, code: error.code, keyValue: error.keyValue });

        // Trata erro de índice único (placa duplicada na mesma região/empresa)
        if (error.code === 11000) {
            const numPlaca = dadosParaAtualizar.numero_placa || placaAntiga.numero_placa; // Pega o número que causou o conflito
            const duplicateError = new Error(`Já existe uma placa com o número '${numPlaca}' nesta região.`);
            duplicateError.status = 409;
            throw duplicateError;
        }
         // Relança erros 400/404 já definidos ou outros como 500
        if (error.status === 400 || error.status === 404) throw error;
        const serviceError = new Error(`Erro interno ao atualizar placa: ${error.message}`);
        serviceError.status = 500;
        throw serviceError;
    }
};


/**
 * Busca todas as placas de uma empresa com paginação, filtros e ordenação.
 * Adiciona informações sobre aluguel ativo (cliente_nome, aluguel_data_fim).
 * @param {string} empresaId - ObjectId da empresa.
 * @param {object} queryParams - Parâmetros da query (page, limit, sortBy, order, regiao_id, disponivel, search).
 * @returns {Promise<object>} - Objeto com { data: Array<object>, pagination: object }.
 * @throws {Error} - Lança erro 500 em caso de falha na DB.
 */
exports.getAllPlacas = async (empresaId, queryParams) => {
    logger.info(`[PlacaService] Buscando placas para empresa ${empresaId}.`);
    logger.debug(`[PlacaService] Query Params: ${JSON.stringify(queryParams)}`);
    const { page = 1, limit = 10, sortBy = 'createdAt', order = 'desc', regiao_id, disponivel, search } = queryParams;

    // Converte page e limit para inteiros e calcula skip
    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);
    if (isNaN(pageInt) || pageInt < 1 || isNaN(limitInt) || limitInt < 1) {
        const error = new Error('Parâmetros de paginação inválidos (page/limit).');
        error.status = 400;
        logger.warn(`[PlacaService] Falha na busca: ${error.message}`);
        throw error;
    }
    const skip = (pageInt - 1) * limitInt;
    const sortOrder = order === 'desc' ? -1 : 1;

    // Monta a query Mongoose
    let query = { empresa: empresaId };
    if (regiao_id && regiao_id !== 'todas') {
        // Valida se regiao_id é um ObjectId válido antes de usar
        if (mongoose.Types.ObjectId.isValid(regiao_id)) {
            query.regiao = regiao_id;
        } else {
             logger.warn(`[PlacaService] regiao_id inválido fornecido: ${regiao_id}. Ignorando filtro.`);
             // Não adiciona filtro inválido
        }
    }
    if (disponivel === 'true' || disponivel === 'false') {
        query.disponivel = disponivel === 'true';
    }
    if (search) {
        const searchRegex = new RegExp(search.trim(), 'i'); // Case-insensitive
        query.$or = [
            { numero_placa: searchRegex },
            { nomeDaRua: searchRegex }
        ];
    }

    logger.debug(`[PlacaService] Query Mongoose construída: ${JSON.stringify(query)}`);
    logger.debug(`[PlacaService] Opções: skip=${skip}, limit=${limitInt}, sort={${sortBy}:${sortOrder}}`);

    try {
        // Busca as placas e o total de documentos em paralelo
        const [placas, totalDocs] = await Promise.all([
            Placa.find(query)
                .populate('regiao', 'nome') // Popula nome da região
                .sort({ [sortBy]: sortOrder })
                .skip(skip)
                .limit(limitInt)
                .lean(), // Usa lean para performance e facilitar adição de campos
            Placa.countDocuments(query)
        ]);
        logger.info(`[PlacaService] Encontradas ${placas.length} placas nesta página. Total de documentos: ${totalDocs}.`);


        // Busca informações do aluguel ativo APÓS buscar as placas
        const hoje = new Date();
        const placaIds = placas.map(p => p._id); // Obtém os ObjectIds das placas encontradas

        if (placaIds.length > 0) {
            logger.debug(`[PlacaService] Buscando alugueis ativos para ${placaIds.length} placas.`);
            const alugueisAtivos = await Aluguel.find({
                placa: { $in: placaIds },
                empresa: empresaId,
                data_inicio: { $lte: hoje },
                data_fim: { $gte: hoje }
            }).populate('cliente', 'nome').lean(); // Popula nome do cliente
            logger.debug(`[PlacaService] Encontrados ${alugueisAtivos.length} alugueis ativos.`);

            // Mapeia os alugueis por ID da placa para acesso rápido
            const aluguelMap = alugueisAtivos.reduce((map, aluguel) => {
                map[aluguel.placa.toString()] = aluguel; // Converte ObjectId para string como chave
                return map;
            }, {});

            // Adiciona informações do aluguel aos objetos das placas
            placas.forEach(placa => {
                const aluguel = aluguelMap[placa._id.toString()]; // Usa string do ObjectId para buscar no map
                if (aluguel && aluguel.cliente) {
                    placa.cliente_nome = aluguel.cliente.nome;
                    placa.aluguel_data_fim = aluguel.data_fim;
                    logger.debug(`[PlacaService] Placa ${placa._id} associada ao cliente ${placa.cliente_nome}.`);
                }
            });
        }


        // Calcula paginação
        const totalPages = Math.ceil(totalDocs / limitInt);
        const pagination = {
            totalDocs,
            totalPages,
            currentPage: pageInt,
            limit: limitInt
        };

        logger.debug(`[PlacaService] Retornando dados e paginação.`);
        // O mapeamento _id -> id deve ocorrer globalmente
        return { data: placas, pagination };

    } catch (error) {
        logger.error(`[PlacaService] Erro Mongoose/DB ao buscar placas: ${error.message}`, { stack: error.stack });
        const serviceError = new Error(`Erro interno ao buscar placas: ${error.message}`);
        serviceError.status = 500;
        throw serviceError;
    }
};

/**
 * Busca uma placa específica pelo ID, garantindo que pertence à empresa.
 * Adiciona informações do aluguel ativo se a placa estiver indisponível.
 * @param {string} id - ObjectId da placa.
 * @param {string} empresaId - ObjectId da empresa proprietária.
 * @returns {Promise<object>} - A placa encontrada (objeto simples populado).
 * @throws {Error} - Lança erro com status 404 ou 500.
 */
exports.getPlacaById = async (id, empresaId) => {
    logger.info(`[PlacaService] Buscando placa ID ${id} para empresa ${empresaId}`);
    try {
        // Encontra a placa e popula o nome da região
        const placa = await Placa.findOne({ _id: id, empresa: empresaId })
                                  .populate('regiao', 'nome') // Popula o campo 'regiao' e seleciona apenas o campo 'nome'
                                  .lean(); // Usa lean para retornar objeto simples

        if (!placa) {
            const error = new Error('Placa não encontrada.');
            error.status = 404;
            logger.warn(`[PlacaService] Placa ID ${id} não encontrada ou não pertence à empresa ${empresaId}.`);
            throw error;
        }
        logger.info(`[PlacaService] Placa ${placa.numero_placa} (ID: ${id}) encontrada.`);

        // Busca o aluguel ativo para esta placa, se ela estiver marcada como indisponível
        if (!placa.disponivel) {
            logger.debug(`[PlacaService] Placa ID ${id} está indisponível. Buscando aluguel ativo...`);
            const hoje = new Date();
            const aluguelAtivo = await Aluguel.findOne({
                placa: placa._id, // Usa o ObjectId recuperado
                empresa: empresaId,
                data_inicio: { $lte: hoje },
                data_fim: { $gte: hoje }
            }).populate('cliente', 'nome').lean(); // Popula o nome do cliente

            if (aluguelAtivo && aluguelAtivo.cliente) {
                placa.cliente_nome = aluguelAtivo.cliente.nome;
                placa.aluguel_data_fim = aluguelAtivo.data_fim;
                logger.debug(`[PlacaService] Aluguel ativo encontrado para placa ${id}, cliente: ${placa.cliente_nome}.`);
            } else {
                 logger.debug(`[PlacaService] Placa ${id} está indisponível, mas nenhum aluguel ATIVO foi encontrado (pode ser manutenção).`);
                 // Se está indisponível e sem aluguel ativo, assume-se manutenção
                 placa.status_manutencao = true; // Adiciona um flag para o frontend, se útil
            }
        }

        // O mapeamento _id -> id deve ocorrer globalmente
        return placa;

    } catch (error) {
        if (error.status === 404) throw error;
        logger.error(`[PlacaService] Erro Mongoose/DB ao buscar placa por ID ${id}: ${error.message}`, { stack: error.stack });
        const serviceError = new Error(`Erro interno ao buscar detalhes da placa: ${error.message}`);
        serviceError.status = 500;
        throw serviceError;
    }
};


/**
 * Apaga uma placa, verificando se não está alugada. Apaga a imagem do R2 se existir.
 * @param {string} id - ObjectId da placa a apagar.
 * @param {string} empresaId - ObjectId da empresa proprietária.
 * @returns {Promise<void>}
 * @throws {Error} - Lança erro com status 409, 404 ou 500.
 */
exports.deletePlaca = async (id, empresaId) => {
    logger.info(`[PlacaService] Tentando apagar placa ID ${id} para empresa ${empresaId}.`);

    try {
        // Verifica se a placa está alugada atualmente
        const hoje = new Date();
        logger.debug(`[PlacaService] Verificando se placa ${id} está alugada hoje (${hoje.toISOString()}).`);
        const aluguelAtivo = await Aluguel.findOne({
            placa: id,
            empresa: empresaId,
            data_inicio: { $lte: hoje },
            data_fim: { $gte: hoje }
        }).lean(); // lean() é suficiente

        if (aluguelAtivo) {
            const error = new Error('Não é possível apagar uma placa que está atualmente alugada.');
            error.status = 409; // Conflict
            logger.warn(`[PlacaService] Tentativa de apagar placa ${id} falhou: ${error.message}`);
            throw error;
        }
        logger.debug(`[PlacaService] Placa ${id} não está alugada. Prosseguindo com a exclusão.`);

        // Encontra e apaga a placa para obter a URL da imagem antes de apagar
        logger.debug(`[PlacaService] Tentando encontrar e apagar placa ID ${id}.`);
        const placaApagada = await Placa.findOneAndDelete({ _id: id, empresa: empresaId });

        if (!placaApagada) {
            const error = new Error('Placa não encontrada.');
            error.status = 404;
            logger.warn(`[PlacaService] Placa ID ${id} não encontrada ou não pertence à empresa ${empresaId} para exclusão.`);
            throw error;
        }
        logger.info(`[PlacaService] Placa ${placaApagada.numero_placa} (ID: ${id}) apagada com sucesso do DB.`);

        // Se a placa tinha imagem, tenta apagar do R2
        if (placaApagada.imagem) {
            const imagemKeyCompleta = `${process.env.R2_FOLDER_NAME || 'inmidia-uploads-sistema'}/${placaApagada.imagem}`;
            logger.info(`[PlacaService] Solicitando exclusão da imagem ${imagemKeyCompleta} do R2 para placa apagada ID ${id}.`);
            try {
                await deleteFileFromR2(imagemKeyCompleta);
                logger.info(`[PlacaService] Imagem ${imagemKeyCompleta} excluída com sucesso do R2.`);
            } catch (deleteError) {
                logger.error(`[PlacaService] Falha NÃO CRÍTICA ao excluir imagem ${imagemKeyCompleta} do R2 para placa apagada ID ${id}:`, deleteError);
            }
        }

        // Opcional: Apagar histórico de alugueis desta placa? (Já comentado no original)

    } catch (error) {
        if (error.status === 409 || error.status === 404) throw error;
        logger.error(`[PlacaService] Erro Mongoose/DB ao apagar placa ID ${id}: ${error.message}`, { stack: error.stack, code: error.code });
        const serviceError = new Error(`Erro interno ao apagar placa: ${error.message}`);
        serviceError.status = 500;
        throw serviceError;
    }
};

/**
 * Alterna a disponibilidade de uma placa (manutenção), impedindo se estiver alugada.
 * @param {string} id - ObjectId da placa.
 * @param {string} empresaId - ObjectId da empresa proprietária.
 * @returns {Promise<object>} - A placa com o status atualizado (objeto simples populado).
 * @throws {Error} - Lança erro com status 409, 404 ou 500.
 */
exports.toggleDisponibilidade = async (id, empresaId) => {
    logger.info(`[PlacaService] Tentando alternar disponibilidade da placa ID ${id} para empresa ${empresaId}`);

    let placa;
    try {
        // Busca a placa (não usar lean() aqui, pois vamos chamar .save())
        placa = await Placa.findOne({ _id: id, empresa: empresaId });
        if (!placa) {
            const error = new Error('Placa não encontrada.');
            error.status = 404;
            logger.warn(`[PlacaService] Placa ID ${id} não encontrada ou não pertence à empresa ${empresaId} para alternar disponibilidade.`);
            throw error;
        }
        logger.debug(`[PlacaService] Placa ${placa.numero_placa} (ID: ${id}) encontrada. Status atual: ${placa.disponivel}.`);

        // Verifica se está alugada atualmente (só impede de colocar em manutenção se estiver alugada)
        if (placa.disponivel) { // Se está disponível e queremos colocar em manutenção (disponivel=false)
             const hoje = new Date();
             logger.debug(`[PlacaService] Verificando se placa disponível ${id} está alugada hoje.`);
             const aluguelAtivo = await Aluguel.findOne({
                placa: id,
                empresa: empresaId,
                data_inicio: { $lte: hoje },
                data_fim: { $gte: hoje }
             }).lean(); // lean() é suficiente

             if (aluguelAtivo) {
                const error = new Error('Não é possível colocar uma placa alugada em manutenção.');
                error.status = 409; // Conflict
                logger.warn(`[PlacaService] Tentativa de colocar placa ${id} em manutenção falhou: ${error.message}`);
                throw error;
             }
             logger.debug(`[PlacaService] Placa ${id} não está alugada, pode ser colocada em manutenção.`);
        } else { // Se está indisponível (manutenção ou alugada) e queremos torná-la disponível (disponivel=true)
             logger.debug(`[PlacaService] Placa ${id} está indisponível. Permitindo tornar disponível.`);
             // Não precisamos verificar aluguel aqui, pois a intenção é justamente liberá-la (seja de manutenção ou fim de aluguel implícito)
        }

        // Alterna o status e salva
        placa.disponivel = !placa.disponivel;
        logger.debug(`[PlacaService] Tentando salvar placa ID ${id} com novo status disponivel=${placa.disponivel}.`);
        await placa.save();
        logger.info(`[PlacaService] Disponibilidade da placa ID ${id} alternada com sucesso para ${placa.disponivel}.`);

        // Retorna a placa atualizada populada e como objeto simples para consistência
        const placaAtualizadaPopulada = await Placa.findById(id).populate('regiao', 'nome').lean();
        return placaAtualizadaPopulada;

    } catch (error) {
        if (error.status === 409 || error.status === 404) throw error;
        logger.error(`[PlacaService] Erro Mongoose/DB ao alternar disponibilidade da placa ID ${id}: ${error.message}`, { stack: error.stack, code: error.code });
        const serviceError = new Error(`Erro interno ao alternar disponibilidade: ${error.message}`);
        serviceError.status = 500;
        throw serviceError;
    }
};

/**
 * Busca todas as localizações de placas (ID, número, rua, coordenadas) para uma empresa.
 * @param {string} empresaId - ObjectId da empresa.
 * @returns {Promise<Array<object>>} - Array de objetos com { _id, numero_placa, nomeDaRua, coordenadas }.
 * @throws {Error} - Lança erro 500 em caso de falha na DB.
 */
exports.getAllPlacaLocations = async (empresaId) => {
    logger.info(`[PlacaService] Buscando localizações de placas para empresa ${empresaId}.`);
    try {
        const locations = await Placa.find(
            { empresa: empresaId, coordenadas: { $exists: true, $ne: null, $ne: "" } }, // Filtra apenas as que têm coordenadas válidas
            '_id numero_placa nomeDaRua coordenadas' // Seleciona apenas os campos necessários
        ).lean(); // Retorna objetos simples
        logger.info(`[PlacaService] Encontradas ${locations.length} localizações de placas para empresa ${empresaId}.`);
        // O mapeamento _id -> id deve ocorrer globalmente
        return locations;
    } catch (error) {
        logger.error(`[PlacaService] Erro Mongoose/DB ao buscar localizações de placas: ${error.message}`, { stack: error.stack });
        const serviceError = new Error(`Erro interno ao buscar localizações: ${error.message}`);
        serviceError.status = 500;
        throw serviceError;
    }
};