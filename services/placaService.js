// services/placaService.js

const Placa = require('../models/Placa');
const Regiao = require('../models/Regiao'); 
const Aluguel = require('../models/Aluguel'); 
const logger = require('../config/logger');
const path = require('path');
const mongoose = require('mongoose');
const { deleteFileFromR2 } = require('../middlewares/uploadMiddleware'); 
const AppError = require('../utils/AppError'); // [MELHORIA] Importa AppError

/**
 * Cria uma nova placa.
 * @param {object} placaData - Dados da placa.
 * @param {object} file - Ficheiro de imagem (opcional).
 * @param {string} empresaId - ObjectId da empresa proprietária.
 * @returns {Promise<object>} - A nova placa criada (objeto JSON formatado).
 * @throws {AppError} - Lança erro com status 400, 404, 409 ou 500.
 */
exports.createPlaca = async (placaData, file, empresaId) => {
    logger.info(`[PlacaService] Tentando criar placa para empresa ${empresaId}.`);

    if (!placaData.numero_placa || !placaData.regiao) {
        // [MELHORIA] Usa AppError
        throw new AppError('Número da placa e região são obrigatórios.', 400);
    }

    const dadosParaSalvar = { ...placaData, empresa: empresaId };

    if (file) {
        logger.info(`[PlacaService] Ficheiro recebido: ${file.key}`);
        dadosParaSalvar.imagem = path.basename(file.key); 
    } else {
        delete dadosParaSalvar.imagem; 
    }

    try {
        // Validação de região (garante que existe e pertence à empresa)
        logger.debug(`[PlacaService] Validando região ID ${dadosParaSalvar.regiao} para empresa ${empresaId}.`);
        const regiaoExistente = await Regiao.findOne({ _id: dadosParaSalvar.regiao, empresa: empresaId }).lean();
        if (!regiaoExistente) {
            // [MELHORIA] Usa AppError
            throw new AppError(`Região ID ${dadosParaSalvar.regiao} inválida ou não pertence à empresa ${empresaId}.`, 404);
        }
        logger.debug(`[PlacaService] Região ${regiaoExistente.nome} (ID: ${dadosParaSalvar.regiao}) validada.`);

        const novaPlaca = new Placa(dadosParaSalvar);

        logger.debug(`[PlacaService] Tentando salvar nova placa ${dadosParaSalvar.numero_placa} no DB.`);
        const placaSalva = await novaPlaca.save();
        logger.info(`[PlacaService] Placa ${placaSalva.numero_placa} (ID: ${placaSalva._id}) criada com sucesso para empresa ${empresaId}.`);

        // [MELHORIA] Popular o documento salvo e usar .toJSON()
        await placaSalva.populate('regiao', 'nome');

        // toJSON() aplica a transformação global (_id -> id, remove __v)
        return placaSalva.toJSON(); 

    } catch (error) {
        logger.error(`[PlacaService] Erro Mongoose/DB ao criar placa: ${error.message}`, { stack: error.stack, code: error.code, keyValue: error.keyValue });

        if (error.code === 11000) {
            // [MELHORIA] Usa AppError
            throw new AppError(`Já existe uma placa com o número '${placaData.numero_placa}' nesta região.`, 409);
        }
        // [MELHORIA] Relança AppErrors (400, 404) ou lança 500
        if (error instanceof AppError) throw error;
        throw new AppError(`Erro interno ao criar placa: ${error.message}`, 500);
    }
};

/**
 * Atualiza uma placa existente.
 * @param {string} id - ObjectId da placa a atualizar.
 * @param {object} placaData - Novos dados da placa.
 * @param {object} file - Novo ficheiro de imagem (opcional).
 * @param {string} empresaId - ObjectId da empresa proprietária.
 * @returns {Promise<object>} - A placa atualizada (objeto JSON formatado).
 * @throws {AppError} - Lança erro com status 404, 400, 409 ou 500.
 */
exports.updatePlaca = async (id, placaData, file, empresaId) => {
    logger.info(`[PlacaService] Tentando atualizar placa ID ${id} para empresa ${empresaId}.`);

    let placaAntiga;
    try {
        placaAntiga = await Placa.findOne({ _id: id, empresa: empresaId });
        if (!placaAntiga) {
            // [MELHORIA] Usa AppError
            throw new AppError('Placa não encontrada.', 404);
        }
    } catch (error) {
        if (error instanceof AppError) throw error;
        logger.error(`[PlacaService] Erro Mongoose/DB ao buscar placa antiga ID ${id}: ${error.message}`, { stack: error.stack });
        throw new AppError(`Erro interno ao buscar placa para atualização: ${error.message}`, 500);
    }

    const dadosParaAtualizar = { ...placaData };
    let imagemAntigaKeyCompleta = null; 

    // Lógica para tratar a imagem (mantida)
    if (file) {
        imagemAntigaKeyCompleta = placaAntiga.imagem ? `${process.env.R2_FOLDER_NAME || 'inmidia-uploads-sistema'}/${placaAntiga.imagem}` : null;
        dadosParaAtualizar.imagem = path.basename(file.key);
    } else if (dadosParaAtualizar.hasOwnProperty('imagem') && dadosParaAtualizar.imagem === '') {
        imagemAntigaKeyCompleta = placaAntiga.imagem ? `${process.env.R2_FOLDER_NAME || 'inmidia-uploads-sistema'}/${placaAntiga.imagem}` : null;
        dadosParaAtualizar.imagem = null; 
    } else {
        delete dadosParaAtualizar.imagem; 
    }

    try {
        // Validação de região (se foi alterada)
        if (dadosParaAtualizar.regiao && String(dadosParaAtualizar.regiao) !== String(placaAntiga.regiao)) {
             const regiaoExistente = await Regiao.findOne({ _id: dadosParaAtualizar.regiao, empresa: empresaId }).lean();
             if (!regiaoExistente) {
                // [MELHORIA] Usa AppError
                throw new AppError(`Região ID ${dadosParaAtualizar.regiao} inválida ou não pertence à empresa ${empresaId}.`, 404);
             }
        } else if (dadosParaAtualizar.hasOwnProperty('regiao') && !dadosParaAtualizar.regiao) {
             dadosParaAtualizar.regiao = null;
        } else if (!dadosParaAtualizar.hasOwnProperty('regiao')) {
            delete dadosParaAtualizar.regiao;
        }

        // Atualiza a placa na base de dados
        // Popula antes de retornar para que .toJSON() inclua o nome da região
        const placaAtualizadaDoc = await Placa.findByIdAndUpdate(id, dadosParaAtualizar, { new: true, runValidators: true }).populate('regiao', 'nome'); 
        
        if (!placaAtualizadaDoc) {
             // [MELHORIA] Usa AppError
             throw new AppError('Placa não encontrada durante a atualização.', 404);
        }
        logger.info(`[PlacaService] Placa ID ${id} atualizada com sucesso no DB.`);

        // Se a imagem foi alterada, apaga a antiga (lógica mantida)
        if (imagemAntigaKeyCompleta && (!file || imagemAntigaKeyCompleta !== file.key)) {
            try {
                await deleteFileFromR2(imagemAntigaKeyCompleta);
            } catch (deleteError) {
                logger.error(`[PlacaService] Falha NÃO CRÍTICA ao excluir imagem antiga ${imagemAntigaKeyCompleta} do R2:`, deleteError);
            }
        }

        // Retorna o objeto JSON formatado
        return placaAtualizadaDoc.toJSON();

    } catch (error) {
        logger.error(`[PlacaService] Erro Mongoose/DB ao atualizar placa ID ${id}: ${error.message}`, { stack: error.stack, code: error.code, keyValue: error.keyValue });

        if (error.code === 11000) {
            const numPlaca = dadosParaAtualizar.numero_placa || placaAntiga.numero_placa; 
            // [MELHORIA] Usa AppError
            throw new AppError(`Já existe uma placa com o número '${numPlaca}' nesta região.`, 409);
        }
        
        // [MELHORIA] Relança AppErrors (400, 404, 409) ou lança 500
        if (error instanceof AppError) throw error;
        throw new AppError(`Erro interno ao atualizar placa: ${error.message}`, 500);
    }
};


/**
 * Busca todas as placas de uma empresa com paginação, filtros e ordenação.
 * @param {string} empresaId - ObjectId da empresa.
 * @param {object} queryParams - Parâmetros da query (page, limit, sortBy, order, regiao_id, disponivel, search).
 * @returns {Promise<object>} - Objeto com { data: Array<object>, pagination: object }.
 * @throws {AppError} - Lança erro 400 ou 500.
 */
exports.getAllPlacas = async (empresaId, queryParams) => {
    logger.info(`[PlacaService] Buscando placas para empresa ${empresaId}.`);
    const { page = 1, limit = 10, sortBy = 'createdAt', order = 'desc', regiao_id, disponivel, search } = queryParams;

    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);
    if (isNaN(pageInt) || pageInt < 1 || isNaN(limitInt) || limitInt < 1) {
        // [MELHORIA] Usa AppError
        throw new AppError('Parâmetros de paginação inválidos (page/limit).', 400);
    }
    const skip = (pageInt - 1) * limitInt;
    const sortOrder = order === 'desc' ? -1 : 1;

    let query = { empresa: empresaId };
    if (regiao_id && regiao_id !== 'todas') {
        if (mongoose.Types.ObjectId.isValid(regiao_id)) {
            query.regiao = regiao_id;
        } else {
             logger.warn(`[PlacaService] regiao_id inválido fornecido: ${regiao_id}. Ignorando filtro.`);
        }
    }
    if (disponivel === 'true' || disponivel === 'false') {
        query.disponivel = disponivel === 'true';
    }
    if (search) {
        const searchRegex = new RegExp(search.trim(), 'i'); 
        query.$or = [
            { numero_placa: searchRegex },
            { nomeDaRua: searchRegex }
        ];
    }

    try {
        const [placasDocs, totalDocs] = await Promise.all([
            Placa.find(query)
                .populate('regiao', 'nome') 
                .sort({ [sortBy]: sortOrder })
                .skip(skip)
                .limit(limitInt)
                .exec(), // Retorna documentos Mongoose
            Placa.countDocuments(query)
        ]);

        // [MELHORIA] Mapeia documentos Mongoose para objetos JSON formatados
        const placas = placasDocs.map(doc => doc.toJSON());
        logger.info(`[PlacaService] Encontradas ${placas.length} placas nesta página. Total de documentos: ${totalDocs}.`);

        // Busca informações do aluguel ativo
        const hoje = new Date();
        const placaIds = placas.map(p => p.id).filter(id => id); 

        if (placaIds.length > 0) {
            const alugueisAtivos = await Aluguel.find({
                placa: { $in: placaIds }, 
                empresa: empresaId,
                data_inicio: { $lte: hoje },
                data_fim: { $gte: hoje }
            }).populate('cliente', 'nome').lean(); 

            const aluguelMap = alugueisAtivos.reduce((map, aluguel) => {
                map[aluguel.placa.toString()] = aluguel;
                return map;
            }, {});

            // Adiciona informações do aluguel aos objetos das placas
            placas.forEach(placa => {
                const aluguel = aluguelMap[placa.id]; 
                if (aluguel && aluguel.cliente) {
                    placa.cliente_nome = aluguel.cliente.nome;
                    placa.aluguel_data_fim = aluguel.data_fim;
                }
            });
        }

        // Calcula paginação (mantido)
        const totalPages = Math.ceil(totalDocs / limitInt);
        const pagination = { totalDocs, totalPages, currentPage: pageInt, limit: limitInt };

        return { data: placas, pagination };

    } catch (error) {
        logger.error(`[PlacaService] Erro Mongoose/DB ao buscar placas: ${error.message}`, { stack: error.stack });
        // [MELHORIA] Relança AppErrors (400) ou lança 500
        if (error instanceof AppError) throw error;
        throw new AppError(`Erro interno ao buscar placas: ${error.message}`, 500);
    }
};

/**
 * Busca uma placa específica pelo ID, garantindo que pertence à empresa.
 * @param {string} id - ObjectId da placa.
 * @param {string} empresaId - ObjectId da empresa proprietária.
 * @returns {Promise<object>} - A placa encontrada (objeto JSON formatado populado).
 * @throws {AppError} - Lança erro com status 404 ou 500.
 */
exports.getPlacaById = async (id, empresaId) => {
    logger.info(`[PlacaService] Buscando placa ID ${id} para empresa ${empresaId}`);
    try {
        // Encontra a placa e popula o nome da região
        const placaDoc = await Placa.findOne({ _id: id, empresa: empresaId })
                                  .populate('regiao', 'nome') 
                                  .exec(); 

        if (!placaDoc) {
            // [MELHORIA] Usa AppError
            throw new AppError('Placa não encontrada.', 404);
        }
        
        // Retorna o objeto JSON formatado
        const placa = placaDoc.toJSON();
        
        logger.info(`[PlacaService] Placa ${placa.numero_placa} (ID: ${id}) encontrada.`);

        // Busca o aluguel ativo para esta placa, se ela estiver marcada como indisponível
        if (!placa.disponivel) {
            const hoje = new Date();
            const aluguelAtivo = await Aluguel.findOne({
                placa: placa.id, 
                empresa: empresaId,
                data_inicio: { $lte: hoje },
                data_fim: { $gte: hoje }
            }).populate('cliente', 'nome').lean(); 

            if (aluguelAtivo && aluguelAtivo.cliente) {
                placa.cliente_nome = aluguelAtivo.cliente.nome;
                placa.aluguel_data_fim = aluguelAtivo.data_fim;
            } else {
                 placa.status_manutencao = true; 
            }
        }

        return placa;

    } catch (error) {
        logger.error(`[PlacaService] Erro Mongoose/DB ao buscar placa por ID ${id}: ${error.message}`, { stack: error.stack });
        // [MELHORIA] Relança AppErrors (404) ou lança 500
        if (error instanceof AppError) throw error;
        throw new AppError(`Erro interno ao buscar detalhes da placa: ${error.message}`, 500);
    }
};

/**
 * Apaga uma placa, verificando se não está alugada. Apaga a imagem do R2 se existir.
 * @param {string} id - ObjectId da placa a apagar.
 * @param {string} empresaId - ObjectId da empresa proprietária.
 * @returns {Promise<void>}
 * @throws {AppError} - Lança erro com status 409, 404 ou 500.
 */
exports.deletePlaca = async (id, empresaId) => {
    logger.info(`[PlacaService] Tentando apagar placa ID ${id} para empresa ${empresaId}.`);

    try {
        // Verifica se a placa está alugada atualmente
        const hoje = new Date();
        const aluguelAtivo = await Aluguel.findOne({
            placa: id,
            empresa: empresaId,
            data_inicio: { $lte: hoje },
            data_fim: { $gte: hoje }
        }).lean(); 

        if (aluguelAtivo) {
            // [MELHORIA] Usa AppError
            throw new AppError('Não é possível apagar uma placa que está atualmente alugada.', 409);
        }

        // Encontra e apaga a placa para obter a URL da imagem antes de apagar
        const placaApagada = await Placa.findOneAndDelete({ _id: id, empresa: empresaId });

        if (!placaApagada) {
            // [MELHORIA] Usa AppError
            throw new AppError('Placa não encontrada.', 404);
        }
        logger.info(`[PlacaService] Placa ${placaApagada.numero_placa} (ID: ${id}) apagada com sucesso do DB.`);

        // Se a placa tinha imagem, tenta apagar do R2 (lógica mantida)
        if (placaApagada.imagem) {
            const imagemKeyCompleta = `${process.env.R2_FOLDER_NAME || 'inmidia-uploads-sistema'}/${placaApagada.imagem}`;
            try {
                await deleteFileFromR2(imagemKeyCompleta);
            } catch (deleteError) {
                logger.error(`[PlacaService] Falha NÃO CRÍTICA ao excluir imagem ${imagemKeyCompleta} do R2 para placa apagada ID ${id}:`, deleteError);
            }
        }

    } catch (error) {
        logger.error(`[PlacaService] Erro Mongoose/DB ao apagar placa ID ${id}: ${error.message}`, { stack: error.stack, code: error.code });
        // [MELHORIA] Relança AppErrors (409, 404) ou lança 500
        if (error instanceof AppError) throw error;
        throw new AppError(`Erro interno ao apagar placa: ${error.message}`, 500);
    }
};

/**
 * Alterna a disponibilidade de uma placa (manutenção), impedindo se estiver alugada.
 * @param {string} id - ObjectId da placa.
 * @param {string} empresaId - ObjectId da empresa proprietária.
 * @returns {Promise<object>} - A placa com o status atualizado (objeto JSON formatado).
 * @throws {AppError} - Lança erro com status 409, 404 ou 500.
 */
exports.toggleDisponibilidade = async (id, empresaId) => {
    logger.info(`[PlacaService] Tentando alternar disponibilidade da placa ID ${id} para empresa ${empresaId}`);

    let placa;
    try {
        placa = await Placa.findOne({ _id: id, empresa: empresaId });
        if (!placa) {
            // [MELHORIA] Usa AppError
            throw new AppError('Placa não encontrada.', 404);
        }

        // Verifica se está alugada atualmente (só impede de colocar em manutenção se estiver alugada)
        if (placa.disponivel) { 
             const hoje = new Date();
             const aluguelAtivo = await Aluguel.findOne({
                placa: id,
                empresa: empresaId,
                data_inicio: { $lte: hoje },
                data_fim: { $gte: hoje }
             }).lean(); 

             if (aluguelAtivo) {
                // [MELHORIA] Usa AppError
                throw new AppError('Não é possível colocar uma placa alugada em manutenção.', 409);
             }
        }

        // Alterna o status e salva
        placa.disponivel = !placa.disponivel;
        await placa.save();

        // Retorna a placa atualizada populada e como objeto JSON formatado
        await placa.populate('regiao', 'nome');
        return placa.toJSON();

    } catch (error) {
        logger.error(`[PlacaService] Erro Mongoose/DB ao alternar disponibilidade da placa ID ${id}: ${error.message}`, { stack: error.stack, code: error.code });
        // [MELHORIA] Relança AppErrors (409, 404) ou lança 500
        if (error instanceof AppError) throw error;
        throw new AppError(`Erro interno ao alternar disponibilidade: ${error.message}`, 500);
    }
};

/**
 * Busca todas as localizações de placas (ID, número, rua, coordenadas) para uma empresa.
 * @param {string} empresaId - ObjectId da empresa.
 * @returns {Promise<Array<object>>} - Array de objetos com { id, numero_placa, nomeDaRua, coordenadas }.
 * @throws {AppError} - Lança erro 500 em caso de falha na DB.
 */
exports.getAllPlacaLocations = async (empresaId) => {
    logger.info(`[PlacaService] Buscando localizações de placas para empresa ${empresaId}.`);
    try {
        const locations = await Placa.find(
            { empresa: empresaId, coordenadas: { $exists: true, $ne: null, $ne: "" } }, 
            '_id numero_placa nomeDaRua coordenadas'
        ).lean(); 
        
        // [MELHORIA] Mapeamento para garantir 'id' na resposta (já que é .lean())
        const locationsFormatted = locations.map(location => ({
            id: location._id ? location._id.toString() : undefined,
            numero_placa: location.numero_placa,
            nomeDaRua: location.nomeDaRua,
            coordenadas: location.coordenadas
        }));

        logger.info(`[PlacaService] Encontradas ${locationsFormatted.length} localizações de placas para empresa ${empresaId}.`);
        return locationsFormatted;
        
    } catch (error) {
        logger.error(`[PlacaService] Erro Mongoose/DB ao buscar localizações de placas: ${error.message}`, { stack: error.stack });
        // [MELHORIA] Usa AppError
        throw new AppError(`Erro interno ao buscar localizações: ${error.message}`, 500);
    }
};