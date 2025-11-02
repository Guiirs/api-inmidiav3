// services/empresaService.js
const Empresa = require('../models/Empresa');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');

// --- [CORREÇÃO] Imports adicionados para a nova função de registo ---
const User = require('../models/User');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
// --- Fim da Correção ---


// Função existente (INTACTA)
const getApiKey = async (empresaId) => {
    try {
        const empresa = await Empresa.findById(empresaId).select('apiKey');
        if (!empresa) {
            throw new AppError('Empresa não encontrada.', 404);
        }
        return empresa.apiKey;
    } catch (error) {
        logger.error(`[EmpresaService] Erro ao buscar API Key: ${error.message}`);
        throw error;
    }
};

// Função existente (INTACTA)
const regenerateApiKey = async (empresaId) => {
    try {
        const empresa = await Empresa.findById(empresaId);
        if (!empresa) {
            throw new AppError('Empresa não encontrada.', 404);
        }
        
        empresa.generateApiKey(); // Método do Model
        await empresa.save();
        
        logger.info(`[EmpresaService] API Key regenerada para empresa: ${empresaId}`);
        return empresa.apiKey;
    } catch (error) {
        logger.error(`[EmpresaService] Erro ao regenerar API Key: ${error.message}`);
        throw error;
    }
};

// Função existente (INTACTA)
const getEmpresaDetails = async (empresaId) => {
    try {
        // Busca a empresa e exclui campos sensíveis
        const empresa = await Empresa.findById(empresaId)
            .select('-apiKey -api_key_hash -api_key_prefix -usuarios'); 
            
        if (!empresa) {
            throw new AppError('Detalhes da empresa não encontrados.', 404);
        }
        return empresa;
    } catch (error) {
        logger.error(`[EmpresaService] Erro ao buscar detalhes da empresa: ${error.message}`);
        throw error;
    }
};

// Função existente (INTACTA)
const updateEmpresaDetails = async (empresaId, updateData) => {
    try {
        // Garante que campos sensíveis não sejam atualizados por esta rota
        const { apiKey, api_key_hash, api_key_prefix, usuarios, ...allowedUpdates } = updateData;

        const empresa = await Empresa.findByIdAndUpdate(
            empresaId,
            allowedUpdates,
            { new: true, runValidators: true }
        ).select('-apiKey -api_key_hash -api_key_prefix -usuarios'); // Retorna o objeto atualizado sem os campos sensíveis

        if (!empresa) {
            throw new AppError('Empresa não encontrada para atualização.', 404);
        }
        
        logger.info(`[EmpresaService] Detalhes da empresa ${empresaId} atualizados.`);
        return empresa;
    } catch (error) {
        logger.error(`[EmpresaService] Erro ao atualizar detalhes da empresa: ${error.message}`);
        // Trata erros de validação do Mongoose
        if (error.name === 'ValidationError') {
            throw new AppError(`Dados de atualização inválidos: ${error.message}`, 400);
        }
        throw error;
    }
};


// --- [CORREÇÃO] Nova função de registo adicionada ---
/**
 * Regista uma nova empresa e o seu utilizador administrador.
 * Esta operação é transacional para garantir a integridade dos dados.
 */
const registerEmpresa = async (empresaData, userData) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        // 1. Criar a Empresa
        const novaEmpresa = new Empresa({
            nome: empresaData.nome,
            cnpj: empresaData.cnpj,
        });
        await novaEmpresa.save({ session });

        // 2. Criar o Utilizador Admin
        const hashedPassword = await bcrypt.hash(userData.password, 12);
        
        const novoUser = new User({
            username: userData.username,
            email: userData.email,
            password: hashedPassword,
            nome: userData.nome,
            sobrenome: userData.sobrenome,
            role: 'admin', // O primeiro utilizador é sempre admin
            empresa: novaEmpresa._id, // Ligar o utilizador à nova empresa
        });
        await novoUser.save({ session });

        // 3. (Opcional mas recomendado) Adicionar o utilizador à lista de utilizadores da empresa
        novaEmpresa.usuarios.push(novoUser._id);
        await novaEmpresa.save({ session });

        // 4. Se tudo correu bem, cometer a transação
        await session.commitTransaction();
        
        // Retornar o utilizador (sem a password) para o controlador
        const userParaRetorno = novoUser.toObject();
        delete userParaRetorno.password;
        
        return { empresa: novaEmpresa, user: userParaRetorno };

    } catch (error) {
        // Se algo falhar, reverter tudo
        await session.abortTransaction();
        logger.error(`[EmpresaService] Erro ao registar nova empresa: ${error.message}`);
        
        // Se for erro de duplicado (ex: CNPJ ou email já existem)
        if (error.code === 11000) {
            // Identifica qual campo causou o erro de duplicado
            const campo = Object.keys(error.keyValue)[0];
            throw new AppError(`O ${campo} '${error.keyValue[campo]}' já está a ser utilizado.`, 409);
        }
        throw error; // Lança o erro para o errorHandler
    } finally {
        session.endSession();
    }
};
// --- Fim da Correção ---


module.exports = {
    getApiKey,
    regenerateApiKey,
    getEmpresaDetails,
    updateEmpresaDetails,
    registerEmpresa, // --- [CORREÇÃO] Exportar a nova função ---
};