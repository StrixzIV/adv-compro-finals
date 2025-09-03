# Stage 1: installing dependentcies
FROM node:24-alpine AS deps

WORKDIR /app

COPY package*.json ./

RUN npm install

# Stage 2: build service
FROM node:24-alpine AS build

WORKDIR /app

COPY . .
COPY --from=deps /app/node_modules/ node_modules/

RUN npm run build

# Stage 3: runtime preparation
FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV production

COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/public ./public

EXPOSE 3000

CMD ["npm", "run", "start"]
