FROM node:11.13.0-alpine

WORKDIR /app

RUN apk add --update git python make gcc g++

COPY package.json package.json
COPY yarn.lock yarn.lock

RUN yarn

COPY . .

RUN yarn run build

ENV PORT 3000
EXPOSE 3000

CMD ["yarn", "start"]
