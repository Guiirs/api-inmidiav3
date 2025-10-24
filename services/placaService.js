// InMidia/backend/services/placaService.js
const { v4: uuidv4 } = require('uuid'); // Ainda usado para gerar prefixo de API Key, mas não para ID da Placa
const Placa = require('../models/Placa'); // Modelo Placa Mongoose
const Regiao = require('../models/Regiao'); // Necessário para populate
const Aluguel = require('../models/Aluguel'); // Necessário para verificar disponibilidade
const mediaService = require('./midiaService'); // Serviço de mídia (R2)

class PlacaService {
    // constructor não precisa mais do 'db'
    constructor() {}

    async getAll(empresa_id, filters) {
        const { page = 1, limit = 10, sortBy = 'createdAt', order = 'desc', regiao_id, disponivel, search } = filters;
        const skip = (page - 1) * limit;

        // Mapeia sortBy para campos Mongoose (regiao é populado, então usamos 'regiao.nome')
        const allowedSortBy = ['_id', 'numero_placa', 'nomeDaRua', 'regiao.nome', 'createdAt', 'updatedAt'];
        // Ajusta o campo de ordenação se for pela região populada
        let sortColumn = allowedSortBy.includes(sortBy) ? sortBy : 'createdAt'; // Default sort
        const sortOrder = (order.toLowerCase() === 'asc') ? 1 : -1;

        let queryFilter = { empresa: empresa_id }; // Filtro base por empresa

        // Aplica filtros adicionais
        if (search) {
            const searchRegex = new RegExp(search, 'i'); // Case-insensitive
            queryFilter.$or = [
                { numero_placa: searchRegex },
                { nomeDaRua: searchRegex }
            ];
        }
        if (regiao_id && regiao_id !== 'todas') {
            queryFilter.regiao = regiao_id; // Filtra pelo ObjectId da região
        }
        if (disponivel === 'true' || disponivel === 'false') {
            queryFilter.disponivel = disponivel === 'true';
        }

        // --- Consulta Principal ---
        const placasQuery = Placa.find(queryFilter)
            .populate('regiao', 'nome') // Popula o campo 'regiao' buscando o 'nome' do documento Regiao
            // Nota: Não estamos populando aluguel/cliente ativo aqui para manter a query mais simples.
            // Isso pode ser adicionado depois se necessário, possivelmente com aggregate/$lookup.
            .sort({ [sortColumn]: sortOrder })
            .skip(skip)
            .limit(parseInt(limit));

        // --- Consulta de Contagem (para paginação) ---
        const totalItems = await Placa.countDocuments(queryFilter);

        // Executa a consulta principal
        const placas = await placasQuery.exec();
        const totalPages = Math.ceil(totalItems / limit);

        // Mapeia o resultado para um formato consistente (opcional, mas pode ser útil para o frontend)
        const data = placas.map(p => ({
            id: p._id, // Renomeia _id para id
            numero_placa: p.numero_placa,
            nomeDaRua: p.nomeDaRua,
            imagem: p.imagem,
            regiao: p.regiao ? p.regiao.nome : null, // Acessa o nome da região populada
            disponivel: p.disponivel,
            // Campos de aluguel ativo (cliente_nome, aluguel_data_fim) omitidos nesta versão
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
        }));

        return {
            data: data,
            pagination: { totalItems, totalPages, currentPage: parseInt(page), itemsPerPage: parseInt(limit) }
        };
    }

    async getById(id, empresa_id) {
        // Busca por _id e empresa, populando a região
        const placa = await Placa.findOne({ _id: id, empresa: empresa_id })
                                 .populate('regiao', 'nome') // Popula nome da região
                                 .exec();

        if (!placa) {
            const error = new Error('Placa não encontrada.');
            error.status = 404;
            throw error;
        }

        // Lógica para adicionar dados do aluguel ativo (se necessário)
        // const hoje = new Date();
        // hoje.setHours(0, 0, 0, 0); // Zera hora para comparar apenas data
        // const aluguelAtivo = await Aluguel.findOne({
        //     placa: placa._id,
        //     data_inicio: { $lte: hoje },
        //     data_fim: { $gte: hoje }
        // }).populate('cliente', 'nome').exec();

        // Converte para objeto simples para poder adicionar propriedades
        const placaObj = placa.toObject();
        // if (aluguelAtivo) {
        //     placaObj.cliente_nome = aluguelAtivo.cliente ? aluguelAtivo.cliente.nome : 'Cliente não encontrado';
        //     placaObj.aluguel_data_fim = aluguelAtivo.data_fim;
        // } else {
             placaObj.cliente_nome = null;
             placaObj.aluguel_data_fim = null;
        // }

        // Renomeia _id para id e regiao._id para regiao_id para consistência (opcional)
        placaObj.id = placaObj._id;
        placaObj.regiao_id = placaObj.regiao?._id; // ID da região
        placaObj.regiao = placaObj.regiao?.nome; // Apenas o nome da região
        delete placaObj._id;
        // delete placaObj.__v; // Remove versão do Mongoose

        return placaObj;
    }

    async create(placaData, empresa_id) {
        let savedImageData = null;
        try {
            let imagemPath = null;
            // 1. Salva imagem se existir (lógica mediaService inalterada)
            if (placaData.imagemFileObject) { // Assumindo que o controller passa o file object aqui
                savedImageData = await mediaService.saveImage(placaData.imagemFileObject);
                imagemPath = savedImageData.path;
            }

            // 2. Prepara dados para o Mongoose (regiao_id vira regiao)
            const novaPlacaData = {
                numero_placa: placaData.numero_placa,
                coordenadas: placaData.coordenadas || null,
                nomeDaRua: placaData.nomeDaRua || null,
                tamanho: placaData.tamanho || null,
                regiao: placaData.regiao_id || null, // Usa o ObjectId da região
                imagem: imagemPath, // URL do R2 ou null
                empresa: empresa_id, // ObjectId da empresa
                disponivel: true
            };

            // 3. Cria e salva a placa
            const novaPlaca = new Placa(novaPlacaData);
            const placaCriada = await novaPlaca.save();
            return placaCriada; // Retorna o documento Mongoose

        } catch (error) {
            // 4. Se erro, apaga imagem carregada (lógica mediaService inalterada)
            if (savedImageData && savedImageData.path) {
                console.log(`Erro ao criar placa (${error.message}), removendo imagem carregada: ${savedImageData.path}`);
                mediaService.deleteImage(savedImageData.path).catch(deleteErr => {
                    console.error(`Erro ao tentar apagar imagem ${savedImageData.path} após falha na criação da placa:`, deleteErr);
                });
            }

            // Trata erro de índice único
            if (error.code === 11000) {
                 const uniqueError = new Error('Já existe uma placa cadastrada com este número nesta região.');
                 uniqueError.status = 409;
                 throw uniqueError;
            }
            // Re-lança outros erros
            throw error;
        }
    }

    async update(id, placaData, empresa_id, newImageFileObject = null) {
        let newImageData = null;
        let imagemAntigaPath = null;

        try {
            // 1. Busca placa atual para verificar posse e obter URL da imagem antiga
            const placaAtual = await Placa.findOne({ _id: id, empresa: empresa_id }).exec();
            if (!placaAtual) {
                // Se carregou nova imagem mas placa não existe, apaga nova imagem
                if (newImageFileObject) {
                     const tempImageData = await mediaService.saveImage(newImageFileObject);
                     await mediaService.deleteImage(tempImageData.path);
                }
                const error = new Error('Placa a ser atualizada não encontrada.');
                error.status = 404;
                throw error;
            }
            imagemAntigaPath = placaAtual.imagem; // Guarda URL antiga

            // 2. Prepara dados para atualização Mongoose
            const updateData = {};
            if (placaData.numero_placa !== undefined) updateData.numero_placa = placaData.numero_placa;
            if (placaData.coordenadas !== undefined) updateData.coordenadas = placaData.coordenadas || null;
            if (placaData.nomeDaRua !== undefined) updateData.nomeDaRua = placaData.nomeDaRua || null;
            if (placaData.tamanho !== undefined) updateData.tamanho = placaData.tamanho || null;
            if (placaData.regiao_id !== undefined) updateData.regiao = placaData.regiao_id || null; // Atualiza a referência ObjectId
            // Não atualiza 'disponivel' aqui, é feito pelo toggleDisponibilidade
            // delete updateData.disponivel; // Garante que não atualize

            // 3. Lida com a imagem
            if (newImageFileObject) {
                newImageData = await mediaService.saveImage(newImageFileObject);
                updateData.imagem = newImageData.path; // Define nova URL
            } else if (placaData.hasOwnProperty('imagem') && !placaData.imagem) {
                // Permite remover a imagem enviando imagem: null ou ''
                updateData.imagem = null;
            }
            // Se nem newImageFileObject nem placaData.imagem foram enviados, o campo 'imagem' não é incluído em updateData

            // 4. Tenta atualizar a placa
            const placaAtualizada = await Placa.findByIdAndUpdate(
                id,
                { $set: updateData },
                { new: true, runValidators: true } // Retorna o novo doc, roda validadores
            ).exec();

            // Verifica se a atualização ocorreu (findByIdAndUpdate retorna null se não encontrar)
             if (!placaAtualizada) {
                 // Caso raro (deletado entre findOne e findByIdAndUpdate)
                 if (newImageData && newImageData.path) await mediaService.deleteImage(newImageData.path);
                 throw new Error('Placa não encontrada durante a atualização.');
             }


            // 5. Se atualização OK, lida com a imagem antiga
            const imagemMudou = updateData.hasOwnProperty('imagem'); // Verifica se o campo imagem estava no $set
            if (imagemMudou && imagemAntigaPath && imagemAntigaPath !== updateData.imagem) {
                await mediaService.deleteImage(imagemAntigaPath);
            }

            return placaAtualizada; // Retorna o documento atualizado

        } catch (error) {
            // 6. Se erro, apaga a *nova* imagem carregada, se houver
            if (newImageData && newImageData.path) {
                 console.log(`Erro ao atualizar placa (${error.message}), removendo nova imagem carregada: ${newImageData.path}`);
                 mediaService.deleteImage(newImageData.path).catch(deleteErr => {
                    console.error(`Erro ao tentar apagar nova imagem ${newImageData.path} após falha na atualização da placa:`, deleteErr);
                });
            }
            // Trata erro de índice único
             if (error.code === 11000) {
                 const uniqueError = new Error('Já existe outra placa cadastrada com este número nesta região.');
                 uniqueError.status = 409;
                 throw uniqueError;
            }
            // Re-lança outros erros
            throw error;
        }
    }

    async delete(id, empresa_id) {
        // 1. Busca a placa para pegar a URL da imagem e verificar posse
        const placaParaApagar = await Placa.findOne({ _id: id, empresa: empresa_id }).exec();
        if (!placaParaApagar) {
            const error = new Error('Placa não encontrada para exclusão.');
            error.status = 404;
            throw error;
        }
        const imagemPath = placaParaApagar.imagem; // URL da imagem no R2

        // 2. Apaga a placa do MongoDB
        const result = await Placa.deleteOne({ _id: id }).exec(); // _id já garante a unicidade

        // 3. Se apagou com sucesso e tinha imagem, apaga do R2
        if (result.deletedCount > 0 && imagemPath) {
            await mediaService.deleteImage(imagemPath);
        } else if (result.deletedCount === 0) {
            // Segurança extra, embora o findOne inicial já devesse ter falhado
             throw new Error('Placa não encontrada para exclusão (no deleteOne).');
        }

        return { success: true };
    }

    async toggleDisponibilidade(id, empresa_id) {
        // Verifica se há aluguel ATIVO HOJE para esta placa
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0); // Zera a hora para comparar apenas a data

        const aluguelAtivo = await Aluguel.findOne({
            placa: id,
            empresa: empresa_id, // Garante que o aluguel é da mesma empresa
            data_inicio: { $lte: hoje }, // Começou hoje ou antes
            data_fim: { $gte: hoje }      // Termina hoje ou depois
        }).exec();

        if (aluguelAtivo) {
            // Se está ativamente alugada, não permite a troca manual
            const error = new Error('Não é possível alterar a disponibilidade. A placa está ativamente alugada.');
            error.status = 409; // Conflict
            throw error;
        }

        // Se não houver aluguel ativo, permite a troca manual
        const placaAtual = await Placa.findOne({ _id: id, empresa: empresa_id }).exec();
        if (!placaAtual) {
            const error = new Error('Placa não encontrada.');
            error.status = 404;
            throw error;
        }

        // Alterna o status e salva
        const novoStatus = !placaAtual.disponivel;
        await Placa.updateOne({ _id: id }, { $set: { disponivel: novoStatus } });

        return { message: 'Disponibilidade atualizada com sucesso!', disponivel: novoStatus };
    }
}

module.exports = PlacaService;