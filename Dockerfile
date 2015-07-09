FROM kudoz/iojs-gm
MAINTAINER Jonathan Cremin <jonathan@crem.in>

WORKDIR /app

COPY . .

RUN npm install && npm rebuild node-sass

RUN npm run build

EXPOSE 4040

CMD npm start
