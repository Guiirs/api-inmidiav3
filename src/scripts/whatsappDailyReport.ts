// @ts-nocheck
// scripts/whatsappDailyReport.ts
import cron from 'node-cron';
import logger from '../config/logger';
import whatsappService from '../services/whatsappService';

/**
 * Configura envio diário de relatórios WhatsApp
 * Horário configurável via variável de ambiente WHATSAPP_REPORT_HOUR
 */
export function scheduleWhatsAppReports() {
    // Pega hora configurada ou usa 09:00 como padrão
    const reportHour = process.env.WHATSAPP_REPORT_HOUR || '09:00';
    const [hour, minute] = reportHour.split(':');

    // Valida hora
    if (!hour || !minute || parseInt(hour) > 23 || parseInt(minute) > 59) {
        logger.error(`[WhatsApp Cron] Hora inválida: ${reportHour}. Use formato HH:MM`);
        return;
    }

    // Cron expression: minuto hora * * *  (todos os dias)
    const cronExpression = `${minute} ${hour} * * *`;
    
    logger.info(`[WhatsApp Cron] ⏰ Agendando relatórios diários para ${reportHour}`);
    logger.info(`[WhatsApp Cron] Cron expression: ${cronExpression}`);

    // Agenda tarefa
    cron.schedule(cronExpression, async () => {
        try {
            logger.info('[WhatsApp Cron] 🚀 Executando envio de relatório diário...');
            
            const sucesso = await whatsappService.enviarRelatorioDisponibilidade();
            
            if (sucesso) {
                logger.info('[WhatsApp Cron] ✅ Relatório diário enviado com sucesso!');
            } else {
                logger.warn('[WhatsApp Cron] ⚠️ Falha ao enviar relatório diário');
            }
        } catch (error: any) {
            logger.error(`[WhatsApp Cron] ❌ Erro ao enviar relatório: ${error.message}`);
        }
    }, {
        scheduled: true,
        timezone: process.env.TZ || 'Europe/Lisbon'
    });

    logger.info('[WhatsApp Cron] ✅ Cron job de relatórios WhatsApp configurado!');
    logger.info(`[WhatsApp Cron] Próximo envio: ${reportHour} (${process.env.TZ || 'Europe/Lisbon'})`);
}

/**
 * Envia relatório sob demanda (para testes)
 */
export async function enviarRelatorioAgora() {
    try {
        logger.info('[WhatsApp] Enviando relatório sob demanda...');
        const sucesso = await whatsappService.enviarRelatorioDisponibilidade();
        
        if (sucesso) {
            logger.info('[WhatsApp] ✅ Relatório enviado!');
        } else {
            logger.error('[WhatsApp] ❌ Falha ao enviar relatório');
        }
        
        return sucesso;
    } catch (error: any) {
        logger.error(`[WhatsApp] Erro: ${error.message}`);
        return false;
    }
}
