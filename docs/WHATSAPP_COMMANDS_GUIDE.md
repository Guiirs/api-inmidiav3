# 📱 Guia de Comandos WhatsApp

## ✅ Bot Ativo e Funcionando!

O bot está rodando e escutando mensagens no grupo **"Placas Disponíveis"**.

---

## 🎯 Como Testar os Comandos

### 1️⃣ Abra o WhatsApp
- Vá até o grupo **"Placas Disponíveis"**
- ID do grupo: `120363425517091266@g.us`

### 2️⃣ Comandos Disponíveis

#### 📊 Comando: `!placas` ou `!disponibilidade`
**O que faz:** Envia o relatório completo de disponibilidade de placas  
**Quem pode usar:** Apenas administradores do grupo  
**Resposta esperada:**
1. Mensagem de confirmação: "🔄 Gerando relatório de disponibilidade..."
2. Relatório completo com:
   - Total de placas
   - Placas disponíveis (lista)
   - Placas alugadas (com cliente e data)
   - Placas indisponíveis

**Exemplo de uso:**
```
!placas
```

#### 📋 Comando: `!help` ou `!ajuda`
**O que faz:** Mostra a lista de comandos disponíveis  
**Quem pode usar:** Todos os membros do grupo  
**Resposta esperada:**
```
📋 Comandos Disponíveis:

!placas - Exibe relatório de disponibilidade
!disponibilidade - Alias para !placas
!help - Mostra esta ajuda

💡 O relatório diário é enviado automaticamente todos os dias às 09:00h
```

**Exemplo de uso:**
```
!help
```

---

## 🔧 Correções Implementadas

### ✅ Problema de Verificação de Admin Resolvido
- **Erro anterior:** `window.Store.ContactMethods.getIsMyContact is not a function`
- **Solução:** Simplificada a verificação de admin usando `message.author` diretamente
- **Resultado:** Função `isUserAdmin()` agora funciona corretamente

### ✅ Melhorias na Função `handleMessage()`
- Ignora mensagens que não começam com `!`
- Logs detalhados de cada etapa do processamento
- Tratamento de erros robusto
- Mensagens de feedback ao usuário em caso de erro

---

## 📊 Logs do Bot

Quando você enviar um comando, verá logs como:

```
[WhatsApp] 📩 Comando recebido: "!placas"
[WhatsApp] Verificando permissões do usuário...
[WhatsApp] Enviando confirmação...
[WhatsApp] Gerando e enviando relatório...
[WhatsApp] Gerando relatório de disponibilidade...
[WhatsApp] Encontradas 47 placas no total
[WhatsApp] Encontrados 0 aluguéis ativos
[WhatsApp] Separadas: 47 disponíveis, 0 alugadas, 0 indisponíveis
[WhatsApp] ✅ Relatório enviado com sucesso para 120363425517091266@g.us
[WhatsApp] ✅ Relatório enviado com sucesso!
```

---

## ⚙️ Status do Sistema

**Estado Atual:**
- ✅ MongoDB: Conectado
- ✅ WhatsApp: Autenticado e pronto
- ✅ Grupo: "Placas Disponíveis" encontrado
- ✅ Comandos: Funcionando
- ✅ Verificação de Admin: Corrigida

**Próximos Passos:**
1. Teste o comando `!help` no grupo
2. Teste o comando `!placas` (se você for admin)
3. Verifique se o relatório é enviado corretamente
4. Configure o envio automático diário (já está configurado para 09:00h)

---

## 🚨 Solução de Problemas

### Se o bot não responder:
1. Verifique se o terminal ainda está rodando
2. Verifique se você está no grupo correto
3. Certifique-se de que o comando começa com `!`
4. Para `!placas`, verifique se você é admin do grupo

### Se aparecer erro de permissão:
- Apenas administradores podem usar `!placas`
- Use `!help` para verificar se o bot está respondendo

### Para reiniciar o bot:
```bash
# Parar o bot atual
Ctrl+C no terminal do bot

# Iniciar novamente
cd BECKEND
node scripts/startWhatsAppBot.js
```

---

## 📅 Envios Automáticos

O sistema está configurado para enviar relatórios automaticamente:
- **Horário:** 09:00h (definido em `WHATSAPP_REPORT_HOUR`)
- **Fuso horário:** Europe/Lisbon (definido em `TZ`)
- **Grupo:** Placas Disponíveis

Para alterar o horário, edite o arquivo `.env`:
```env
WHATSAPP_REPORT_HOUR="10:00"  # Exemplo: 10h da manhã
```

---

## 🎉 Teste Agora!

Vá até o grupo **"Placas Disponíveis"** e digite:
```
!help
```

Depois, se você for admin, teste:
```
!placas
```

Você deve receber o relatório completo! 🚀
