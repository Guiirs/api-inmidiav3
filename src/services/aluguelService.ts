// @ts-nocheck
// services/aluguelService.ts
import mongoose from 'mongoose';
import Aluguel from '../models/Aluguel';
import Placa from '../models/Placa';
import Cliente from '../models/Cliente';
import logger from '../config/logger';
import AppError from '../utils/AppError';
import notificationService from './notificationService';
import webhookService from './webhookService';
import sseController from '../controllers/sseController';
import whatsappService from './whatsappService';
import BiWeekHelpers from '../utils/biWeekHelpers';
import PeriodService from './periodService';

// Verifica se está em ambiente de teste (JEST_WORKER_ID é definido pelo Jest)
const isTestEnvironment = process.env.JEST_WORKER_ID !== undefined;
const useTransactions = !isTestEnvironment; // Desativa transações APENAS em teste

if (!useTransactions) {
    // Adiciona um log mais visível para confirmar a desativação
    console.warn('\n[[[ ALERTA DE TESTE: Transações Mongoose DESABILITADAS ]]]\n');
    logger.warn('[AluguelService] TRANSAÇÕES MONGOOSE DESABILITADAS (Ambiente de Teste Detectado via JEST_WORKER_ID)');
}

class AluguelService {
    constructor() {}

    /**
     * Obtém todos os alugueis para uma placa específica, retornando objetos simples.
     * @param {string} placaId - ObjectId da placa.
     * @param {string} empresa_id - ObjectId da empresa.
     * @returns {Promise<Array<object>>} - Array com os dados dos alugueis (populados com cliente).
     * @throws {AppError} - Lança erro com status 500 (Erro interno) ou delega 400 (ID inválido).
     */
    async getAlugueisByPlaca(placaId, empresa_id) {
        logger.info(`[AluguelService] Iniciando getAlugueisByPlaca para placa ${placaId} na empresa ${empresa_id}.`);
        
        // [MELHORIA] Removida verificação de mongoose.Types.ObjectId.isValid(). 
        // A rota (Passo 06) já valida, ou o errorHandler captura o CastError (400).

        try {
            logger.debug('[AluguelService] Executando Aluguel.find()...');
            
            // Campos no model corrigido: 'placa' e 'cliente'
            const alugueisDocs = await Aluguel.find({ placa: placaId, empresa: empresa_id })
                                            .populate('cliente', 'nome logo_url') 
                                            .sort({ data_inicio: -1 })
                                            .exec(); 
            logger.info(`[AluguelService] Query concluída. ${alugueisDocs.length} alugueis encontrados para placa ${placaId}.`);
            
            logger.debug('[AluguelService] Iniciando conversão para JSON e mapeamento...');
            
            // Usa o toJSON para aplicar a transformação global (_id -> id, remove __v)
            const alugueis = alugueisDocs.map(doc => {
                const obj = doc.toJSON();

                // Adiciona cliente_nome após a transformação toJSON (lógica mantida)
                obj.cliente_nome = obj.cliente?.nome || 'Cliente Apagado'; 

                // Garante que o campo cliente seja null se não foi populado corretamente
                if (!obj.cliente || !obj.cliente.id) {
                    obj.cliente = null;
                }
                return obj;
            });

            logger.debug('[AluguelService] Mapeamento toJSON e cliente_nome concluído.');
            return alugueis; 

        } catch (error) { 
            logger.error(`[AluguelService] Erro final em getAlugueisByPlaca: ${error.message}`, { stack: error.stack });
            // [MELHORIA] Relança AppErrors ou lança 500
            if (error instanceof AppError) throw error; 
            throw new AppError(`Erro interno ao buscar histórico de alugueis: ${error.message}`, 500);
        }
    }

    /**
     * Cria um novo aluguel (reserva) para uma placa, usando transação (exceto em testes).
     * [PERÍODO UNIFICADO] Usa PeriodService para processar períodos (bi-week ou custom)
     * @param {object} aluguelData - Dados do aluguel:
     *   - Novo formato: { placa_id, cliente_id, periodType, startDate, endDate, biWeekIds }
     *   - Formato legado: { placa_id, cliente_id, bi_week_ids } ou { placa_id, cliente_id, data_inicio, data_fim }
     * @param {string} empresa_id - ObjectId da empresa.
     * @returns {Promise<object>} - O documento do novo aluguel criado (populado e com id mapeado).
     * @throws {AppError} - Lança erro com status 400, 404, 409 ou 500.
     */
    async createAluguel(aluguelData, empresa_id) {
        logger.info(`[AluguelService] Tentando criar aluguel para empresa ${empresa_id}.`);
        const { placa_id, cliente_id } = aluguelData;

        // [PERÍODO UNIFICADO] Processar período usando PeriodService
        let period;
        try {
            logger.debug('[AluguelService] Processando período com PeriodService...');
            period = await PeriodService.processPeriodInput(aluguelData);
            
            logger.info(`[AluguelService] Período processado: Tipo=${period.periodType}`);
            logger.info(`[AluguelService] Datas: ${PeriodService.formatDate(period.startDate)} - ${PeriodService.formatDate(period.endDate)}`);
            if (period.biWeekIds && period.biWeekIds.length > 0) {
                logger.info(`[AluguelService] Bi-semanas: ${period.biWeekIds.join(', ')}`);
            }
        } catch (periodError) {
            logger.error(`[AluguelService] Erro ao processar período: ${periodError.message}`);
            throw periodError; // PeriodService já lança AppError
        }

        const session = useTransactions ? await mongoose.startSession() : null;
        if (session) {
            logger.debug('[AluguelService] Iniciando transação Mongoose para criar aluguel.');
            session.startTransaction();
        } else {
            logger.debug('[AluguelService] Transações desabilitadas (ambiente de teste).');
        }

        try {
            // [PERÍODO UNIFICADO] Verificação de conflitos usando novos campos
            logger.debug(`[AluguelService] Verificando conflitos para placa ${placa_id}...`);
            
            const conflictingAluguel = await Aluguel.findOne({
                placa: placa_id,
                empresa: empresa_id,
                startDate: { $lt: period.endDate },
                endDate: { $gt: period.startDate }
            }).lean().session(session).exec();

            if (conflictingAluguel) {
                logger.warn(`[AluguelService] CONFLITO DETECTADO! Aluguel existente ID ${conflictingAluguel._id} conflita com novo período.`);
                throw new AppError(`Esta placa (ID: ${placa_id}) já está reservada total ou parcialmente no período solicitado.`, 409);
            }
            logger.debug(`[AluguelService] Nenhum conflito encontrado.`);

            // [PERÍODO UNIFICADO] Cria o aluguel com novos campos + legado para compatibilidade
            logger.debug(`[AluguelService] Tentando salvar novo aluguel no DB.`);
            const createOptions = session ? { session } : {};
            const [novoAluguelDoc] = await Aluguel.create([{
                placa: placa_id, 
                cliente: cliente_id,
                empresa: empresa_id,
                // [NOVOS CAMPOS UNIFICADOS]
                periodType: period.periodType,
                startDate: period.startDate,
                endDate: period.endDate,
                biWeekIds: period.biWeekIds,
                biWeeks: period.biWeeks ? period.biWeeks.map(bw => bw._id) : [],
                // [CAMPOS LEGADO] Mantidos para compatibilidade
                data_inicio: period.startDate, 
                data_fim: period.endDate,
                bi_week_ids: period.biWeekIds,
                bi_weeks: period.biWeeks ? period.biWeeks.map(bw => bw._id) : []
            }], createOptions);
            
            logger.info(`[AluguelService] Aluguel ${novoAluguelDoc._id} criado ${session ? 'na transação' : ''}.`);
            logger.info(`[AluguelService] Tipo: ${period.periodType}`);
            if (period.biWeekIds && period.biWeekIds.length > 0) {
                logger.info(`[AluguelService] Bi-semanas vinculadas: ${period.biWeekIds.join(', ')}`);
            }
            // Verificação de status de placa (mantida - usando novos campos)
            const hoje = new Date(); hoje.setUTCHours(0, 0, 0, 0);
            const isAtivoHoje = (period.startDate.getTime() <= hoje.getTime() && period.endDate.getTime() >= hoje.getTime());

            // REMOVIDO: A lógica de atualização do campo 'disponivel' foi removida.
            // O campo 'disponivel' agora é usado APENAS para manutenção manual.
            // O status de aluguel é determinado dinamicamente pela existência de aluguéis ativos.

            // Commita condicionalmente
            if (session) {
                logger.debug(`[AluguelService] Commitando transação ${novoAluguelDoc._id}.`);
                await session.commitTransaction();
            }
            logger.info(`[AluguelService] Aluguel ${novoAluguelDoc._id} processado com sucesso.`);

            // Busca e formata o resultado (usando toJSON)
            const aluguelCriado = await Aluguel.findById(novoAluguelDoc._id)
                                                  .populate('cliente', 'nome logo_url')
                                                  .populate('placa', 'numero_placa')
                                                  .populate('bi_weeks') // [BI-WEEK SYNC] Popula bi-semanas
                                                  .exec(); 

             if (aluguelCriado) {
                 const obj = aluguelCriado.toJSON(); 
                 obj.cliente_nome = obj.cliente?.nome || 'Cliente Apagado';
                 if (!obj.cliente || !obj.cliente.id) obj.cliente = null;
                 
                 // [NOVO] Dispara notificações em tempo real
                 try {
                     const notificacaoData = {
                         aluguel_id: obj.id,
                         placa: obj.placa?.numero_placa || placa_id,
                         cliente: obj.cliente_nome,
                         data_inicio: obj.data_inicio,
                         data_fim: obj.data_fim
                     };

                     // WebSocket
                     notificationService.notifyEmpresa(
                         empresa_id,
                         notificationService.TYPES.ALUGUEL_CRIADO,
                         notificacaoData
                     );

                     // SSE
                     sseController.notificarEmpresa(
                         empresa_id,
                         'aluguel_criado',
                         notificacaoData
                     );

                     // Webhook
                     webhookService.disparar(
                         empresa_id,
                         'aluguel_criado',
                         notificacaoData
                     ).catch(err => logger.error(`[AluguelService] Erro ao disparar webhook: ${err.message}`));

                     // [NOVO] WhatsApp - Notificação de novo aluguel
                     logger.info(`[AluguelService] Verificando se WhatsApp está habilitado... WHATSAPP_ENABLED=${process.env.WHATSAPP_ENABLED}`);
                     
                     if (process.env.WHATSAPP_ENABLED === 'true') {
                         logger.info(`[AluguelService] WhatsApp habilitado! Buscando dados para notificação...`);
                         
                         const placaCompleta = await Placa.findById(placa_id).populate('regiao', 'nome').exec();
                         const clienteCompleto = await Cliente.findById(cliente_id).exec();
                         
                         logger.info(`[AluguelService] Placa encontrada: ${placaCompleta?.numero_placa}, Cliente: ${clienteCompleto?.nome}`);
                         
                         if (placaCompleta && clienteCompleto) {
                             logger.info(`[AluguelService] Enviando notificação WhatsApp...`);
                             whatsappService.notificarNovoAluguel(
                                 novoAluguelDoc,
                                 placaCompleta,
                                 clienteCompleto
                             ).catch(err => logger.error(`[AluguelService] Erro ao enviar notificação WhatsApp: ${err.message}`));
                         } else {
                             logger.warn(`[AluguelService] Dados incompletos para notificação WhatsApp. Placa: ${!!placaCompleta}, Cliente: ${!!clienteCompleto}`);
                         }
                     } else {
                         logger.info(`[AluguelService] WhatsApp desabilitado. Notificação não será enviada.`);
                     }

                     logger.info(`[AluguelService] Notificações disparadas para aluguel ${obj.id}`);
                 } catch (notifError) {
                     logger.error(`[AluguelService] Erro ao enviar notificações: ${notifError.message}`);
                     // Não falha a operação se notificação falhar
                 }
                 
                 return obj;
             } else {
                 logger.error(`[AluguelService] ERRO INESPERADO: Aluguel ${novoAluguelDoc._id} não encontrado após criação/commit.`);
                 throw new AppError('Erro ao buscar aluguel recém-criado.', 500);
             }

        } catch (error) {
             if (session && session.inTransaction()) {
                 logger.warn(`[AluguelService] Abortando transação devido a erro: ${error.message}`);
                 await session.abortTransaction();
             }
             logger.error(`[AluguelService] Erro ao criar aluguel: ${error.message}`, { stack: error.stack, status: error.status });
             
             // [MELHORIA] Relança AppErrors específicos ou lança 500
             if (error instanceof AppError) throw error; 
             throw new AppError(`Erro interno ao criar aluguel: ${error.message}`, 500);
        } finally {
            if (session) {
                logger.debug('[AluguelService] Finalizando sessão Mongoose.');
                await session.endSession();
            }
         }
    }

    /**
     * Apaga um aluguel (cancela uma reserva) e atualiza o status da placa se necessário, usando transação (exceto em testes).
     * @param {string} aluguel_id - ObjectId do aluguel a ser apagado.
     * @param {string} empresa_id - ObjectId da empresa.
     * @returns {Promise<{success: boolean, message: string}>} - Confirmação de sucesso.
     * @throws {AppError} - Lança erro com status 404 ou 500.
     */
    async deleteAluguel(aluguel_id, empresa_id) {
        logger.info(`[AluguelService] Tentando apagar aluguel ${aluguel_id} para empresa ${empresa_id}.`);
        const session = useTransactions ? await mongoose.startSession() : null;
        if (session) {
            logger.debug('[AluguelService] Iniciando transação Mongoose para apagar aluguel.');
            session.startTransaction();
        } else {
            logger.debug('[AluguelService] Transações desabilitadas (ambiente de teste).');
        }

        try {
            // 1. Encontra o aluguel 
            logger.debug(`[AluguelService] Buscando aluguel ${aluguel_id}...`);
            const aluguel = await Aluguel.findOne({ _id: aluguel_id, empresa: empresa_id })
                                         .select('placa data_inicio data_fim')
                                         .lean().session(session).exec();
            if (!aluguel) {
                 // [MELHORIA] Usa AppError
                 throw new AppError('Aluguel não encontrado.', 404);
            }
            const placaId = aluguel.placa;
            logger.debug(`[AluguelService] Aluguel ${aluguel_id} encontrado, placa ${placaId}.`);

            // 2. Apaga o aluguel
            logger.debug(`[AluguelService] Apagando aluguel ${aluguel_id} do DB.`);
            const deleteOptions = session ? { session } : {};
            const deleteResult = await Aluguel.deleteOne({ _id: aluguel_id }, deleteOptions);
            if (deleteResult.deletedCount === 0) {
                 throw new AppError('Falha ao apagar o aluguel.', 500);
            }
            logger.info(`[AluguelService] Aluguel ${aluguel_id} apagado ${session ? 'na transação' : ''}.`);

            // 3. Verifica se era ativo hoje (com horas zeradas UTC)
            const hoje = new Date(); hoje.setUTCHours(0, 0, 0, 0);
            const inicioAluguel = new Date(aluguel.data_inicio); inicioAluguel.setUTCHours(0,0,0,0);
            const fimAluguel = new Date(aluguel.data_fim); fimAluguel.setUTCHours(0,0,0,0);
            const eraAtivoHoje = (inicioAluguel.getTime() <= hoje.getTime() && fimAluguel.getTime() >= hoje.getTime());

            // REMOVIDO: A lógica de verificação e atualização do campo 'disponivel' foi removida.
            // O campo 'disponivel' agora é usado APENAS para manutenção manual.
            // O status de aluguel é determinado dinamicamente pela existência de aluguéis ativos.

            // Commita condicionalmente
            if (session) {
                logger.debug(`[AluguelService] Commitando transação delete ${aluguel_id}.`);
                await session.commitTransaction();
            }
            logger.info(`[AluguelService] Aluguel ${aluguel_id} apagado com sucesso.`);

            return { success: true, message: 'Aluguel cancelado com sucesso.' };

        } catch (error) {
             if (session && session.inTransaction()) {
                 logger.warn(`[AluguelService] Abortando transação delete devido a erro: ${error.message}`);
                 await session.abortTransaction();
             }
             logger.error(`[AluguelService] Erro ao apagar aluguel: ${error.message}`, { stack: error.stack, status: error.status });
             
             // [MELHORIA] Relança AppErrors específicos ou lança 500
             if (error instanceof AppError) throw error;
             throw new AppError(`Erro interno ao cancelar aluguel: ${error.message}`, 500);
        } finally {
             if (session) {
                 logger.debug('[AluguelService] Finalizando sessão Mongoose.');
                 await session.endSession();
             }
         }
    }

    /**
     * [BI-WEEK SYNC] Busca aluguéis por bi-semana
     * [PERÍODO UNIFICADO] Usa campo biWeekIds (novo) mas aceita bi_week_ids (legado)
     * @param {string} biWeekId - ID da bi-semana (ex: '2025-01')
     * @param {string} empresa_id - ObjectId da empresa
     * @returns {Promise<Array>} - Array de aluguéis
     */
    async getAlugueisByBiWeek(biWeekId, empresa_id) {
        logger.info(`[AluguelService] Buscando aluguéis da bi-semana ${biWeekId} para empresa ${empresa_id}`);
        
        try {
            // [PERÍODO UNIFICADO] Busca usando campo novo OU legado (compatibilidade)
            const alugueis = await Aluguel.find({
                $or: [
                    { biWeekIds: biWeekId },  // Novo campo
                    { bi_week_ids: biWeekId } // Legado
                ],
                empresa: empresa_id
            })
            .populate('cliente', 'nome logo_url')
            .populate('placa', 'numero_placa')
            .populate('bi_weeks')
            .populate('biWeeks')
            .sort({ startDate: -1, data_inicio: -1 }) // Tenta novo campo primeiro
            .exec();
            
            logger.info(`[AluguelService] ${alugueis.length} aluguéis encontrados para bi-semana ${biWeekId}`);
            
            return alugueis.map(doc => {
                const obj = doc.toJSON();
                obj.cliente_nome = obj.cliente?.nome || 'Cliente Apagado';
                if (!obj.cliente || !obj.cliente.id) obj.cliente = null;
                return obj;
            });
            
        } catch (error) {
            logger.error(`[AluguelService] Erro ao buscar aluguéis por bi-semana: ${error.message}`);
            if (error instanceof AppError) throw error;
            throw new AppError(`Erro ao buscar aluguéis por bi-semana: ${error.message}`, 500);
        }
    }

    /**
     * [BI-WEEK SYNC] Busca placas disponíveis em uma bi-semana
     * [PERÍODO UNIFICADO] Usa novos campos mas mantém compatibilidade
     * @param {string} biWeekId - ID da bi-semana (ex: '2025-01')
     * @param {string} empresa_id - ObjectId da empresa
     * @returns {Promise<Array>} - Array de placas disponíveis
     */
    async getPlacasDisponiveisByBiWeek(biWeekId, empresa_id) {
        logger.info(`[AluguelService] Buscando placas disponíveis na bi-semana ${biWeekId} para empresa ${empresa_id}`);
        
        try {
            // Busca a bi-semana para obter as datas (ainda usa BiWeekHelpers - legado)
            const biWeek = await BiWeekHelpers.findBiWeeksByIds([biWeekId]);
            
            if (!biWeek || biWeek.length === 0) {
                throw new AppError(`Bi-semana ${biWeekId} não encontrada.`, 404);
            }
            
            const bw = biWeek[0];
            
            // Busca todas as placas da empresa
            const todasPlacas = await Placa.find({ empresa: empresa_id, ativo: true })
                .populate('regiao', 'nome')
                .lean()
                .exec();
            
            // [PERÍODO UNIFICADO] Busca aluguéis que conflitam com esta bi-semana (novo OU legado)
            const alugueisConflitantes = await Aluguel.find({
                empresa: empresa_id,
                $or: [
                    { biWeekIds: biWeekId },  // Novo campo
                    { bi_week_ids: biWeekId } // Legado
                ]
            })
            .select('placa')
            .lean()
            .exec();
            
            const placasAlugadas = new Set(alugueisConflitantes.map(a => a.placa.toString()));
            
            // Filtra placas disponíveis
            const placasDisponiveis = todasPlacas.filter(placa => {
                return placa.disponivel !== false && !placasAlugadas.has(placa._id.toString());
            });
            
            logger.info(`[AluguelService] ${placasDisponiveis.length} placas disponíveis na bi-semana ${biWeekId}`);
            
            return placasDisponiveis;
            
        } catch (error) {
            logger.error(`[AluguelService] Erro ao buscar placas disponíveis: ${error.message}`);
            if (error instanceof AppError) throw error;
            throw new AppError(`Erro ao buscar placas disponíveis: ${error.message}`, 500);
        }
    }

    /**
     * [BI-WEEK SYNC] Gera relatório de ocupação por bi-semana
     * @param {string} biWeekId - ID da bi-semana (ex: '2025-01')
     * @param {string} empresa_id - ObjectId da empresa
     * @returns {Promise<object>} - Relatório com estatísticas
     */
    async getRelatorioOcupacaoBiWeek(biWeekId, empresa_id) {
        logger.info(`[AluguelService] Gerando relatório de ocupação para bi-semana ${biWeekId}`);
        
        try {
            const biWeek = await BiWeekHelpers.findBiWeeksByIds([biWeekId]);
            
            if (!biWeek || biWeek.length === 0) {
                throw new AppError(`Bi-semana ${biWeekId} não encontrada.`, 404);
            }
            
            const bw = biWeek[0];
            
            // Busca dados
            const todasPlacas = await Placa.countDocuments({ empresa: empresa_id, ativo: true });
            const alugueis = await this.getAlugueisByBiWeek(biWeekId, empresa_id);
            const placasDisponiveis = await this.getPlacasDisponiveisByBiWeek(biWeekId, empresa_id);
            
            const placasAlugadas = alugueis.length;
            const placasLivres = placasDisponiveis.length;
            const taxaOcupacao = todasPlacas > 0 ? ((placasAlugadas / todasPlacas) * 100).toFixed(2) : 0;
            
            return {
                bi_week: {
                    id: bw.bi_week_id,
                    numero: bw.numero,
                    ano: bw.ano,
                    periodo: `${BiWeekHelpers.formatDate(bw.start_date)} - ${BiWeekHelpers.formatDate(bw.end_date)}`,
                    descricao: bw.descricao
                },
                estatisticas: {
                    total_placas: todasPlacas,
                    placas_alugadas: placasAlugadas,
                    placas_disponiveis: placasLivres,
                    taxa_ocupacao: `${taxaOcupacao}%`
                },
                alugueis: alugueis,
                placas_disponiveis: placasDisponiveis
            };
            
        } catch (error) {
            logger.error(`[AluguelService] Erro ao gerar relatório: ${error.message}`);
            if (error instanceof AppError) throw error;
            throw new AppError(`Erro ao gerar relatório: ${error.message}`, 500);
        }
    }
}

export default AluguelService;

