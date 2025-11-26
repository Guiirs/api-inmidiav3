# 📱 Guia de Integração WhatsApp

## Visão Geral

Sistema automatizado de envio de relatórios diários de disponibilidade de placas via WhatsApp Web.

---

## 🚀 Configuração Inicial

### 1. Instalar Dependências

```bash
cd BECKEND
npm install whatsapp-web.js qrcode-terminal
```

### 2. Configurar Variáveis de Ambiente

Edite o arquivo `.env`:

```bash
# Habilitar WhatsApp
WHATSAPP_ENABLED=true

# Nome do grupo (o sistema busca por este nome)
WHATSAPP_GROUP_NAME="Placas Disponíveis"

# Se não encontrar o grupo, usar primeiro disponível
WHATSAPP_USE_FIRST_GROUP=false

# Horário do relatório diário (formato 24h)
WHATSAPP_REPORT_HOUR="09:00"

# Fuso horário
TZ="Europe/Lisbon"
```

### 3. Iniciar o Servidor

```bash
npm run dev
```

### 4. Autenticar WhatsApp

Na primeira execução, um **QR Code** será exibido no terminal:

```
[WhatsApp] 📱 QR Code gerado. Escaneie com seu WhatsApp:
========================================
█████████████████████████████████████
█████████████████████████████████████
========================================
[WhatsApp] Aguardando leitura do QR Code...
```

**Passos**:
1. Abra o WhatsApp no celular
2. Toque em **⋮ → Dispositivos conectados**
3. Toque em **Conectar um dispositivo**
4. Escaneie o QR Code exibido

**Importante**: Após escanear, a sessão fica salva em `whatsapp-session/`. Não precisa escanear novamente.

---

## 📊 Relatório Enviado

### Exemplo de Mensagem

```
📊 RELATÓRIO DE DISPONIBILIDADE
📅 Data: 25/11/2025
━━━━━━━━━━━━━━━━━━━━━

📈 RESUMO GERAL
• Total de placas: 42
• ✅ Disponíveis: 28
• 📦 Alugadas: 12
• ❌ Indisponíveis: 2

✅ PLACAS DISPONÍVEIS (28)
━━━━━━━━━━━━━━━━━━━━━
📍 P-001
   Lisboa Centro - Rua Augusta
📍 P-002
   Porto - Rua Santa Catarina
...

📦 PLACAS ALUGADAS (12)
━━━━━━━━━━━━━━━━━━━━━
📍 P-015
   Lisboa - Av. Liberdade
   👤 Cliente XYZ Lda
   📅 Até: 30/11/2025
...

❌ PLACAS INDISPONÍVEIS (2)
━━━━━━━━━━━━━━━━━━━━━
📍 P-040
   Coimbra - Praça República
...

━━━━━━━━━━━━━━━━━━━━━
🤖 Relatório gerado automaticamente
```

---

## 🎯 Funcionalidades

### 1. Envio Automático Diário

**Configuração**: `WHATSAPP_REPORT_HOUR=09:00`

O sistema envia automaticamente o relatório todos os dias no horário configurado.

### 2. Comandos no WhatsApp

Envie comandos diretamente no grupo WhatsApp:

| Comando | Descrição |
|---------|-----------|
| `!placas` | Gera e envia relatório imediatamente |
| `!disponibilidade` | Alias para !placas |
| `!help` | Mostra lista de comandos |

**Nota**: Apenas **admins do grupo** podem usar comandos.

### 3. API REST (Admin)

Endpoints disponíveis em `/api/v1/whatsapp`:

#### GET `/status`
Verifica status da conexão WhatsApp

**Response**:
```json
{
  "sucesso": true,
  "status": {
    "conectado": true,
    "grupo_configurado": true,
    "grupo_id": "120363123456789@g.us"
  }
}
```

#### POST `/enviar-relatorio`
Envia relatório manualmente

**Response**:
```json
{
  "sucesso": true,
  "mensagem": "Relatório enviado com sucesso!"
}
```

#### POST `/enviar-mensagem`
Envia mensagem customizada

**Body**:
```json
{
  "mensagem": "🚨 Atenção: Manutenção programada para hoje às 14h"
}
```

#### GET `/grupos`
Lista todos os grupos disponíveis

**Response**:
```json
{
  "sucesso": true,
  "total": 3,
  "grupos": [
    {
      "id": "120363123456789@g.us",
      "nome": "Placas Disponíveis",
      "participantes": 15
    }
  ]
}
```

#### POST `/reconectar`
Reinicia a conexão WhatsApp (gera novo QR Code se necessário)

---

## 🔧 Resolução de Problemas

### QR Code não aparece

**Solução**:
```bash
# Deletar sessão antiga
rm -rf BECKEND/whatsapp-session

# Reiniciar servidor
npm run dev
```

### "Grupo não encontrado"

1. Verifique se o nome está correto em `WHATSAPP_GROUP_NAME`
2. Use o endpoint `GET /api/v1/whatsapp/grupos` para listar grupos
3. Ou configure `WHATSAPP_USE_FIRST_GROUP=true`

### Relatório não envia no horário

1. Verifique se `WHATSAPP_ENABLED=true`
2. Confirme o formato de `WHATSAPP_REPORT_HOUR` (ex: `09:00`)
3. Verifique o fuso horário em `TZ`
4. Consulte os logs: `[WhatsApp Cron]`

### Cliente desconecta frequentemente

**Causas comuns**:
- Celular sem internet
- WhatsApp desinstalado/atualizado
- Dispositivo removido em "Dispositivos conectados"

**Solução**: Use `POST /api/v1/whatsapp/reconectar`

---

## 📱 Integração Frontend

### React Hook Example

```jsx
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../services/api';

// Hook para status WhatsApp
export const useWhatsAppStatus = () => {
  return useQuery({
    queryKey: ['whatsapp', 'status'],
    queryFn: async () => {
      const { data } = await api.get('/whatsapp/status');
      return data.status;
    },
    refetchInterval: 30000 // Atualiza a cada 30s
  });
};

// Hook para enviar relatório
export const useEnviarRelatorio = () => {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/whatsapp/enviar-relatorio');
      return data;
    },
    onSuccess: () => {
      toast.success('Relatório enviado com sucesso!');
    }
  });
};

// Componente
function WhatsAppControl() {
  const { data: status } = useWhatsAppStatus();
  const enviarRelatorio = useEnviarRelatorio();

  return (
    <div>
      <h3>WhatsApp Status</h3>
      <p>
        {status?.conectado ? '✅ Conectado' : '❌ Desconectado'}
      </p>
      
      {status?.grupo_configurado && (
        <button onClick={() => enviarRelatorio.mutate()}>
          📱 Enviar Relatório Agora
        </button>
      )}
    </div>
  );
}
```

---

## 🔒 Segurança

1. **Autenticação**: Todas as rotas API requerem `authMiddleware` + `adminAuthMiddleware`
2. **Comandos WhatsApp**: Apenas admins do grupo podem executar
3. **Sessão**: Arquivos de sessão salvos localmente em `whatsapp-session/`
4. **Rate Limiting**: Endpoints protegidos contra spam

---

## 📋 Checklist de Deploy

- [ ] Variáveis de ambiente configuradas
- [ ] WhatsApp autenticado (QR Code escaneado)
- [ ] Grupo criado e nome configurado
- [ ] Horário de envio definido
- [ ] Servidor rodando em produção
- [ ] Logs monitorados
- [ ] Backup da pasta `whatsapp-session/`

---

## 🆘 Suporte

**Logs importantes**:
```bash
# Logs gerais WhatsApp
grep "WhatsApp" logs/combined.log

# Logs do Cron Job
grep "WhatsApp Cron" logs/combined.log

# Erros
grep "ERROR" logs/error.log | grep WhatsApp
```

**Reiniciar WhatsApp via API**:
```bash
curl -X POST http://localhost:4000/api/v1/whatsapp/reconectar \
  -H "Authorization: Bearer SEU_TOKEN_JWT"
```

---

## 📚 Referências

- [whatsapp-web.js Docs](https://wwebjs.dev/)
- [node-cron Docs](https://www.npmjs.com/package/node-cron)
- API REST: http://localhost:4000/api/v1/docs

---

**Última atualização**: 25/11/2025
