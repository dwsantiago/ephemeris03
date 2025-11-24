FROM node:18-slim

# Instalar dependências necessárias
RUN apt-get update && apt-get install -y curl ca-certificates && apt-get clean

WORKDIR /app

# Copiar package.json primeiro para cache do Docker
COPY package*.json ./

# Instalar dependências (incluindo swisseph)
RUN npm install

# Copiar projeto
COPY . .

# Criar pasta de efemérides
RUN mkdir -p /usr/local/share/ephe

# Baixar efemérides diretamente do GitHub (manutenção garantida)
RUN curl -L https://raw.githubusercontent.com/dwsantiago/ephemeris03/main/ephe/seas_18.se1 -o /usr/local/share/ephe/seas_18.se1 && \
    curl -L https://raw.githubusercontent.com/dwsantiago/ephemeris03/main/ephe/semo_18.se1 -o /usr/local/share/ephe/semo_18.se1 && \
    curl -L https://raw.githubusercontent.com/dwsantiago/ephemeris03/main/ephe/sele_18.se1 -o /usr/local/share/ephe/sele_18.se1 && \
    curl -L https://raw.githubusercontent.com/dwsantiago/ephemeris03/main/ephe/sede_18.se1 -o /usr/local/share/ephe/sede_18.se1

# Informar ao swisseph onde está a pasta
ENV EPHE_PATH=/usr/local/share/ephe

EXPOSE 3000

CMD ["node", "index.js"]
