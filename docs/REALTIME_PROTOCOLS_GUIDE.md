# 🔔 Sistema de Notificações em Tempo Real

## Protocolos Implementados

### 1. WebSocket (Socket.IO) 🌐

**Propósito**: Comunicação bidirecional em tempo real entre servidor e cliente

**Conexão**:
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'SEU_JWT_TOKEN_AQUI'
  },
  transports: ['websocket', 'polling']
});

// Ouvir notificações
socket.on('notification', (data) => {
  console.log('Nova notificação:', data);
  // data: { type, data, timestamp }
});

// Teste de conexão
socket.on('connect', () => {
  console.log('Conectado ao WebSocket');
  socket.emit('ping');
});

socket.on('pong', (data) => {
  console.log('Pong recebido:', data);
});
```

**Rooms Automáticas**:
- `user_{userId}` - Notificações específicas do usuário
- `empresa_{empresaId}` - Notificações para toda empresa
- `admins` - Broadcast para todos admins

---

### 2. Webhooks 🎣

**Propósito**: Notificar sistemas externos quando eventos ocorrem

#### **Gerenciar Webhooks**

**Listar webhooks**:
```bash
GET /api/v1/webhooks
Authorization: Bearer {token}
```

**Criar webhook**:
```bash
POST /api/v1/webhooks
Authorization: Bearer {token}
Content-Type: application/json

{
  "nome": "Webhook Produção",
  "url": "https://seu-sistema.com/webhook/inmid ia",
  "eventos": [
    "aluguel_criado",
    "contrato_criado",
    "placa_disponivel"
  ],
  "retry_config": {
    "max_tentativas": 3,
    "timeout_ms": 5000
  },
  "headers": {
    "Authorization": "Bearer seu_token_customizado"
  }
}
```

**Atualizar webhook**:
```bash
PUT /api/v1/webhooks/{webhookId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "ativo": false,
  "eventos": ["contrato_criado"]
}
```

**Regenerar Secret** (para validação HMAC):
```bash
POST /api/v1/webhooks/{webhookId}/regenerar-secret
Authorization: Bearer {token}
```

**Testar webhook**:
```bash
POST /api/v1/webhooks/{webhookId}/testar
Authorization: Bearer {token}
```

#### **Receber Webhooks no seu sistema**

```javascript
const crypto = require('crypto');
const express = require('express');
const app = express();

app.post('/webhook/inmidia', express.json(), (req, res) => {
  // 1. Validar assinatura HMAC
  const signature = req.headers['x-webhook-signature'];
  const secret = 'SEU_SECRET_DO_WEBHOOK'; // Obtido ao criar webhook
  
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(req.body));
  const expectedSignature = hmac.digest('hex');
  
  if (signature !== expectedSignature) {
    return res.status(401).send('Assinatura inválida');
  }
  
  // 2. Processar evento
  const { evento, data, timestamp } = req.body;
  
  console.log(`Evento recebido: ${evento}`);
  console.log('Dados:', data);
  
  // Responder rapidamente (< 5 segundos)
  res.status(200).send('OK');
  
  // Processar de forma assíncrona
  processarEvento(evento, data);
});
```

---

### 3. Server-Sent Events (SSE) 📡

**Propósito**: Stream unidirecional de eventos do servidor para cliente (mais leve que WebSocket)

#### **Cliente JavaScript**

```javascript
const token = 'SEU_JWT_TOKEN';
const eventSource = new EventSource(
  `http://localhost:3000/api/v1/sse/stream?token=${token}`
);

// Conectado
eventSource.addEventListener('open', () => {
  console.log('Conexão SSE estabelecida');
});

// Receber notificações
eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  console.log('Notificação SSE:', data);
  
  switch(data.type) {
    case 'connected':
      console.log('✅ Conectado ao SSE');
      break;
    case 'aluguel_criado':
      alert(`Novo aluguel: Placa ${data.data.placa}`);
      break;
    case 'contrato_criado':
      console.log('Contrato criado:', data.data);
      break;
  }
});

// Erros
eventSource.addEventListener('error', (error) => {
  console.error('Erro SSE:', error);
  if (eventSource.readyState === EventSource.CLOSED) {
    console.log('Conexão SSE fechada');
  }
});

// Fechar conexão
// eventSource.close();
```

#### **React Hook Exemplo**

```jsx
import { useEffect, useState } from 'react';

function useSSENotifications(token) {
  const [notifications, setNotifications] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource(
      `${import.meta.env.VITE_API_URL}/sse/stream?token=${token}`
    );

    eventSource.onopen = () => {
      console.log('SSE Connected');
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type !== 'connected') {
        setNotifications(prev => [...prev, data]);
        
        // Notificação do navegador
        if (Notification.permission === 'granted') {
          new Notification('InMidia Notificação', {
            body: `Evento: ${data.type}`,
            icon: '/logo.png'
          });
        }
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [token]);

  return { notifications, connected };
}

// Uso
function Dashboard() {
  const { notifications, connected } = useSSENotifications(authToken);
  
  return (
    <div>
      <div className={connected ? 'online' : 'offline'}>
        {connected ? '🟢 Online' : '🔴 Offline'}
      </div>
      
      {notifications.map((notif, i) => (
        <div key={i} className="notification">
          <strong>{notif.type}</strong>
          <pre>{JSON.stringify(notif.data, null, 2)}</pre>
        </div>
      ))}
    </div>
  );
}
```

---

## Eventos Disponíveis

| Evento | Descrição | Dados |
|--------|-----------|-------|
| `placa_disponivel` | Placa voltou a ficar disponível | `{ placa_id, numero_placa }` |
| `placa_alugada` | Placa foi alugada | `{ placa_id, cliente_nome, data_inicio, data_fim }` |
| `aluguel_criado` | Novo aluguel criado | `{ aluguel_id, placa, cliente, datas }` |
| `aluguel_cancelado` | Aluguel cancelado | `{ aluguel_id, motivo }` |
| `contrato_criado` | Novo contrato gerado | `{ contrato_id, pi_id, cliente }` |
| `contrato_expirando` | Contrato próximo de expirar | `{ contrato_id, dias_restantes }` |
| `contrato_expirado` | Contrato expirou | `{ contrato_id }` |
| `pi_criada` | Nova Proposta Interna | `{ pi_id, pi_code, cliente }` |
| `pi_aprovada` | PI aprovada | `{ pi_id, aprovado_por }` |
| `cliente_novo` | Novo cliente cadastrado | `{ cliente_id, nome }` |
| `api_key_regenerada` | API Key regenerada | `{ empresa_id, regenerada_por }` |

---

## Comparação de Protocolos

| Característica | WebSocket | SSE | Webhooks |
|----------------|-----------|-----|----------|
| Direção | Bidirecional | Servidor → Cliente | Servidor → Sistema Externo |
| Conexão | Persistente | Persistente | Request por evento |
| Complexidade | Média | Baixa | Baixa |
| Reconexão automática | Sim (Socket.IO) | Sim (nativo) | Retry logic |
| Suporte navegador | Excelente | Excelente | N/A |
| Uso de recursos | Médio | Baixo | Muito baixo |
| Melhor para | Apps interativos | Notificações simples | Integrações externas |

---

## Boas Práticas

### WebSocket
- ✅ Reconectar automaticamente em caso de desconexão
- ✅ Implementar heartbeat/ping para manter conexão viva
- ✅ Limitar taxa de mensagens enviadas

### Webhooks
- ✅ Responder rapidamente (< 5s) com status 200
- ✅ Processar payload de forma assíncrona
- ✅ Validar assinatura HMAC sempre
- ✅ Implementar idempotência (eventos podem ser duplicados)
- ✅ Logar todos os webhooks recebidos

### SSE
- ✅ Implementar reconexão automática (já nativo no EventSource)
- ✅ Tratar mensagens keep-alive `:keep-alive`
- ✅ Usar token JWT na query string para autenticação
- ✅ Fechar conexão quando componente desmontar

---

## Estatísticas e Monitoramento

### Estatísticas SSE
```bash
GET /api/v1/sse/stats
Authorization: Bearer {token}
```

Resposta:
```json
{
  "sucesso": true,
  "sse_stats": {
    "total_conexoes": 5,
    "por_empresa": {
      "64a1b2c3d4e5f6789": 3,
      "64a1b2c3d4e5f6790": 2
    },
    "por_role": {
      "admin": 2,
      "user": 3
    }
  }
}
```

### Estatísticas de Webhooks
As estatísticas são armazenadas no próprio documento do webhook:
- `total_disparos`
- `sucessos`
- `falhas`
- `ultimo_disparo`
- `ultimo_sucesso`
- `ultima_falha`

---

## Segurança

### Autenticação
- **WebSocket/SSE**: JWT Token obrigatório
- **Webhooks**: Assinatura HMAC-SHA256

### Rate Limiting
- WebSocket: Limite de conexões por empresa (configurável)
- SSE: 1 conexão por usuário recomendado
- Webhooks: 3 tentativas com exponential backoff

### Headers de Segurança
- CORS configurado para frontend específico
- Helmet para headers HTTP seguros
- Sanitização de inputs

---

## Troubleshooting

### WebSocket não conecta
1. Verificar se JWT token é válido
2. Verificar CORS no servidor
3. Tentar usar `polling` se firewall bloquear WebSocket

### Webhooks não disparam
1. Verificar se webhook está `ativo: true`
2. Verificar se evento está na lista `eventos`
3. Verificar logs do servidor para erros HTTP

### SSE desconecta frequentemente
1. Proxies/Load balancers podem ter timeout
2. Configurar timeouts maiores no nginx/apache
3. Keep-alive está sendo enviado a cada 30s

---

## Exemplos de Integração

Veja exemplos completos na pasta `/docs/examples/`:
- `websocket-react.jsx` - Integração React com Socket.IO
- `sse-vanilla.js` - SSE com JavaScript puro
- `webhook-receiver.js` - Servidor Express para receber webhooks
- `webhook-zapier.md` - Integração com Zapier/Make

---

**Desenvolvido para InMidia API v3**  
Última atualização: Novembro 2025
