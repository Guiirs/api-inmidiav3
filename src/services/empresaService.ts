// @ts-nocheck
// src/services/empresaService.ts
import Empresa from '../models/Empresa';
import User from '../models/User';
import logger from '../config/logger';
import AppError from '../utils/AppError';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

const getApiKey = async (empresaId: string) => {
    try {
        const empresa = await Empresa.findById(empresaId).select('apiKey');
        if (!empresa) {
            throw new AppError('Empresa não encontrada.', 404);
        }
        return empresa.apiKey;
    } catch (error: any) {
        logger.error(`[EmpresaService] Erro ao buscar API Key: ${error.message}`);
        throw error;
    }
};

const regenerateApiKey = async (empresaId: string) => {
    try {
        const empresa = await Empresa.findById(empresaId);
        if (!empresa) {
            throw new AppError('Empresa não encontrada.', 404);
        }
        
        empresa.generateApiKey();
        await empresa.save();
        
        logger.info(`[EmpresaService] API Key regenerada para empresa: ${empresaId}`);
        return empresa.apiKey;
    } catch (error: any) {
        logger.error(`[EmpresaService] Erro ao regenerar API Key: ${error.message}`);
        throw error;
    }
};

const getEmpresaDetails = async (empresaId: string) => {
    try {
        const empresa = await Empresa.findById(empresaId)
            .select('-apiKey -api_key_hash -api_key_prefix -usuarios');
            
        if (!empresa) {
            throw new AppError('Detalhes da empresa não encontrados.', 404);
        }
        return empresa;
    } catch (error: any) {
        logger.error(`[EmpresaService] Erro ao buscar detalhes da empresa: ${error.message}`);
        throw error;
    }
};

const updateEmpresaDetails = async (empresaId: string, updateData: any) => {
    try {
        const { apiKey, api_key_hash, api_key_prefix, usuarios, ...allowedUpdates } = updateData;

        const empresa = await Empresa.findByIdAndUpdate(
            empresaId,
            allowedUpdates,
            { new: true, runValidators: true }
        ).select('-apiKey -api_key_hash -api_key_prefix -usuarios');

        if (!empresa) {
            throw new AppError('Empresa não encontrada para atualização.', 404);
        }
        
        logger.info(`[EmpresaService] Detalhes da empresa ${empresaId} atualizados.`);
        return empresa;
    } catch (error: any) {
        logger.error(`[EmpresaService] Erro ao atualizar detalhes da empresa: ${error.message}`);
        if (error.name === 'ValidationError') {
            throw new AppError(`Dados de atualização inválidos: ${error.message}`, 400);
        }
        throw error;
    }
};

const registerEmpresa = async (empresaData: any, userData: any) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const novaEmpresa = new Empresa({
            nome: empresaData.nome,
            cnpj: empresaData.cnpj,
        });
        await novaEmpresa.save({ session });

        const hashedPassword = await bcrypt.hash(userData.password, 12);
        
        const novoUser = new User({
            username: userData.username,
            email: userData.email,
            password: hashedPassword,
            nome: userData.nome,
            sobrenome: userData.sobrenome,
            role: 'admin',
            empresa: novaEmpresa._id,
        });
        await novoUser.save({ session });

        novaEmpresa.usuarios.push(novoUser._id as any);
        await novaEmpresa.save({ session });

        await session.commitTransaction();
        
        const userParaRetorno = novoUser.toObject();
        delete userParaRetorno.password;
        
        return { empresa: novaEmpresa, user: userParaRetorno };

    } catch (error: any) {
        await session.abortTransaction();
        logger.error(`[EmpresaService] Erro ao registar nova empresa: ${error.message}`);
        
        if (error.code === 11000) {
            const campo = Object.keys(error.keyValue)[0];
            throw new AppError(`O ${campo} '${error.keyValue[campo]}' já está a ser utilizado.`, 409);
        }
        throw error;
    } finally {
        session.endSession();
    }
};

export {
    getApiKey,
    regenerateApiKey,
    getEmpresaDetails,
    updateEmpresaDetails,
    registerEmpresa
};

