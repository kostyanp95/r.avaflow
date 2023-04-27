# r.avaflow WEB application
This project is created with the aim of helping scientists and researchers in the field of earth sciences (geomorphology, glaciology, debris flow studies) to work with the modeling of debris flows, avalanches, or lahars.

The essence of the project is to enable a user, who may not have sufficient IT skills such as working with a terminal and installing and configuring necessary dependencies, to work with a program that has a user-friendly and understandable GUI/UI. In other words, complete automation of the installation and configuration of all required dependencies of GRASS GIS and the main extension r.avaflow.

The ultimate goal of the project is to compile a binary file that will install and run a Docker image with all installed dependencies, as well as deploy a web application with an interface inside Docker, which will process user input and send it for execution to the r.avaflow extension of GRASS GIS.

# About r.avaflow
r.avaflow represents a GIS-supported open source software tool for the simulation of complex, cascading mass flows over arbitrary topography. It employs the NOC-TVD numerical scheme (Wang et al., 2004) along with a Voellmy-type model, with an enhanced version of the Pudasaini multi-phase flow model (Pudasaini and Mergili, 2019), or with an equilibrium-of-motion model for flows which are not extremely rapid. Simplified approaches are available, too. Complementary functions include entrainment, deposition, dispersion, and phase transformations. The starting mass may be defined through raster maps and/or hydrographs. r.avaflow includes the possibility to explore multi-core computing environments to run multiple simulations at once as a basis for parameter sensitivity analysis and optimization. Further, the simulation results are visualized through maps and diagrams, and input for 3D and immersive virtual reality visualization is generated.

Authors:
Mergili, M., Pudasaini, S.P., 2014-2023. r.avaflow - The mass flow simulation tool. https://www.avaflow.org


# Requirements
Windows 10. Minimal version 1903 (May 2019 Update) for later fo installing WSL or Docker Desktop.

Or Linux distribution that supports Docker.

Or macOS minimal version 10.13 (High Sierra) for Docker.

# Why using Docker?
To utilize r.avaflow, quite a few dependencies must be installed, including Python, R language, GRASS GIS (with packages). Moreover, some of these require specific versions. For average users, this can be a labor-intensive process and a waste of time.

A ready-to-use Docker image will contain all the necessary installed dependencies of the required versions, as well as a complete environment ready for operation.

If a user wants to try r.avaflow as a tool for a few experiments and then remove it, this will be much easier to accomplish. The only thing that needs to be removed is Docker.