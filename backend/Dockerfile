FROM node:22-alpine

WORKDIR /notesapp

COPY package*.json ./

# Use the committed lockfile so the image matches the dependencies tested in CI.
RUN npm ci --omit=dev

COPY . .

EXPOSE 5000

CMD [ "npm","start" ]

