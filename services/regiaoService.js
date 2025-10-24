// services/regiaoService.js
const Regiao = require('../models/Regiao'); // Importa o modelo Regiao Mongoose
const Placa = require('../models/Placa');   // Importa o modelo Placa para a verificação no delete
// mongoose não é mais necessário aqui diretamente se não usar ObjectId

class RegiaoService {
    // constructor não precisa mais do 'db'
    constructor() {}

    async getAll(empresa_id) {
        // Busca todas as regiões da empresa, ordenadas por nome
        // Adiciona .lean() para retornar objetos simples e melhorar performance
        return await Regiao.find({ empresa: empresa_id })
                           .sort({ nome: 1 }) // 1 para ascendente
                           .lean() // <-- Adicionado .lean()
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
            // NÃO usar .lean() aqui, pois .save() opera em um documento Mongoose
            const regiaoSalva = await novaRegiao.save();
            // A transformação toJSON/toObject configurada globalmente tratará _id -> id
            return regiaoSalva;
        } catch (error) {
            // Trata o erro de índice único (nome duplicado para a mesma empresa)
            if (error.code === 11000) {
                const uniqueError = new Error('Já existe uma região com este nome na sua empresa.');
                uniqueError.status = 409; // Conflict
                throw uniqueError;
            }
            throw error; // Re-lança outros erros
        }
    }

    async update(id, nome, empresa_id) {
        try {
            // Encontra a região pelo _id e empresa_id e atualiza o nome
            // { new: true } retorna o documento *após* a atualização
            // NÃO usar .lean() aqui, pois findOneAndUpdate retorna um documento Mongoose por padrão (a menos que use lean explicitamente nas opções)
            const regiaoAtualizada = await Regiao.findOneAndUpdate(
                { _id: id, empresa: empresa_id }, // Critérios de busca
                { $set: { nome: nome } },         // Dados a atualizar
                { new: true, runValidators: true } // Retorna o novo, executa validadores
            ).exec();

            if (!regiaoAtualizada) {
                const error = new Error('Região não encontrada.');
                error.status = 404; // Not Found
                throw error;
            }
            // A transformação toJSON/toObject tratará _id -> id na resposta
            return regiaoAtualizada;
        } catch (error) {
            // Trata o erro de índice único (novo nome duplicado para a mesma empresa)
            if (error.code === 11000) {
                const uniqueError = new Error('Já existe uma região com este nome na sua empresa.');
                uniqueError.status = 409; // Conflict
                throw uniqueError;
            }
            throw error; // Re-lança outros erros
        }
    }

    async delete(id, empresa_id) {
        // 1. Verifica se alguma placa está a usar esta região
        // Usar .lean() aqui é seguro e performático, pois só precisamos verificar a existência
        const placaUsandoRegiao = await Placa.findOne({
            regiao: id,
            empresa: empresa_id
        }).lean().exec(); // <-- Adicionado .lean()

        if (placaUsandoRegiao) {
            const error = new Error('Não é possível apagar esta região, pois está a ser utilizada por uma ou mais placas.');
            error.status = 400; // Bad Request
            throw error;
        }

        // 2. Se nenhuma placa estiver a usar, tenta apagar a região
        // deleteOne não retorna o documento, então .lean() não se aplica
        const result = await Regiao.deleteOne({ _id: id, empresa: empresa_id }).exec();

        if (result.deletedCount === 0) {
            const error = new Error('Região não encontrada.');
            error.status = 404; // Not Found
            throw error;
        }

        return { success: true };
    }
}

module.exports = RegiaoService;