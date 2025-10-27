// services/regiaoService.js
const Regiao = require('../models/Regiao'); // Importa o modelo Regiao Mongoose
const Placa = require('../models/Placa');   // Importa o modelo Placa para a verificação no delete
const logger = require('../config/logger'); // Importa o logger

class RegiaoService {
    constructor() {}

    /**
     * Obtém todas as regiões de uma empresa.
     * @param {string} empresa_id - ObjectId da empresa.
     * @returns {Promise<Array<object>>} - Array de regiões (objetos simples).
     * @throws {Error} - Lança erro 500 em caso de falha na DB.
     */
    async getAll(empresa_id) {
        logger.info(`[RegiaoService] Buscando todas as regiões para empresa ${empresa_id}.`);
        try {
            const regioes = await Regiao.find({ empresa: empresa_id })
                                        .sort({ nome: 1 }) // Ordena por nome ascendente
                                        .lean() // Retorna objetos simples
                                        .exec();
            logger.info(`[RegiaoService] Encontradas ${regioes.length} regiões para empresa ${empresa_id}.`);
            // Mapeamento _id -> id deve ocorrer globalmente
            return regioes;
        } catch (error) {
            logger.error(`[RegiaoService] Erro Mongoose/DB ao buscar todas as regiões: ${error.message}`, { stack: error.stack });
            const serviceError = new Error(`Erro interno ao buscar regiões: ${error.message}`);
            serviceError.status = 500;
            throw serviceError;
        }
    }

    /**
     * Cria uma nova região para uma empresa.
     * @param {string} nome - Nome da nova região.
     * @param {string} empresa_id - ObjectId da empresa.
     * @returns {Promise<object>} - O documento da nova região criada.
     * @throws {Error} - Lança erro 400, 409 ou 500.
     */
    async create(nome, empresa_id) {
        logger.info(`[RegiaoService] Tentando criar região '${nome}' para empresa ${empresa_id}.`);

        // Validação básica (complementa express-validator)
        if (!nome || typeof nome !== 'string' || nome.trim() === '') {
            const error = new Error('O nome da região é obrigatório e não pode ser vazio.');
            error.status = 400;
            logger.warn(`[RegiaoService] Falha ao criar região: ${error.message}`);
            throw error;
        }
        const nomeTrimmed = nome.trim(); // Usa o nome sem espaços extras

        const novaRegiao = new Regiao({
            nome: nomeTrimmed,
            empresa: empresa_id
        });

        try {
            logger.debug(`[RegiaoService] Tentando salvar nova região '${nomeTrimmed}' no DB.`);
            const regiaoSalva = await novaRegiao.save();
            logger.info(`[RegiaoService] Região '${regiaoSalva.nome}' (ID: ${regiaoSalva._id}) criada com sucesso para empresa ${empresa_id}.`);
            // Mapeamento _id -> id deve ocorrer globalmente
            return regiaoSalva; // Retorna o documento Mongoose completo
        } catch (error) {
            logger.error(`[RegiaoService] Erro Mongoose/DB ao criar região: ${error.message}`, { stack: error.stack, code: error.code, keyValue: error.keyValue });

            // Trata o erro de índice único (nome duplicado para a mesma empresa)
            if (error.code === 11000) {
                const uniqueError = new Error(`Já existe uma região com o nome '${nomeTrimmed}' na sua empresa.`);
                uniqueError.status = 409; // Conflict
                throw uniqueError;
            }
            // Relança outros erros como 500
            const serviceError = new Error(`Erro interno ao criar região: ${error.message}`);
            serviceError.status = 500;
            throw serviceError;
        }
    }

    /**
     * Atualiza o nome de uma região existente.
     * @param {string} id - ObjectId da região a atualizar.
     * @param {string} nome - Novo nome para a região.
     * @param {string} empresa_id - ObjectId da empresa.
     * @returns {Promise<object>} - O documento da região atualizada.
     * @throws {Error} - Lança erro 400, 404, 409 ou 500.
     */
    async update(id, nome, empresa_id) {
        logger.info(`[RegiaoService] Tentando atualizar região ID ${id} para nome '${nome}' na empresa ${empresa_id}.`);

        // Validação básica
        if (!nome || typeof nome !== 'string' || nome.trim() === '') {
            const error = new Error('O novo nome da região é obrigatório e não pode ser vazio.');
            error.status = 400;
            logger.warn(`[RegiaoService] Falha ao atualizar região: ${error.message}`);
            throw error;
        }
        const nomeTrimmed = nome.trim();

        try {
            logger.debug(`[RegiaoService] Tentando encontrar e atualizar região ID ${id} no DB.`);
            // { new: true } retorna o documento *após* a atualização
            // runValidators: true executa validações do schema Mongoose
            const regiaoAtualizada = await Regiao.findOneAndUpdate(
                { _id: id, empresa: empresa_id }, // Critérios de busca
                { $set: { nome: nomeTrimmed } },  // Dados a atualizar
                { new: true, runValidators: true } // Opções
            ); // Não precisa de .exec() explícito com await

            if (!regiaoAtualizada) {
                const error = new Error('Região não encontrada.');
                error.status = 404; // Not Found
                logger.warn(`[RegiaoService] Falha ao atualizar: Região ID ${id} não encontrada ou não pertence à empresa ${empresa_id}.`);
                throw error;
            }
            logger.info(`[RegiaoService] Região ID ${id} atualizada com sucesso para nome '${regiaoAtualizada.nome}'.`);
            // Mapeamento _id -> id deve ocorrer globalmente
            return regiaoAtualizada; // Retorna o documento Mongoose atualizado

        } catch (error) {
            logger.error(`[RegiaoService] Erro Mongoose/DB ao atualizar região ID ${id}: ${error.message}`, { stack: error.stack, code: error.code, keyValue: error.keyValue });

            // Trata o erro de índice único (novo nome duplicado para a mesma empresa)
            if (error.code === 11000) {
                const uniqueError = new Error(`Já existe uma região com o nome '${nomeTrimmed}' na sua empresa.`);
                uniqueError.status = 409; // Conflict
                throw uniqueError;
            }
            // Relança erros 400/404 ou outros como 500
            if (error.status === 400 || error.status === 404) throw error;
            const serviceError = new Error(`Erro interno ao atualizar região: ${error.message}`);
            serviceError.status = 500;
            throw serviceError;
        }
    }

    /**
     * Apaga uma região, verificando se não está em uso por placas.
     * @param {string} id - ObjectId da região a apagar.
     * @param {string} empresa_id - ObjectId da empresa.
     * @returns {Promise<{success: boolean}>} - Confirmação de sucesso.
     * @throws {Error} - Lança erro 400, 404 ou 500.
     */
    async delete(id, empresa_id) {
        logger.info(`[RegiaoService] Tentando apagar região ID ${id} para empresa ${empresa_id}.`);

        try {
            // 1. Verifica se alguma placa está a usar esta região
            logger.debug(`[RegiaoService] Verificando se alguma placa usa a região ID ${id}.`);
            const placaUsandoRegiao = await Placa.findOne({
                regiao: id,
                empresa: empresa_id
            }).lean().exec(); // lean() é suficiente, só precisamos saber se existe

            if (placaUsandoRegiao) {
                const error = new Error('Não é possível apagar esta região, pois está a ser utilizada por uma ou mais placas.');
                error.status = 400; // Bad Request (ou 409 Conflict)
                logger.warn(`[RegiaoService] Falha ao apagar região ID ${id}: ${error.message}. Placa: ${placaUsandoRegiao._id}`);
                throw error;
            }
            logger.debug(`[RegiaoService] Nenhuma placa encontrada usando a região ID ${id}. Prosseguindo com a exclusão.`);

            // 2. Se nenhuma placa estiver a usar, tenta apagar a região
            logger.debug(`[RegiaoService] Tentando apagar região ID ${id} do DB.`);
            const result = await Regiao.deleteOne({ _id: id, empresa: empresa_id });

            if (result.deletedCount === 0) {
                const error = new Error('Região não encontrada.');
                error.status = 404; // Not Found
                logger.warn(`[RegiaoService] Região ID ${id} não encontrada ou não pertence à empresa ${empresa_id} para exclusão.`);
                throw error;
            }

            logger.info(`[RegiaoService] Região ID ${id} apagada com sucesso.`);
            return { success: true };

        } catch (error) {
            // Se for 400 ou 404, relança
            if (error.status === 400 || error.status === 404) throw error;
            // Loga e relança outros erros como 500
            logger.error(`[RegiaoService] Erro Mongoose/DB ao apagar região ID ${id}: ${error.message}`, { stack: error.stack, code: error.code });
            const serviceError = new Error(`Erro interno ao apagar região: ${error.message}`);
            serviceError.status = 500;
            throw serviceError;
        }
    }
}

module.exports = RegiaoService; // Exporta a classe