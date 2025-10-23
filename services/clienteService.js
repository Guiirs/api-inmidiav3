// services/clienteService.js
const mediaService = require('./midiaService'); // Reutilizamos o nosso gestor de média

class ClienteService {
    constructor(db) {
        this.db = db;
    }

    async getAll(empresa_id) {
        return this.db('clientes').where({ empresa_id }).select('*').orderBy('nome', 'asc');
    }

    async getById(id, empresa_id) {
        const cliente = await this.db('clientes').where({ id, empresa_id }).first();
        if (!cliente) {
            const error = new Error('Cliente não encontrado.');
            error.status = 404;
            throw error;
        }
        return cliente;
    }

    async create(clienteData, empresa_id, fileObject) {
        const { nome, cnpj, telefone } = clienteData;
        let logo_url = null;

        // 1. Salva o logo, se existir
        if (fileObject) {
            try {
                // O mediaService já trata de salvar o ficheiro e retornar o caminho
                const imageData = await mediaService.saveImage(fileObject);
                logo_url = imageData.path;
            } catch (uploadError) {
                console.error("Erro ao salvar logo do cliente:", uploadError);
                throw new Error('Erro ao processar o upload do logo.');
            }
        }

        // 2. Verifica duplicidade de CNPJ (só se o CNPJ for enviado)
        if (cnpj) {
            const existing = await this.db('clientes').where({ cnpj, empresa_id }).first();
            if (existing) {
                // Se já existe, apaga o logo que acabámos de carregar
                if (logo_url) await mediaService.deleteImage(logo_url);
                const error = new Error('Um cliente com este CNPJ já existe na sua empresa.');
                error.status = 409;
                throw error;
            }
        }

        // 3. Cria o cliente
        const [novoCliente] = await this.db('clientes').insert({
            nome,
            cnpj: cnpj || null, // Guarda null se for vazio
            telefone: telefone || null, // Guarda null se for vazio
            logo_url,
            empresa_id
        }).returning('*');

        return novoCliente;
    }

    async update(id, clienteData, empresa_id, fileObject) {
        const { nome, cnpj, telefone } = clienteData;
        
        const clienteAtual = await this.getById(id, empresa_id); // Verifica posse e obtém dados
        const imagemAntigaPath = clienteAtual.logo_url;
        let logo_url = imagemAntigaPath; // Mantém o logo antigo por defeito

        // 1. Verifica se um novo logo foi enviado
        if (fileObject) {
            try {
                const imageData = await mediaService.saveImage(fileObject);
                logo_url = imageData.path; // Define o novo caminho do logo
            } catch (uploadError) {
                throw new Error('Erro ao processar o novo logo.');
            }
        }

        // 2. Verifica duplicidade de CNPJ (se CNPJ foi fornecido e é diferente do atual)
        if (cnpj && cnpj !== clienteAtual.cnpj) {
            const existing = await this.db('clientes')
                .where({ cnpj, empresa_id })
                .whereNot({ id }) // Exclui o próprio cliente
                .first();
            if (existing) {
                // Se deu erro de duplicidade, apaga o novo logo carregado (se houver)
                if (fileObject && logo_url) await mediaService.deleteImage(logo_url);
                const error = new Error('Um cliente com este CNPJ já existe na sua empresa.');
                error.status = 409;
                throw error;
            }
        }
        
        // 3. Atualiza o cliente
        const [clienteAtualizado] = await this.db('clientes')
            .where({ id, empresa_id })
            .update({
                nome,
                cnpj: cnpj || null,
                telefone: telefone || null,
                logo_url
            })
            .returning('*');

        // 4. Se a atualização foi bem-sucedida e um novo logo foi carregado, apaga o antigo
        if (fileObject && imagemAntigaPath && imagemAntigaPath !== logo_url) {
            await mediaService.deleteImage(imagemAntigaPath);
        }

        return clienteAtualizado;
    }

    async delete(id, empresa_id) {
        // TODO: Futuramente, verificar se o cliente está em uso na tabela 'alugueis'
        // const aluguelExistente = await this.db('alugueis').where({ cliente_id: id, empresa_id }).first();
        // if (aluguelExistente) { ... }

        const cliente = await this.getById(id, empresa_id); // Verifica posse e obtém dados
        const logoPath = cliente.logo_url;
        
        const count = await this.db('clientes').where({ id, empresa_id }).del();
        
        if (count > 0 && logoPath) {
            // Se apagou do DB, remove o logo associado
            await mediaService.deleteImage(logoPath);
        }
        return { success: true };
    }
}

module.exports = ClienteService;