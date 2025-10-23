// InMidia/backend/controllers/placaController.js

const { validationResult } = require('express-validator');
const PlacaService = require('../services/placaService');
const mediaService = require('../services/midiaService'); // Importa o novo MediaService
const db = require('../config/database');
// Importa as regras de validação corretas (assumindo que estão em placaValidator.js)
const { placaValidationRules, handleValidationErrors } = require('../validators/placaValidator');

const createPlacaController = () => {
    const controller = {};
    // Instancia o PlacaService passando o banco de dados
    const placaService = new PlacaService(db);

    controller.getAllPlacas = async (req, res, next) => {
        try {
            // Verifica se req.user e req.user.empresa_id existem
            if (!req.user || !req.user.empresa_id) {
                 const error = new Error('Informações de autenticação inválidas.');
                 error.status = 401; // Unauthorized
                 throw error;
            }
            const empresa_id = req.user.empresa_id;
            const result = await placaService.getAll(empresa_id, req.query);
            res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    };

    controller.getPlacaById = async (req, res, next) => {
        try {
             // Verifica se req.user e req.user.empresa_id existem
            if (!req.user || !req.user.empresa_id) {
                 const error = new Error('Informações de autenticação inválidas.');
                 error.status = 401; // Unauthorized
                 throw error;
            }
            const { id } = req.params;
            const empresa_id = req.user.empresa_id;
            const placa = await placaService.getById(id, empresa_id);
            res.status(200).json(placa);
        } catch (err) {
            next(err);
        }
    };

    controller.createPlaca = async (req, res, next) => {
        // A validação já foi feita pelo middleware handleValidationErrors
        // const errors = validationResult(req);
        // if (!errors.isEmpty()) {
        //    // Se houver erro de validação e foi feito upload, apaga a imagem
        //     if (req.file) {
        //         await mediaService.deleteImage(`/uploads/${req.file.filename}`);
        //     }
        //     return res.status(400).json({ errors: errors.array() });
        // }


        let savedImageData = null; // Guarda a info da imagem salva
        try {
            // Verifica se req.user e req.user.empresa_id existem
            if (!req.user || !req.user.empresa_id) {
                 const error = new Error('Informações de autenticação inválidas.');
                 error.status = 401; // Unauthorized
                 throw error;
            }
            const empresa_id = req.user.empresa_id;
            let imagemPath = null;

            // 1. Se um ficheiro foi carregado, salva-o usando o MediaService
            if (req.file) {
                // O mediaService agora apenas confirma/retorna o caminho relativo, pois multer já salvou
                savedImageData = await mediaService.saveImage(req.file); // Adapte se saveImage retornar algo diferente
                imagemPath = savedImageData.path; // Pega o caminho relativo retornado
            }

            const placaData = {
                ...req.body,
                imagem: imagemPath // Passa o caminho relativo (ou null) para o PlacaService
            };

            // 2. Tenta criar a placa no banco de dados
            const placaCriada = await placaService.create(placaData, empresa_id);
            res.status(201).json(placaCriada);

        } catch (err) {
            // 3. Se ocorrer um erro *depois* da imagem ter sido salva, pede ao MediaService para apagar
            if (savedImageData && savedImageData.path) {
                console.log(`Erro ao criar placa (${err.message}), removendo imagem carregada: ${savedImageData.path}`);
                // Usamos .catch() aqui para não quebrar se a exclusão falhar, mas logamos
                mediaService.deleteImage(savedImageData.path).catch(deleteErr => {
                    console.error(`Erro ao tentar apagar imagem ${savedImageData.path} após falha na criação da placa:`, deleteErr);
                });
            }
            next(err); // Passa o erro original para o errorHandler
        }
    };

    controller.updatePlaca = async (req, res, next) => {
        // A validação já foi feita pelo middleware handleValidationErrors
        // const errors = validationResult(req);
        // if (!errors.isEmpty()) {
        //    // Se houver erro de validação e foi feito upload de NOVA imagem, apaga a NOVA imagem
        //     if (req.file) {
        //         await mediaService.deleteImage(`/uploads/${req.file.filename}`);
        //     }
        //     return res.status(400).json({ errors: errors.array() });
        // }


        let newImageData = null; // Guarda info da *nova* imagem salva
        try {
             // Verifica se req.user e req.user.empresa_id existem
            if (!req.user || !req.user.empresa_id) {
                 const error = new Error('Informações de autenticação inválidas.');
                 error.status = 401; // Unauthorized
                 throw error;
            }
            const { id } = req.params;
            const empresa_id = req.user.empresa_id;
            const placaData = { ...req.body };

            // 1. Se uma nova imagem foi enviada, salva-a usando MediaService
            if (req.file) {
                newImageData = await mediaService.saveImage(req.file); // Adapte se saveImage retornar algo diferente
                placaData.imagem = newImageData.path; // Define o novo caminho relativo para ser salvo no DB
            } else if (placaData.hasOwnProperty('imagem') && !placaData.imagem) {
                 // Caso o frontend envie "imagem: null" ou "imagem: ''" explicitamente para remover a imagem
                 placaData.imagem = null;
            } else {
                // Se não enviou ficheiro novo E não enviou 'imagem' no body, removemos a propriedade
                // para que o service não tente atualizar o campo imagem no DB para undefined.
                delete placaData.imagem;
            }


            // 2. Tenta atualizar a placa (o PlacaService agora lida com apagar a imagem antiga SE NECESSÁRIO)
            // Passamos o newImageData.path para o service saber qual imagem foi a recém-carregada (e não deve ser apagada por engano)
            const placaAtualizada = await placaService.update(id, placaData, empresa_id, newImageData?.path);
            res.status(200).json(placaAtualizada);

        } catch (err) {
             // 3. Se ocorrer um erro *depois* da NOVA imagem ter sido salva, pede ao MediaService para apagar a NOVA imagem
            if (newImageData && newImageData.path) {
                console.log(`Erro ao atualizar placa (${err.message}), removendo nova imagem carregada: ${newImageData.path}`);
                 // Usamos .catch() para não quebrar se a exclusão falhar
                 mediaService.deleteImage(newImageData.path).catch(deleteErr => {
                    console.error(`Erro ao tentar apagar nova imagem ${newImageData.path} após falha na atualização da placa:`, deleteErr);
                });
            }
            next(err); // Passa o erro original para o errorHandler
        }
    };

    controller.deletePlaca = async (req, res, next) => {
        try {
             // Verifica se req.user e req.user.empresa_id existem
            if (!req.user || !req.user.empresa_id) {
                 const error = new Error('Informações de autenticação inválidas.');
                 error.status = 401; // Unauthorized
                 throw error;
            }
            const { id } = req.params;
            const empresa_id = req.user.empresa_id;
            // O PlacaService agora é responsável por chamar o mediaService.deleteImage após apagar no DB
            await placaService.delete(id, empresa_id);
            res.status(204).send(); // No Content
        } catch (err) {
            next(err);
        }
    };

    controller.toggleDisponibilidade = async (req, res, next) => {
        try {
             // Verifica se req.user e req.user.empresa_id existem
            if (!req.user || !req.user.empresa_id) {
                 const error = new Error('Informações de autenticação inválidas.');
                 error.status = 401; // Unauthorized
                 throw error;
            }
            const { id } = req.params;
            const empresa_id = req.user.empresa_id;
            const result = await placaService.toggleDisponibilidade(id, empresa_id);
            res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    };

    controller.getAllPlacaLocations = async (req, res, next) => {
        try {
            if (!req.user || !req.user.empresa_id) {
                const error = new Error('Informações de utilizador inválidas na sessão.');
                error.status = 401;
                throw error;
            }
            const empresa_id = req.user.empresa_id;

            const locations = await db('placas')
                .select('id', 'numero_placa', 'coordenadas', 'nomeDaRua')
                .where('empresa_id', empresa_id)
                .whereNotNull('coordenadas'); // Busca apenas placas com coordenadas definidas

            res.status(200).json(locations);
        } catch (err) {
            next(err);
        }
    };

    return controller;
};

module.exports = createPlacaController();