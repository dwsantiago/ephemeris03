FROM node:18

WORKDIR /app

# 1. Instala dependências (Mantendo o zlib1g-dev que é CRUCIAL)
RUN apt-get update && apt-get install -y \
    build-essential wget unzip python3 git zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# 2. Baixa e Compila (Lógica Inteligente de Diretório)
RUN git clone --depth 1 https://github.com/aloistr/swisseph.git /tmp/swe \
    && cd /tmp/swe \
    # [TRUQUE] Se existir pasta 'src', entra nela. Se não, assume que está na raiz.
    && if [ -d "src" ]; then cd src; fi \
    && make libswe.so \
    && mkdir -p /usr/local/lib \
    && cp libswe.so /usr/local/lib/ \
    && ldconfig \
    # [TRUQUE] Volta para a raiz do repo para pegar os arquivos de dados (ephe)
    && cd /tmp/swe \
    && mkdir -p /usr/local/share/ephe \
    && if [ -d "ephe" ]; then cp -r ephe/* /usr/local/share/ephe/; fi

# 3. Instala dependências do Node
COPY package*.json ./
RUN npm install --omit=dev

# 4. Copia o código da API
COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["node", "index.js"]
