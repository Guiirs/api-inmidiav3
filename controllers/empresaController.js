// InMidia/backend/controllers/empresaController.js
const db = require('../config/database');
const EmpresaService = require('../services/empresaService');

const createEmpresaController = () => {
    const controller = {};
    const empresaService = new EmpresaService(db);

    controller.register = async (req, res, next) => {
        // --- ADICIONE ESTE LOG ---
        console.log('--- CONTROLADOR register EXECUTADO (VALIDAÇÃO PASSOU) ---');
        try {
            const { nome_empresa, cnpj, username, email, password, nome, sobrenome } = req.body;
            const registrationData = {
                nome_empresa,
                cnpj,
                adminUser: { username, email, password, nome, sobrenome }
            };
            const result = await empresaService.register(registrationData);
            res.status(201).json(result);
        } catch (err) {
            next(err);
        }
    };
    
    return controller;
};

module.exports = createEmpresaController();