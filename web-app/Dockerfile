FROM kostyanp95/r.avaflow:0.0.1

WORKDIR /r.avaflow/web-app

COPY . .

#15 Install Node.js and npm dependisies
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    cd /r.avaflow/web-app/server && npm i && \
    cd /r.avaflow/web-app && npm i

#16 Expose ports for the web applications
EXPOSE 3000 4200

#17 Run Nest and Angular in development mode
CMD ["npm", "run", "start:dev"]
