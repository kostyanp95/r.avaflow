FROM ubuntu:20.04

WORKDIR /r.avaflow

COPY . .

#4 Update packages repository, install locate
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
RUN apt install python3-pip -y && \
    echo "alias python=python3" >> ~/.bash_aliases && \
    source ~/.bash_aliases

#8 Selecting suitable repository
RUN apt install -y software-properties-common && \
    add-apt-repository ppa:ubuntugis/ubuntugis-unstable -y && \
    apt update -y

#9 Installing necessary additional packages
RUN apt update && \
    apt install libgeos-dev -y && \
    apt install libproj-dev proj-data proj-bin -y && \
    apt install libgdal-dev python3-gdal gdal-bin -y

#10 Installing GRASS GIS (dev package)
RUN apt update -y && \
    apt install grass-dev grass-doc grass-gui -y

#11 Installing pillow
RUN apt install python3-pip -y && \
    python3 -m pip install --upgrade pillow

#12 Installing R statistical software
RUN apt-key adv --keyserver keyserver.ubuntu.com --recv-keys E298A3A825C0D65DFD57CBB651716619E084DAB9 && \
    add-apt-repository 'deb https://cloud.r-project.org/bin/linux/ubuntu focal-cran40/' && \
    apt update -y && \
    apt install r-base r-base-core -y

#13 Installing necessary additional R packages
RUN echo 'install.packages(c("stats","foreign","sp","rgeos","rgdal","raster","maptools","ROCR","fmsb", "Rcpp"), lib="/usr/lib/R/library/", repos = "http://cran.case.edu" )' > ./avaflow/install.packages.R && \
    R CMD BATCH ./avaflow/install.packages.R

#14 Installing r.avaflow extension in GRASS GIS
RUN grass -c XY ./temp_grassdb/temp_location/ --exec g.extension extension=r.avaflow url=/r.avaflow/avaflow/ && \
    rm -rf ./temp_grassdb
