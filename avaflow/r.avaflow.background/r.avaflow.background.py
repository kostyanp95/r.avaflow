#!/usr/bin/env python3

#############################################################################
#
# MODULE:       r.avaflow.background.py
#
# AUTHOR:       Martin Mergili
#
# PURPOSE:      The mass flow simulation tool
#               Script for the generation of a csv file of the
#               landscape surrounding one or more r.avaflow simulations
#
# COPYRIGHT:    (c) 2022 - 2023 by the author
#               (c) 2022 - 2023 by the University of Graz
#               (c) 2000 - 2023 by the GRASS Development Team
#
# VERSION:      20230105 (5 January 2023)
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
#% keywords: Virtual reality
#% keywords: 3D display
#%end

#%option
#% key: prefix
#% type: string
#% description: Prefix for output
#% required: yes
#% multiple: no
#%end

#%option
#% key: cellsize
#% type: string
#% description: Raster cell size (m, skip to use cell size of elevation raster map)
#% required: no
#% multiple: no
#%end

#%option
#% key: elevation
#% type: string
#% description: Path to elevation raster map (tiff or asc)
#% required: yes
#% multiple: no
#%end

#%option
#% key: ortho
#% type: string
#% description: Path to orthophoto (tiff, RGB, 8bit unsigned)
#% required: no
#% multiple: no
#%end

# Importing libraries

import grass.script as grass
from grass.script import core as grasscore
import os
import subprocess

# Defining error message

def ErrorMessage(specify):
    grass.message(" ")
    grass.error("Please revise the " + specify + ".")
    grass.message(" ")
    sys.exit()

def main():

    # Setting flags and parameters

    prefix = options["prefix"]
    cellsize = options["cellsize"]
    elevation = options["elevation"]
    ortho = options["ortho"]

    # Managing missing input

    if not prefix: ErrorMessage("prefix")
    if not cellsize: cellsize = None
    if not elevation: ErrorMessage("elevation")
    if not ortho: ortho = None

    # Preparing system and loading elevation raster map

    outpathf0 = prefix+"_vrbackground/"

    os.system("rm -rf " + outpathf0)
    os.system("mkdir " + outpathf0)

    grass.run_command("r.in.gdal", flags="o", overwrite=True, input=elevation, output=prefix+"_elevbg")
    grass.run_command("g.region", flags="s", rast=prefix+"_elevbg")
    
    grass.run_command("g.region", flags="s", rast=prefix+"_elevbg")
    if cellsize: grass.run_command("g.region", flags="a", nsres=cellsize, ewres=cellsize)
    
    grass.mapcalc('"%s_elevbg" = if(isnull("%s_elevbg")==1,0,"%s_elevbg")' %(prefix, prefix, prefix), overwrite=True)

    # Processing orthophoto

    if ortho:

        grass.run_command("r.in.gdal", flags="o", overwrite=True, input=ortho, output="orthobg")

    grass.mapcalc('"%s_elevbg" = int(100*"%s_elevbg")/100' %(prefix, prefix), overwrite=True)            
    
    if not ortho:

        # Creating and processing hillshade raster as alternative background to orthophoto

        grass.run_command("r.relief", overwrite=True, input=prefix+"_elevbg", output=prefix+"_hillshadebg")
        grass.mapcalc('"orthobg.red" = ("%s_hillshade"+255)/2' %prefix, overwrite=True)
        grass.mapcalc('"orthobg.green" = ("%s_hillshade"+255)/2' %prefix, overwrite=True)
        grass.mapcalc('"orthobg.blue" = ("%s_hillshade"+255)/2' %prefix, overwrite=True)

    # Creating colour rasters

    grass.mapcalc('"%s_redbg" = orthobg.red/254.9' %prefix, overwrite=True)
    grass.mapcalc('"%s_greenbg" = orthobg.green/254.9' %prefix, overwrite=True)
    grass.mapcalc('"%s_bluebg" = orthobg.blue/254.9' %prefix, overwrite=True)    

    # Importing rasters to csv file

    grass.run_command("r.out.gdal", overwrite=True, input=prefix+"_elevbg", output=outpathf0+"xe.csv", format="XYZ")
    grass.run_command("r.out.gdal", overwrite=True, input=prefix+"_redbg", output=outpathf0+"xr.csv", format="XYZ")
    grass.run_command("r.out.gdal", overwrite=True, input=prefix+"_greenbg", output=outpathf0+"xg.csv", format="XYZ")
    grass.run_command("r.out.gdal", overwrite=True, input=prefix+"_bluebg", output=outpathf0+"xb.csv", format="XYZ")

    fxeody=open(outpathf0+"xe.csv", "r")
    fxrody=open(outpathf0+"xr.csv", "r")
    fxgody=open(outpathf0+"xg.csv", "r")
    fxbody=open(outpathf0+"xb.csv", "r")
    
    feody=open(outpathf0+"xxe.csv", "w")
    frody=open(outpathf0+"xxr.csv", "w")
    fgody=open(outpathf0+"xxg.csv", "w")
    fbody=open(outpathf0+"xxb.csv", "w")

    txeody=fxeody.readlines()
    txeody.sort()
    for j in range(len(txeody)):
        feody.write(txeody[j])

    txrody=fxrody.readlines()
    txrody.sort()
    for j in range(len(txrody)):
        frody.write(txrody[j])

    txgody=fxgody.readlines()
    txgody.sort()
    for j in range(len(txgody)):
        fgody.write(txgody[j])

    txbody=fxbody.readlines()
    txbody.sort()
    for j in range(len(txbody)):
        fbody.write(txbody[j])

    feody.close()
    frody.close()
    fgody.close()
    fbody.close()
    fxeody.close()
    fxrody.close()
    fxgody.close()
    fxbody.close()

    feody=open(outpathf0+"xxe.csv", "r")
    frody=open(outpathf0+"xxr.csv", "r")
    fgody=open(outpathf0+"xxg.csv", "r")
    fbody=open(outpathf0+"xxb.csv", "r")
    ffinal=open(outpathf0+"pvbg.csv", "w")

    tfinal="x,y,z,r,g,b\n" 
    
    teody=feody.readlines()
    
    for j in range(len(teody)):
        teody[j]=teody[j].replace("\n","")
        trody=frody.readline().replace("\n","")
        trody = trody.split(" ")
        tgody=fgody.readline().replace("\n","")
        tgody = tgody.split(" ")
        tbody=fbody.readline().replace("\n","")
        tbody = tbody.split(" ")
        teody[j] = ( teody[j] + "," + str(round(float(trody[2]),2)) + "," 
            + str(round(float(tgody[2]),2)) + "," + str(round(float(tbody[2]),2)))
        teody[j] = teody[j].replace("65535","NaN").replace("-nan","NaN").replace(" ",",") + "\n"
        tfinal = tfinal + teody[j]
            
    print(tfinal, file=ffinal)
        
    feody.close()
    frody.close()
    fgody.close()
    fbody.close()
    ffinal.close()

    # Cleaning system and exiting

    os.system( "rm -rf " + outpathf0 + "x*" )

if __name__ == "__main__":
    options, flags = grass.parser()
    main()
