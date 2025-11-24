FROM node:18-slim

# Instalar dependências mínimas necessárias
RUN apt-get update && apt-get install -y \
    libc6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia package.json e package-lock.json
COPY package*.json ./

# Instala dependências do Node
RUN npm install --omit=dev

# Copia restante do projeto
COPY . .

# Garante que o libswe.so seja encontrado
ENV LD_LIBRARY_PATH=/app/libs

EXPOSE 3000

CMD ["node", "index.js"]
