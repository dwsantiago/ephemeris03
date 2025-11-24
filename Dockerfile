FROM debian:stable-slim

RUN apt-get update && apt-get install -y \
  build-essential \
  wget \
  tar \
  nodejs \
  npm \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN wget https://www.astro.com/ftp/swisseph/swe_unix_src_2.10.03.tar.gz -O /tmp/swe.tar.gz && \
    tar -xzf /tmp/swe.tar.gz -C /tmp && \
    cd /tmp/swe/src && \
    make -j4 swetest && \
    cp swetest /usr/local/bin/ && \
    mkdir -p /usr/local/share/ephe && \
    cp -r /tmp/swe/ephe/* /usr/local/share/ephe/

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3000
CMD ["node", "index.js"]
