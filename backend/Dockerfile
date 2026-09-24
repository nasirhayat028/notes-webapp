FROM node:22-alpine

WORKDIR /notesapp

RUN apk update && apk upgrade --no-cache

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

# npm is only needed during image build.
# The application runs directly with Node.js at runtime.
RUN rm -rf /usr/local/lib/node_modules/npm \
    /usr/local/bin/npm \
    /usr/local/bin/npx

EXPOSE 5000

CMD [ "node", "server.js" ]