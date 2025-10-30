// services/empresaService.js
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose'); 
const Empresa = require('../models/Empresa'); 
const User = require('../models/User'); 
const logger = require('../config/logger'); 
const AppError = require('../utils/AppError'); // [MELHORIA] Importa AppError
const saltRounds = 10;

class EmpresaService {
    constructor() {}

    /**
     * Regista uma nova empresa e o seu utilizador administrador, usando uma transação.
     * @param {object} empresaData - Dados da empresa (nome_empresa, cnpj) e do admin (adminUser: { username, email, password, nome, sobrenome }).
     * @returns {Promise<object>} - Objeto com mensagem, dados da empresa/utilizador criados e a API key completa.
     * @throws {AppError} - Lança erro com status 400, 409 ou 500.
     */
    async register(empresaData) {
        logger.info('[EmpresaService] Tentando registar nova empresa.');
        
        const { nome_empresa, cnpj, adminUser } = empresaData;

        // Validação de Inputs Essenciais (convertida para AppError)
        if (!nome_empresa || !cnpj || !adminUser) {
            // [MELHORIA] Usa AppError
            throw new AppError('Dados incompletos para registo da empresa ou administrador.', 400);
        }
        const { username, email, password, nome, sobrenome } = adminUser;
        if (!username || !email || !password || !nome || !sobrenome) {
            // [MELHORIA] Usa AppError
            throw new AppError('Dados incompletos para o utilizador administrador (username, email, password, nome, sobrenome).', 400);
        }
         // Validação mínima de senha (convertida para AppError)
         if (password.length < 6) {
             // [MELHORIA] Usa AppError
             throw new AppError('A senha do administrador deve ter pelo menos 6 caracteres.', 400);
         }

        const session = await mongoose.startSession();
        logger.debug('[EmpresaService] Iniciando transação Mongoose para registo.');
        session.startTransaction();

        try {
            // Verifica a existência prévia DENTRO da transação
            logger.debug(`[EmpresaService] Verificando existência de CNPJ: ${cnpj}`);
            const existingEmpresa = await Empresa.findOne({ cnpj }).session(session).lean().exec();
            if (existingEmpresa) {
                // [MELHORIA] Usa AppError
                throw new AppError('Uma empresa com este CNPJ já está registada.', 409);
            }

            logger.debug(`[EmpresaService] Verificando existência de email: ${email} ou username: ${username}`);
            const existingUser = await User.findOne({ $or: [{ email }, { username }] }).session(session).lean().exec();
            if (existingUser) {
                 const field = existingUser.email === email ? 'e-mail' : 'nome de utilizador';
                 // [MELHORIA] Usa AppError
                 throw new AppError(`Um utilizador com este ${field} já existe.`, 409);
            }

            logger.debug(`[EmpresaService] Hasheando senha para admin ${username}`);
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // --- GERAÇÃO DA NOVA API KEY HÍBRIDA ---
            logger.debug('[EmpresaService] Gerando API Key...');
            const prefixBase = nome_empresa.substring(0, 4).toLowerCase().replace(/[^a-z]/g, '') || 'emp';
            const apiKeyPrefix = `${prefixBase}_${uuidv4().split('-')[0].substring(0, 4)}`;
            const apiKeySecret = uuidv4();
            const apiKeyHash = await bcrypt.hash(apiKeySecret, saltRounds);
            const fullApiKey = `${apiKeyPrefix}_${apiKeySecret}`;
            logger.debug(`[EmpresaService] API Key gerada com prefixo: ${apiKeyPrefix}`);
            // --- FIM DA GERAÇÃO ---

            // Cria a empresa dentro da transação
            logger.debug(`[EmpresaService] Tentando salvar nova empresa ${nome_empresa} no DB.`);
            const [newEmpresa] = await Empresa.create([{
                nome: nome_empresa,
                cnpj,
                api_key_hash: apiKeyHash,
                api_key_prefix: apiKeyPrefix,
                status_assinatura: 'active' 
            }], { session });
            logger.info(`[EmpresaService] Empresa ${nome_empresa} (ID: ${newEmpresa._id}) criada na transação.`);


            // Cria o utilizador admin dentro da transação
            logger.debug(`[EmpresaService] Tentando salvar novo admin ${username} no DB.`);
            const [newAdmin] = await User.create([{
                username,
                email,
                password: hashedPassword,
                nome,
                sobrenome,
                role: 'admin',
                empresa: newEmpresa._id
            }], { session });
            logger.info(`[EmpresaService] Admin ${username} (ID: ${newAdmin._id}) criado na transação para empresa ${newEmpresa._id}.`);


            logger.debug(`[EmpresaService] Commitando transação para empresa ${newEmpresa._id}.`);
            await session.commitTransaction();
            logger.info(`[EmpresaService] Registo de empresa ${nome_empresa} e admin ${username} concluído com sucesso.`);

            // Retorna a resposta (usando .toString() para garantir que o ID é uma string, conforme o padrão de retorno JSON)
            return {
                message: 'Empresa e utilizador administrador registados com sucesso!',
                empresa: { id: newEmpresa._id.toString(), nome: newEmpresa.nome },
                user: {
                    id: newAdmin._id.toString(),
                    username: newAdmin.username,
                    email: newAdmin.email,
                    role: newAdmin.role
                },
                fullApiKey: fullApiKey
            };
        } catch (error) {
            logger.warn(`[EmpresaService] Abortando transação de registo devido a erro: ${error.message}`);
            await session.abortTransaction();

            // Log detalhado do erro
            logger.error(`[EmpresaService] Erro Mongoose/DB ao registar empresa/admin (transação abortada): ${error.message}`, { stack: error.stack, code: error.code, keyValue: error.keyValue });

            // [MELHORIA] Se o erro já for um AppError (lançado nas checagens iniciais), relança-o.
            if (error instanceof AppError) {
                throw error;
            } 
            
            // Trata duplicação de chave não apanhada pela verificação inicial (11000)
            if (error.code === 11000) {
                let field = 'campo desconhecido';
                 if (error.keyPattern) {
                     field = Object.keys(error.keyPattern)[0];
                     field = field === 'cnpj' ? 'CNPJ' : (field === 'email' ? 'e-mail' : (field === 'username' ? 'nome de utilizador' : (field === 'api_key_prefix' || field === 'api_key_hash' ? 'API Key' : field)));
                 }
                 // [MELHORIA] Usa AppError
                 throw new AppError(`Já existe um registo com este ${field}.`, 409);
            } 
            
            // Erro genérico 500 para qualquer outra coisa
            throw new AppError(`Erro interno durante o registo: ${error.message}`, 500);

        } finally {
            logger.debug('[EmpresaService] Finalizando sessão Mongoose.');
            session.endSession();
        }
    }
}

module.exports = EmpresaService; // Exporta a classe