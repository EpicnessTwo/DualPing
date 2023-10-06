FROM node:20

WORKDIR /app

RUN apt-get update && apt-get install -y iputils-ping

COPY package.json package-lock.json ./
RUN npm install

COPY run.js ./

CMD ["node", "run.js"]