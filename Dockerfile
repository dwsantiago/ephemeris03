FROM node:18

WORKDIR /app

# Instala ferramentas de build e Python3 (necessário para ffi-napi/node-gyp)
RUN apt-get update && apt-get install -y \
    build-essential wget unzip python3 \
    && rm -rf /var/lib/apt/lists/*

# Baixa e compila a Swiss Ephemeris (libswe)
RUN wget https://www.astro.com/ftp/swisseph/swe_unix_src_2.10.03.tar.gz -O /tmp/swe.tar.gz \
    && tar -xzf /tmp/swe.tar.gz -C /tmp \
    && cd /tmp/swe/src \
    && make libswe.so \
    && mkdir -p /usr/local/lib \
    && cp libswe.so /usr/local/lib/ \
    && ldconfig \
    && mkdir -p /usr/local/share/ephe \
    && cp -r /tmp/swe/ephe/* /usr/local/share/ephe/

# Copia package.json e instala dependências
COPY package*.json ./
RUN npm install --omit=dev

# Copia o restante do código
COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["node", "index.js"]
