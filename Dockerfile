FROM node:18

WORKDIR /app

# 1. Instala Python e ferramentas de build (Necessário para o ffi-napi)
RUN apt-get update && apt-get install -y \
    build-essential wget unzip python3 \
    && rm -rf /var/lib/apt/lists/*

# 2. Baixa do site oficial e compila a BIBLIOTECA (libswe.so)
# Nota: Usamos o link oficial ftp/swisseph para garantir a pasta 'swe/src'
RUN wget https://www.astro.com/ftp/swisseph/swe_unix_src_2.10.03.tar.gz -O /tmp/swe.tar.gz \
    && tar -xzf /tmp/swe.tar.gz -C /tmp \
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
