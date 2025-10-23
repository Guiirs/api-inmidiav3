// services/regiaoService.js
class RegiaoService {
    constructor(db) {
        this.db = db;
    }

    async getAll(empresa_id) {
        return await this.db('regioes').where({ empresa_id }).select('*').orderBy('nome', 'asc');
    }

    async create(nome, empresa_id) {
        const [insertedIdObject] = await this.db('regioes').insert({ nome, empresa_id }).returning('id');
        const insertedId = (typeof insertedIdObject === 'object') ? insertedIdObject.id : insertedIdObject;
        return await this.db('regioes').where({ id: insertedId }).first();
    }

    async update(id, nome, empresa_id) {
        const count = await this.db('regioes').where({ id, empresa_id }).update({ nome });
        if (count === 0) {
            const error = new Error('Região não encontrada.');
            error.status = 404;
            throw error;
        }
        return await this.db('regioes').where({ id }).first();
    }

    async delete(id, empresa_id) {
        const placaUsandoRegiao = await this.db('placas').where({ regiao_id: id, empresa_id }).first();
        if (placaUsandoRegiao) {
            const error = new Error('Não é possível apagar esta região, pois está a ser utilizada por uma ou mais placas.');
            error.status = 400;
            throw error;
        }

        const count = await this.db('regioes').where({ id, empresa_id }).del();
        if (count === 0) {
            const error = new Error('Região não encontrada.');
            error.status = 404;
            throw error;
        }
        return { success: true };
    }
}

module.exports = RegiaoService;