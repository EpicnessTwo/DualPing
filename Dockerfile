FROM alpine:latest

WORKDIR /app

RUN apk update && \
    apk add nodejs npm iputils && \
    rm -rf /var/cache/apk/*

COPY package.json package-lock.json ./
RUN npm install

COPY run.js ./

CMD ["node", "run.js"]