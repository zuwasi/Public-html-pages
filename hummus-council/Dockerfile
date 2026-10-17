FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY server.cjs reviews.cjs index.html jev-logo.png abu-hassan-portrait.png abu-hassan-hummus.jpg abu-hassan-framed.jpg esl-logo.png ./
ENV NODE_ENV=production HOST=0.0.0.0
CMD ["node", "server.cjs"]
