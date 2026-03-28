FROM ubuntu:22.04 AS base

WORKDIR /r.avaflow

COPY . .

#3.5 Switch to Yandex mirror (more reliable from Russia than Ubuntu CDN)
RUN sed -i \
    's|http://archive.ubuntu.com|http://mirror.yandex.ru|g; s|http://security.ubuntu.com|http://mirror.yandex.ru|g' \
    /etc/apt/sources.list

#4 Update packages repository, install locale
RUN apt-get update && \
    apt-get install locales -y && \
    locale-gen en_US.UTF-8 && \
    update-locale LANG=en_US.UTF-8

#5 Define system variables
ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Europe/Moscow \
    LC_ALL=en_US.UTF-8

#6 Use bash by default
RUN ln -fs /bin/bash /bin/sh

#7 Making sure that Python 3 is used
RUN apt-get install -y --no-install-recommends python3 python3-pip python3-setuptools python3-wheel curl gnupg && \
    echo "alias python=python3" >> ~/.bash_aliases

#8 Adding ubuntugis PPA manually (no software-properties-common needed)
RUN curl -fsSL "https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x6B827C12C2D425E227EDCA75089EBE08314DF160" | \
        gpg --dearmor -o /usr/share/keyrings/ubuntugis.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/ubuntugis.gpg] https://ppa.launchpadcontent.net/ubuntugis/ubuntugis-unstable/ubuntu jammy main" \
        > /etc/apt/sources.list.d/ubuntugis-unstable.list && \
    apt-get update -y

#9 Installing necessary additional packages
RUN apt-get install -y --no-install-recommends libgeos-dev && \
    apt-get install -y --no-install-recommends libproj-dev proj-data proj-bin && \
    apt-get install -y --no-install-recommends libgdal-dev python3-gdal gdal-bin

#10 Installing GRASS GIS (headless, no GUI/docs needed in Docker)
RUN apt-get install -y --no-install-recommends grass-core grass-dev git make gcc --fix-missing

#11 Installing pillow
RUN apt-get install -y --no-install-recommends python3-pil

#12 Installing R statistical software
RUN curl -fsSL https://cloud.r-project.org/bin/linux/ubuntu/marutter_pubkey.asc | \
        gpg --dearmor -o /usr/share/keyrings/r-project.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/r-project.gpg] https://cloud.r-project.org/bin/linux/ubuntu jammy-cran40/" \
        > /etc/apt/sources.list.d/r-project.list && \
    apt-get update -y && \
    apt-get install -y --no-install-recommends r-base r-base-core

#13 Installing necessary additional R packages
# Note: rgdal/rgeos/maptools retired from CRAN in 2023, replaced by sf/terra
RUN echo 'install.packages(c("stats","foreign","sp","sf","terra","raster","ROCR","fmsb","Rcpp"), lib="/usr/lib/R/library/", repos="https://cloud.r-project.org")' > ./avaflow/install.packages.R && \
    R CMD BATCH ./avaflow/install.packages.R

#14 Installing r.avaflow extension in GRASS GIS
RUN grass -c XY ./temp_grassdb/temp_location/ --exec g.extension extension=r.avaflow url=/r.avaflow/avaflow/ && \
    rm -rf ./temp_grassdb


FROM base AS webapp

WORKDIR /r.avaflow/web-app

COPY . .

#15 Install Node.js and npm dependencies
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_16.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    cd /r.avaflow/web-app/server && npm i && \
    cd /r.avaflow/web-app && npm i

#16 Expose ports for the web applications
EXPOSE 3000 4200

#17 Run Nest and Angular in development mode
CMD ["npm", "run", "start:dev"]
