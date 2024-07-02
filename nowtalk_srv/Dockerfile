FROM node:22.3.0



COPY package.json package.json
COPY package-lock.json package-lock.json

RUN npm install

COPY /app /

CMD [ "node", "app.js" ]
