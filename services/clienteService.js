// services/clienteService.js
const Cliente = require('../models/Cliente'); // Importa o modelo Cliente Mongoose
// O midiaService continua a ser usado da mesma forma para R2
const mediaService = require('./midiaService');

class ClienteService {
    // constructor não precisa mais do 'db'
    constructor() {}

    // Auxiliar para buscar cliente e verificar posse (usado em getById, update, delete)
    // Adiciona .lean() pois geralmente só precisamos dos dados aqui
    async _findClienteByIdAndEmpresa(id, empresa_id) {
        // Adiciona .lean()
        const cliente = await Cliente.findOne({ _id: id, empresa: empresa_id }).lean().exec(); // <-- Adicionado .lean()
        if (!cliente) {
            const error = new Error('Cliente não encontrado.');
            error.status = 404;
            throw error;
        }
        // A transformação global toJSON/toObject (se configurada) tratará _id -> id
        return cliente; // Retorna objeto simples
    }

    async getAll(empresa_id) {
        // Busca todos os clientes da empresa, ordenados por nome
        // Adiciona .lean() para performance
        return await Cliente.find({ empresa: empresa_id })
                            .sort({ nome: 1 })
                            .lean() // <-- Adicionado .lean()
                            .exec();
    }

    async getById(id, empresa_id) {
        // Usa a função auxiliar que já tem .lean()
        return await this._findClienteByIdAndEmpresa(id, empresa_id);
    }

    async create(clienteData, empresa_id, fileObject) {
        const { nome, cnpj, telefone } = clienteData;
        let logo_url = null;
        let savedImageData = null; // Para guardar dados da imagem salva

        // 1. Salva o logo, se existir (usando midiaService, lógica inalterada)
        if (fileObject) {
            try {
                savedImageData = await mediaService.saveImage(fileObject);
                logo_url = savedImageData.path; // URL completa do R2
            } catch (uploadError) {
                console.error("Erro ao salvar logo do cliente:", uploadError);
                // Não precisa apagar imagem aqui, pois ainda não foi salva no R2 se deu erro
                throw new Error('Erro ao processar o upload do logo.');
            }
        }

        // 2. Verifica duplicidade de CNPJ (só se o CNPJ for enviado)
        if (cnpj) {
            // Adiciona .lean() pois só precisamos saber se existe
            const existing = await Cliente.findOne({ cnpj: cnpj, empresa: empresa_id })
                                          .lean() // <-- Adicionado .lean()
                                          .exec();
            if (existing) {
                // Se já existe e carregamos um logo, apaga o logo do R2
                if (logo_url) await mediaService.deleteImage(logo_url);
                const error = new Error('Um cliente com este CNPJ já existe na sua empresa.');
                error.status = 409; // Conflict
                throw error;
            }
        }

        // 3. Cria o cliente com Mongoose
        const novoCliente = new Cliente({
            nome,
            cnpj: cnpj || null, // Guarda null se for vazio
            telefone: telefone || null, // Guarda null se for vazio
            logo_url, // URL do logo ou null
            empresa: empresa_id // ObjectId da empresa
        });

        try {
            // Tenta salvar o novo cliente no MongoDB
            // .save() opera no documento Mongoose, NÃO usar .lean() antes
            const clienteSalvo = await novoCliente.save();
            // A transformação toJSON/toObject tratará _id -> id na resposta
            return clienteSalvo;
        } catch (error) {
            // Se o save falhar (ex: erro de validação do Mongoose ou erro de índice único não capturado antes)
            // e carregamos um logo, apaga o logo do R2
            if (logo_url) await mediaService.deleteImage(logo_url);

            // Re-lança o erro original ou um erro específico se necessário
            if (error.code === 11000 && error.keyPattern && error.keyPattern.cnpj) {
                 const uniqueError = new Error('Um cliente com este CNPJ já existe na sua empresa (erro no save).');
                 uniqueError.status = 409;
                 throw uniqueError;
            }
            throw error;
        }
    }

    async update(id, clienteData, empresa_id, fileObject) {
        const { nome, cnpj, telefone } = clienteData;

        // Busca o cliente atual (já usa .lean() via _findClienteByIdAndEmpresa)
        const clienteAtual = await this._findClienteByIdAndEmpresa(id, empresa_id);
        const imagemAntigaPath = clienteAtual.logo_url; // URL antiga
        let logo_url = imagemAntigaPath; // Mantém o logo antigo por defeito
        let newImageData = null;

        // 1. Verifica se um novo logo foi enviado (lógica do midiaService inalterada)
        if (fileObject) {
            try {
                newImageData = await mediaService.saveImage(fileObject);
                logo_url = newImageData.path; // Define a nova URL do logo
            } catch (uploadError) {
                console.error("Erro ao processar novo logo do cliente:", uploadError);
                throw new Error('Erro ao processar o novo logo.');
            }
        } else if (clienteData.hasOwnProperty('logo_url') && !clienteData.logo_url) {
            // Permite remover o logo enviando logo_url: null ou ''
            logo_url = null;
        }


        // 2. Verifica duplicidade de CNPJ (se CNPJ foi fornecido, não é nulo/vazio E é diferente do atual)
        const checkCnpj = cnpj && cnpj !== clienteAtual.cnpj;
        if (checkCnpj) {
            // Adiciona .lean() pois só precisamos saber se existe
            const existing = await Cliente.findOne({
                cnpj: cnpj,
                empresa: empresa_id,
                _id: { $ne: id } // Exclui o próprio cliente da verificação ($ne = not equal)
            }).lean().exec(); // <-- Adicionado .lean()

            if (existing) {
                // Se deu erro de duplicidade e carregamos um novo logo, apaga o novo logo do R2
                if (newImageData && newImageData.path) await mediaService.deleteImage(newImageData.path);
                const error = new Error('Um cliente com este CNPJ já existe na sua empresa.');
                error.status = 409; // Conflict
                throw error;
            }
        }

        // 3. Prepara dados para atualização
        const updateData = {
            nome,
            cnpj: cnpj || null,
            telefone: telefone || null,
            logo_url // Nova URL ou null
        };

        try {
            // Atualiza o cliente no MongoDB, retornando o *novo* documento
            // findByIdAndUpdate retorna o documento Mongoose por padrão, NÃO usar .lean()
            const clienteAtualizado = await Cliente.findByIdAndUpdate(
                id,
                { $set: updateData },
                { new: true, runValidators: true } // Retorna o novo, executa validadores
            ).exec();

            if (!clienteAtualizado) {
                 // Caso raro, mas se o cliente for deletado entre a busca inicial e o update
                 if (newImageData && newImageData.path) await mediaService.deleteImage(newImageData.path);
                 throw new Error('Cliente não encontrado durante a atualização.'); // Lança erro 404
            }


            // 4. Se a atualização foi bem-sucedida E
            //    (um novo logo foi carregado OU o logo foi explicitamente removido) E
            //    havia um logo antigo
            const logoMudou = (newImageData || (clienteData.hasOwnProperty('logo_url') && !clienteData.logo_url));
            if (logoMudou && imagemAntigaPath) {
                // E o logo antigo é diferente do novo (caso tenha carregado um novo)
                if(imagemAntigaPath !== logo_url) {
                    await mediaService.deleteImage(imagemAntigaPath);
                }
            }
            // A transformação toJSON/toObject tratará _id -> id na resposta
            return clienteAtualizado;

        } catch (error) {
            // Se o update falhar (ex: erro de validação, erro de índice único não capturado antes)
            // e carregamos um novo logo, apaga o novo logo do R2
            if (newImageData && newImageData.path) await mediaService.deleteImage(newImageData.path);

             if (error.code === 11000 && error.keyPattern && error.keyPattern.cnpj) {
                 const uniqueError = new Error('Um cliente com este CNPJ já existe na sua empresa (erro no update).');
                 uniqueError.status = 409;
                 throw uniqueError;
            }
            // Re-lança outros erros
            throw error;
        }
    }

    async delete(id, empresa_id) {
        // Busca o cliente (já usa .lean() via _findClienteByIdAndEmpresa)
        const cliente = await this._findClienteByIdAndEmpresa(id, empresa_id);
        const logoPath = cliente.logo_url; // URL do logo no R2

        // Apaga o cliente do MongoDB (deleteOne não precisa de .lean())
        const result = await Cliente.deleteOne({ _id: id }).exec(); // _id já garante a unicidade

        // Se apagou do DB (deletedCount > 0) e tinha um logo, remove o logo do R2
        if (result.deletedCount > 0 && logoPath) {
            await mediaService.deleteImage(logoPath);
        } else if (result.deletedCount === 0) {
             // Caso não tenha encontrado para deletar (já tinha sido deletado?)
             throw new Error('Cliente não encontrado para exclusão.');
        }

        return { success: true };
    }
}

module.exports = ClienteService;