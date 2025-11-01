// services/regiaoService.js
const Regiao = require('../models/Regiao'); 
const Placa = require('../models/Placa');   
const logger = require('../config/logger'); 
const AppError = require('../utils/AppError'); // [MELHORIA] Importa AppError

class RegiaoService {
    constructor() {}

    /**
     * Obtém todas as regiões de uma empresa.
     * @param {string} empresa_id - ObjectId da empresa.
     * @returns {Promise<Array<object>>} - Array de regiões (objetos simples).
     * @throws {AppError} - Lança erro 500 em caso de falha na DB.
     */
    async getAll(empresa_id) {
        logger.info(`[RegiaoService] Buscando todas as regiões para empresa ${empresa_id}.`);
        try {
            const regioes = await Regiao.find({ empresa: empresa_id })
                                        .sort({ nome: 1 }) 
                                        .lean() // Retorna objetos simples (relying on global transform)
                                        .exec();
            logger.info(`[RegiaoService] Encontradas ${regioes.length} regiões para empresa ${empresa_id}.`);
            return regioes;
        } catch (error) {
            logger.error(`[RegiaoService] Erro Mongoose/DB ao buscar todas as regiões: ${error.message}`, { stack: error.stack });
            // [MELHORIA] Usa AppError
            throw new AppError(`Erro interno ao buscar regiões: ${error.message}`, 500);
        }
    }

    /**
     * Cria uma nova região para uma empresa.
     * @param {string} nome - Nome da nova região.
     * @param {string} empresa_id - ObjectId da empresa.
     * @returns {Promise<object>} - O documento da nova região criada (objeto JSON formatado).
     * @throws {AppError} - Lança erro 400, 409 ou 500.
     */
    async create(nome, empresa_id) {
        logger.info(`[RegiaoService] Tentando criar região '${nome}' para empresa ${empresa_id}.`);

        // Validação básica (mantida como fallback)
        if (!nome || typeof nome !== 'string' || nome.trim() === '') {
            // [MELHORIA] Usa AppError
            throw new AppError('O nome da região é obrigatório e não pode ser vazio.', 400);
        }
        const nomeTrimmed = nome.trim(); 

        const novaRegiao = new Regiao({
            nome: nomeTrimmed,
            empresa: empresa_id
        });

        try {
            logger.debug(`[RegiaoService] Tentando salvar nova região '${nomeTrimmed}' no DB.`);
            const regiaoSalva = await novaRegiao.save();
            logger.info(`[RegiaoService] Região '${regiaoSalva.nome}' (ID: ${regiaoSalva._id}) criada com sucesso para empresa ${empresa_id}.`);
            
            // [MELHORIA] Retorna a representação JSON
            return regiaoSalva.toJSON(); 
            
        } catch (error) {
            logger.error(`[RegiaoService] Erro Mongoose/DB ao criar região: ${error.message}`, { stack: error.stack, code: error.code, keyValue: error.keyValue });

            // Trata o erro de índice único
            if (error.code === 11000) {
                // [MELHORIA] Usa AppError
                throw new AppError(`Já existe uma região com o nome '${nomeTrimmed}' na sua empresa.`, 409);
            }
            // [MELHORIA] Relança AppErrors (400, 409) ou lança 500
            if (error instanceof AppError) throw error;
            throw new AppError(`Erro interno ao criar região: ${error.message}`, 500);
        }
    }

    /**
     * Atualiza o nome de uma região existente.
     * @param {string} id - ObjectId da região a atualizar.
     * @param {string} nome - Novo nome para a região.
     * @param {string} empresa_id - ObjectId da empresa.
     * @returns {Promise<object>} - O documento da região atualizada (objeto JSON formatado).
     * @throws {AppError} - Lança erro 400, 404, 409 ou 500.
     */
    async update(id, nome, empresa_id) {
        logger.info(`[RegiaoService] Tentando atualizar região ID ${id} para nome '${nome}' na empresa ${empresa_id}.`);

        // Validação básica (mantida como fallback)
        if (!nome || typeof nome !== 'string' || nome.trim() === '') {
            // [MELHORIA] Usa AppError
            throw new AppError('O novo nome da região é obrigatório e não pode ser vazio.', 400);
        }
        const nomeTrimmed = nome.trim();

        try {
            logger.debug(`[RegiaoService] Tentando encontrar e atualizar região ID ${id} no DB.`);
            
            const regiaoAtualizada = await Regiao.findOneAndUpdate(
                { _id: id, empresa: empresa_id }, 
                { $set: { nome: nomeTrimmed } },  
                { new: true, runValidators: true }
            ); 

            if (!regiaoAtualizada) {
                // [MELHORIA] Usa AppError
                throw new AppError('Região não encontrada.', 404);
            }
            logger.info(`[RegiaoService] Região ID ${id} atualizada com sucesso para nome '${regiaoAtualizada.nome}'.`);
            
            // [MELHORIA] Retorna a representação JSON
            return regiaoAtualizada.toJSON(); 

        } catch (error) {
            logger.error(`[RegiaoService] Erro Mongoose/DB ao atualizar região ID ${id}: ${error.message}`, { stack: error.stack, code: error.code, keyValue: error.keyValue });

            // Trata o erro de índice único
            if (error.code === 11000) {
                // [MELHORIA] Usa AppError
                throw new AppError(`Já existe uma região com o nome '${nomeTrimmed}' na sua empresa.`, 409);
            }
            
            // [MELHORIA] Relança AppErrors (400, 404, 409) ou lança 500
            if (error instanceof AppError) throw error;
            throw new AppError(`Erro interno ao atualizar região: ${error.message}`, 500);
        }
    }

    /**
     * Apaga uma região, verificando se não está em uso por placas.
     * @param {string} id - ObjectId da região a apagar.
     * @param {string} empresa_id - ObjectId da empresa.
     * @returns {Promise<{success: boolean}>} - Confirmação de sucesso.
     * @throws {AppError} - Lança erro 400, 404 ou 500.
     */
    async delete(id, empresa_id) {
        logger.info(`[RegiaoService] Tentando apagar região ID ${id} para empresa ${empresa_id}.`);

        try {
            // 1. Verifica se alguma placa está a usar esta região
            logger.debug(`[RegiaoService] Verificando se alguma placa usa a região ID ${id}.`);
            const placaUsandoRegiao = await Placa.findOne({
                regiao: id,
                empresa: empresa_id
            }).lean().exec(); 

            if (placaUsandoRegiao) {
                // [MELHORIA] Usa AppError
                throw new AppError('Não é possível apagar esta região, pois está a ser utilizada por uma ou mais placas.', 400); 
            }
            logger.debug(`[RegiaoService] Nenhuma placa encontrada usando a região ID ${id}. Prosseguindo com a exclusão.`);

            // 2. Tenta apagar a região
            logger.debug(`[RegiaoService] Tentando apagar região ID ${id} do DB.`);
            const result = await Regiao.deleteOne({ _id: id, empresa: empresa_id });

            if (result.deletedCount === 0) {
                // [MELHORIA] Usa AppError
                throw new AppError('Região não encontrada.', 404);
            }

            logger.info(`[RegiaoService] Região ID ${id} apagada com sucesso.`);
            return { success: true };

        } catch (error) {
            logger.error(`[RegiaoService] Erro Mongoose/DB ao apagar região ID ${id}: ${error.message}`, { stack: error.stack, code: error.code });
            
            // [MELHORIA] Relança AppErrors (400, 404) ou lança 500
            if (error instanceof AppError) throw error;
            throw new AppError(`Erro interno ao apagar região: ${error.message}`, 500);
        }
    }
}

module.exports = RegiaoService;