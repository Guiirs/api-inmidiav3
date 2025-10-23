// InMidia/backend/services/placaService.js
const { v4: uuidv4 } = require('uuid');
const mediaService = require('./midiaService');
// Importa o knex (ou a instância 'db') para usar o knex.raw na consulta de data
const knex = require('../config/database'); 

class PlacaService {
    constructor(db) {
        this.db = db;
    }

    async getAll(empresa_id, filters) {
        // ... (Toda a lógica de filtros e paginação existente) ...
        const { page = 1, limit = 10, sortBy = 'id', order = 'desc', regiao_id, disponivel, search } = filters;
        const offset = (page - 1) * limit;

        const allowedSortBy = ['id', 'numero_placa', 'nomeDaRua', 'regiao'];
        const sortColumn = allowedSortBy.includes(sortBy) ? (sortBy === 'regiao' ? 'regioes.nome' : `placas.${sortBy}`) : 'placas.id';
        const sortOrder = (order.toLowerCase() === 'asc') ? 'asc' : 'desc';

        const hoje = new Date().toISOString().split('T')[0];

        let query = this.db('placas')
            .leftJoin('regioes', 'placas.regiao_id', 'regioes.id')
            .leftJoin('alugueis', (join) => {
                join.on('alugueis.placa_id', '=', 'placas.id')
                    // Usa a instância do knex (importada como 'knex' ou 'this.db') para o .raw
                    .andOn('alugueis.data_inicio', '<=', knex.raw('?', [hoje]))
                    .andOn('alugueis.data_fim', '>=', knex.raw('?', [hoje]));
            })
            .leftJoin('clientes', 'alugueis.cliente_id', 'clientes.id')
            .select(
                'placas.id', 'placas.numero_placa', 'placas.nomeDaRua', 'placas.imagem',
                'regioes.nome as regiao', 'placas.disponivel',
                'clientes.nome as cliente_nome', 'alugueis.data_fim as aluguel_data_fim'
            )
            .where('placas.empresa_id', empresa_id);

        let countQuery = this.db('placas').count('id as total').where('empresa_id', empresa_id);

        // ... (Lógica de filtros 'search', 'regiao_id', 'disponivel' existente) ...
         if (search) {
            const searchTerm = `%${search}%`;
            query.where(function() { this.where('placas.numero_placa', 'like', searchTerm).orWhere('placas.nomeDaRua', 'like', searchTerm); });
            countQuery.where(function() { this.where('placas.numero_placa', 'like', searchTerm).orWhere('placas.nomeDaRua', 'like', searchTerm); });
        }
        if (regiao_id && regiao_id !== 'todas') {
            query.where('placas.regiao_id', regiao_id);
            countQuery.where({ regiao_id });
        }
        if (disponivel === 'true' || disponivel === 'false') {
            query.where('placas.disponivel', disponivel === 'true');
            countQuery.where('disponivel', disponivel === 'true');
        }

        const countResult = await countQuery.first();
        const totalItems = parseInt(countResult?.total || 0, 10);
        const placas = await query.orderBy(sortColumn, sortOrder).limit(limit).offset(offset);
        const totalPages = Math.ceil(totalItems / limit);

        return {
            data: placas,
            pagination: { totalItems, totalPages, currentPage: parseInt(page), itemsPerPage: parseInt(limit) }
        };
    }

    async getById(id, empresa_id) {
        // --- ATUALIZADO PARA INCLUIR DADOS DO ALUGUEL ATIVO ---
        const hoje = new Date().toISOString().split('T')[0];

        const placa = await this.db('placas')
            .leftJoin('regioes', 'placas.regiao_id', 'regioes.id')
            // Junta alugueis ativos hoje
            .leftJoin('alugueis', (join) => {
                join.on('alugueis.placa_id', '=', 'placas.id')
                    .andOn('alugueis.data_inicio', '<=', knex.raw('?', [hoje]))
                    .andOn('alugueis.data_fim', '>=', knex.raw('?', [hoje]));
            })
            // Junta o cliente desse aluguel
            .leftJoin('clientes', 'alugueis.cliente_id', 'clientes.id')
            .select(
                'placas.*', // Todos os dados da placa
                'regioes.nome as regiao', // Nome da região
                'clientes.nome as cliente_nome', // Nome do cliente (se alugada)
                'alugueis.data_fim as aluguel_data_fim' // Data fim (se alugada)
            )
            .where('placas.id', id)
            .andWhere('placas.empresa_id', empresa_id)
            .first();
        // --- FIM DA ATUALIZAÇÃO ---

        if (!placa) {
            const error = new Error('Placa não encontrada.');
            error.status = 404;
            throw error;
        }
        return placa;
    }

    async create(placaData, empresa_id) {
        // ... (código existente inalterado) ...
        const { numero_placa, coordenadas, nomeDaRua, tamanho, regiao_id, imagem } = placaData;
        if(numero_placa && regiao_id) {
            const placaExistente = await this.db('placas').where({ numero_placa, empresa_id, regiao_id }).first();
            if (placaExistente) {
                 if (imagem) {
                     await mediaService.deleteImage(imagem);
                 }
                const error = new Error('Já existe uma placa cadastrada com este número nesta região.');
                error.status = 409;
                throw error;
            }
        }
        const novaPlaca = {
            id_placa: uuidv4(),
            numero_placa,
            coordenadas: coordenadas || null,
            nomeDaRua: nomeDaRua || null,
            tamanho: tamanho || null,
            regiao_id,
            imagem: imagem || null,
            empresa_id,
            disponivel: true 
        };
        const [insertedResult] = await this.db('placas').insert(novaPlaca).returning('*');
        return insertedResult;
    }

    async update(id, placaData, empresa_id, newImagePath = null) {
        // ... (código existente inalterado, esta função só atualiza os dados, não o status) ...
         const placaAtual = await this.db('placas').where({ id, empresa_id }).select('imagem', 'regiao_id', 'numero_placa').first();
        if (!placaAtual) {
             if (placaData.imagem) {
                 await mediaService.deleteImage(placaData.imagem);
             }
            const error = new Error('Placa a ser atualizada não encontrada.');
            error.status = 404;
            throw error;
        }
        const imagemAntigaPath = placaAtual.imagem;
        if (placaData.numero_placa !== undefined || placaData.regiao_id !== undefined) {
             const numeroParaVerificar = placaData.numero_placa !== undefined ? placaData.numero_placa : placaAtual.numero_placa;
             const regiaoParaVerificar = placaData.regiao_id !== undefined ? placaData.regiao_id : placaAtual.regiao_id;
             if (numeroParaVerificar && regiaoParaVerificar) {
                const placaExistente = await this.db('placas')
                    .where({
                        numero_placa: numeroParaVerificar,
                        empresa_id: empresa_id,
                        regiao_id: regiaoParaVerificar
                    })
                    .whereNot('id', id)
                    .first();
                if (placaExistente) {
                    if (placaData.imagem && placaData.imagem !== imagemAntigaPath) {
                        await mediaService.deleteImage(placaData.imagem);
                    }
                    const error = new Error('Já existe outra placa cadastrada com este número nesta região.');
                    error.status = 409;
                    throw error;
                }
            }
        }
        delete placaData.id;
        delete placaData.id_placa;
        delete placaData.empresa_id;
         const removerImagemExistente = placaData.hasOwnProperty('imagem') && !placaData.imagem && !newImagePath;
        try {
            // Remove a flag 'disponivel' dos dados de atualização,
            // pois ela só deve ser mudada pelo toggle ou pelo aluguelService
            delete placaData.disponivel; 
            
            const count = await this.db('placas').where({ id, empresa_id }).update(placaData);
            if (count > 0 || removerImagemExistente) {
                if ((newImagePath && imagemAntigaPath && newImagePath !== imagemAntigaPath) || (removerImagemExistente && imagemAntigaPath)) {
                    await mediaService.deleteImage(imagemAntigaPath);
                }
            } else {
                 const checkExists = await this.db('placas').where({ id, empresa_id }).first();
                 if (!checkExists) {
                    const error = new Error('Placa não encontrada para atualização.');
                    error.status = 404;
                    throw error;
                 }
                 return checkExists;
            }
            return await this.db('placas').where({ id, empresa_id }).first();
        } catch(error) {
             if (placaData.imagem && placaData.imagem !== imagemAntigaPath) {
                 await mediaService.deleteImage(placaData.imagem);
             }
            throw error;
        }
    }

    async delete(id, empresa_id) {
        // ... (código existente inalterado) ...
        const placaParaApagar = await this.db('placas').where({ id, empresa_id }).select('imagem').first();
        if (!placaParaApagar) {
            const error = new Error('Placa não encontrada para exclusão.');
            error.status = 404;
            throw error;
        }
        const imagemPath = placaParaApagar.imagem;
        const count = await this.db('placas').where({ id, empresa_id }).del();
        if (count === 0) {
            const error = new Error('Placa não encontrada para exclusão.');
            error.status = 404;
            throw error;
        }
        await mediaService.deleteImage(imagemPath);
        return { success: true };
    }

    async toggleDisponibilidade(id, empresa_id) {
        // --- LÓGICA ATUALIZADA ---
        // Verifica se há aluguel ATIVO HOJE
        const hoje = new Date().toISOString().split('T')[0];
        const aluguelAtivo = await this.db('alugueis')
           .where({ placa_id: id, empresa_id })
           .andWhere('data_inicio', '<=', hoje)
           .andWhere('data_fim', '>=', hoje)
           .first();

        if (aluguelAtivo) {
            // Se está ativamente alugada, não permite a troca manual
            const error = new Error('Não é possível alterar a disponibilidade. A placa está ativamente alugada.');
            error.status = 409; // Conflito
            throw error;
        }

        // Se não houver aluguel ativo, permite a troca manual (Manutenção)
        const placaAtual = await this.db('placas').where({ id, empresa_id }).select('disponivel').first();
        if (!placaAtual) {
            const error = new Error('Placa não encontrada.');
            error.status = 404;
            throw error;
        }
        const novoStatus = !placaAtual.disponivel;
        await this.db('placas').where({ id, empresa_id }).update({ disponivel: novoStatus });
        return { message: 'Disponibilidade atualizada com sucesso!', disponivel: novoStatus };
    }
}

module.exports = PlacaService;