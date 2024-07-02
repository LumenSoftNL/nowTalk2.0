FROM node:22.3.0

COPY /app/package.json package.json
COPY /app/package-lock.json package-lock.json

RUN npm install

COPY /app /

WORKDIR /data

CMD [ "node", "app.mjs" ]
