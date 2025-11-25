/**
 * ===================================================
 * ROTAS DE TESTE - EXCEL (PROTEGIDAS COM ADMIN)
 * ===================================================
 * 
 * Rotas protegidas para testar geração de Excel/PDF
 * ⚠️ DESABILITAR EM PRODUÇÃO via NODE_ENV
 */

const express = require('express');
const router = express.Router();
const excelServiceV2 = require('../services/excelServiceV2');
const PropostaInterna = require('../models/PropostaInterna');
const adminAuthMiddleware = require('../middlewares/adminAuthMiddleware');

// Protege todas as rotas de teste com autenticação admin
router.use(adminAuthMiddleware);

/**
 * GET /test-excel/:piId
 * Gera Excel de uma PI específica (SEM autenticação)
 */
router.get('/test-excel/:piId', async (req, res, next) => {
  try {
    const { piId } = req.params;
    
    console.log('========================================');
    console.log('TESTE EXCEL - PI:', piId);
    console.log('========================================');
    
    // Buscar PI completa
    const pi = await PropostaInterna.findById(piId)
      .populate('cliente')
      .populate('empresa')
      .populate({
        path: 'placas',
        populate: { path: 'regiao' }
      })
      .lean();
    
    if (!pi) {
      return res.status(404).json({ error: 'PI não encontrada' });
    }
    
    console.log('PI encontrada:', pi.pi_code);
    console.log('Cliente:', pi.cliente.nome);
    console.log('Empresa:', pi.empresa.nome);
    console.log('Placas:', pi.placas.length);
    
    // Gerar Excel
    const buffer = await excelServiceV2.generateContratoExcel(
      pi,
      pi.cliente,
      pi.empresa,
      { name: 'Teste', sobrenome: 'Usuario' }
    );
    
    // Gerar nome do arquivo
    const filename = `TESTE_PI_${pi.pi_code}_${Date.now()}.xlsx`;
    
    // Enviar arquivo
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    
    console.log('Enviando Excel:', filename);
    console.log('Tamanho:', buffer.length, 'bytes');
    console.log('========================================');
    
    res.send(buffer);
    
  } catch (error) {
    console.error('ERRO ao gerar Excel de teste:', error);
    next(error); // Use o errorHandler global
  }
});

/**
 * GET /test-excel-pdf/:piId
 * Gera PDF a partir do Excel de uma PI (SEM autenticação)
 */
router.get('/test-excel-pdf/:piId', async (req, res, next) => {
  try {
    const { piId } = req.params;
    
    console.log('========================================');
    console.log('TESTE PDF (via Excel) - PI:', piId);
    console.log('========================================');
    
    // Buscar PI completa
    const pi = await PropostaInterna.findById(piId)
      .populate('cliente')
      .populate('empresa')
      .populate({
        path: 'placas',
        populate: { path: 'regiao' }
      })
      .lean();
    
    if (!pi) {
      return res.status(404).json({ error: 'PI não encontrada' });
    }
    
    console.log('PI encontrada:', pi.pi_code);
    
    // Gerar PDF a partir do Excel
    const buffer = await excelServiceV2.generateContratoPDF(
      pi,
      pi.cliente,
      pi.empresa,
      { name: 'Teste', sobrenome: 'Usuario' }
    );
    
    // Gerar nome do arquivo
    const filename = `TESTE_PDF_${pi.pi_code}_${Date.now()}.pdf`;
    
    // Enviar arquivo
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    
    console.log('Enviando PDF:', filename);
    console.log('Tamanho:', buffer.length, 'bytes');
    console.log('========================================');
    
    res.send(buffer);
    
  } catch (error) {
    console.error('ERRO ao gerar PDF de teste:', error);
    next(error); // Use o errorHandler global
  }
});

/**
 * GET /list-pis
 * Lista todas as PIs (para facilitar testes)
 */
router.get('/list-pis', async (req, res) => {
  try {
    const pis = await PropostaInterna.find()
      .populate('cliente', 'nome')
      .select('pi_code cliente dataInicio dataFim valorTotal')
      .limit(20)
      .sort({ createdAt: -1 })
      .lean();
    
    res.json({
      total: pis.length,
      pis: pis.map(pi => ({
        id: pi._id,
        pi_code: pi.pi_code,
        cliente: pi.cliente?.nome,
        periodo: `${pi.dataInicio} - ${pi.dataFim}`,
        valor: pi.valorTotal,
        testExcel: `/api/v1/test-excel/${pi._id}`,
        testPdf: `/api/v1/test-excel-pdf/${pi._id}`
      }))
    });
  } catch (error) {
    next(error); // Use o errorHandler global
  }
});

module.exports = router;
