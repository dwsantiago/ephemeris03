FROM node:18

WORKDIR /app

# 1. Instalação de dependências
# ADICIONEI: 'git' (para baixar o codigo) e 'zlib1g-dev' (CRUCIAL para compilar sem erro)
RUN apt-get update && apt-get install -y \
    build-essential wget unzip python3 git zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# 2. Baixa o código fonte via GIT e compila
# Usar git clone --depth 1 é mais rápido e garante que a pasta será /tmp/swe
RUN git clone --depth 1 https://github.com/aloistr/swisseph.git /tmp/swe \
    && cd /tmp/swe/src \
    && make libswe.so \
    && mkdir -p /usr/local/lib \
    && cp libswe.so /usr/local/lib/ \
    && ldconfig \
    && mkdir -p /usr/local/share/ephe \
    && cp -r /tmp/swe/ephe/* /usr/local/share/ephe/

# 3. Instala dependências do Node
COPY package*.json ./
RUN npm install --omit=dev

# 4. Copia o código da API
COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["node", "index.js"]
