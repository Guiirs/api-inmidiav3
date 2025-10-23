# --- Estágio de Build ---
FROM node:18 AS builder

WORKDIR /usr/src/app

# Copia apenas os ficheiros de dependência primeiro para aproveitar o cache
COPY package*.json ./

# Instala APENAS dependências de produção (e devDeps se precisar para build)
# Use --legacy-peer-deps se ainda for necessário por outras dependências
RUN npm install --only=production --legacy-peer-deps
# Se você tiver um passo de build (ex: Typescript), coloque-o aqui
# RUN npm run build

# Copia o resto do código da aplicação
COPY . .

# --- Estágio Final ---
FROM node:18-slim AS final

WORKDIR /usr/src/app

# Copia as dependências instaladas e o código do estágio de build
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app .

# Garante que a pasta de uploads existe (importante no estágio final)
RUN mkdir -p public/uploads && chown -R node:node public/uploads

# Muda para um utilizador não-root por segurança
USER node

# Expõe a porta
EXPOSE 3000

# Comando para iniciar a aplicação
CMD [ "node", "server.js" ]