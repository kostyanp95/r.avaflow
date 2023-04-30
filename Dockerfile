#1 Use official Node.js image as builder
FROM node:18 as builder

#2 Set work directory
WORKDIR /r.avaflow

#3 Copy files
COPY . .

#4 Install Nest and Angular dependencies
RUN cd ./web-app/server && npm i && \
    cd ../ && npm i

#5 Build Angular application
RUN cd ./web-app && npm run ng:build

# Use official Node.js slim image as final stage
FROM node:18-slim

# Set work directory
WORKDIR /r.avaflow

# Copy files from builder stage
COPY --from=builder /r.avaflow ./

#6 Install production dependencies for Nest
RUN cd ./web-app/server && npm ci --only=production

#7 Install runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        python3 \
        libgeos-dev \
        libproj-dev proj-data proj-bin \
        libgdal-dev python3-gdal && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    rm -rf /root/.cache

#8 Define system variables
ENV TZ=Europe/Moscow

#9 Expose ports for the application
EXPOSE 3000 4200

#10 Set up the entrypoint for your application
ENTRYPOINT ["/bin/bash", "-c"]

#11 Run Nest and Angular in development mode
CMD ["cd ./web-app/server && npm run start:dev & cd ../ && npm run ng:serve"]
