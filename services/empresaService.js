// services/empresaService.js
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose'); // Importa mongoose para transações
const Empresa = require('../models/Empresa'); // Importa o modelo Empresa
const User = require('../models/User'); // Importa o modelo User
const logger = require('../config/logger'); // Importa o logger
const saltRounds = 10;

class EmpresaService {
    constructor() {}

    /**
     * Regista uma nova empresa e o seu utilizador administrador, usando uma transação.
     * @param {object} empresaData - Dados da empresa (nome_empresa, cnpj) e do admin (adminUser: { username, email, password, nome, sobrenome }).
     * @returns {Promise<object>} - Objeto com mensagem, dados da empresa/utilizador criados e a API key completa.
     * @throws {Error} - Lança erro com status 400, 409 ou 500.
     */
    async register(empresaData) {
        logger.info('[EmpresaService] Tentando registar nova empresa.');
        logger.debug(`[EmpresaService] Dados recebidos: ${JSON.stringify(empresaData)}`); // Cuidado ao logar senha em produção detalhada

        const { nome_empresa, cnpj, adminUser } = empresaData;

        // Validação de Inputs Essenciais (complementa express-validator)
        if (!nome_empresa || !cnpj || !adminUser) {
            const error = new Error('Dados incompletos para registo da empresa ou administrador.');
            error.status = 400;
            logger.warn(`[EmpresaService] Falha no registo: ${error.message}`);
            throw error;
        }
        const { username, email, password, nome, sobrenome } = adminUser;
        if (!username || !email || !password || !nome || !sobrenome) {
            const error = new Error('Dados incompletos para o utilizador administrador (username, email, password, nome, sobrenome).');
            error.status = 400;
            logger.warn(`[EmpresaService] Falha no registo: ${error.message}`);
            throw error;
        }
         // Validação mínima de senha (poderia ser mais forte)
         if (password.length < 6) {
             const error = new Error('A senha do administrador deve ter pelo menos 6 caracteres.');
             error.status = 400;
             logger.warn(`[EmpresaService] Falha no registo: ${error.message}`);
             throw error;
         }

        const session = await mongoose.startSession();
        logger.debug('[EmpresaService] Iniciando transação Mongoose para registo.');
        session.startTransaction();

        try {
            // Verifica a existência prévia DENTRO da transação
            logger.debug(`[EmpresaService] Verificando existência de CNPJ: ${cnpj}`);
            const existingEmpresa = await Empresa.findOne({ cnpj }).session(session).lean().exec();
            if (existingEmpresa) {
                const error = new Error('Uma empresa com este CNPJ já está registada.');
                error.status = 409; // Conflict
                logger.warn(`[EmpresaService] Falha no registo: ${error.message}`);
                throw error; // Abortará a transação
            }

            logger.debug(`[EmpresaService] Verificando existência de email: ${email} ou username: ${username}`);
            const existingUser = await User.findOne({ $or: [{ email }, { username }] }).session(session).lean().exec();
            if (existingUser) {
                 const field = existingUser.email === email ? 'e-mail' : 'nome de utilizador';
                const error = new Error(`Um utilizador com este ${field} já existe.`);
                error.status = 409; // Conflict
                logger.warn(`[EmpresaService] Falha no registo: ${error.message}`);
                throw error; // Abortará a transação
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
                status_assinatura: 'active' // Define como ativo por defeito no registo
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
                empresa: newEmpresa._id // Associa o admin à empresa
            }], { session });
            logger.info(`[EmpresaService] Admin ${username} (ID: ${newAdmin._id}) criado na transação para empresa ${newEmpresa._id}.`);


            logger.debug(`[EmpresaService] Commitando transação para empresa ${newEmpresa._id}.`);
            await session.commitTransaction();
            logger.info(`[EmpresaService] Registo de empresa ${nome_empresa} e admin ${username} concluído com sucesso.`);

            // Retorna a resposta (sem a senha, claro)
            // O mapeamento _id -> id deve ocorrer globalmente
            return {
                message: 'Empresa e utilizador administrador registados com sucesso!',
                empresa: { id: newEmpresa._id, nome: newEmpresa.nome },
                user: {
                    id: newAdmin._id,
                    username: newAdmin.username,
                    email: newAdmin.email,
                    role: newAdmin.role
                },
                fullApiKey: fullApiKey // Retorna a chave completa (única vez)
            };
        } catch (error) {
            logger.warn(`[EmpresaService] Abortando transação de registo devido a erro: ${error.message}`);
            await session.abortTransaction();

            // Log detalhado do erro
            logger.error(`[EmpresaService] Erro Mongoose/DB ao registar empresa/admin (transação abortada): ${error.message}`, { stack: error.stack, code: error.code, keyValue: error.keyValue });

            // Relança erros específicos (400, 409) ou um erro 500 genérico
            if (error.status === 400 || error.status === 409) {
                throw error;
            } else if (error.code === 11000) { // Captura duplicação que possa ter ocorrido
                let field = 'campo desconhecido';
                 if (error.keyPattern) {
                     field = Object.keys(error.keyPattern)[0];
                     field = field === 'cnpj' ? 'CNPJ' : (field === 'email' ? 'e-mail' : (field === 'username' ? 'nome de utilizador' : (field === 'api_key_prefix' || field === 'api_key_hash' ? 'API Key' : field)));
                 }
                 const duplicateError = new Error(`Já existe um registo com este ${field}.`);
                 duplicateError.status = 409;
                 throw duplicateError;
            } else {
                 const serviceError = new Error(`Erro interno durante o registo: ${error.message}`);
                 serviceError.status = 500;
                 throw serviceError;
            }
        } finally {
            logger.debug('[EmpresaService] Finalizando sessão Mongoose.');
            session.endSession();
        }
    }
}

module.exports = EmpresaService; // Exporta a classe