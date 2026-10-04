FROM node:22-alpine
WORKDIR /app
COPY server.cjs index.html jev-logo.png abu-hassan-portrait.png abu-hassan-hummus.jpg ./
ENV NODE_ENV=production HOST=0.0.0.0
CMD ["node", "server.cjs"]
