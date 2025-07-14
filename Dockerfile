# Dockerfile (à placer à la racine du projet)

############################################
# 1) Build de l’app Front (Vite + React)  #
############################################
FROM node:20-alpine AS front-builder

WORKDIR /app
# copie du package.json et des fichiers de config
COPY package.json package-lock.json ./
RUN npm ci

COPY . ./


# installation et build

RUN npm run build

############################################
# 2) Build & bundle de l’app Back (Express)#
############################################
FROM node:20-alpine AS back-builder

WORKDIR /server
# copie du package.json du serveur
COPY server/package.json server/package-lock.json ./

RUN npm ci

# on ne copie pas encore le code ni le dist du front

############################################
# 3) Image finale de production            #
############################################
FROM node:20-alpine

WORKDIR /server

# on récupère node_modules du back
COPY --from=back-builder /server/node_modules ./node_modules
# copie du code serveur
COPY server ./

# on récupère le build front et on le met dans ./public
# (à condition que votre index.js serve
#  static('public') ou que vous adaptiez)
COPY --from=front-builder /app/dist ./public

# port d'écoute de votre serveur Express
EXPOSE 6969

# lancement de l’app
CMD ["node", "index.js"]
