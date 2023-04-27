#!/usr/bin/env python3

#############################################################################
#
# MODULE:       r.avaflow 3
#
# AUTHORS:      Martin Mergili and Shiva P. Pudasaini
# CONTRIBUTORS: Massimiliano Alvioli, Matthias Benedikt, Emmanuel Delage,
#               Wolfgang Fellin, Jan-Thomas Fischer, Sigridur S. Gylfadottir,
#               Andreas Huber, Ivan Marchesini, Markus Metz, Markus Neteler,
#               Alexander Ostermann, Matthias Rauter
#
# PURPOSE:      The mass flow simulation tool
#
# COPYRIGHT:    (c) 2013 - 2023 by the authors
#               (c) 2020 - 2023 by the University of Graz
#               (c) 2013 - 2021 by the BOKU University, Vienna
#               (c) 2015 - 2020 by the University of Vienna
#               (c) 2014 - 2023 by the University of Bonn
#               (c) 2000 - 2023 by the GRASS Development Team
#               (c) 1993 - 2023 by the R Development Core Team
#
#               This program is free software under the GNU General Public
#               License (>=v2). Read the file COPYING that comes with GRASS
#               for details.
#
#############################################################################

#%module
#% description: The mass flow simulation tool
#% keywords: Raster
#% keywords: Landslide
#% keywords: Numerical simulation
#%end

#%flag
#% key: a
#% description: Map plots of pressure and kinetic energy
#% guisection: flags
#%end

#%flag
#% key: e
#% description: Model execution
#% guisection: flags
#%end

#%flag
#% key: k
#% description: Keep result GRASS raster maps
#% guisection: flags
#%end

#%flag
#% key: m
#% description: Multiple model runs
#% guisection: flags
#%end

#%flag
#% key: t
#% description: Map plots of impact wave or tsunami height
#% guisection: flags
#%end

#%flag
#% key: v
#% description: Evaluation and visualization
#% guisection: flags
#%end

#%option
#% key: prefix
#% type: string
#% description: Prefix for output files and folders
#% required: no
#% multiple: no
#%end

#%option
#% key: cores
#% type: string
#% description: Number of cores to be used for multiple model runs
#% required: no
#% multiple: no
#%end

#%option
#% key: cellsize
#% type: string
#% description: Cell size in metres
#% required: no
#% multiple: no
#%end

#%option
#% key: phases
#% type: string
#% description: Phase(s) to be considered (maximum 3, comma-separated, x = mixture, s = solid, fs = fine solid, f = fluid, m = multi-phase)
#% required: no
#% multiple: yes
#%end

#%option
#% key: gravity
#% type: string
#% description: Gravity (m/s2)
#% required: no
#% multiple: no
#%end

#%option
#% key: limiter
#% type: string
#% description: Numerical limiter (1 = Minmod limiter, 2 = Superbee limiter, 3 = Woodward limiter, 4 = van Leer limiter)
#% required: no
#% multiple: no
#%end

#%option
#% key: layers
#% type: string
#% description: Layer mode (0 = no, 1 = yes)
#% required: no
#% multiple: no
#%end

#%option
#% key: controls
#% type: string
#% description: Controls (comma-separated)
#% required: no
#% multiple: yes
#%end

#%option
#% key: aoicoords
#% type: string
#% description: Set of coordinates delineating area of interest (N,S,E,W)
#% required: no
#% multiple: yes
#%end

#%option
#% key: elevation
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of elevation raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: hrelease
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of release height raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: rhrelease1
#% type: string
#% description: Ratio(s) of PHASE 1 release height (comma-separated)
#% required: no
#% multiple: yes
#%end

#%option
#% key: vhrelease
#% type: string
#% description: Variation of release height (comma-separated)
#% required: no
#% multiple: yes
#%end

#%option
#% key: hrelease1
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of PHASE 1 release height raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: hrelease2
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of PHASE 2 release height raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: hrelease3
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of PHASE 3 release height raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: trelease
#% type: string
#% gisprompt: old,raster,dcell
#% description: Release time raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: trelstop
#% type: string
#% gisprompt: old,raster,dcell
#% description: Release hydrograph stop time raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: tslide
#% type: string
#% gisprompt: old,raster,dcell
#% description: Time of initial sliding raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: tstop
#% type: string
#% gisprompt: old,raster,dcell
#% description: Stopping time raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: vinx
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of release velocity in x direction raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: viny
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of release velocity in y direction raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: vinx1
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of PHASE 1 release velocity in x direction raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: viny1
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of PHASE 1 release velocity in y direction raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: vinx2
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of PHASE 2 release velocity in x direction raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: viny2
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of PHASE 2 release velocity in y direction raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: vinx3
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of PHASE 3 release velocity in x direction raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: viny3
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of PHASE 3 release velocity in y direction raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: hentrmax
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of maximum height of entrainment raster map (comma-separated)
#% required: no
#% multiple: no
#%end

#%option
#% key: rhentrmax1
#% type: string
#% description: Ratio(s) of maximum height of PHASE 1 entrainment (comma-separated)
#% required: no
#% multiple: no
#%end

#%option
#% key: vhentrmax
#% type: string
#% description: Variation of maximum height of entrainment (comma-separated)
#% required: no
#% multiple: yes
#%end

#%option
#% key: hentrmax1
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of maximum height of PHASE 1 entrainment raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: hentrmax2
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of maximum height of PHASE 2 entrainment raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: hentrmax3
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of maximum height of PHASE 3 entrainment raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: density
#% type: string
#% description: Density parameters (comma-separated)
#% required: no
#% multiple: yes
#%end

#%option
#% key: friction
#% type: string
#% description: Friction parameters (comma-separated)
#% required: no
#% multiple: yes
#%end

#%option
#% key: viscosity
#% type: string
#% description: Viscosity parameters (comma-separated)
#% required: no
#% multiple: yes
#%end

#%option
#% key: basal
#% type: string
#% description: Basal surface parameters (comma-separated)
#% required: no
#% multiple: yes
#%end

#%option
#% key: transformation
#% type: string
#% description: Phase transformation parameters (comma-separated)
#% required: no
#% multiple: yes
#%end

#%option
#% key: dynfric
#% type: string
#% description: Parameters for the dynamic adaptation of friction (comma-separated)
#% required: no
#% multiple: yes
#%end

#%option
#% key: slidepar
#% type: string
#% description: Parameters for initial sliding (search radius, exponent for weighting, coefficient for deformation)
#% required: no
#% multiple: yes
#%end

#%option
#% key: special
#% type: string
#% description: Special parameters (comma-separated)
#% required: no
#% multiple: yes
#%end

#%option
#% key: phi1
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of internal friction angle of PHASE 1 raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: phi2
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of internal friction angle of PHASE 2 raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: phi3
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of internal friction angle of PHASE 3 raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: delta1
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of basal friction angle of PHASE 1 raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: delta2
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of basal friction angle of PHASE 2 raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: delta3
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of basal friction angle of PHASE 3 raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: tufri
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of turbulent friction coefficient raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: ny1
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of viscosity of PHASE 1 raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: ny2
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of viscosity of PHASE 2 raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: ny3
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of viscosity of PHASE 3 raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: ambdrag
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of ambient drag coefficient raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: flufri
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of fluid friction coefficient raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: centr
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of entrainment coefficient raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: cvshear
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of shear velocity coefficient raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: deltab
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of basal friction difference raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: ctrans12
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of PHASE 1-PHASE 2 transformation coefficient raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: ctrans13
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of PHASE 1-PHASE 3 transformation coefficient raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: ctrans23
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of PHASE 2-PHASE 3 transformation coefficient raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: zones
#% type: string
#% gisprompt: old,raster,cell
#% description: Zones raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: impactarea
#% type: string
#% gisprompt: old,raster,cell
#% description: Name of observed impact area raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: hdeposit
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of observed deposit height raster map
#% required: no
#% multiple: no
#%end

#%option
#% key: hydrograph
#% type: string
#% description: Path(es) to hydrograph file(s)
#% required: no
#% multiple: yes
#%end

#%option
#% key: hydrocoords
#% type: string
#% description: Pairs of coordinates of hydrograph(s) (x1, y1, x2, y2, ...)
#% required: no
#% multiple: yes
#%end

#%option
#% key: adaptograph
#% type: string
#% description: Path(es) to adaptograph file(s)
#% required: no
#% multiple: no
#%end

#%option
#% key: frictiograph
#% type: string
#% description: Path(es) to frictiograph file(s)
#% required: no
#% multiple: no
#%end

#%option
#% key: transformograph
#% type: string
#% description: Path(es) to transformograph file(s)
#% required: no
#% multiple: no
#%end

#%option
#% key: sampling
#% type: string
#% description: Type of parameter sampling (positive number = random, 0 = controlled, negative number = OAT)
#% required: no
#% multiple: no
#%end

#%option
#% key: cfl
#% type: string
#% description: CFL criterion, initial time step length (s)
#% required: no
#% multiple: yes
#%end

#%option
#% key: time
#% type: string
#% description: Time interval (s), stop for writing output (s)
#% required: no
#% multiple: yes
#%end

#%option
#% key: slomo
#% type: string
#% description: Factor for slow motion
#% required: no
#% multiple: no
#%end

#%option
#% key: thresholds
#% type: string
#% description: Lower thresholds for display of flow height, kinetic energy and pressure (comma-separated)
#% required: no
#% multiple: yes
#%end

#%option
#% key: profile
#% type: string
#% description: Pairs of coordinates for profile plots (x1,y1,x2,y2,...)
#% required: no
#% multiple: yes
#%end

#%option
#% key: ctrlpoints
#% type: string
#% description: Pairs of coordinates for control points (x1,y1,x2,y2,...)
#% required: no
#% multiple: yes
#%end

#%option
#% key: reftime
#% type: string
#% description: Reference time of reach for each control point (t1,t2,...)
#% required: no
#% multiple: yes
#%end

#%option
#% key: phexagg
#% type: string
#% description: Exaggeration of flow height in profile plots
#% required: no
#% multiple: no
#%end

#%option
#% key: orthophoto
#% type: string
#% description: Path to orthophoto tiff image
#% required: no
#% multiple: no
#%end

#%option
#% key: visualization
#% type: string
#% description: Parameters for visualization
#% required: no
#% multiple: yes
#%end

# Importing libraries

import grass.script as grass
from grass.script import core as grasscore
import math
from PIL import Image
import os
import queue
import random
import shutil
import subprocess
import sys
import threading
import time


# Defining fundamental functions, classes, and variables

def which(file):  # function for reading GRASS directory:
    for path in os.environ["PATH"].split(":"):
        if os.path.exists(path + "/" + file):
            return path + "/" + file
    return None


for i in ["70", "71", "72", "73", "74", "75", "76", "77", "78", "79", ""]:
    if not which("grass" + i) is None:
        bingrass = which("grass" + i)  # reading grass binary
        
if not bingrass:
    grass.error("Please install GRASS 7 or GRASS 8.")
    grass.message(" ")
    sys.exit()
        
queueLock = threading.Lock()  # queue for multi-core processing
workQueue = queue.Queue()

exitFlag = 0  # exit flag
ambvars = grass.gisenv()  # path to GRASS data
locpath = ambvars.GISDBASE + "/" + ambvars.LOCATION_NAME  # path to GRASS location
temppath = (
    ambvars.GISDBASE
    + "/"
    + ambvars.LOCATION_NAME
    + "/"
    + ambvars.MAPSET
    + "/.tmp/rtemp"
)  # path to temporary directory

if True:

    scriptpath = "$HOME/.grass8/addons/etc/r.avaflow.rcode"  # path to R scripts
    scriptpath2 = "$HOME/.grass8/addons/scripts"  # path to r.avaflow.mult

else:

    scriptpath = "$HOME/.grass7/addons/etc/r.avaflow.rcode"  # path to R scripts
    scriptpath2 = "$HOME/.grass7/addons/scripts"  # path to r.avaflow.mult

mainmapset = ambvars.MAPSET  # name of main mapset


def ErrorMessage(specify):  # function for error message:
    grass.message(" ")
    grass.error("Please revise the " + specify + ".")
    grass.message(" ")
    sys.exit()


class myThread(threading.Thread):  # class for threading:
    def __init__(self, name, q):
        threading.Thread.__init__(self)
        self.name = name
        self.q = q

    def run(self):
        process_data(self.name, self.q)


def StartBatch(jid):  # function for start of multi-core processing:
    print("Executing model run %s" % jid)
    execute = "bash " + temppath + "/tmp" + str(jid) + "/batch" + str(jid)
    os.system(execute + " < /dev/null > " + temppath + "/out" + str(jid))
    print("Model run %s completed." % jid)
    return


def process_data(threadName, q):  # function supporting start of multi-core processing:
    while not exitFlag:
        queueLock.acquire()
        if not workQueue.empty():
            time.sleep(0.25)
            data = q.get()
            queueLock.release()
            StartBatch(data)
        else:
            queueLock.release()


mstring = [
    "_hflow",
    "_tflow",
    "_pflow",
    "_basechange",
    "_vflow",
    "_htsun",
    "_treach",
]  # list of names of raster maps


def corrasc(corrname):  # function for correcting output ascii rasters

    os.rename(corrname + ".asc", corrname + "o.asc")

    fpressureo = open(corrname + "o.asc", "r")
    fpressure = open(corrname + ".asc", "w")

    fdata = ""
    for i in range(0, 5):
        fdatah = fpressureo.readline()
        fdata = fdata + "\t".join(fdatah.split()) + "\n"

    fdatah = fpressureo.readline()
    fdatai = fdatah.split()
    if fdatai[0] == "NODATA_value":
        fdata = fdata + fdatah
        fdataj = fdatai[1]
    else:
        fdata = fdata + "NODATA_value\t-9999\n" + fdatah
        fdataj = "-9999"

    fdata = fdata + "".join(fpressureo.readlines())
    fdata = fdata.replace("corner", "center").replace(fdataj, "-9999")

    fpressure.write(fdata)

    fpressureo.close()
    fpressure.close()

    os.system("rm -f " + corrname + "o.asc")
    os.system("rm -f " + corrname + ".asc.aux.xml")

def writeparam(jid, aflag, eflag, kflag, mflag, tflag, vflag, pf, cores, cellsize, phases, gravity, limiter, layers, controls, aoicoords, 
   elevation, hrelease, rhrelease1, vhrelease, vhrlx, hrelease1, hrelease2, hrelease3, trelease, trelstop, tslide, stoptime, vinx, viny, vinx1, viny1, vinx2, viny2, vinx3, viny3, 
   hentrmax, rhentrmax1, vhentrmax, vhemx, hentrmax1, hentrmax2, hentrmax3, phi1, phi2, phi3, delta1, delta2, delta3, tufri, ny1, ny2, ny3, ambdrag, flufri, centr, cvshear, deltab, 
   ctrans12, ctrans13, ctrans23, zones, impactarea, hdeposit, hydrograph, hydrocoords, density, friction, viscosity, basal, transformation, special, dynfric, 
   adaptograph, frictiograph, transformograph, sampling, slidepar, cfl, times, slomo, thresholds, profile, ctrlpoints, reftime, phexagg, orthophoto, 
   lmax, nmesh, model, phasesnum, thresholdsc, tint, tstop, gt, ortho_c1, ortho_c2, ortho_c3, ortho_c4, ortho_c5, ortho_c6, visualization, ascpath):

   if not mflag:
       p1file = open(temppath + "/param1.txt", "w")  # opening parameter file for single model run
   else:
       p1file = open(temppath + "/param" + str(jid) + ".txt", "w")  # opening parameter file for multiple model runs

   print(mainmapset, file=p1file)  # name of main mapset
   
   if not mflag:
       print("0", file=p1file)  # identifier for single model run
   else:
       print("1", file=p1file)  # identifier for multiple model runs

   print("1", file=p1file)  # mesh spacing (multiple of ascii raster cell size)  
   print("%s_" % pf, file=p1file)  # prefix
   print("", file=p1file)  # name of directory with input files
   print("%s_results/%s_ascii/" % (pf, pf), file=p1file)  # path and prefix for storing output maps
   print("%s_results/%s_files/" % (pf, pf), file=p1file)  # path and prefix for storing output files
   print("%s_results/%s_aimec/" % (pf, pf), file=p1file)  # path and prefix for storing output aimec files
   print("%s_results/%s_vr/" % (pf, pf), file=p1file)  # path and prefix for storing virtual reality input files
   print("%s_results/%s_plots/" % (pf, pf), file=p1file)  # path and prefix for storing output R plots
   
   print(str(model), file=p1file)  # model
   for l in range(0, 3):
       print(str(phasesnum[l]), file=p1file)  # phases
   if aflag:
       print("1", file=p1file)  # control for additional output
   else:
       print("0", file=p1file)
   if tflag:
       print("1", file=p1file)  # control for tsunami output
   else:
       print("0", file=p1file)
   print(gravity, file=p1file)  # gravity
   print(limiter, file=p1file)  # numerical limiter
   print(layers, file=p1file)  # layer mode

   print(controls[0], file=p1file)  # control for correction of flow height
   print(controls[1], file=p1file)  # control for diffusion control
   print(controls[2], file=p1file)  # control for curvature
   print(controls[3], file=p1file)  # control for surface control
   print(controls[4], file=p1file)  # control for entrainment and deposition
   print(controls[5], file=p1file)  # control for stopping
   print(controls[6], file=p1file)  # control for dynamic variation of friction
   print(controls[7], file=p1file)  # control for non-hydrostatic effects
   print(controls[8], file=p1file)  # control for phase separation
   print(controls[9], file=p1file)  # control for input hydrograph management      
   print(controls[10], file=p1file)  # control for deceleration management

   if elevation:
       print(elevation, file=p1file)  # name of elevation map
   else:
       print("None", file=p1file)            
   if hrelease:
       print(hrelease, file=p1file)  # name of MIXTURE release height map
   elif hrelease1:
       print(hrelease1, file=p1file)  # name of PHASE 1 release height map
   else:
       print("None", file=p1file)
   if hrelease2:
       print(hrelease2, file=p1file)  # name of PHASE 2 release height map
   else:
       print("None", file=p1file)
   if hrelease3:
       print(hrelease3, file=p1file)  # name of PHASE 3 release height map
   else:
       print("None", file=p1file)
   if rhrelease1:
       print(rhrelease1, file=p1file)  # fraction of PHASE 1 release height
   else:
       print("1.00", file=p1file)
   if vhrelease:
       print(vhrlx, file=p1file)  # variation of release height
   else:
       print("1.00", file=p1file)
   if vinx1:
       print(vinx1, file=p1file)  # name of MIXTURE or PHASE 1 release velocity in x direction map
   else:
       print("None", file=p1file)
   if vinx2:
       print(vinx2, file=p1file)  # name of PHASE 2 release velocity in x direction map
   else:
       print("None", file=p1file)
   if vinx3:
       print(vinx3, file=p1file)  # name of PHASE 3 release velocity in x direction map
   else:
       print("None", file=p1file)
   if viny1:
       print(viny1, file=p1file)  # name of MIXTURE or PHASE 1 release velocity in y direction map
   else:
       print("None", file=p1file)
   if viny2:
       print(viny2, file=p1file)  # name of PHASE 2 release velocity in y direction map
   else:
       print("None", file=p1file)
   if viny3:
       print(viny3, file=p1file)  # name of PHASE 3 release velocity in y direction map
   else:
       print("None", file=p1file)               
   if hentrmax == 1:
       print(hentrmax, file=p1file)  # name of maximum height of MIXTURE entrainment map
   elif hentrmax1:
       print(hentrmax1, file=p1file)  # name of maximum height of PHASE 1 entrainment map
   else:
       print("None", file=p1file)
   if hentrmax2:
       print(hentrmax2, file=p1file) # name of maximum height of PHASE 2 entrainment map
   else:
       print("None", file=p1file)
   if hentrmax3:
       print(hentrmax3, file=p1file)  # name of maximum height of PHASE 3 entrainment map
   else:
       print("None", file=p1file)
   if rhentrmax1:
       print(rhentrmax1, file=p1file)  # fraction of PHASE 1 maximum height of entrainment
   else:
       print("1.00", file=p1file)
   if vhentrmax:
       print(vhemx, file=p1file)  # variation of maximum height of entrainment
   else:
       print("1.00", file=p1file)
   if zones:
       print(zones, file=p1file)  # name of zones map
   else:
       print("None", file=p1file)                    
   if centr:
       print(centr, file=p1file)  # name of entrainment coefficient map
   else:
       print("None", file=p1file)                    
   if cvshear:
       print(cvshear, file=p1file)  # name of shear velocity coefficient map
   else:
       print("None", file=p1file)                    
   if phi1:
       print(phi1, file=p1file)  # name of internal friction angle of MIXTURE or PHASE 1 map
   else:
       print("None", file=p1file)                    
   if phi2:
       print(phi2, file=p1file)  # name of internal friction angle of PHASE 2 map
   else:
       print("None", file=p1file)                    
   if phi3:
       print(phi3, file=p1file)  # name of internal friction angle of PHASE 3 map
   else:
       print("None", file=p1file)                    
   if deltab:
       print(deltab, file=p1file)  # name of basal friction difference map
   else:
       print("None", file=p1file)                    
   if tufri:
       print(tufri, file=p1file)  # name of turbulent friction coefficient map
   else:
       print("None", file=p1file)
   if delta1:
       print(delta1, file=p1file)  # name of basal friction angle of MIXTURE or PHASE 1 map
   else:
       print("None", file=p1file)
   if delta2:
       print(delta2, file=p1file)  # name of basal friction angle of PHASE 2 map
   else:
       print("None", file=p1file)                    
   if delta3:
       print(delta3, file=p1file)  # name of basal friction angle of PHASE 3 map
   else:
       print("None", file=p1file)                    
   if ny1:
       print(ny1, file=p1file)  # name of viscosity of MIXTURE or PHASE 1 map
   else:
       print("None", file=p1file)                    
   if ny2:
       print(ny2, file=p1file)  # name of viscosity of PHASE 2 map
   else:
       print("None", file=p1file)                    
   if ny3:
       print(ny3, file=p1file)  # name of viscosity of PHASE 3 map
   else:
       print("None", file=p1file)                    
   if ambdrag:
       print(ambdrag, file=p1file)  # name of ambient drag coefficient map
   else:
       print("None", file=p1file)                    
   if flufri:
       print(flufri, file=p1file)  # name of fluid friction coefficient map
   else:
       print("None", file=p1file)                    
   if ctrans12:
       print(ctrans12, file=p1file)  # name of PHASE 1-PHASE 2 transformation coefficient map
   else:
       print("None", file=p1file)                    
   if ctrans13:
       print(ctrans13, file=p1file)  # name of PHASE 1-PHASE 3 transformation coefficient map
   else:
       print("None", file=p1file)                    
   if ctrans23:
       print(ctrans23, file=p1file)  # name of PHASE 2-PHASE 3 transformation coefficient map
   else:
       print("None", file=p1file)                    
   if trelease:
       print(trelease, file=p1file)  # name of release time map
   else:
       print("None", file=p1file)                    
   if trelstop:
       print(trelstop, file=p1file)  # name of release hydrograph stop time map
   else:
       print("None", file=p1file)                    
   if stoptime:
       print(stoptime, file=p1file)  # name of stopping time map
   else:
       print("None", file=p1file)                    
   if tslide:
       print(tslide, file=p1file)  # name of time of initial sliding map
   else:
       print("None", file=p1file)                    
   if impactarea:
       print(impactarea, file=p1file)  # name of observed impact area map
   else:
       print("None", file=p1file)                    
   if hdeposit:
       print(hdeposit, file=p1file)  # name of height of observed deposit map
   else:
       print("None", file=p1file)
   if orthophoto:
   
       try: grass.parse_command("g.rename", rast=(ortho_c4, ortho_c1))
       except: test=0
       try: grass.parse_command("g.rename", rast=(ortho_c5, ortho_c2))
       except: test=0
       try: grass.parse_command("g.rename", rast=(ortho_c6, ortho_c3))
       except: test=0
       
       grass.run_command("r.out.gdal", input=ortho_c1, output=ascpath + ortho_c1 + ".asc", format="AAIGrid", overwrite=True)
       corrasc(ascpath + ortho_c1)     

       grass.run_command("r.out.gdal", input=ortho_c2, output=ascpath + ortho_c2 + ".asc", format="AAIGrid", overwrite=True)
       corrasc(ascpath + ortho_c2)

       grass.run_command("r.out.gdal", input=ortho_c3, output=ascpath + ortho_c3 + ".asc", format="AAIGrid", overwrite=True)
       corrasc(ascpath + ortho_c3)
   
       print(ortho_c1, file=p1file)  # name of orthophoto channel 1 map
       print(ortho_c2, file=p1file)  # name of orthophoto channel 2 map
       print(ortho_c3, file=p1file)  # name of orthophoto channel 3 map
             
   else:
       print("None", file=p1file)
       print("None", file=p1file)
       print("None", file=p1file)

   if hydrocoords:
       print(hydrocoords, file=p1file)  # hydrograph profile parameters
   else:
       print("None", file=p1file)
       
   if hydrograph:
       print(hydrograph, file=p1file)  #path to hydrograph file
   else:
       print("None", file=p1file)

   if adaptograph:
       print(adaptograph, file=p1file)  # path to adaptograph file
   else:
       print("None", file=p1file)

   if frictiograph:
       print(frictiograph, file=p1file)  # path to frictiograph file
   else:
       print("None", file=p1file)

   if transformograph:
       print(transformograph, file=p1file)  # path to transformograph file
   else:
       print("None", file=p1file)

   print(lmax, file=p1file)  # number of flow parameters
   for l in range(0, lmax):
       print(round(gt[l], 10), file=p1file)  # flow parameters

   print(thresholdsc, file=p1file)  # threshold of flow height (for computation)
   print(thresholds[0], file=p1file)  # threshold of flow height (for display)
   print(thresholds[1], file=p1file)  # threshold of flow kinetic energy
   print(thresholds[2], file=p1file)  # threshold of flow pressure
   print(tint, file=p1file)  # time for writing output
   print(tstop, file=p1file)  # process duration at which to stop
   print(slomo, file=p1file)  # factor for slow motion

   print(slidepar[0], file=p1file)  # search radius for initial sliding
   print(slidepar[1], file=p1file)  # exponent for weighting for initial sliding
   print(slidepar[2], file=p1file)  # coefficient for deformation

   print(cfl[0], file=p1file)  # cfl criterion
   print(cfl[1], file=p1file)  # maximum length of time step

   if profile:
       print(str(profile), file=p1file)  # profile vertices (x and y coordinates)
   else:
       print("None", file=p1file)

   if ctrlpoints:
       print(str(ctrlpoints), file=p1file) # control points (x and y coordinates)
   else:
       print("None", file=p1file)

   for i in range(0, len(visualization)):
       print(visualization[i], file=p1file) #visualization parameter

   p1file.close()  # closing parameter file

def main():  # starting main function

    # Setting flags and parameters

    aflag = flags["a"]
    eflag = flags["e"]
    kflag = flags["k"]
    mflag = flags["m"]
    tflag = flags["t"]
    vflag = flags["v"]
    pf = options["prefix"]
    cores = options["cores"]
    cellsize = options["cellsize"]
    phases = options["phases"]
    gravity = options["gravity"]
    limiter = options["limiter"]
    layers = options["layers"]
    controls = options["controls"]
    aoicoords = options["aoicoords"]
    elevation = options["elevation"]
    hrelease = options["hrelease"]
    rhrelease1 = options["rhrelease1"]
    vhrelease = options["vhrelease"]
    hrelease1 = options["hrelease1"]
    hrelease2 = options["hrelease2"]
    hrelease3 = options["hrelease3"]
    trelease = options["trelease"]
    trelstop = options["trelstop"]
    tslide = options["tslide"]
    stoptime = options["tstop"]
    vinx = options["vinx"]
    viny = options["viny"]
    vinx1 = options["vinx1"]
    viny1 = options["viny1"]
    vinx2 = options["vinx2"]
    viny2 = options["viny2"]
    vinx3 = options["vinx3"]
    viny3 = options["viny3"]
    hentrmax = options["hentrmax"]
    rhentrmax1 = options["rhentrmax1"]
    vhentrmax = options["vhentrmax"]
    hentrmax1 = options["hentrmax1"]
    hentrmax2 = options["hentrmax2"]
    hentrmax3 = options["hentrmax3"]
    phi1 = options["phi1"]
    phi2 = options["phi2"]
    phi3 = options["phi3"]
    delta1 = options["delta1"]
    delta2 = options["delta2"]
    delta3 = options["delta3"]
    tufri = options["tufri"]
    ny1 = options["ny1"]
    ny2 = options["ny2"]
    ny3 = options["ny3"]
    ambdrag = options["ambdrag"]
    flufri = options["flufri"]
    centr = options["centr"]
    cvshear = options["cvshear"]
    deltab = options["deltab"]
    ctrans12 = options["ctrans12"]
    ctrans13 = options["ctrans13"]
    ctrans23 = options["ctrans23"]
    zones = options["zones"]
    impactarea = options["impactarea"]
    hdeposit = options["hdeposit"]
    hydrograph = options["hydrograph"]
    hydrocoords = options["hydrocoords"]
    density = options["density"]
    friction = options["friction"]
    viscosity = options["viscosity"]
    basal = options["basal"]
    transformation = options["transformation"]
    special = options["special"]
    dynfric = options["dynfric"]
    adaptograph = options["adaptograph"]
    frictiograph = options["frictiograph"]
    transformograph = options["transformograph"]
    sampling = options["sampling"]
    slidepar = options["slidepar"]
    cfl = options["cfl"]
    times = options["time"]
    slomo = options["slomo"]
    thresholds = options["thresholds"]
    profile = options["profile"]
    ctrlpoints = options["ctrlpoints"]
    reftime = options["reftime"]
    phexagg = options["phexagg"]
    orthophoto = options["orthophoto"]
    visualization = options["visualization"]

    # Prefix
    if not pf:
        pf = "avf"

    print()
    print()
    print(
        "#############################################################################"
    )
    print("#")
    print("# MODULE:       r.avaflow 3")
    print("#")
    print("# AUTHORS:      Martin Mergili and Shiva P. Pudasaini")
    print("# CONTRIBUTORS: Massimiliano Alvioli, Matthias Benedikt, Emmanuel Delage,")
    print("#               Wolfgang Fellin, Jan-Thomas Fischer, Sigridur S. Gylfadottir,")
    print("#               Andreas Huber, Ivan Marchesini, Markus Metz, Markus Neteler,")
    print("#               Alexander Ostermann, Matthias Rauter")
    print("#")
    print("# PURPOSE:      The mass flow simulation tool")
    print("# VERSION:      20230127 (27 January 2023)")
    print("#")
    print("# COPYRIGHT:    (c) 2013 - 2023 by the authors")
    print("#               (c) 2020 - 2023 by the University of Graz")
    print("#               (c) 2013 - 2021 by the BOKU University, Vienna")
    print("#               (c) 2015 - 2020 by the University of Vienna")
    print("#               (c) 2014 - 2023 by the University of Bonn")
    print("#               (c) 2000 - 2023 by the GRASS Development Team")
    print("#               (c) 1993 - 2023 by the R Development Core Team")
    print("#")
    print("#               This program is free software under the GNU General Public")
    print("#               License (>=v2). Read the file COPYING that comes with GRASS")
    print("#               for details.")
    print("#")
    print("# PREFIX:       %s" % pf)
    print("#")
    print(
        "#############################################################################"
    )
    print()
    print()

    # Making sure that all parameters are correctly defined

    # Flags
    if not eflag and not vflag:

        eflag = "1"
        vflag = "1"

    if mflag:
        aflag = "1"

    # Profile
    if profile:
        if not phexagg:
            phexagg = "1"
        try:
            phexagg = float(phexagg)
        except ValueError:
            ErrorMessage("profile exaggeration value")
        phexagg = str(phexagg)

    if eflag:  # for model execution mode:

        # Raster maps
        for inrast in [ elevation, hrelease, hrelease1, hrelease2, hrelease3, hentrmax, hentrmax1, hentrmax2, hentrmax3, vinx, viny, vinx1, viny1, vinx2, viny2, vinx3, viny3, phi1, phi2, phi3,
            deltab, tufri, delta1, delta2, delta3, ny1, ny2, ny3, ambdrag, flufri, centr, cvshear, ctrans12, ctrans13, ctrans23, zones, trelease, trelstop, tslide, stoptime, 
            impactarea, hdeposit]:  # !!!CHECK not yet working

            if inrast and (not grasscore.find_file(inrast, element="cell", mapset=".") 
                and not grasscore.find_file(inrast, element="fcell", mapset=".") and not grasscore.find_file(inrast, element="dcell", mapset=".")):
                ErrorMessage("GRASS raster maps")

        # Mesh spacing
        nmesh = "1"

        # Number and types of phases
        if not phases:
            phases = "m"
        if phases == "m":
            phases = "s,fs,f"
        phases = list(map(str, phases.split(",")))

        if len(phases) > 3:
            ErrorMessage("number of phases")
        else:
            if len(phases) == 1:
                model = 1
            elif len(phases) == 2:
                ErrorMessage("number of phases. Please use the multi-phase model (three phases) and provide no release data for the phase which is not needed.")
            elif len(phases) == 3:
                model = 7
            phasesnum = []

        for i in range(0, len(phases)):
            if not (len(phases) == 1 and phases[i] == "x") and not phases[i] == "s" and not phases[i] == "fs" and not phases[i] == "f":
                ErrorMessage("types of phases")
            elif phases[i] == "x":
                phasesnum.append(1)
                model = 0
            elif phases[i] == "s":
                phasesnum.append(1)
            elif phases[i] == "fs":
                phasesnum.append(2)
            elif phases[i] == "f":
                phasesnum.append(3)

        if model <= 3:
            phasesnum.append(0)
            phasesnum.append(0)

        if not gravity:
            gravity = "9.81"

        # Gravity
        if not limiter:
            limiter = "1"
        elif not limiter == "1" and not limiter == "2" and not limiter == "3" and not limiter == "4":
            ErrorMessage("numerical limiter")

        # Numerical limiter
        if not layers:
            layers = "0"
        elif not layers == "0" and not layers == "1" and not layers == "2":
            ErrorMessage("layer mode")

        # Elevation
        if not elevation:
            ErrorMessage("elevation raster map")

        # Release
        if model <= 3 and not hydrograph and not hrelease:
            ErrorMessage("definition of flow release")
        elif model == 7 and not hydrograph and not hrelease1 and not hrelease2 and not hrelease3 and not (hrelease and rhrelease1):
            ErrorMessage("definition of flow release")

        # Entrainable height
        if model == 7 and (hentrmax and not rhentrmax1):
            ErrorMessage("definition of entrainable height")

        # Hydrographs
        if hydrograph and not hydrocoords:
            ErrorMessage("input hydrograph coordinates")

        # Controls
        if not controls:
            controls = "0,0,1,0,0,0,0,0,0,2,0"
        controls = list(map(str, controls.split(",")))
        if not len(controls) == 11:
            ErrorMessage("number of controls")

        for econtrols in controls:
            try:
                econtrols = int(econtrols)
            except ValueError:
                ErrorMessage("control parameter values")

        # Thresholds
        if not thresholds:
            thresholds = "0.1,10000,10000,0.000001"
        thresholds = list(map(str, thresholds.split(",")))
        if not len(thresholds) == 4:
            ErrorMessage("number of thresholds")
        thresholdsc = thresholds[3]

        for ethresholds in thresholds:
            try:
                ethresholds = float(ethresholds)
            except ValueError:
                ErrorMessage("threshold parameter values")

        # Parameter sampling
        if mflag:
            if not sampling:
                sampling = "100"
            try:
                sampling = int(sampling)
            except ValueError:
                ErrorMessage("value provided for sampling")
            sampling=str(sampling)

        # Parameters for initial sliding
        if not slidepar:
            slidepar = "0,0,0"
        slidepar = list(map(str, slidepar.split(",")))
        if not len(slidepar) == 3:
            ErrorMessage("number of parameters for initial sliding")

        for eslidepar in slidepar:
            try:
                eslidepar = float(eslidepar)
            except ValueError:
                ErrorMessage("initial sliding parameter values")

        # Flow parameters
        if not mflag:

            if model == 0:

                if not density:
                    density = "2000"
                if not friction:
                    friction = "35,20,3.0"
                if not basal:
                    basal = "-7.0,0.0"
                if not special:
                    special = "0.05,0.0,1.0,4.0,1.0,100.0"
                if not dynfric:
                    dynfric = "0.0,-6.0"
                lmax = 14

            elif model == 1:

                if not density:
                    density = "2700"
                if not friction:
                    friction = "35,20,0.05"
                if not viscosity:
                    viscosity = "-9999,-9999"
                if not basal:
                    basal = "-7.0,0.0"
                if not special:
                    special = "0.05,0.0,0.0,1,10,1,1.0,4.0,1.0,100.0"
                if not dynfric:
                    dynfric = "0.0,-6.0"
                lmax = 20

            elif model == 7:

                if not density:
                    density = "2700,1800,1000"
                if not friction:
                    friction = "35,20,0,0,0,0,0.05"
                if not viscosity:
                    viscosity = "-9999,-9999,-3.0,-9999,-3.0,0.0"
                if not basal:
                    basal = "-7.0,0.0"
                if not transformation:
                    transformation = "0.0,0.0,0.0"
                if not special:
                    special = "0.05,0.0,0.333,0.0,10,0.12,1,1,1,3,1,0.1,1,1,1,1,1,0,0,0,1,1,1,10,0,1,1,1,0.0,1.0,4.0,1.0,100.0"
                if not dynfric:
                    dynfric = "0.0,-6.0,0.0"
                lmax = 57

        elif int(sampling) > 0:

            if model == 0:

                if not density:
                    density = "2000,2000"
                if not friction:
                    friction = "35,35,20,20,3.0,3.0"
                if not basal:
                    basal = "-7.0,-7.0,0.0,0.0"
                if not special:
                    special = "0.05,0.05,0.0,0.0,1.0,1.0,4.0,4.0,1.0,1.0,100.0,100.0"
                if not dynfric:
                    dynfric = "0.0,0.0,-6.0,-6.0"
                lmax = 14

            elif model == 1:

                if not density:
                    density = "2700,2700"
                if not friction:
                    friction = "35,35,20,20,0.05,0.05"
                if not viscosity:
                    viscosity = "-9999,-9999,-9999,-9999"
                if not basal:
                    basal = "-7.0,-7.0,0.0,0.0"
                if not special:
                    special = "0.05,0.05,0.0,0.0,0.0,0.0,1,1,10,10,1,1,1.0,1.0,4.0,4.0,1.0,1.0,100.0,100.0"
                if not dynfric:
                    dynfric = "0.0,0.0,-6.0,-6.0"
                lmax = 20

            elif model == 7:

                if not density:
                    density = "2700,2700,1800,1800,1000,1000"
                if not friction:
                    friction = "35,35,20,20,0,0,0,0,0,0,0,0,0.05,0.05"
                if not viscosity:
                    viscosity = "-9999,-9999,-9999,-9999,-3.0,-3.0,-9999,-9999,-3.0,-3.0,0.0,0.0"
                if not basal:
                    basal = "-7.0,-7.0,0.0,0.0"
                if not transformation:
                    transformation = "0.0,0.0,0.0,0.0,0.0,0.0"
                if not special:
                    special = "0.05,0.05,0.0,0.0,0.333,0.333,0.0,0.0,10,10,0.12,0.12,1,1,1,1,1,1,3,3,1,1,0.1,0.1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1,1,10,10,0,0,1,1,1,1,1,1,0.0,0.0,1.0,1.0,4.0,4.0,1.0,1.0,100.0,100.0"
                if not dynfric:
                    dynfric = "0.0,0.0,-6.0,-6.0,0.0,0.0"
                lmax = 57
        else:

            if model == 0:

                if not density:
                    density = "2000,2000,0"
                if not friction:
                    friction = "35,35,0,20,20,0,3.0,3.0,0"
                if not basal:
                    basal = "-7.0,-7.0,0,0.0,0.0,0"
                if not special:
                    special = "0.05,0.05,0,0.0,0.0,0,1.0,1.0,0,4.0,4.0,0,1.0,1.0,0,100.0,100.0,0"
                if not dynfric:
                    dynfric = "0.0,0.0,0,-6.0,-6.0,0"
                lmax = 14

            elif model == 1:

                if not density:
                    density = "2700,2700,0"
                if not friction:
                    friction = "35,35,0,20,20,0,0.05,0.05,0"
                if not viscosity:
                    viscosity = "-9999,-9999,0,-9999,-9999,0"
                if not basal:
                    basal = "-7.0,-7.0,0,0.0,0.0,0"
                if not special:
                    special = "0.05,0.05,0,0.0,0.0,0,0.0,0.0,0,1,1,0,10,10,0,1,1,0,1.0,1.0,0,4.0,4.0,0,1.0,1.0,0,100.0,100.0,0"
                if not dynfric:
                    dynfric = "0.0,0.0,0,-6.0,-6.0,0"
                lmax = 20

            elif model == 7:

                if not density:
                    density = "2700,2700,0,1800,1800,0,1000,1000,0"
                if not friction:
                    friction = "35,35,0,20,20,0,0,0,0,0,0,0,0,0,0,0,0,0,0.05,0.05,0"
                if not viscosity:
                    viscosity = "-9999,-9999,0,-9999,-9999,0,-3.0,-3.0,0,-9999,-9999,0,-3.0,-3.0,0,0.0,0.0,0"
                if not basal:
                    basal = "-7.0,-7.0,0,0.0,0.0,0"
                if not transformation:
                    transformation = "0.0,0.0,0,0.0,0.0,0,0.0,0.0,0"
                if not special:
                    special = "0.05,0.05,0,0.0,0.0,0,0.333,0.333,0,0.0,0.0,0,10,10,0,0.12,0.12,0,1,1,0,1,1,0,1,1,0,3,3,0,1,1,0,0.1,0.1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,1,1,0,1,1,0,10,10,0,0,0,0,1,1,0,1,1,0,1,1,0,0.0,0.0,0,1.0,1.0,0,4.0,4.0,0,1.0,1.0,0,100.0,100.0,0"
                if not dynfric:
                    dynfric = "0.0,0.0,0,-6.0,-6.0,0,0.0,0.0,0"
                lmax = 57

        if model == 0:
            flowparam = density + "," + friction + "," + basal + "," + special + "," + dynfric
        elif model == 1:
            flowparam = density + "," + friction + "," + viscosity + "," + basal + "," + special + "," + dynfric
        else:
            flowparam = density + "," + friction + "," + viscosity + "," + basal + "," + transformation + "," + special + "," + dynfric

        flowparam = list(map(str, flowparam.split(",")))

        if not mflag and not len(flowparam) == lmax:
            ErrorMessage("number of flow parameters")
        elif mflag and int(sampling) > 0 and not len(flowparam) == 2 * lmax:
            ErrorMessage("number of flow parameters")
        elif mflag and int(sampling) <= 0 and not len(flowparam) == 3 * lmax:
            ErrorMessage("number of flow parameters")

        for eflowparam in flowparam:
            try:
                eflowparam = float(eflowparam)
            except ValueError:
                ErrorMessage("parameter values")

        # CFL criterion and initial time step length
        if not cfl:
            cfl = "0.40,0.001"
        cfl = list(map(str, cfl.split(",")))
        if not len(cfl) == 2:
            ErrorMessage("number of cfl parameters")

        for ecfl in cfl:
            try:
                ecfl = float(ecfl)
            except ValueError:
                ErrorMessage("cfl values")

        # Time interval and stop time
        if not times:
            times = "10,300"
        times = list(map(str, times.split(",")))
        tint = times[0]
        tstop = times[1]

        if mflag:
            tint = tstop

        for etimes in times:
            try:
                etimes = float(etimes)
            except ValueError:
                ErrorMessage("times")

        if reftime:  # if reference times of reach are defined:

            reftime = list(map(str, reftime.split(",")))  # splitting list of reference times of reach
            
            ctrlpts = list(map(str, ctrlpoints.split(",")))
            if not len(reftime) == len(ctrlpts)/2:
                ErrorMessage("number of reference times of reach")

        # Factor for slow motion
        if not slomo:
            slomo = "1"

        elif slomo == "min":
            slomo = "60"

        elif slomo == "h":
            slomo = "3600"
            
        elif slomo == "d":
            slomo = "86400"
            
        elif slomo == "w":
            slomo = "604800"

        elif slomo == "mon":
            slomo = "2592000"

        elif slomo == "yr":
            slomo = "31536000"

        elif slomo == "g":
            slomo = "-31536000"

        # Number of cores
        if mflag:
            if not cores:
                cores = "8"
            try:
                cores = int(cores)
            except ValueError:
                ErrorMessage("number of cores")
            cores=str(cores)

        #Visualization parameters
        if not visualization:
            visualization = "0.1,5.0,5.0,1,100,2,-11000,9000,100,0.60,0.25,0.15,0.2,1.0,None,None,None"
        visualization = list(map(str, visualization.split(",")))
        if not len(visualization) == 17:
            ErrorMessage("number of visualization parameters")

    # Preparing environment

    print("1. PREPARING ENVIRONMENT.")

    os.system("rm -rf " + temppath)  # if necessary, deleting temporary directory
    os.system("mkdir " + temppath)  # creating temporary directory

    os.environ["GRASS_VERBOSE"] = "-1"
    grass.run_command("g.gisenv", set="GRASS_VERBOSE=-1")  # suppressing errors and warnings (overruled for some functions)

    ortho_c1 = pf + "_ortho.red"
    ortho_c2 = pf + "_ortho.green"
    ortho_c3 = pf + "_ortho.blue"
    ortho_c4 = pf + "_ortho.1"
    ortho_c5 = pf + "_ortho.2"
    ortho_c6 = pf + "_ortho.3"
    if orthophoto: grass.run_command("r.in.gdal", flags="o", overwrite=True, input=orthophoto, output=pf + "_ortho") #orthophoto

    ascpath = pf + "_results/" + pf + "_ascii/"  # path to directory with ascii rasters
    filepath = pf + "_results/" + pf + "_files/"  # path to directory with result text files

    if eflag:  # for model execution mode:

        if os.path.exists(pf + "_results"):
            os.system("rm -rf " + pf + "_results")  # if result directory already exists, deleting it
        os.mkdir(pf + "_results")  # creating directory for results
        os.mkdir(pf + "_results/" + pf + "_files")  # creating directory for result files
        os.mkdir(pf + "_results/" + pf + "_plots")  # creating directory for result plots
        if mflag: 
            os.mkdir(pf + "_results/" + pf + "_aimec")  # creating directory for import to aimec
            os.mkdir(pf + "_results/" + pf + "_aimec/depth")  # creating directory for depth rasters for aimec
            os.mkdir(pf + "_results/" + pf + "_aimec/pressure")  # creating directory for pressure rasters for aimec
        os.mkdir(pf + "_results/" + pf + "_vr")  # creating directory for virtual reality input
        os.mkdir(pf + "_results/" + pf + "_vr/data")  # creating directory for csv files for virtual reality input
        if not mflag:
            os.mkdir(pf + "_results/" + pf + "_plots/" + pf + "_maps_timesteps")  # creating directory for result maps of all time steps
        if not mflag:
            os.mkdir(pf + "_results/" + pf + "_plots/" + pf + "_profiles_timesteps")  # creating directory for result profiles of all time steps
        os.mkdir(ascpath)  # creating directory for result ascii rasters

        # Defining GRASS region

        grass.run_command("g.region", flags="d")  # setting default region
        if cellsize:
            grass.run_command("g.region", flags="a", res=cellsize)  # updating cell size
        if aoicoords:  # updating extent:
            aoicoords = list(map(str, aoicoords.split(",")))
            if not len(aoicoords) == 4:
                ErrorMessage("number of coordinates of the area of interest")
            grass.run_command("g.region", flags="a", n=aoicoords[0], s=aoicoords[1], w=aoicoords[2], e=aoicoords[3])

        grass.mapcalc('"_aoi"=pow("%s",0)' % elevation, overwrite=True, quiet=True)
        cellsize = grass.raster_info("_aoi")["nsres"]  # reading cell size
        rnorth = grass.raster_info("_aoi")["north"]  # reading boundaries of aoi map
        rsouth = grass.raster_info("_aoi")["south"]
        rwest = grass.raster_info("_aoi")["west"]
        reast = grass.raster_info("_aoi")["east"]

        grass.run_command("g.region", flags="d")  # setting default region
        grass.run_command("g.region", flags="a", n=rnorth, s=rsouth, w=rwest, e=reast)  # updating bounds
        grass.run_command("g.region", flags="a", res=cellsize)  # updating cell size

        if not mflag:  # for single model run:

            jid = 0
            vhrl = "1.00"
            vhem = "1.00"
            gt = [float(flowparam[0])]
            for l in range(1, lmax):
                gt.append(float(flowparam[l]))

            writeparam(jid, aflag, eflag, kflag, mflag, tflag, vflag, pf, cores, cellsize, phases, gravity, limiter, layers, controls, aoicoords, 
                elevation, hrelease, rhrelease1, vhrelease, vhrl, hrelease1, hrelease2, hrelease3, trelease, trelstop, tslide, stoptime, vinx, viny, vinx1, viny1, vinx2, viny2, vinx3, viny3, 
                hentrmax, rhentrmax1, vhentrmax, vhem, hentrmax1, hentrmax2, hentrmax3, phi1, phi2, phi3, delta1, delta2, delta3, tufri, ny1, ny2, ny3, ambdrag, flufri, centr, cvshear, deltab, 
                ctrans12, ctrans13, ctrans23, zones, impactarea, hdeposit, hydrograph, hydrocoords, density, friction, viscosity, basal, transformation, special, dynfric, 
                adaptograph, frictiograph, transformograph, sampling, slidepar, cfl, times, slomo, thresholds, profile, ctrlpoints, reftime, phexagg, orthophoto, 
                lmax, nmesh, model, phasesnum, thresholdsc, tint, tstop, gt, ortho_c1, ortho_c2, ortho_c3, ortho_c4, ortho_c5, ortho_c6, visualization, ascpath)  
                # writing model parameters to file

            print("2. ROUTING FLOW.")  # routing flow

            start = time.time()  # storing time (start of main computation)

            os.environ["XINT"] = "1"  # exporting id of model run
            grass.run_command("r.avaflow.main")  # executing r.avaflow

            stop = time.time()  # storing time (end of main computation)
            comptime = stop - start  # storing computational time in seconds

            timefile = open(filepath + pf + "_time.txt", "w")
            timefile.write(str(comptime))  # writing computational time to file
            timefile.close()

        else:  # for multiple model runs:

            if int(sampling) > 0:
                nruns = int(sampling)  # number of model runs
            elif int(sampling) < 0:
                nruns = int(sampling) * -1
            ncores = int(cores)  # number of processors to be used

            # Preparing variation of input raster maps

            if model == 7 and hrelease:
                rhrls = list(
                    map(str, rhrelease1.split(","))
                )  # splitting string with ratio(s) of PHASE 1 release height
                rhrlsmin = rhrls[0]  # minimum
                if len(rhrls) == 3:  # maximum and third parameter
                    rhrlsmax = rhrls[1]
                    rhrls3 = rhrls[2]
                elif len(rhrls) == 2:
                    rhrlsmax = rhrls[1]
                elif len(rhrls) == 1:
                    rhrlsmax = rhrls[0]
                else:
                    ErrorMessage()  # else, exiting with error message

            if (hrelease or hrelease1 or hrelease2 or hrelease3) and vhrelease:
                vhrl = list(
                    map(str, vhrelease.split(","))
                )  # splitting string with variation of release height
                vhrlmin = vhrl[0]  # minimum
                if len(vhrl) == 3:  # maximum and third parameter
                    vhrlmax = vhrl[1]
                    vhrl3 = vhrl[2]
                elif len(vhrl) == 2:
                    vhrlmax = vhrl[1]
                elif len(vhrl) == 1:
                    vhrlmax = vhrl[0]
                else:
                    ErrorMessage()  # else, exiting with error message
            else:
                vhrlmin = "1"
                vhrlmax = "1"
                vhrl3 = "1"

            if model == 7 and hentrmax:
                rhems = list(
                    map(str, rhentrmax1.split(","))
                )  # splitting string with ratio(s) of maximum height of entrainment
                rhemsmin = rhems[0]  # minimum
                if len(rhems) == 3:  # maximum and third parameter
                    rhemsmax = rhems[1]
                    rhems3 = rhems[2]
                elif len(rhems) == 2:
                    rhemsmax = rhems[1]
                elif len(rhems) == 1:
                    rhemsmax = rhems[0]
                else:
                    ErrorMessage()  # else, exiting with error message

            if (hentrmax or hentrmax1 or hentrmax2 or hentrmax3) and vhentrmax:
                vhem = list(map(str, vhentrmax.split(",")))  # splitting string with variation of maximum height of entrainment
                vhemmin = vhem[0]  # minimum
                if len(vhem) == 2:  # maximum and third parameter
                    vhemmax = vhem[1]
                    vhem3 = vhem[2]
                elif len(vhem) == 2:
                    vhemmax = vhem[1]
                elif len(vhem) == 1:
                    vhemmax = vhem[0]
                else:
                    ErrorMessage()  # else, exiting with error message
            else:
                vhemmin = "1"
                vhemmax = "1"
                vhem3 = "1"

            if sampling == "0":  # if controlled sampling is applied:

                njids = 2
                nruns0 = []
                nruns = 1

                if float(vhrlmin) == float(vhrlmax):
                    nruns0.append(1)
                else:
                    nruns0.append(int(vhrl3))
                nruns *= nruns0[0]

                if float(vhemmin) == float(vhemmax):
                    nruns0.append(1)
                else:
                    nruns0.append(int(vhem3))
                nruns *= nruns0[1]

                if model == 7 and hrelease and rhrelease1:

                    njids += 1
                    if float(rhrlsmin) == float(rhrlsmax):
                        nruns0.append(1)
                    else:
                        nruns0.append(int(rhrls3))
                    nruns *= nruns0[2]

                if model == 7 and hentrmax and rhentrmax1:

                    njids += 1
                    if float(rhemsmin) == float(rhemsmax):
                        nruns0.append(1)
                    else:
                        nruns0.append(int(rhems3))
                    nruns *= nruns0[njids - 1]

                for l in range(0, lmax):

                    if float(flowparam[3 * l]) == float(flowparam[3 * l + 1]):
                        nruns0.append(1)
                    else:
                        nruns0.append(int(flowparam[3 * l + 2]))
                    nruns *= nruns0[l + njids]

                jids = [0]
                for l in range(1, lmax + njids):
                    jids.append(0)

            elif int(sampling) < 0:  # if OAT sampling is applied:

                nruns00 = nruns
                nruns = 0
                nvar = []
                njids = 2

                if not float(vhrlmin) == float(vhrlmax):
                    nvar.append(1)
                    nruns += nruns00
                else:
                    nvar.append(0)

                if not float(vhemmin) == float(vhemmax):
                    nvar.append(1)
                    nruns += nruns00
                else:
                    nvar.append(0)

                if model == 7 and hrelease and rhrelease1:

                    njids += 1
                    if not float(rhrlsmin) == float(rhrlsmax):
                        nvar.append(1)
                        nruns += nruns00
                    else:
                        nvar.append(0)

                if model == 7 and hentrmax and rhentrmax1:

                    njids += 1
                    if not float(rhemsmin) == float(rhemsmax):
                        nvar.append(1)
                        nruns += nruns00
                    else:
                        nvar.append(0)

                for l in range(0, lmax):
                    if not float(flowparam[3 * l]) == float(flowparam[3 * l + 1]):
                        nvar.append(1)
                        nruns += nruns00
                    else:
                        nvar.append(0)

                lnrun = 0
                ltest = 0

            for jid in range(1, nruns + 1):  # loop over predefined number of randomized parameter combinations:

                if jid < 10:
                    jfill = "00000" + str(jid)  # formatting model run string
                elif jid < 100:
                    jfill = "0000" + str(jid)
                elif jid < 1000:
                    jfill = "000" + str(jid)
                elif jid < 10000:
                    jfill = "00" + str(jid)
                elif jid < 100000:
                    jfill = "0" + str(jid)
                else:
                    jfill = str(jid)

                if sampling == "0":  # if controlled sampling is applied:

                    jidctrl = 0
                    for l in range(0, lmax + njids):

                        ll = l
                        if ll == 0 or jids[l] == 0 or jidctrl == 1:
                            jids[l] += 1
                        if jids[l] > nruns0[l]:
                            jids[l] = 1
                            jidctrl = 1
                        else:
                            jidctrl = 0

                # Varying input raster maps

                ipar = []
                if sampling == "0":  # for controlled sampling:

                    if float(vhrlmin) == float(vhrlmax):
                        vhrl = float(vhrlmin)
                    else:
                        vhrl = float(vhrlmin) + float(jids[0] - 1) / float(nruns0[0] - 1) * (float(vhrlmax) - float(vhrlmin))
                        ipar.append(1)

                elif int(sampling) > 0:  # for random sampling:

                    vhrl = round(random.uniform(float(vhrlmin), float(vhrlmax)), 2)  # variation of release height

                else:  # if OAT sampling is applied:

                    if ltest < lmax + njids:
                        while nvar[ltest] == 0 and ltest < lmax + njids:
                            ltest += 1
                            lnrun = 0

                    if float(vhrlmin) == float(vhrlmax) or not ltest == 0:
                        vhrl = float(vhrl3)
                    else:
                        vhrl = float(vhrlmin) + float(lnrun) / float(nruns00 - 1) * (float(vhrlmax) - float(vhrlmin))

                vhrl = str(vhrl)

                if sampling == "0":  # for controlled sampling:

                    if float(vhemmin) == float(vhemmax):
                        vhem = float(vhemmin)
                    else:
                        vhem = float(vhemmin) + float(jids[1] - 1) / float(nruns0[1] - 1) * (float(vhemmax) - float(vhemmin))
                        if model <= 3:
                            ipar.append(2)
                        else:
                            ipar.append(3)

                elif int(sampling) > 0:  # for random sampling:

                    vhem = round(random.uniform(float(vhemmin), float(vhemmax)), 2)  # variation of maximum height of entrainment

                else:  # if OAT sampling is applied:

                    if float(vhemmin) == float(vhemmax) or not ltest == 1:
                        vhem = float(vhem3)
                    else:
                        vhem = float(vhemmin) + float(lnrun) / float(nruns00 - 1) * (float(vhemmax) - float(vhemmin))

                vhem = str(vhem)

                if ( model == 7 and hrelease and rhrelease1 ):  # if release heights are defined by total height and ratio of PHASE 1:

                    if sampling == "0":  # for controlled sampling:

                        if float(rhrlsmin) == float(rhrlsmax):
                            rhrls = float(rhrlsmin)
                        else:
                            rhrls = float(rhrlsmin) + float(jids[2] - 1) / float(nruns0[2] - 1) * (float(rhrlsmax) - float(rhrlsmin))
                            ipar.append(2)

                    elif int(sampling) > 0:  # for random sampling:

                        rhrls = random.uniform(float(rhrlsmin), float(rhrlsmax))  # randomizing ratio of PHASE 1 release height

                    else:  # if OAT sampling is applied:

                        if float(rhrlsmin) == float(rhrlsmax) or not ltest == 2:
                            rhrls = float(rhrls3)
                        else:
                            rhrls = float(rhrlsmin) + float(lnrun) / float(nruns00 - 1) * (float(rhrlsmax) - float(rhrlsmin))

                    rhrls = str(rhrls)  # constraining ratio and converting to string

                else:

                    rhrls = "-9999"

                if model == 7 and hentrmax and rhentrmax1:
                    # if maximum heights of entrainment are defined by total height and ratio of PHASE 1:

                    if sampling == "0":  # for controlled sampling:

                        if float(rhemsmin) == float(rhemsmax):
                            rhems = float(rhemsmin)
                        else:
                            rhems = float(rhemsmin) + float(jids[njids - 1] - 1) / float(nruns0[njids - 1] - 1) * (float(rhemsmax) - float(rhemsmin))
                            ipar.append(4)

                    elif int(sampling) > 0:  # for random sampling:

                        rhems = random.uniform(float(rhemsmin), float(rhemsmax))  # randomizing ratio of maximum PHASE 1 height of entrainment

                    else:  # for OAT sampling:

                        if float(rhemsmin) == float(rhemsmax) or not ltest == njids - 1:
                            rhems = float(rhems3)
                        else:
                            rhems = float(rhemsmin) + float(lnrun) / float(nruns00 - 1) * (float(rhemsmax) - float(rhemsmin))

                    rhems = str(rhems)  # constraining ratio and converting to string

                else:

                    rhems = "-9999"

                # Writing model parameters to file

                gt = []

                if sampling == "0":  # if controlled sampling is applied:

                    for l in range(0, lmax):
                        if float(flowparam[3 * l]) == float(flowparam[3 * l + 1]):
                            gt.append(float(flowparam[3 * l]))
                        else:
                            gt.append(float(flowparam[3 * l]) + float(jids[l + njids] - 1) / float(nruns0[l + njids] - 1)
                                * (float(flowparam[3 * l + 1]) - float(flowparam[3 * l])))
                            if model <= 3:
                                ipar.append(3 + l)
                            else:
                                ipar.append(5 + l)

                elif int(sampling) > 0:  # if random sampling is applied:

                    for l in range(0, lmax):
                        gt.append(random.uniform(float(flowparam[2 * l]), float(flowparam[2 * l + 1])))  # randomizing flow and basal surface parameters

                else:  # if OAT sampling is applied:

                    for l in range(0, lmax):
                        if (float(flowparam[3 * l]) == float(flowparam[3 * l + 1]) or not ltest == l + njids):
                            gt.append(float(flowparam[3 * l + 2]))
                        else:
                            gt.append(float(flowparam[3 * l])+ float(lnrun)/ float(nruns00 - 1)
                                * (float(flowparam[3 * l + 1]) - float(flowparam[3 * l])))

                    lnrun += 1
                    if lnrun == nruns00:
                        lnrun = 0
                        ltest += 1

                writeparam(jid, aflag, eflag, kflag, mflag, tflag, vflag, pf, cores, cellsize, phases, gravity, limiter, layers, controls, aoicoords, 
                    elevation, hrelease, rhrls, vhrelease, vhrl, hrelease1, hrelease2, hrelease3, trelease, trelstop, tslide, stoptime, vinx, viny, vinx1, viny1, vinx2, viny2, vinx3, viny3, 
                    hentrmax, rhems, vhentrmax, vhem, hentrmax1, hentrmax2, hentrmax3, phi1, phi2, phi3, delta1, delta2, delta3, tufri, ny1, ny2, ny3, ambdrag, flufri, centr, cvshear, deltab, 
                    ctrans12, ctrans13, ctrans23, zones, impactarea, hdeposit, hydrograph, hydrocoords, density, friction, viscosity, basal, transformation, special, dynfric, 
                    adaptograph, frictiograph, transformograph, sampling, slidepar, cfl, times, slomo, thresholds, profile, ctrlpoints, reftime, phexagg, orthophoto, 
                    lmax, nmesh, model, phasesnum, thresholdsc, tint, tstop, gt, ortho_c1, ortho_c2, ortho_c3, ortho_c4, ortho_c5, ortho_c6, visualization, ascpath)

                # Creating batch file

                os.mkdir(temppath + "/tmp%s" % jid)  # creating directory for batch file
                strtmp = temppath + "/tmp%s/batch" % jid  # file name for batch file
                out = open(strtmp + str(jid), "w")  # creating batch file
                os.system("rm -rf " + locpath + "/map%s" % jid)  # removing old mapset for model run
                grass.run_command("g.mapset", flags="c", mapset="map%s" % jid)  # creating new mapset for model run
                grass.run_command("g.mapsets", mapset=ambvars.MAPSET, operation="add")  # making original mapset active

                grass.run_command("g.mapset", mapset=ambvars.MAPSET)  # switching back to original mapset
                os.system("mkdir " + locpath + "/map%s/.tmp/rtemp" % jid)  # creating directory in mapset for model run
                os.environ["PATH"] += (os.pathsep + os.path.join(temppath + "/tmp%s") % jid)  # adding path to batch file

                print(
"""#!/bin/bash
export jid=%s
export SHELL=\"/bin/bash\"
export cellsize=%s
export rnorth=%s
export rsouth=%s
export rwest=%s
export reast=%s
export rtemp=%s
export GRASS_BATCH_JOB=%s/r.avaflow.mult
cp %s/*.txt %s/map%s/.tmp/rtemp/
%s --text %s/map%s --exec $GRASS_BATCH_JOB
unset GRASS_BATCH_JOB"""
                    % (jid, cellsize, rnorth, rsouth, rwest, reast, temppath, scriptpath2, temppath, locpath, jid, bingrass, locpath, jid), file=out)  # creating batch file

                out.close()  # closing batch file
                fd = os.open(strtmp + str(jid), os.O_RDONLY)  # opening batch file
                os.fchmod(fd, 0o755)  # making batch file executable
                os.close(fd)  # closing batch file

            # Executing batch processing

            start_batch = time.time()  # storing time (start of multi-core processing)

            neff = min(ncores, nruns)
            threadList = list(range(1, neff + 1))
            nameList = list(range(1, nruns + 1))
            threads = []
            for tName in threadList:
                thread = myThread(tName, workQueue)
                thread.start()
                threads.append(thread)
            queueLock.acquire()
            for word in nameList:
                workQueue.put(word)
            queueLock.release()
            while not workQueue.empty():
                pass
            global exitFlag
            exitFlag = 1
            for t in threads:
                t.join()
            print()
            print("Batch processing completed.")
            print()

            for jid in range(1, nruns + 1):
                os.system("rm -rf " + locpath + "/map" + str(jid))  # removing mapsets for all model runs

            # Impact and deposition indicator indices

            for j in range(0, 3):  # loop over all output parameters for wich impact indicator index should be derived:
                grass.mapcalc('"%s_iii%s"=0' % (pf, mstring[j]), overwrite=True, quiet=True)  # initializing impact indicator index map
            grass.mapcalc('"%s_dii"=0' % pf, overwrite=True, quiet=True)  # initializing deposit indicator index map

            nsuccess = 0  # intitalizing counter for number of successful simulations
            for jid in nameList:  # loop over all model runs:

                ftimesteps = open(pf + "_results/" + pf + "_files/" + pf + "_nout" + str(jid) + ".txt", "r") # opening file with number of time steps and success
                ftimesteps.readline()  # number of time steps is not needed
                csuccess = (ftimesteps.readline())  # reading control for success of simulation
                csuccess = int(csuccess.replace("\n", ""))  # removing newline
                ftimesteps.close()  # closing file with number of time steps

                if jid < 10:
                    jfill = "00000" + str(jid)  # formatting model run string
                elif jid < 100:
                    jfill = "0000" + str(jid)
                elif jid < 1000:
                    jfill = "000" + str(jid)
                elif jid < 10000:
                    jfill = "00" + str(jid)
                elif jid < 100000:
                    jfill = "0" + str(jid)
                else:
                    jfill = str(jid)

                if csuccess == 1:  # if simulation was successful:

                    nsuccess = nsuccess + 1  # updating number of successful simulations

                if model <= 3:
                    mstringlist = ["_hflow_max", "_hflow_fin", "_vflow_max", "none", "none", "_tflow_max", "_pflow_max", "_basechange_fin", "_treach"]
                elif model == 7:
                    mstringlist = ["_hflow_max", "_hflow_fin", "_vflow1_max", "_vflow2_max", "_vflow3_max", "_tflow_max", "_pflow_max", "_basechange_fin", "_treach"]

                if csuccess == 1:

                    for mstringi in mstringlist:

                        if not mstringi == "none":

                            grass.run_command("r.in.gdal", input=ascpath + pf + mstringi + str(jid) + ".asc", output=pf + mstringi + str(jid), overwrite=True)  # importing map

                    minval = grass.raster_info(pf + "_basechange_fin" + str(jid))["min"]  # minimum value of basal change
                    maxval = grass.raster_info(pf + "_basechange_fin" + str(jid))["max"]  # maximum value of basal change

                    if minval == 0 and maxval == 0:
                        grass.mapcalc('"%s_hflow_dep%s"="%s_hflow_fin%s"' % (pf, str(jid), pf, str(jid)), overwrite=True, quiet=True) # simulated height of deposition map
                    else:
                        grass.mapcalc('"%s_hflow_dep%s"=if("%s_basechange_fin%s">0,"%s_basechange_fin%s",0)' % (pf, str(jid), pf, str(jid), pf, str(jid)), overwrite=True, quiet=True)

                    grass.mapcalc('"%s_iis%s"=if("%s_hflow_max%s">%s,1,0)'% (pf, jfill, pf, str(jid), thresholds[0]), overwrite=True, quiet=True)  # impact indicator score map
                    grass.mapcalc('"%s_dis%s"=if("%s_hflow_dep%s">%s,1,0)'% (pf, jfill, pf, str(jid), thresholds[0]), overwrite=True, quiet=True)  # deposit indicator score map

                    for j in range(0, 3):  # loop over all output parameters for wich impact indicator index should be derived:

                        grass.mapcalc('"%s_iii%s"=if("%s%s_max%s">%s,"%s_iii%s"+1,"%s_iii%s")' % (pf, mstring[j], pf, mstring[j], str(jid), thresholds[j], pf, mstring[j], pf, mstring[j]),
                            overwrite=True, quiet=True)  # updating impact indicator index map

                    grass.mapcalc('"%s_dii"=if("%s_hflow_dep%s">%s,"%s_dii"+1,"%s_dii")' % (pf, pf, str(jid), thresholds[0], pf, pf), 
                        overwrite=True, quiet=True)  # updating deposit indicator index map

                    # Input for aimec

                    grass.mapcalc('"_hflowii"=if("%s_hflow_max%s">=%s,"%s_hflow_max%s",0)' % (pf, str(jid), thresholds[0], pf, str(jid)), overwrite=True, quiet=True)
                        # constraining maximum flow height map
                    grass.mapcalc('"_tflowii"=if("%s_tflow_max%s">=%s,"%s_tflow_max%s",0)' % (pf, str(jid), thresholds[1], pf, str(jid)), overwrite=True, quiet=True)
                        # constraining maximum flow kinetic energy map

                    grass.run_command("r.out.gdal", input="_hflowii", output=pf + "_results/" + pf + "_aimec/depth/" + jfill + ".asc", format="AAIGrid", overwrite=True)
                        # exporting maximum flow height raster to ascii
                    grass.run_command("r.out.gdal", input="_tflowii", output=pf + "_results/" + pf + "_aimec/pressure/" + jfill + ".asc", format="AAIGrid", overwrite=True)
                        # exporting maximum flow kinetic energy raster to ascii

                    corrasc(pf + "_results/" + pf + "_aimec/depth/" + jfill)
                    corrasc(pf + "_results/" + pf + "_aimec/pressure/" + jfill)

                else:
                    grass.mapcalc('"%s_iis%s"=0' % (pf, jfill), overwrite=True, quiet=True)  # impact indicator score map
                    grass.mapcalc('"%s_dis%s"=0' % (pf, jfill), overwrite=True, quiet=True)  # deposit indicator score map

            # Finalizing impact indicator index maps

            for j in range(0, 3):

                grass.mapcalc('"%s_iii%s"=float("%s_iii%s")/float(%s)' % (pf, mstring[j], pf, mstring[j], str(nsuccess)), overwrite=True, quiet=True)

                grass.run_command("r.out.gdal", input=pf + "_iii" + mstring[j], output=ascpath + pf + "_iii" + mstring[j] + ".asc", format="AAIGrid", 
                    overwrite=True)  # exporting impact indicator index map to ascii
                corrasc(ascpath + pf + "_iii" + mstring[j])

            # Finalizing deposit indicator index map

            grass.mapcalc('"%s_dii"=float("%s_dii")/float(%s)' % (pf, pf, str(nsuccess)), overwrite=True, quiet=True)

            grass.run_command("r.out.gdal", input=pf + "_dii", output=ascpath + pf + "_dii.asc", format="AAIGrid", overwrite=True)  # exporting deposit indicator index map to ascii
            corrasc(ascpath + pf + "_dii")

            # Input for aimec

            if impactarea:
                grass.mapcalc('"_cimpactarea"=if("%s">0,1,0)' % impactarea, overwrite=True, quiet=True)  # binary map of observed impact area
                grass.run_command("r.out.gdal", input="_cimpactarea", output=pf + "_results/" + pf + "_aimec/" + pf + "_impactarea.asc", format="AAIGrid", overwrite=True)  # exporting to ascii
                corrasc(pf + "_results/" + pf + "_aimec/" + pf + "_impactarea")

            if hdeposit:
                grass.mapcalc('"_cdepositarea"=if("%s">0,1,0)' % hdeposit, overwrite=True, quiet=True)  # binary map of observed height of deposit
                grass.run_command("r.out.gdal", input="_cdepositarea", output=pf + "_results/" + pf + "_aimec/" + pf + "_depositarea.asc", format="AAIGrid", overwrite=True)  # exporting to ascii
                corrasc(pf + "_results/" + pf + "_aimec/" + pf + "_depositarea")

            # Finalizing multi-core processing

            stop_batch = time.time()  # storing time (stop of multi-core processing)
            comptime_batch = (stop_batch - start_batch)  # storing computational time for batch processing in seconds

            timefile = open(filepath + pf + "_time.txt", "w")
            timefile.write(str(comptime_batch))  # writing computational time for batch processing to file
            timefile.close()

    if vflag:  # evaluation and visualization mode:

        print()
        print("3. EVALUATION AND VISUALIZATION")
        print()

        ftimesteps = open(pf + "_results/" + pf + "_files/" + pf + "_nout1.txt", "r")  # opening file with number of time steps and success
        ntimesteps = ftimesteps.readline()  # reading number of time steps
        ntimesteps = int(ntimesteps.replace("\n", ""))  # removing newline
        csuccess = (ftimesteps.readline())  # reading control for success of simulation
        csuccess = int(csuccess.replace("\n", ""))  # removing newline
        basechange = (ftimesteps.readline())  # reading control for change of basal topography
        basechange = int(basechange.replace("\n", ""))  # removing newline
       
        ftimesteps.close()  # closing file with number of time steps

        if mflag:
            success = nsuccess
        else:
            success = csuccess

        # Profile plots

        if profile and not mflag and success > 0:

            subprocess.call("Rscript %s_results/%s_plots/r.avaflow.profile.R --slave --quiet" % (pf, pf), shell=True)  # creating profiles with R

            for j in [1, 2, 4,]:  # loop over all parameters to be displayed as bar plots:

                pnames = []  # initializing list of map images
                pnamesc = []  # initializing list of compressed profile images
                pwidthc = 400  # defining width of compressed profile images

                for step in range(0, ntimesteps + 1):  # loop over all time steps:

                    if step < 10:
                        fill = "000" + str(step)  # formatting model run string
                    elif step < 100:
                        fill = "00" + str(step)
                    elif step < 1000:
                        fill = "0" + str(step)
                    else:
                        fill = str(step)

                    pimg = Image.open(pf + "_results/" + pf + "_plots/" + pf + "_profiles_timesteps/" + pf + mstring[j] + fill + ".png")  # opening profile image
                    pheightc = int(float(pimg.size[1]) * float(pwidthc / float(pimg.size[0])))  # height of compressed profile image
                    pimgc = pimg.resize((pwidthc, pheightc), Image.BILINEAR)  # compressed profile image
                    pimgc.save(temppath + "/" + mstring[j] + "c" + fill + ".png")  # saving compressed profile image

                    pnames.append(pf + "_results/" + pf + "_plots/" + pf + "_profiles_timesteps/" + pf + mstring[j] + fill + ".png") # updating list of profile images
                    pnamesc.append(temppath + "/" + mstring[j] + "c" + fill + ".png")  # updating list of profile images

                images = []

                for nnn in pnames:
                    frame = Image.open(nnn)
                    frame = frame.convert("P", palette=Image.ADAPTIVE, colors=256)
                    images.append(frame)

                # Save the frames as an animated GIF
                images[0].save(pf + "_results/" + pf + "_plots/" + pf + mstring[j] + "_profile.gif", save_all=True, append_images=images[1:], duration=200, loop=0)

                images = []

                for nnn in pnamesc:
                    frame = Image.open(nnn)
                    frame = frame.convert("P", palette=Image.ADAPTIVE, colors=256)
                    images.append(frame)

                # Save the frames as an animated GIF (reduced file size)
                images[0].save(pf + "_results/" + pf + "_plots/" + pf + mstring[j] + "_profilec.gif", save_all=True, append_images=images[1:], duration=200, loop=0)

        # Hydrograph plots

        if (hydrograph or hydrocoords) and not mflag and success > 0:

                subprocess.call("Rscript %s_results/%s_plots/r.avaflow.hydrograph.R --slave --quiet" % (pf, pf), shell=True)  # creating hydrograph plot with R

        # Map plots

        if success > 0:

            subprocess.call("Rscript %s_results/%s_plots/r.avaflow.map.R --slave --quiet" % (pf, pf), shell=True)  # creating maps with R

            if not mflag: # for single model run:

                jrange = [0]
                if aflag:
                    jrange.append(1)
                    jrange.append(2)
                if basechange != 0:
                    jrange.append(3)
                if model == 7 and tflag:
                    jrange.append(5)
                jrange.append(6)

                for j in jrange:  # loop over all sets of maps to be used for animated gifs

                    mnames = []  # initializing list of map images
                    mnamesc = []  # initializing list of compressed map images
                    mwidthc = 640  # defining width of compressed map images
            
                    for i in range( 0, ntimesteps + 2 ):  # loop over all time steps plus one for maps of maximum values:

                        if i < 10:
                            fill = "000" + str(i)  # formatting model run string
                        elif i < 100:
                            fill = "00" + str(i)
                        elif i < 1000:
                            fill = "0" + str(i)
                        else:
                            fill = str(i)

                        if i <= ntimesteps and not j == 6:  # for all time steps (not maps of maximum value), prepare maps for animated gifs

                            mimg = Image.open( pf + "_results/" + pf + "_plots/" + pf + "_maps_timesteps/" + pf + mstring[j] + fill + ".png" )  # opening map image
                            mheightc = int(float( mimg.size[1]) * float( mwidthc / float(mimg.size[0] )))  # height of compressed map image
                            mimgc = mimg.resize(( mwidthc, mheightc ), Image.BILINEAR )  # compressed map image
                            mimgc.save( temppath + "/" + mstring[j] + "c" + fill + ".png" )  # saving compressed map image
                            mnames.append( pf + "_results/" + pf + "_plots/" + pf + "_maps_timesteps/" + pf + mstring[j] + fill + ".png" ) # updating list of map images
                            mnamesc.append( temppath + "/" + mstring[j] + "c" + fill + ".png" )  # updating list of compressed map images

                    if not j == 6:

                        images = []

                        for nnn in mnames:
                            frame = Image.open( nnn )
                            frame = frame.convert( "P", palette=Image.ADAPTIVE, colors=256 )
                            images.append( frame )

                        # Save the frames as an animated GIF
                        images[0].save( pf + "_results/" + pf + "_plots/" + pf + mstring[j] + "_map.gif", save_all=True, append_images=images[1:], duration=200, loop=0 )

                        images = []

                        for nnn in mnamesc:
                            frame = Image.open( nnn )
                            frame = frame.convert( "P", palette=Image.ADAPTIVE, colors=256 )
                            images.append( frame )

                        # Save the frames as an animated GIF
                        images[0].save( pf + "_results/" + pf + "_plots/" + pf + mstring[j] + "_mapc.gif", save_all=True, append_images=images[1:], duration=200, loop=0 )

            else:  # for multiple model runs:

                # Evaluation through ROC plots

                if impactarea:

                    grass.run_command("r.out.gdal", flags="c", input=impactarea, output=temppath + "/observed.asc", format="AAIGrid", overwrite=True)  
                        # exporting map of observed impact area map to ascii raster
                    grass.run_command("r.out.gdal", flags="c", input=pf + '_iii_hflow', output=temppath + "/xindex.asc", format="AAIGrid", overwrite=True)  
                        # exporting impact indicator index map to ascii raster

                    with open(temppath + "/xindex.asc", "r") as xfin:
                        with open(temppath + "/index.asc", "w") as xfout:
                            for line in xfin:
                                xfout.write(line.replace("-nan", "0.0"))

                    xfin.close()
                    xfout.close()

                    subprocess.call("Rscript %s_results/%s_plots/r.avaflow.roc.R %s %s %s %s %s --slave --quiet" % (pf, pf, temppath, pf, "1", "1", "1"), shell=True)
                        # ROC plot relating iii to observation (without normalization)

                    subprocess.call("Rscript %s_results/%s_plots/r.avaflow.roc.R %s %s %s %s %s --slave --quiet" % (pf, pf, temppath, pf, "2", "2", "1"), shell=True)
                        # ROC plot relating iii to observation (with normalization)

                if hdeposit:

                    grass.run_command("r.out.gdal", flags="c", input=hdeposit, output=temppath + "/observed.asc", format="AAIGrid", overwrite=True)  
                        # exporting map of observed deposition height to ascii raster
                    grass.run_command("r.out.gdal", flags="c", input=pf + '_dii', output=temppath + "/xindex.asc", format="AAIGrid", overwrite=True)  
                        # exporting deposition indicator map to ascii raster

                    with open(temppath + "/xindex.asc", "r") as xfin:
                        with open(temppath + "/index.asc", "w") as xfout:
                            for line in xfin:
                                xfout.write(line.replace("-nan", "0.0"))

                    xfin.close()
                    xfout.close()

                    subprocess.call("Rscript %s_results/%s_plots/r.avaflow.roc.R %s %s %s %s %s --slave --quiet" % (pf, pf, temppath, pf, "3", "1", "2"), shell=True)
                        # ROC plot relating dii to observation (without normalization)

                    subprocess.call("Rscript %s_results/%s_plots/r.avaflow.roc.R %s %s %s %s %s --slave --quiet" % (pf, pf, temppath, pf, "4", "2", "2"), shell=True )
                        # ROC plot relating dii to observation (with normalization)

                # Producing graphics summarizing the evaluation results

                if eflag and mflag and impactarea:

                    if sampling == "0" and len(ipar) == 2:

                        subprocess.call("Rscript %s_results/%s_plots/r.avaflow.multval.R %s %s %s %s %s %s %s --slave --quiet"
                            % (pf, pf, pf, str(model), str(nruns), str(ipar[0]), str(ipar[1]), "i", "0"), shell=True)

                if eflag and mflag and hdeposit:

                    if sampling == "0" and len(ipar) == 2:

                        subprocess.call("Rscript %s_results/%s_plots/r.avaflow.multval.R %s %s %s %s %s %s %s --slave --quiet"
                            % (pf, pf, pf, str(model), str(nruns), str(ipar[0]), str(ipar[1]), "d", "0"), shell=True)

                if ctrlpoints and reftime:

                    if sampling == "0" and len(ipar) == 2:

                        for ictrlpoint in range(1, len(ctrlpoints) / 2 + 1):

                            subprocess.call("Rscript %s_results/%s_plots/r.avaflow.multval.R %s %s %s %s %s %s %s --slave --quiet" 
                                % (pf, pf, pf, str(model), str(nruns), str(ipar[0]), str(ipar[1]), "t", str(ictrlpoint)), shell=True)

    # Cleaning file system and exiting

    if not vflag:  # evaluation and visualization mode:

        ftimesteps = open(pf + "_results/" + pf + "_files/" + pf + "_nout1.txt", "r")  # opening file with number of time steps and success
        ftimesteps.readline()
        csuccess = (ftimesteps.readline())  # reading control for success of simulation
        csuccess = int(csuccess.replace("\n", ""))  # removing newline
        basechange = (ftimesteps.readline())  # reading control for change of basal topography
        basechange = int(basechange.replace("\n", ""))  # removing newline
        ftimesteps.close()  # closing file with number of time steps

        if mflag:
            success = nsuccess
        else:
            success = csuccess

    os.system("rm -rf " + temppath)  # removing temporary directory
    if eflag and basechange == 0:
        os.system("rm -rf " + ascpath + pf + "_basechange*")  # removing obsolete ascii rasters

    grass.run_command("g.remove", flags="f", type="rast", pattern="_*", quiet=True)  # removing temporary input and result raster maps

    if not kflag:
        grass.run_command("g.remove", flags="f", type="rast", pattern=pf + "_*", quiet=True)  # removing result raster maps

    grass.run_command("g.region", flags="d")  # resetting default region

    if eflag and not mflag:

        if csuccess == 1:
            print()
            print("Completed successfully in %.1f seconds (net computing time excluding visualization)."% comptime)
            print("Please find the collected results in the directory %s_results." % pf)
            print()

        elif csuccess == 0:
            print()
            print("The simulation was interrupted due to numerical failure.")
            print("Please find the collected results in the directory %s_results." % pf)
            print()

    elif eflag and mflag:

        print()
        print("Completed in %.1f seconds (net computing time excluding visualization)." % comptime_batch)
        print("%s out of %s simulations were successful." % (str(nsuccess), str(nruns)))
        print("Please find the collected results in the directory %s_results." % pf)
        print()

    elif vflag and not eflag:

        print()
        print("Completed successfully.")
        print("Please find the collected results in the directory %s_results." % pf)
        print()

    sys.exit()  # exit


if __name__ == "__main__":
    options, flags = grass.parser()
    main()
