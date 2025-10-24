// InMidia/backend/services/placaService.js
const { v4: uuidv4 } = require('uuid'); // Ainda pode ser usado para outras coisas, mas não para ID da Placa
const Placa = require('../models/Placa'); // Modelo Placa Mongoose
const Regiao = require('../models/Regiao'); // Necessário para populate
const Aluguel = require('../models/Aluguel'); // Necessário para verificar disponibilidade
const mediaService = require('./midiaService'); // Serviço de mídia (R2)
const mongoose = require('mongoose'); // Necessário para ObjectId e queries

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

        let queryFilter = { empresa: new mongoose.Types.ObjectId(empresa_id) }; // Filtro base por empresa (converte para ObjectId)

        // Aplica filtros adicionais
        if (search) {
            const searchRegex = new RegExp(search, 'i'); // Case-insensitive
            queryFilter.$or = [
                { numero_placa: searchRegex },
                { nomeDaRua: searchRegex }
            ];
        }
        if (regiao_id && regiao_id !== 'todas') {
             try {
                // Tenta converter regiao_id para ObjectId para o filtro
                queryFilter.regiao = new mongoose.Types.ObjectId(regiao_id);
             } catch (e) {
                 console.warn(`[PlacaService - getAll] ID de região inválido recebido: ${regiao_id}`);
                 // Ignora o filtro se o ID for inválido
             }
        }
        if (disponivel === 'true' || disponivel === 'false') {
            queryFilter.disponivel = disponivel === 'true';
        }

        // --- Consulta Principal ---
        const placasQuery = Placa.find(queryFilter)
            .populate('regiao', 'nome') // Popula o campo 'regiao' buscando o 'nome' do documento Regiao
            .sort({ [sortColumn]: sortOrder })
            .skip(skip)
            .limit(parseInt(limit))
            .select('-__v') // Exclui __v (opcional, já que toJSON/lean fazem isso)
            .lean(); // <-- Adicionado .lean()

        // --- Consulta de Contagem (para paginação) ---
        const totalItems = await Placa.countDocuments(queryFilter);

        // Executa a consulta principal
        const placas = await placasQuery.exec(); // exec() ainda necessário
        const totalPages = Math.ceil(totalItems / limit);

        // Mapeia o resultado (necessário apenas se a transformação global toJSON não estiver ativa ou para ajustar a estrutura)
        const data = placas.map(p => ({
            ...p, // Inclui todos os campos do objeto lean
            id: p._id, // Mapeia _id para id (se toJSON global não estiver ativo ou para garantir)
            regiao: p.regiao ? p.regiao.nome : null, // Extrai nome da região populada
            // Remove _id original se mapeou para id
            // _id: undefined
        }));
         // Remove _id se existir após spread
         data.forEach(p => delete p._id);


        return {
            data: data,
            pagination: { totalItems, totalPages, currentPage: parseInt(page), itemsPerPage: parseInt(limit) }
        };
    }

    async getById(id, empresa_id) {
        // Adiciona .lean() para retornar um objeto simples
        const placa = await Placa.findOne({ _id: id, empresa: empresa_id })
                                 .populate('regiao', 'nome')
                                 .lean() // <-- Adicionado .lean()
                                 .exec();

        if (!placa) {
            const error = new Error('Placa não encontrada.');
            error.status = 404;
            throw error;
        }

        // Adiciona dados do aluguel ativo (opcional, como antes)
        // const hoje = ...; const aluguelAtivo = ...;

        // Formata a resposta (placa já é um objeto simples)
        placa.id = placa._id; // Mapeia _id para id (se toJSON global não estiver ativo ou para garantir)
        placa.regiao_id = placa.regiao?._id; // Mantém regiao_id para compatibilidade com frontend
        placa.regiao = placa.regiao?.nome; // Mantém apenas o nome em 'regiao'
        delete placa._id; // Remove _id original
        // delete placa.__v; // .lean() já remove __v

        // Lógica para adicionar cliente_nome e aluguel_data_fim se necessário...

        return placa;
    }

    async create(placaData, empresa_id) {
        let savedImageData = null;
        try {
            let imagemPath = null;
            // 1. Salva imagem se existir
            if (placaData.imagemFileObject) {
                savedImageData = await mediaService.saveImage(placaData.imagemFileObject);
                imagemPath = savedImageData.path;
            }

            // 2. Prepara dados para o Mongoose (usa placaData.regiao)
            const novaPlacaData = {
                numero_placa: placaData.numero_placa,
                coordenadas: placaData.coordenadas || null,
                nomeDaRua: placaData.nomeDaRua || null,
                tamanho: placaData.tamanho || null,
                regiao: placaData.regiao || null, // <<< Usa 'regiao' diretamente
                imagem: imagemPath,
                empresa: empresa_id,
                disponivel: true
            };

            // 3. Cria e salva a placa (NÃO usar .lean())
            const novaPlaca = new Placa(novaPlacaData);
            const placaCriada = await novaPlaca.save();
             // A transformação toJSON global (se configurada) tratará _id -> id na resposta
            return placaCriada;

        } catch (error) {
            // 4. Se erro, apaga imagem carregada
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
            throw error; // Re-lança outros erros
        }
    }

    async update(id, placaData, empresa_id, newImageFileObject = null) {
        let newImageData = null;
        let imagemAntigaPath = null;

        try {
            // 1. Busca placa atual
            // Adiciona .lean() pois só precisamos dos dados para comparação e imagem antiga
            const placaAtual = await Placa.findOne({ _id: id, empresa: empresa_id })
                                           .lean() // <-- Adicionado .lean()
                                           .exec();
            if (!placaAtual) {
                // Se carregou nova imagem mas placa não existe, apaga nova imagem
                if (newImageFileObject) {
                     // Precisamos salvar temporariamente para poder deletar? Não ideal.
                     // A lógica aqui pode precisar de ajuste dependendo de como o mediaService lida com erros.
                     // Vamos assumir que o controller já trataria isso ou que o erro 404 é suficiente.
                }
                const error = new Error('Placa a ser atualizada não encontrada.');
                error.status = 404; throw error;
            }
            imagemAntigaPath = placaAtual.imagem;

            // 2. Prepara dados para atualização
            const updateData = {};
            if (placaData.numero_placa !== undefined) updateData.numero_placa = placaData.numero_placa;
            if (placaData.coordenadas !== undefined) updateData.coordenadas = placaData.coordenadas || null;
            if (placaData.nomeDaRua !== undefined) updateData.nomeDaRua = placaData.nomeDaRua || null;
            if (placaData.tamanho !== undefined) updateData.tamanho = placaData.tamanho || null;
             // <<< Usa placaData.regiao diretamente >>>
            if (placaData.regiao !== undefined) updateData.regiao = placaData.regiao || null;

            // 3. Lida com a imagem
            if (newImageFileObject) {
                newImageData = await mediaService.saveImage(newImageFileObject);
                updateData.imagem = newImageData.path;
            } else if (placaData.hasOwnProperty('imagem') && !placaData.imagem) {
                updateData.imagem = null;
            }

            // 4. Verifica duplicidade antes de atualizar (usando 'regiao')
             if (updateData.numero_placa !== undefined || updateData.regiao !== undefined) {
                 const numeroParaVerificar = updateData.numero_placa !== undefined ? updateData.numero_placa : placaAtual.numero_placa;
                 // Garante que regiaoParaVerificar seja ObjectId ou null
                 let regiaoParaVerificar = updateData.regiao !== undefined ? updateData.regiao : placaAtual.regiao;
                 // Converte para ObjectId se for uma string válida, senão mantém null
                 if (regiaoParaVerificar && typeof regiaoParaVerificar === 'string' && mongoose.Types.ObjectId.isValid(regiaoParaVerificar)) {
                     regiaoParaVerificar = new mongoose.Types.ObjectId(regiaoParaVerificar);
                 } else if (regiaoParaVerificar && typeof regiaoParaVerificar !== 'object') { // Se não for ObjectId nem null
                    regiaoParaVerificar = null; // Trata como inválido/nulo
                 }


                 if (numeroParaVerificar && regiaoParaVerificar !== undefined) { // Permite regiao null na verificação
                    // Adiciona .lean() à verificação de duplicidade
                    const placaExistente = await Placa.findOne({
                        numero_placa: numeroParaVerificar,
                        empresa: empresa_id,
                        regiao: regiaoParaVerificar, // <<< Usa 'regiao' (ObjectId ou null)
                        _id: { $ne: id }
                    }).lean().exec(); // <-- Adicionado .lean()
                    if (placaExistente) {
                        if (newImageData && newImageData.path) await mediaService.deleteImage(newImageData.path);
                        const error = new Error('Já existe outra placa cadastrada com este número nesta região.');
                        error.status = 409; throw error;
                    }
                }
             }

            // 5. Tenta atualizar a placa
            // NÃO usar .lean() aqui para retornar o documento Mongoose atualizado
            const placaAtualizada = await Placa.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true }).exec();
            if (!placaAtualizada) {
                 if (newImageData && newImageData.path) await mediaService.deleteImage(newImageData.path);
                 throw new Error('Placa não encontrada durante a atualização.');
             }

            // 6. Se atualização OK, lida com a imagem antiga
            const imagemMudou = updateData.hasOwnProperty('imagem');
            if (imagemMudou && imagemAntigaPath && imagemAntigaPath !== updateData.imagem) {
                 await mediaService.deleteImage(imagemAntigaPath);
            }
            // A transformação toJSON global (se configurada) tratará _id -> id na resposta
            return placaAtualizada;

        } catch (error) {
            // 7. Se erro, apaga a *nova* imagem carregada, se houver
            if (newImageData && newImageData.path) {
                 console.log(`Erro ao atualizar placa (${error.message}), removendo nova imagem carregada: ${newImageData.path}`);
                 mediaService.deleteImage(newImageData.path).catch(deleteErr => { console.error("Erro ao apagar nova imagem após falha:", deleteErr); });
            }
            // Trata erro de índice único
             if (error.code === 11000) {
                 const uniqueError = new Error('Já existe outra placa cadastrada com este número nesta região.');
                 uniqueError.status = 409; throw uniqueError;
            }
            throw error; // Re-lança outros erros
        }
    }

    async delete(id, empresa_id) {
        // 1. Busca a placa
        // Adiciona .lean() pois só precisamos da URL da imagem
        const placaParaApagar = await Placa.findOne({ _id: id, empresa: empresa_id })
                                           .select('imagem') // Seleciona apenas a imagem
                                           .lean() // <-- Adicionado .lean()
                                           .exec();
        if (!placaParaApagar) {
            const error = new Error('Placa não encontrada para exclusão.');
            error.status = 404; throw error;
        }
        const imagemPath = placaParaApagar.imagem;

        // 2. Apaga a placa (deleteOne não precisa de .lean())
        const result = await Placa.deleteOne({ _id: id }).exec();

        // 3. Se apagou e tinha imagem, apaga do R2
        if (result.deletedCount > 0 && imagemPath) {
            await mediaService.deleteImage(imagemPath);
        } else if (result.deletedCount === 0) {
             throw new Error('Placa não encontrada para exclusão (no deleteOne).');
        }
        return { success: true };
    }

    async toggleDisponibilidade(id, empresa_id) {
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

        // Verifica se há aluguel ativo HOJE
        // Adiciona .lean() pois só precisamos saber se existe
        const aluguelAtivo = await Aluguel.findOne({
            placa: id, empresa: empresa_id,
            data_inicio: { $lte: hoje }, data_fim: { $gte: hoje }
        }).lean().exec(); // <-- Adicionado .lean()

        if (aluguelAtivo) {
            const error = new Error('Não é possível alterar a disponibilidade. A placa está ativamente alugada.');
            error.status = 409; throw error;
        }

        // Busca placa atual para obter status atual
        // Adiciona .lean() pois só precisamos do campo 'disponivel'
        const placaAtual = await Placa.findOne({ _id: id, empresa: empresa_id })
                                      .select('disponivel') // Seleciona apenas 'disponivel'
                                      .lean() // <-- Adicionado .lean()
                                      .exec();
        if (!placaAtual) {
            const error = new Error('Placa não encontrada.');
            error.status = 404; throw error;
        }

        const novoStatus = !placaAtual.disponivel;
        // updateOne não precisa de .lean()
        await Placa.updateOne({ _id: id }, { $set: { disponivel: novoStatus } });

        return { message: 'Disponibilidade atualizada com sucesso!', disponivel: novoStatus };
    }

    // Método adicionado para a rota /placas/locations
    async getAllPlacaLocations(empresa_id) {
        // Adiciona .lean() para performance
        return await Placa.find({
                empresa: new mongoose.Types.ObjectId(empresa_id), // Converte para ObjectId
                coordenadas: { $ne: null, $ne: '' } // Apenas onde coordenadas não são nulas ou vazias
            })
            .select('_id numero_placa coordenadas nomeDaRua') // Seleciona campos relevantes
            .lean() // <-- Adicionado .lean()
            .exec();
    }

} // Fim da classe

module.exports = PlacaService;