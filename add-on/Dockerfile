FROM node:22.3.0

WORKDIR /nowTalkSrv

COPY package.json package.json
COPY package-lock.json package-lock.json

RUN npm install

COPY . .

CMD [ "node", "app.js" ]
