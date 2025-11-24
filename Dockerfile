FROM node:18-slim

RUN apt-get update && apt-get install -y \
    wget \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN wget https://github.com/aloistr/swisseph/archive/refs/tags/v2.10.03.tar.gz -O /tmp/swe.tar.gz && \
    tar -xzf /tmp/swe.tar.gz -C /tmp && \
    cd /tmp/swisseph-2.10.03/src && \
    make -j4 swetest && \
    cp swetest /usr/local/bin/ && \
    mkdir -p /usr/local/share/ephe && \
    cp -r /tmp/swisseph-2.10.03/ephe/* /usr/local/share/ephe/

WORKDIR /app
COPY . .

RUN npm install

EXPOSE 3000
CMD ["npm", "start"]
