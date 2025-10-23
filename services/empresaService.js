const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

class EmpresaService {
    constructor(db) {
        this.db = db;
    }

    async register(empresaData) {
        const { nome_empresa, cnpj, adminUser } = empresaData;

        // 1. Verifica se o objeto adminUser e a senha existem
        if (!adminUser || !adminUser.password) {
            const error = new Error('A senha do administrador é obrigatória e não foi fornecida ao serviço.');
            error.status = 400;
            throw error;
        }

        const { username, email, password, nome, sobrenome } = adminUser;

        // Verifica se a empresa ou o utilizador já existem
        const existingEmpresa = await this.db('empresas').where({ cnpj }).first();
        if (existingEmpresa) {
            const error = new Error('Uma empresa com este CNPJ já está registada.');
            error.status = 409;
            throw error;
        }

        const existingUser = await this.db('users').where({ email }).orWhere({ username }).first();
        if (existingUser) {
            const error = new Error('Um utilizador com este e-mail ou nome de utilizador já existe.');
            error.status = 409;
            throw error;
        }

        // Encripta a senha do utilizador
        const hashedPassword = await bcrypt.hash(password, 10);

        // --- GERAÇÃO DA NOVA API KEY HÍBRIDA ---
        // Cria um prefixo curto, ex: 'nome_a1b2' (primeiras 4 letras + 4 chars aleatórios)
        const prefixBase = nome_empresa.substring(0, 4).toLowerCase().replace(/[^a-z]/g, '') || 'emp'; // Garante prefixo
        const apiKeyPrefix = `${prefixBase}_${uuidv4().split('-')[0].substring(0, 4)}`;
        const apiKeySecret = uuidv4(); // A parte secreta longa
        const apiKeyHash = await bcrypt.hash(apiKeySecret, 10); // O hash que vai para o DB
        const fullApiKey = `${apiKeyPrefix}_${apiKeySecret}`; // A chave completa para mostrar ao utilizador *apenas uma vez*
        // --- FIM DA GERAÇÃO ---

        // Inicia a transação
        return this.db.transaction(async trx => {
            const [newEmpresa] = await trx('empresas').insert({
                nome: nome_empresa,
                cnpj,
                api_key_hash: apiKeyHash, // Guarda o hash
                api_key_prefix: apiKeyPrefix, // Guarda o prefixo
                status_assinatura: 'active'
            }).returning('*'); // Retorna todos os dados da nova empresa

            const [newAdmin] = await trx('users').insert({
                username,
                email,
                password: hashedPassword,
                nome,
                sobrenome,
                role: 'admin',
                empresa_id: newEmpresa.id // Associa o admin à empresa
            }).returning(['id', 'username', 'email', 'role']);

            return {
                message: 'Empresa e utilizador administrador registados com sucesso!',
                empresa: { id: newEmpresa.id, nome: newEmpresa.nome },
                user: newAdmin,
                // RETORNA A CHAVE COMPLETA AQUI - ÚNICA OPORTUNIDADE
                fullApiKey: fullApiKey
            };
        });
    }
}

module.exports = EmpresaService;