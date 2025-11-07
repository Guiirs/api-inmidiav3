// services/placaService.js

const Placa = require('../models/Placa');
const Regiao = require('../models/Regiao'); 
const Aluguel = require('../models/Aluguel'); 
const PropostaInterna = require('../models/PropostaInterna');
const logger = require('../config/logger');
const path = require('path');
const mongoose = require('mongoose');
const { deleteFileFromR2 } = require('../middlewares/uploadMiddleware'); 
const AppError = require('../utils/AppError'); 

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
            throw new AppError(`Região ID ${dadosParaSalvar.regiao} inválida ou não pertence à empresa ${empresaId}.`, 404);
        }
        logger.debug(`[PlacaService] Região ${regiaoExistente.nome} (ID: ${dadosParaSalvar.regiao}) validada.`);

        const novaPlaca = new Placa(dadosParaSalvar);

        logger.debug(`[PlacaService] Tentando salvar nova placa ${dadosParaSalvar.numero_placa} no DB.`);
        const placaSalva = await novaPlaca.save();
        logger.info(`[PlacaService] Placa ${placaSalva.numero_placa} (ID: ${placaSalva._id}) criada com sucesso para empresa ${empresaId}.`);

        await placaSalva.populate('regiao', 'nome');

        return placaSalva.toJSON(); 

    } catch (error) {
        logger.error(`[PlacaService] Erro Mongoose/DB ao criar placa: ${error.message}`, { stack: error.stack, code: error.code, keyValue: error.keyValue });

        if (error.code === 11000) {
            throw new AppError(`Já existe uma placa com o número '${placaData.numero_placa}' nesta região.`, 409);
        }
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
            throw new AppError('Placa não encontrada.', 404);
        }
    } catch (error) {
        if (error instanceof AppError) throw error;
        logger.error(`[PlacaService] Erro Mongoose/DB ao buscar placa antiga ID ${id}: ${error.message}`, { stack: error.stack });
        throw new AppError(`Erro interno ao buscar placa para atualização: ${error.message}`, 500);
    }

    const dadosParaAtualizar = { ...placaData };
    let imagemAntigaKeyCompleta = null; 

    // Lógica para tratar a imagem
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
                throw new AppError(`Região ID ${dadosParaAtualizar.regiao} inválida ou não pertence à empresa ${empresaId}.`, 404);
             }
        } else if (dadosParaAtualizar.hasOwnProperty('regiao') && !dadosParaAtualizar.regiao) {
             dadosParaAtualizar.regiao = null;
        } else if (!dadosParaAtualizar.hasOwnProperty('regiao')) {
            delete dadosParaAtualizar.regiao;
        }

        const placaAtualizadaDoc = await Placa.findByIdAndUpdate(id, dadosParaAtualizar, { new: true, runValidators: true }).populate('regiao', 'nome'); 
        
        if (!placaAtualizadaDoc) {
             throw new AppError('Placa não encontrada durante a atualização.', 404);
        }
        logger.info(`[PlacaService] Placa ID ${id} atualizada com sucesso no DB.`);

        if (imagemAntigaKeyCompleta && (!file || imagemAntigaKeyCompleta !== file.key)) {
            try {
                await deleteFileFromR2(imagemAntigaKeyCompleta);
            } catch (deleteError) {
                logger.error(`[PlacaService] Falha NÃO CRÍTICA ao excluir imagem antiga ${imagemAntigaKeyCompleta} do R2:`, deleteError);
            }
        }

        return placaAtualizadaDoc.toJSON();

    } catch (error) {
        logger.error(`[PlacaService] Erro Mongoose/DB ao atualizar placa ID ${id}: ${error.message}`, { stack: error.stack, code: error.code, keyValue: error.keyValue });

        if (error.code === 11000) {
            const numPlaca = dadosParaAtualizar.numero_placa || placaAntiga.numero_placa; 
            throw new AppError(`Já existe uma placa com o número '${numPlaca}' nesta região.`, 409);
        }
        
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
                .exec(), 
            Placa.countDocuments(query)
        ]);

        const placas = placasDocs.map(doc => doc.toJSON());
        logger.info(`[PlacaService] Encontradas ${placas.length} placas nesta página. Total de documentos: ${totalDocs}.`);

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

            placas.forEach(placa => {
                const aluguel = aluguelMap[placa.id]; 
                if (aluguel && aluguel.cliente) {
                    placa.cliente_nome = aluguel.cliente.nome;
                    placa.aluguel_data_inicio = aluguel.data_inicio;
                    placa.aluguel_data_fim = aluguel.data_fim;
                    placa.aluguel_ativo = true;
                } else {
                    placa.aluguel_ativo = false;
                }
            });
        }

        const totalPages = Math.ceil(totalDocs / limitInt);
        const pagination = { totalDocs, totalPages, currentPage: pageInt, limit: limitInt };

        return { data: placas, pagination };

    } catch (error) {
        logger.error(`[PlacaService] Erro Mongoose/DB ao buscar placas: ${error.message}`, { stack: error.stack });
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
        const placaDoc = await Placa.findOne({ _id: id, empresa: empresaId })
                                    .populate('regiao', 'nome') 
                                    .exec(); 

        if (!placaDoc) {
            throw new AppError('Placa não encontrada.', 404);
        }
        
        const placa = placaDoc.toJSON();
        
        logger.info(`[PlacaService] Placa ${placa.numero_placa} (ID: ${id}) encontrada.`);

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
        const hoje = new Date();
        const aluguelAtivo = await Aluguel.findOne({
            placa: id,
            empresa: empresaId,
            data_inicio: { $lte: hoje },
            data_fim: { $gte: hoje }
        }).lean(); 

        if (aluguelAtivo) {
            throw new AppError('Não é possível apagar uma placa que está atualmente alugada.', 409);
        }

        const placaApagada = await Placa.findOneAndDelete({ _id: id, empresa: empresaId });

        if (!placaApagada) {
            throw new AppError('Placa não encontrada.', 404);
        }
        logger.info(`[PlacaService] Placa ${placaApagada.numero_placa} (ID: ${id}) apagada com sucesso do DB.`);

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
            throw new AppError('Placa não encontrada.', 404);
        }

        if (placa.disponivel) { 
             const hoje = new Date();
             const aluguelAtivo = await Aluguel.findOne({
                placa: id,
                empresa: empresaId,
                data_inicio: { $lte: hoje },
                data_fim: { $gte: hoje }
             }).lean(); 

             if (aluguelAtivo) {
                throw new AppError('Não é possível colocar uma placa alugada em manutenção.', 409);
             }
        }

        placa.disponivel = !placa.disponivel;
        await placa.save();

        await placa.populate('regiao', 'nome');
        return placa.toJSON();

    } catch (error) {
        logger.error(`[PlacaService] Erro Mongoose/DB ao alternar disponibilidade da placa ID ${id}: ${error.message}`, { stack: error.stack, code: error.code });
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
        throw new AppError(`Erro interno ao buscar localizações: ${error.message}`, 500);
    }
};


// =============================================================================
// == FUNÇÃO CORRIGIDA (FILTROS MOVIDOS PARA O BACKEND) ==
// =============================================================================

/**
 * Busca placas que NÃO ESTÃO em PIs ou Alugueis no período e estão disponíveis.
 * @param {string} empresaId - ObjectId da empresa.
 * @param {string} dataInicio - Data de início (ISO string).
 * @param {string} dataFim - Data de fim (ISO string).
 * @param {object} queryParams - Filtros adicionais (ex: { regiao, search, excludePiId }).
 * @returns {Promise<Array<object>>} - Array de placas disponíveis (JSON formatado).
 * @throws {AppError} - Lança erro 400 ou 500.
 */
exports.getPlacasDisponiveis = async (empresaId, dataInicio, dataFim, queryParams = {}) => {
    logger.info(`[PlacaService] Buscando placas disponíveis de ${dataInicio} a ${dataFim} para empresa ${empresaId}.`);

    // *** INÍCIO DA CORREÇÃO ***
    // 1. Extrai os filtros (regiao, search, excludePiId) dos queryParams
    const { regiao, search, excludePiId } = queryParams;
    // *** FIM DA CORREÇÃO ***

    const startDate = new Date(dataInicio);
    const endDate = new Date(dataFim);

    // Validação de datas
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new AppError('Datas de início ou fim inválidas.', 400);
    }
    if (endDate <= startDate) {
        throw new AppError('A data de fim deve ser posterior à data de início.', 400);
    }

    try {
        // 1. Encontrar IDs de placas em Alugueis que conflitam
        const alugueisOcupados = await Aluguel.find({
            empresa: empresaId,
            data_inicio: { $lte: endDate }, 
            data_fim: { $gte: startDate } 
        }).select('placa').lean();
        
        const idsAlugadas = alugueisOcupados.map(a => a.placa.toString());
        logger.debug(`[PlacaService] ${idsAlugadas.length} placas em aluguéis no período.`);

        // 2. Encontrar IDs de placas em PIs que conflitam
        const piQuery = {
            empresa: empresaId,
            status: { $in: ['em_andamento', 'concluida'] }, 
            dataInicio: { $lte: endDate }, 
            dataFim: { $gte: startDate }
        };
        
        // Exclui a PI atual se estiver editando (para permitir manter as placas já selecionadas)
        if (excludePiId) {
            piQuery._id = { $ne: excludePiId };
            logger.debug(`[PlacaService] Excluindo PI ${excludePiId} da verificação de disponibilidade.`);
        }
        
        const pisOcupadas = await PropostaInterna.find(piQuery).select('placas').lean();
        logger.debug(`[PlacaService] ${pisOcupadas.length} PIs encontradas no período.`);

        const idsEmPI = pisOcupadas.flatMap(pi => (pi.placas || []).map(p => p.toString()));
        logger.debug(`[PlacaService] ${idsEmPI.length} placas em PIs no período.`);


        // 3. Juntar todos os IDs ocupados (Set remove duplicatas)
        const placasOcupadasIds = [...new Set([...idsAlugadas, ...idsEmPI])];
        
        logger.info(`[PlacaService] Total: ${placasOcupadasIds.length} placas ocupadas no período.`);

        // 4. Buscar todas as placas da empresa que:
        
        // *** INÍCIO DA CORREÇÃO ***
        // 4.1. Define a query base
        // NOTA: Removido o filtro 'disponivel: true' porque o campo 'disponivel'
        // é usado apenas para manutenção manual. A disponibilidade para PIs/Aluguéis
        // é gerenciada pela lógica de verificação de datas e conflitos.
        const finalQuery = {
            empresa: empresaId,
            _id: { $nin: placasOcupadasIds } 
        };

        // 4.2. Adiciona filtro de REGIÃO (se fornecido)
        if (regiao) {
            finalQuery.regiao = regiao;
            logger.debug(`[PlacaService] Adicionando filtro de regiao: ${regiao}`);
        }

        // 4.3. Adiciona filtro de SEARCH (se fornecido)
        if (search) {
            const searchRegex = new RegExp(search.trim(), 'i'); 
            finalQuery.$or = [
                { numero_placa: searchRegex },
                { nomeDaRua: searchRegex }
            ];
            logger.debug(`[PlacaService] Adicionando filtro de search: ${search}`);
        }
        // *** FIM DA CORREÇÃO ***

        logger.debug(`[PlacaService] Query final para buscar placas: ${JSON.stringify(finalQuery)}`);

        const placasDisponiveisDocs = await Placa.find(finalQuery) // <-- USA A QUERY FINAL
            .populate('regiao', 'nome') // Mantém o populate para o frontend
            .sort({ 'regiao.nome': 1, 'numero_placa': 1 }) 
            .exec(); 

        // 5. Mapeia para JSON
        const placasDisponiveis = placasDisponiveisDocs.map(doc => doc.toJSON());
        
        logger.info(`[PlacaService] ✅ Retornando ${placasDisponiveis.length} placas disponíveis (${idsAlugadas.length} em aluguéis, ${idsEmPI.length} em PIs, ${placasOcupadasIds.length} total ocupadas).`);
        
        if (placasDisponiveis.length > 0) {
            logger.debug(`[PlacaService] Primeiras placas disponíveis: ${placasDisponiveis.slice(0, 3).map(p => p.numero_placa).join(', ')}`);
        }
        
        return placasDisponiveis;

    } catch (error) {
        logger.error(`[PlacaService] Erro Mongoose/DB ao buscar placas disponíveis: ${error.message}`, { stack: error.stack });
        if (error instanceof AppError) throw error;
        throw new AppError(`Erro interno ao buscar placas disponíveis: ${error.message}`, 500);
    }
};