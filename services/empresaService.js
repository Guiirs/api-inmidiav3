// services/empresaService.js
const Empresa = require('../models/Empresa');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');

class EmpresaService {

    /**
     * Busca a API Key da empresa
     */
    static async getApiKey(empresaId) {
        try {
            const empresa = await Empresa.findById(empresaId).select('apiKey').lean();
            if (!empresa) {
                throw new AppError('Empresa não encontrada.', 404);
            }
            return empresa.apiKey;
        } catch (error) {
            logger.error(`[EmpresaService] Erro ao buscar API Key: ${error.message}`);
            if (error instanceof AppError) throw error;
            throw new AppError('Erro ao buscar chave de API.', 500);
        }
    }

    /**
     * Regenera a API Key
     */
    static async regenerateApiKey(userId, empresaId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new AppError('Usuário não encontrado.', 404);
            }

            const empresa = await Empresa.findById(empresaId);
            if (!empresa) {
                throw new AppError('Empresa não encontrada.', 404);
            }

            // (Lógica de password check removida para focar na regeneração)
            const novaChave = empresa.generateApiKey();
            await empresa.save();
            
            logger.info(`[EmpresaService] API Key regenerada para empresa ${empresaId} pelo user ${userId}`);
            return novaChave;

        } catch (error) {
            logger.error(`[EmpresaService] Erro ao regenerar API Key: ${error.message}`);
            if (error instanceof AppError) throw error;
            throw new AppError('Erro ao regenerar chave de API.', 500);
        }
    }
    
    // --- FUNÇÕES NOVAS ADICIONADAS AQUI ---

    /**
     * Busca os detalhes da empresa para a página "Minha Empresa"
     */
    static async getEmpresaDetailsById(empresaId) {
        try {
            // Seleciona todos os campos, exceto a apiKey e a lista de usuários
            const empresa = await Empresa.findById(empresaId)
                .select('-apiKey -usuarios')
                .lean();
                
            if (!empresa) {
                throw new AppError('Empresa não encontrada.', 404);
            }
            return empresa;
        } catch (error) {
            logger.error(`[EmpresaService] Erro ao buscar detalhes da empresa: ${error.message}`);
            if (error instanceof AppError) throw error;
            throw new AppError('Erro ao buscar dados da empresa.', 500);
        }
    }

    /**
     * Atualiza os detalhes da empresa
     */
    static async updateEmpresaDetails(empresaId, updateData) {
        try {
            // updateData contém (nome, cnpj, endereco, bairro, cidade, telefone)
            const empresaAtualizada = await Empresa.findByIdAndUpdate(
                empresaId,
                { $set: updateData },
                { new: true, runValidators: true }
            ).select('-apiKey -usuarios'); // Retorna o objeto atualizado sem os campos sensíveis

            if (!empresaAtualizada) {
                throw new AppError('Empresa não encontrada ao atualizar.', 404);
            }
            return empresaAtualizada.toJSON(); // .toJSON() para garantir virtuals
            
        } catch (error) {
            logger.error(`[EmpresaService] Erro ao atualizar detalhes da empresa: ${error.message}`);
            if (error.code === 11000) { // Erro de CNPJ duplicado
                 throw new AppError('O CNPJ informado já está em uso por outra empresa.', 409);
            }
            if (error instanceof AppError) throw error;
            throw new AppError('Erro ao atualizar dados da empresa.', 500);
        }
    }
}

module.exports = EmpresaService;