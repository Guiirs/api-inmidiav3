// InMidia/backend/services/relatorioService.js
const Placa = require('../models/Placa'); // Modelo Placa Mongoose
const Regiao = require('../models/Regiao'); // Modelo Regiao Mongoose
const mongoose = require('mongoose'); // Necessário para ObjectId

class RelatorioService {
    // constructor não precisa mais do 'db'
    constructor() {}

    async placasPorRegiao(empresa_id) {
        // Usa o Aggregation Pipeline do MongoDB para agrupar e contar
        const results = await Placa.aggregate([
            // 1. Filtra as placas pela empresa (converte string para ObjectId)
            { $match: { empresa: new mongoose.Types.ObjectId(empresa_id) } },
            // 2. Faz o "join" com a coleção de Regioes
            {
                $lookup: {
                    from: Regiao.collection.name, // Nome da coleção de Regioes
                    localField: 'regiao',         // Campo na coleção Placa (ObjectId)
                    foreignField: '_id',          // Campo na coleção Regiao (_id)
                    as: 'regiaoInfo'              // Nome do novo array que conterá a região encontrada
                }
            },
            // 3. Desconstrói o array regiaoInfo (haverá 0 ou 1 elemento)
            //    preserveNullAndEmptyArrays: true -> mantém placas sem região (regiaoInfo será [])
            { $unwind: { path: '$regiaoInfo', preserveNullAndEmptyArrays: true } },
            // 4. Agrupa pelo nome da região (ou um valor padrão se não houver região)
            {
                $group: {
                    // Agrupa pelo nome da região, usando 'Sem Região' se regiaoInfo for nulo/vazio
                    _id: { regiaoNome: { $ifNull: ['$regiaoInfo.nome', 'Sem Região'] } },
                    total_placas: { $sum: 1 } // Conta os documentos em cada grupo
                }
            },
            // 5. Formata a saída
            {
                $project: {
                    _id: 0, // Remove o campo _id do grupo
                    regiao: '$_id.regiaoNome', // Renomeia _id.regiaoNome para regiao
                    total_placas: 1 // Mantém o total_placas
                }
            },
            // 6. Ordena pelo nome da região (opcional)
            { $sort: { regiao: 1 } }
        ]).exec(); // Executa a agregação

        return results; // Retorna o array de objetos simples
    }

    async getDashboardSummary(empresa_id) {
        // Converte para ObjectId se não for (necessário para $match e contagens)
        const empresaObjectId = new mongoose.Types.ObjectId(empresa_id);

        // 1. Contagem total de placas (countDocuments não retorna documento Mongoose)
        const totalPlacasPromise = Placa.countDocuments({ empresa: empresaObjectId });

        // 2. Contagem de placas disponíveis (countDocuments não retorna documento Mongoose)
        const placasDisponiveisPromise = Placa.countDocuments({ empresa: empresaObjectId, disponivel: true });

        // 3. Encontra a região principal usando Aggregation Pipeline
        //    (.aggregate() já retorna objetos simples)
        const regiaoPrincipalPromise = Placa.aggregate([
            // Filtra pela empresa
            { $match: { empresa: empresaObjectId } },
            // Considera apenas placas com região definida
            { $match: { regiao: { $ne: null } } },
            // Faz o "join" com Regioes
            {
                $lookup: {
                    from: Regiao.collection.name,
                    localField: 'regiao',
                    foreignField: '_id',
                    as: 'regiaoInfo'
                }
            },
            // Desconstrói o array (haverá sempre 1 elemento aqui devido ao $match anterior)
            { $unwind: '$regiaoInfo' },
            // Agrupa pelo nome da região e conta
            {
                $group: {
                    _id: { regiaoNome: '$regiaoInfo.nome' },
                    count: { $sum: 1 }
                }
            },
            // Ordena pela contagem descendente
            { $sort: { count: -1 } },
            // Pega apenas o primeiro resultado (o maior)
            { $limit: 1 },
            // Formata a saída para pegar apenas o nome
            {
                $project: {
                    _id: 0,
                    nome: '$_id.regiaoNome'
                }
            }
        ]).exec(); // Executa a agregação

        // Executa todas as promessas em paralelo
        const [totalPlacasResult, placasDisponiveisResult, regiaoPrincipalResultArray] = await Promise.all([
            totalPlacasPromise,
            placasDisponiveisPromise,
            regiaoPrincipalPromise
        ]);

        // Extrai o nome da região principal (ou N/A se não houver placas com região)
        const regiaoPrincipal = regiaoPrincipalResultArray.length > 0 ? regiaoPrincipalResultArray[0].nome : 'N/A';

        return {
            totalPlacas: totalPlacasResult || 0,
            placasDisponiveis: placasDisponiveisResult || 0,
            regiaoPrincipal: regiaoPrincipal,
        };
    }
}

module.exports = RelatorioService;