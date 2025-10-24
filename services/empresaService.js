// services/empresaService.js
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose'); // Importa mongoose para transações
const Empresa = require('../models/Empresa'); // Importa o modelo Empresa
const User = require('../models/User'); // Importa o modelo User
const saltRounds = 10; // Definido aqui se não estiver global

class EmpresaService {
    // constructor não precisa mais do 'db'
    constructor() {}

    async register(empresaData) {
        const { nome_empresa, cnpj, adminUser } = empresaData;

        // 1. Verifica se o objeto adminUser e a senha existem
        if (!adminUser || !adminUser.password) {
            const error = new Error('A senha do administrador é obrigatória.');
            error.status = 400;
            throw error;
        }

        const { username, email, password, nome, sobrenome } = adminUser;

        // Verifica se a empresa ou o utilizador já existem usando Mongoose
        // Adiciona .lean() às verificações de existência para performance
        const existingEmpresa = await Empresa.findOne({ cnpj }).lean().exec(); // <-- Adicionado .lean()
        if (existingEmpresa) {
            const error = new Error('Uma empresa com este CNPJ já está registada.');
            error.status = 409;
            throw error;
        }

        const existingUser = await User.findOne({ $or: [{ email }, { username }] }).lean().exec(); // <-- Adicionado .lean()
        if (existingUser) {
            const error = new Error('Um utilizador com este e-mail ou nome de utilizador já existe.');
            error.status = 409;
            throw error;
        }

        // Encripta a senha do utilizador
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // --- GERAÇÃO DA NOVA API KEY HÍBRIDA (lógica inalterada) ---
        const prefixBase = nome_empresa.substring(0, 4).toLowerCase().replace(/[^a-z]/g, '') || 'emp';
        const apiKeyPrefix = `${prefixBase}_${uuidv4().split('-')[0].substring(0, 4)}`;
        const apiKeySecret = uuidv4();
        const apiKeyHash = await bcrypt.hash(apiKeySecret, saltRounds);
        const fullApiKey = `${apiKeyPrefix}_${apiKeySecret}`;
        // --- FIM DA GERAÇÃO ---

        // Inicia a sessão para transação
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            // Cria a empresa dentro da transação
            // .create() NÃO usa .lean()
            const [newEmpresa] = await Empresa.create([{
                nome: nome_empresa,
                cnpj,
                api_key_hash: apiKeyHash,
                api_key_prefix: apiKeyPrefix,
                status_assinatura: 'active'
            }], { session });

            // Cria o utilizador admin dentro da transação
            // .create() NÃO usa .lean()
            const [newAdmin] = await User.create([{
                username,
                email,
                password: hashedPassword,
                nome,
                sobrenome,
                role: 'admin',
                empresa: newEmpresa._id // Associa o admin à empresa usando o _id do MongoDB
            }], { session });

            // Se tudo correu bem, confirma a transação
            await session.commitTransaction();

            // Retorna a resposta (sem a senha, claro)
            // A transformação toJSON global (se configurada) tratará _id -> id
            return {
                message: 'Empresa e utilizador administrador registados com sucesso!',
                empresa: { id: newEmpresa._id, nome: newEmpresa.nome }, // Retorna _id como id explicitamente se necessário
                user: { // Retorna dados seguros do user
                    id: newAdmin._id, // Retorna _id como id explicitamente se necessário
                    username: newAdmin.username,
                    email: newAdmin.email,
                    role: newAdmin.role
                },
                fullApiKey: fullApiKey // Retorna a chave completa (única vez)
            };
        } catch (error) {
            // Se algo falhar, aborta a transação
            await session.abortTransaction();
            // Trata erros específicos (como duplicação)
             if (error.code === 11000) { // Código de erro de chave duplicada do MongoDB
                let field = Object.keys(error.keyValue)[0];
                field = field === 'cnpj' ? 'CNPJ' : (field === 'email' ? 'e-mail' : (field === 'username' ? 'nome de utilizador' : field));
                // Adapta a mensagem para ser mais genérica ou específica
                const duplicateError = new Error(`Já existe um registo com este ${field}.`);
                duplicateError.status = 409;
                throw duplicateError;
            }
            // Re-lança outros erros
            throw error;
        } finally {
            // Termina a sessão
            session.endSession();
        }
    }
}

module.exports = EmpresaService;