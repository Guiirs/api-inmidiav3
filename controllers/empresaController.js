// InMidia/backend/controllers/empresaController.js
// const db = require('../config/database'); // <-- Remova esta linha
const EmpresaService = require('../services/empresaService');
// A importação dos validadores permanece a mesma
const { registerValidationRules, handleValidationErrors } = require('../validators/empresaValidator');


const createEmpresaController = () => {
    const controller = {};
    // Instancia o serviço sem passar 'db'
    const empresaService = new EmpresaService(); // <-- Alteração aqui

    controller.register = async (req, res, next) => {
        // --- ADICIONE ESTE LOG ---
        console.log('--- CONTROLADOR register EXECUTADO (VALIDAÇÃO PASSOU) ---'); // Log existente mantido

        // A lógica interna permanece a mesma, pois já chamava o serviço
        try {
            const { nome_empresa, cnpj, username, email, password, nome, sobrenome } = req.body;
            const registrationData = {
                nome_empresa,
                cnpj,
                adminUser: { username, email, password, nome, sobrenome }
            };
            // Chama o serviço refatorado
            const result = await empresaService.register(registrationData);
            // Mongoose usa _id, mas o serviço já mapeia para 'id' na resposta, então a resposta está ok
            res.status(201).json(result);
        } catch (err) {
            next(err); // Passa o erro para o errorHandler
        }
    };

    return controller;
};

module.exports = createEmpresaController(); // Exporta a instância