// services/regiaoService.js
const Regiao = require('../models/Regiao'); // Importa o modelo Regiao Mongoose
const Placa = require('../models/Placa');   // Importa o modelo Placa para a verificação no delete

class RegiaoService {
    // constructor não precisa mais do 'db'
    constructor() {}

    async getAll(empresa_id) {
        // Busca todas as regiões da empresa, ordenadas por nome
        return await Regiao.find({ empresa: empresa_id })
                           .sort({ nome: 1 }) // 1 para ascendente, -1 para descendente
                           .exec();
    }

    async create(nome, empresa_id) {
        // Cria uma nova instância do modelo Regiao
        const novaRegiao = new Regiao({
            nome,
            empresa: empresa_id
        });

        try {
            // Tenta salvar a nova região no MongoDB
            const regiaoSalva = await novaRegiao.save();
            return regiaoSalva; // Retorna o documento salvo
        } catch (error) {
            // Trata o erro de índice único (nome duplicado para a mesma empresa)
            if (error.code === 11000) {
                const uniqueError = new Error('Já existe uma região com este nome na sua empresa.');
                uniqueError.status = 409; // Conflict
                throw uniqueError;
            }
            // Re-lança outros erros
            throw error;
        }
    }

    async update(id, nome, empresa_id) {
        try {
            // Encontra a região pelo _id e empresa_id e atualiza o nome
            // { new: true } retorna o documento *após* a atualização
            const regiaoAtualizada = await Regiao.findOneAndUpdate(
                { _id: id, empresa: empresa_id }, // Critérios de busca
                { $set: { nome: nome } },         // Dados a atualizar
                { new: true, runValidators: true } // runValidators garante que o novo nome também seja validado pelo schema, se houver validações
            ).exec();

            // Verifica se a região foi encontrada e atualizada
            if (!regiaoAtualizada) {
                const error = new Error('Região não encontrada.');
                error.status = 404; // Not Found
                throw error;
            }

            return regiaoAtualizada; // Retorna o documento atualizado
        } catch (error) {
            // Trata o erro de índice único (novo nome duplicado para a mesma empresa)
            if (error.code === 11000) {
                const uniqueError = new Error('Já existe uma região com este nome na sua empresa.');
                uniqueError.status = 409; // Conflict
                throw uniqueError;
            }
            // Re-lança outros erros
            throw error;
        }
    }

    async delete(id, empresa_id) {
        // 1. Verifica se alguma placa está a usar esta região
        const placaUsandoRegiao = await Placa.findOne({
            regiao: id,
            empresa: empresa_id // Garante que estamos a verificar placas da mesma empresa
        }).exec();

        if (placaUsandoRegiao) {
            // Se encontrar uma placa, lança erro
            const error = new Error('Não é possível apagar esta região, pois está a ser utilizada por uma ou mais placas.');
            error.status = 400; // Bad Request (ou 409 Conflict)
            throw error;
        }

        // 2. Se nenhuma placa estiver a usar, tenta apagar a região
        const result = await Regiao.deleteOne({ _id: id, empresa: empresa_id }).exec();

        // Verifica se algum documento foi apagado
        if (result.deletedCount === 0) {
            const error = new Error('Região não encontrada.');
            error.status = 404; // Not Found
            throw error;
        }

        // Retorna sucesso
        return { success: true };
    }
}

module.exports = RegiaoService;