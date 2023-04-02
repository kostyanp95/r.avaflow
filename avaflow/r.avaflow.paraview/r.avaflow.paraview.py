#!/usr/bin/env python3

#############################################################################
#
# MODULE:       r.avaflow.paraview.py
#
# AUTHOR:       Martin Mergili
#
# PURPOSE:      The mass flow simulation tool
#               Script for the export of r.avaflow results to csv files
#               and for the generation of an import script for Paraview
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
#% keywords: 3D display
#%end

#%flag
#% key: b
#% description: Basechange mode
#% guisection: flags
#%end

#%flag
#% key: g
#% description: Glacier mode
#% guisection: flags
#%end

#%flag
#% key: l
#% description: Layer mode
#% guisection: flags
#%end

#%flag
#% key: p
#% description: Include paraview-based processing
#% guisection: flags
#%end

#%flag
#% key: t
#% description: Tsunami mode
#% guisection: flags
#%end

#%option
#% key: prefix
#% type: string
#% description: Prefix for output files and folders
#% required: yes
#% multiple: no
#%end

#%option
#% key: phases
#% type: string
#% description: Number of phases to be considered (1 or 3)
#% required: no
#% multiple: no
#%end

#%option
#% key: impactarea
#% type: string
#% description: Path to raster of observed impact area (1=yes, 2=no)
#% required: no
#% multiple: no
#%end

#%option
#% key: ortho
#% type: string
#% description: Path to orthophoto (RGB, 8bit unsigned)
#% required: no
#% multiple: no
#%end

#%option
#% key: time
#% type: string
#% description: Range of time steps to use (integer): minimum, maximum
#% required: yes
#% multiple: yes
#%end

#%option
#% key: hmin
#% type: string
#% description: Minimum flow height to be displayed
#% required: yes
#% multiple: no
#%end

#%option
#% key: href
#% type: string
#% description: Reference flow height for display
#% required: yes
#% multiple: no
#%end

#%option
#% key: htsun
#% type: string
#% description: Reference flow height for display of tsunami (only with flag t)
#% required: no
#% multiple: no
#%end

#%option
#% key: contoursh
#% type: string
#% description: Flow height contours: minimum, maximum, interval (only with flag p)
#% required: no
#% multiple: yes
#%end

#%option
#% key: contoursz
#% type: string
#% description: Elevation contours: minimum, maximum, interval (only with flag p)
#% required: no
#% multiple: yes
#%end


#%option
#% key: rgb
#% type: string
#% description: RGB values for display of one-phase flow (R, G, B, each in the range 0.0-1.0)
#% required: no
#% multiple: yes
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

    basechange = flags["b"]
    glacier = flags["g"]
    layers = flags["l"]
    paraview = flags["p"]
    tsunami = flags["t"]
    prefix = options["prefix"]
    phases = int(options["phases"])
    ortho = options["ortho"]
    impactarea = options["impactarea"]
    time = options["time"]
    min1 = options["hmin"]
    ref1 = options["href"]
    htsun = options["htsun"]
    contoursh = options["contoursh"]
    contoursz = options["contoursz"]
    rgb = options["rgb"]

    # Managing missing input

    if not prefix: ErrorMessage("prefix")
    if not phases: phases = 1
    if impactarea == "0": impactarea = None
    if ortho == "0": ortho = None
    if not time: ErrorMessage("time parameters")
    if not min1: min1 = "0.1"
    if not ref1: ref1 = "5.0"
    if not htsun: htsun = "5.0"
    if not contoursh: contoursh = "1,100,2"
    if not contoursz: contoursz = "-11000,9000,100"
    if not rgb: rgb = "0.60,0.25,0.15,0.2"

    # Managing parameter lists

    time = list(map(str, time.split(",")))
    if not len(time) == 2: ErrorMessage("number of time parameters")

    contoursht = list(map(str, contoursh.split(",")))
    if not len(contoursht) == 3: ErrorMessage("number of flow height contour parameters")
    for i in range(0,3): contoursht[i] = int(contoursht[i])

    contourszt = list(map(str, contoursz.split(",")))
    if not len(contourszt) == 3: ErrorMessage("number of elevation parameters")
    for i in range(0,3): contourszt[i] = int(contourszt[i])

    rgb = list(map(str, rgb.split(",")))
    if not len(rgb) == 4: ErrorMessage("number of RGB components")

    tmin = int(time[0])
    tmax = int(time[1])

    # Preparing system and loading elevation raster

    pypath = "$HOME/.grass7/addons/scripts"
    ascpath = prefix+"_results/"+prefix+"_ascii/"+prefix
    outpathf0=prefix+"_paraview/"
    outpathf=prefix+"_paraview/data/"

    os.system("rm -rf " + outpathf0)
    os.system("mkdir " + outpathf0)
    os.system("mkdir " + outpathf)

    grass.run_command("r.in.gdal", flags="o", overwrite=True, input=ascpath+"_elev.asc", output=prefix+"_elev0")
    grass.run_command("g.region", flags="s", rast=prefix+"_elev0")
    grass.mapcalc('"%s_elev0" = if(isnull("%s_elev0")==1,0,"%s_elev0")' %(prefix, prefix, prefix), overwrite=True)

    # Processing impact area

    if impactarea:

        grass.run_command("r.in.gdal", flags="o", overwrite=True, input=impactarea, output=prefix+"_impactarea")
        grass.run_command("r.to.vect", input=prefix+"_impactarea", output=prefix+"_impactareav0", type="area", flags="v" + "s", quiet=True, overwrite=True)
        grass.run_command("v.drape", input=prefix+"_impactareav0", output=prefix+"_impactareav", elevation=prefix+"_elev0", quiet=True, overwrite=True)
        grass.run_command("v.out.vtk", input=prefix+"_impactareav", output=outpathf+"impactarea.vtk", quiet=True, overwrite=True)

    # Processing orthophoto

    if ortho:

        grass.run_command("r.in.gdal", flags="o", overwrite=True, input=ortho, output="ortho0")
        grass.run_command("r.composite", overwrite=True, red="ortho0.red", green="ortho0.green", blue="ortho0.blue", output="ortho")

    # Loading initial flow height raster for tsunami mode

    if tsunami:

        grass.run_command("r.in.gdal", flags="o", overwrite=True, input=ascpath+"_hflow0000.asc", output=prefix+"_hflow0")
    
    # Starting loop over all time steps
    
    for i in range( tmin, tmax+1):

        if i<10: ii="000"+str(i)
        elif i<100: ii="00"+str(i)
        else: ii="0"+str(i)

        # Importing and processing flow height and basechange data

        grass.run_command("r.in.gdal", flags="o", overwrite=True, input=ascpath+"_hflow"+ii+".asc", output=prefix+"_hflow")
        grass.run_command("r.in.gdal", flags="o", overwrite=True, input=ascpath+"_hflow_max"+ii+".asc", output=prefix+"_hmax")
    
        grass.mapcalc('"%s_hflow" = if(isnull("%s_hflow")==1,0,"%s_hflow")' %(prefix, prefix, prefix), overwrite=True)
        grass.mapcalc('"%s_hmax" = if(isnull("%s_hmax")==1,0,"%s_hmax")' %(prefix, prefix, prefix), overwrite=True)
    
        if basechange and i>tmin:
    
            grass.run_command("r.in.gdal", flags="o", overwrite=True, input=ascpath+"_basechange"+ii+".asc", output=prefix+"_basechange")
            grass.mapcalc('"%s_basechange" = if(isnull("%s_basechange")==1,0,"%s_basechange")' %(prefix, prefix, prefix), overwrite=True)
            grass.mapcalc('"%s_elev" = int(100*("%s_elev0"+"%s_basechange"))/100' %(prefix, prefix, prefix), overwrite=True)
        
        else:
    
            grass.mapcalc('"%s_elev" = int(100*"%s_elev0")/100' %(prefix, prefix), overwrite=True)            
    
        if phases==3:
    
            grass.run_command("r.in.gdal", flags="o", overwrite=True, input=ascpath+"_hflow1"+ii+".asc", output=prefix+"_hflow1")
            grass.run_command("r.in.gdal", flags="o", overwrite=True, input=ascpath+"_hflow2"+ii+".asc", output=prefix+"_hflow2")
            grass.run_command("r.in.gdal", flags="o", overwrite=True, input=ascpath+"_hflow3"+ii+".asc", output=prefix+"_hflow3")

            grass.mapcalc('"%s_hflow1" = if(isnull("%s_hflow1")==1,0,"%s_hflow1")' %(prefix, prefix, prefix), overwrite=True)
            grass.mapcalc('"%s_hflow2" = if(isnull("%s_hflow2")==1,0,"%s_hflow2")' %(prefix, prefix, prefix), overwrite=True)
            grass.mapcalc('"%s_hflow3" = if(isnull("%s_hflow3")==1,0,"%s_hflow3")' %(prefix, prefix, prefix), overwrite=True)
            grass.mapcalc('"%s_hs" = "%s_elev" + "%s_hflow1"+"%s_hflow2"' %(prefix, prefix, prefix, prefix), overwrite=True)

        else:
        
            grass.mapcalc('"%s_hs" = "%s_elev" + "%s_hflow"' %(prefix, prefix, prefix), overwrite=True)
      
        grass.mapcalc('"%s_h" = "%s_elev" + "%s_hflow"' %(prefix, prefix, prefix), overwrite=True)
        grass.mapcalc('"%s_hflow" = "%s_hflow"' %(prefix, prefix), overwrite=True)

        if not ortho:

            # Creating and processing hillshade raster as alternative background to orthophoto

            grass.run_command("r.relief", overwrite=True, input=prefix+"_h", output=prefix+"_hillshade")
            grass.mapcalc('"ortho0.red" = ("%s_hillshade"+255)/2' %prefix, overwrite=True)
            grass.mapcalc('"ortho0.green" = ("%s_hillshade"+255)/2' %prefix, overwrite=True)
            grass.mapcalc('"ortho0.blue" = ("%s_hillshade"+255)/2' %prefix, overwrite=True)

        grass.mapcalc('"%s_alpha" = if("%s_hflow">=%s,pow(min(1,"%s_hflow"/%s),%s),0)' %(prefix, prefix, min1, prefix, ref1, rgb[3]), overwrite=True)
        grass.mapcalc('"%s_alphamax" = if("%s_hmax">=%s,min(0.35,pow(min(1,"%s_hmax"/%s),%s)),0)' %(prefix, prefix, min1, prefix, ref1, rgb[3]), overwrite=True)
        
        if layers and phases==3:

            # Setting colours for display (layer model)

            grass.mapcalc('"%s_red" = if("%s_hflow">=%s,if("%s_hflow2">%s||"%s_hflow3">=%s,0.25,0.5)*"%s_alpha"+ortho0.red/255.1*(1-"%s_alpha"),\
                if("%s_hmax">=%s,0.7*"%s_alphamax"+ortho0.red/254.9*(1-"%s_alphamax"),ortho0.red/254.9))' 
                %(prefix, prefix, min1, prefix, min1, prefix, min1, prefix, prefix, prefix, min1, prefix, prefix), overwrite=True)
            grass.mapcalc('"%s_green" = if("%s_hflow">=%s,if("%s_hflow3">=%s||"%s_hflow2"<%s,0.25,0.5)*"%s_alpha"+ortho0.green/255.1*(1-"%s_alpha"),\
                if("%s_hmax">=%s,0.3*"%s_alphamax"+ortho0.green/254.9*(1-"%s_alphamax"),ortho0.green/254.9))' 
                %(prefix, prefix, min1, prefix, min1, prefix, min1, prefix, prefix, prefix, min1, prefix, prefix), overwrite=True)
            grass.mapcalc('"%s_blue" = if("%s_hflow">=%s,if("%s_hflow3">=%s,0.5,0.25)*"%s_alpha"+ortho0.blue/254.9*(1-"%s_alpha"),\
                if("%s_hmax">=%s,0.0*"%s_alphamax"+ortho0.blue/255.1*(1-"%s_alphamax"),ortho0.blue/254.9))' 
                %(prefix, prefix, min1, prefix, min1, prefix, prefix, prefix, min1, prefix, prefix), overwrite=True)

        elif phases==3:
    
            # Setting colours for display (3-phase model)
    
            if tsunami:

                grass.mapcalc('"%s_htsun" = if("%s_hflow3">%s,"%s_hflow"+"%s_elev"-"%s_hflow0"-"%s_elev0",0)' %(prefix, prefix, min1, prefix, prefix, prefix, prefix), overwrite=True)        
                grass.mapcalc('"%s_corrtsun" = if("%s_hflow3">%s,0.5*("%s_hflow"+"%s_elev"-"%s_hflow0"-"%s_elev0")/%s,0)' %(prefix, prefix, min1, prefix, prefix, prefix, prefix, htsun), overwrite=True)
                addtsun= "0.5"

            else:
        
                grass.mapcalc('"%s_corrtsun" = 0' %prefix, overwrite=True)
                addtsun = "0.0"

            grass.mapcalc('"%s_red" = if("%s_hflow">=%s,max(0.0,min(1.0,(%s+"%s_hflow1"/"%s_hflow"+"%s_corrtsun")))*"%s_alpha"+ortho0.red/255.1*(1-"%s_alpha"),if("%s_hmax">=%s,\
                0.7*"%s_alphamax"+ortho0.red/254.9*(1-"%s_alphamax"),ortho0.red/254.9))' 
                %(prefix, prefix, min1, addtsun, prefix, prefix, prefix, prefix, prefix, prefix, min1, prefix, prefix), overwrite=True)
            grass.mapcalc('"%s_green" = if("%s_hflow">=%s,max(0.0,min(1.0,(%s+1.0*"%s_hflow2"/"%s_hflow"+"%s_corrtsun")))*"%s_alpha"+ortho0.green/255.1*(1-"%s_alpha"),\
                if("%s_hmax">=%s,0.3*"%s_alphamax"+ortho0.green/254.9*(1-"%s_alphamax"),ortho0.green/254.9))' 
                %(prefix, prefix, min1, addtsun, prefix, prefix, prefix, prefix, prefix, prefix, min1, prefix, prefix), overwrite=True)
            grass.mapcalc('"%s_blue" = if("%s_hflow">=%s,"%s_hflow3"/"%s_hflow"*"%s_alpha"+ortho0.blue/254.9*(1-"%s_alpha"),if("%s_hmax">=%s,\
            0.0*"%s_alphamax"+ortho0.blue/255.1*(1-"%s_alphamax"),ortho0.blue/254.9))' 
                %(prefix, prefix, min1, prefix, prefix, prefix, prefix, prefix, min1, prefix, prefix), overwrite=True)
    
        else:
    
            # Setting colours for display (1-phase model)
    
            if glacier:
            
                colfactr="1.00"
                colfactg="1.00"
                colfactb="1.00"
                
            else:
            
                colfactr=rgb[0]
                colfactg=rgb[1]
                colfactb=rgb[2]
                    
            grass.mapcalc('"%s_red" = if("%s_hflow">=%s,%s*"%s_alpha"+ortho0.red/254.9*(1-"%s_alpha"),if("%s_hmax">=%s,0.7*"%s_alphamax"+ortho0.red/255.1*(1-"%s_alphamax"),ortho0.red/254.9))' 
                %(prefix, prefix, min1, colfactr, prefix, prefix, prefix, min1, prefix, prefix), overwrite=True)
            grass.mapcalc('"%s_green" = if("%s_hflow">=%s,%s*"%s_alpha"+ortho0.green/254.9*(1-"%s_alpha"),if("%s_hmax">=%s,0.3*"%s_alphamax"+ortho0.green/255.1*(1-"%s_alphamax"),ortho0.green/254.9))' 
                %(prefix, prefix, min1, colfactg, prefix, prefix, prefix, min1, prefix, prefix), overwrite=True)
            grass.mapcalc('"%s_blue" = if("%s_hflow">=%s,%s*"%s_alpha"+ortho0.blue/254.9*(1-"%s_alpha"),if("%s_hmax">=%s,0.0*"%s_alphamax"+ortho0.blue/255.1*(1-"%s_alphamax"),ortho0.blue/254.9))' 
                %(prefix, prefix, min1, colfactb, prefix, prefix, prefix, min1, prefix, prefix), overwrite=True)    

        # Importing rasters to csv file

        grass.run_command("r.out.gdal", overwrite=True, input=prefix+"_h", output=outpathf+"xh.csv", format="XYZ")
        grass.run_command("r.out.gdal", overwrite=True, input=prefix+"_hs", output=outpathf+"xs.csv", format="XYZ")
        
        if tsunami: grass.run_command("r.out.gdal", overwrite=True, input=prefix+"_htsun", output=outpathf+"xf.csv", format="XYZ")
        else: grass.run_command("r.out.gdal", overwrite=True, input=prefix+"_hflow", output=outpathf+"xf.csv", format="XYZ")
        
        grass.run_command("r.out.gdal", overwrite=True, input=prefix+"_red", output=outpathf+"xr.csv", format="XYZ")
        grass.run_command("r.out.gdal", overwrite=True, input=prefix+"_green", output=outpathf+"xg.csv", format="XYZ")
        grass.run_command("r.out.gdal", overwrite=True, input=prefix+"_blue", output=outpathf+"xb.csv", format="XYZ")

        fxbody=open(outpathf+"xh.csv", "r")
        fxsody=open(outpathf+"xs.csv", "r")
        fxfody=open(outpathf+"xf.csv", "r")
        fxrody=open(outpathf+"xr.csv", "r")
        fxgody=open(outpathf+"xg.csv", "r")
        fxcody=open(outpathf+"xb.csv", "r")
    
        fbody=open(outpathf+"xxh.csv", "w")
        fsody=open(outpathf+"xxs.csv", "w")
        ffody=open(outpathf+"xxf.csv", "w")
        frody=open(outpathf+"xxr.csv", "w")
        fgody=open(outpathf+"xxg.csv", "w")
        fcody=open(outpathf+"xxb.csv", "w")

        txbody=fxbody.readlines()
        txbody.sort()
        for j in range(len(txbody)):
            fbody.write(txbody[j])

        txsody=fxsody.readlines()
        txsody.sort()
        for j in range(len(txsody)):
            fsody.write(txsody[j])

        txfody=fxfody.readlines()
        txfody.sort()
        for j in range(len(txfody)):
            ffody.write(txfody[j])

        txrody=fxrody.readlines()
        txrody.sort()
        for j in range(len(txrody)):
            frody.write(txrody[j])

        txgody=fxgody.readlines()
        txgody.sort()
        for j in range(len(txgody)):
            fgody.write(txgody[j])

        txcody=fxcody.readlines()
        txcody.sort()
        for j in range(len(txcody)):
            fcody.write(txcody[j])

        fbody.close()
        fsody.close()
        ffody.close()
        frody.close()
        fgody.close()
        fcody.close()
        fxbody.close()
        fxfody.close()
        fxrody.close()
        fxgody.close()
        fxcody.close()

        fbody=open(outpathf+"xxh.csv", "r")
        fsody=open(outpathf+"xxs.csv", "r")
        ffody=open(outpathf+"xxf.csv", "r")
        frody=open(outpathf+"xxr.csv", "r")
        fgody=open(outpathf+"xxg.csv", "r")
        fcody=open(outpathf+"xxb.csv", "r")
        ffinal=open(outpathf+"pv"+ii+".csv", "w")

        tfinal="x,y,z,h,s,r,g,b\n" 
    
        tbody=fbody.readlines()
    
        for j in range(len(tbody)):
            tbody[j]=tbody[j].replace("\n","")
            tsody=fsody.readline().replace("\n","")
            tsody = tsody.split(" ")
            tfody=ffody.readline().replace("\n","")
            tfody = tfody.split(" ")
            trody=frody.readline().replace("\n","")
            trody = trody.split(" ")
            tgody=fgody.readline().replace("\n","")
            tgody = tgody.split(" ")
            tcody=fcody.readline().replace("\n","")
            tcody = tcody.split(" ")
            if tfody[2] == "0": tfody[2] = "NaN"
            tbody[j] = ( tbody[j] + "," + str(round(float(tfody[2]),2)) + "," + str(round(float(tsody[2]),2)) + "," + str(round(float(trody[2]),2)) + "," 
                + str(round(float(tgody[2]),2)) + "," + str(round(float(tcody[2]),2)))
            tbody[j] = tbody[j].replace("65535","NaN").replace("-nan","NaN").replace(" ",",") + "\n"
            tfinal = tfinal + tbody[j]
            
        print(tfinal, file=ffinal)
        
        fbody.close()
        fsody.close()
        ffody.close()
        frody.close()
        fgody.close()
        fcody.close()
        ffinal.close()

    # Cleaning system

    os.system( "rm -rf " + outpathf + "x*" )
        
    # Paraview-based processing steps

    fimport=open(outpathf0+"pvimport.py", "w")
    
    timport = "import glob" + "\n"
    timport = timport + "import os" + "\n"
    timport = timport + "from paraview.simple import *" + "\n"
    timport = timport + "import shutil" + "\n"
    timport = timport + "\n"
    if tsunami:
        timport = timport + "hcont = [" + str(contoursht[0]) + "]" + "\n"
        timport = timport + "hmin = " + str(contoursht[2]) + "\n"
    else:
        timport = timport + "hcont = []" + "\n"
        timport = timport + "hmin = " + str(contoursht[0]) + "\n"
    timport = timport + "hmax = " + str(contoursht[1]) + "\n"
    timport = timport + "hint = " + str(contoursht[2]) + "\n"
    timport = timport + "for i in range( hmin, hmax, hint ): hcont.append(i)" + "\n"
    timport = timport + "\n"
    timport = timport + "elevcont = []" + "\n"
    timport = timport + "elevmin = " + str(contourszt[0]) + "\n"
    timport = timport + "elevmax = " + str(contourszt[1]) + "\n"
    timport = timport + "elevint = " + str(contourszt[2]) + "\n"
    timport = timport + "for i in range( elevmin, elevmax, elevint ): elevcont.append(i)" + "\n"
    timport = timport + "\n"
    timport = timport + "if os.path.exists('surface'): shutil.rmtree('surface')" + "\n"
    timport = timport + "if os.path.exists('contoursh'): shutil.rmtree('contoursh')" + "\n"
    timport = timport + "if os.path.exists('contoursz'): shutil.rmtree('contoursz')" + "\n"
    timport = timport + "\n"
    timport = timport + "intab = paraview.simple.CSVReader(FileName=glob.glob('data/pv*.csv'))" + "\n"
    timport = timport + "points = paraview.simple.TableToPoints(intab, XColumn='x', YColumn='y', ZColumn='z', KeepAllDataArrays=True)" + "\n"
    timport = timport + "surface = paraview.simple.Delaunay2D(points)" + "\n"
    timport = timport + "surfcalc = paraview.simple.Calculator(Input=surface, ResultArrayName='rgb', Function='r * iHat + g * jHat + b * kHat')" + "\n"
    timport = timport + "contoursh = paraview.simple.Contour(Input=surface, ContourBy='h', Isosurfaces=hcont)" + "\n"
    if tsunami:
        timport = timport + "contoursz = paraview.simple.Contour(Input=surface, ContourBy='s', Isosurfaces=elevcont)" + "\n"
    else:
        timport = timport + "contoursz = paraview.simple.Contour(Input=surface, ContourBy='z', Isosurfaces=elevcont)" + "\n"
    timport = timport + "\n"
    timport = timport + "print('Writing surfaces ...')" + "\n"
    timport = timport + "paraview.simple.SaveData('surface.pvd', surfcalc, WriteTimeSteps=True)" + "\n"
    timport = timport + "\n"
    timport = timport + "print('Writing flow contours ...')" + "\n"
    timport = timport + "paraview.simple.SaveData('contoursh.pvd', contoursh, WriteTimeSteps=True)" + "\n"
    timport = timport + "\n"
    timport = timport + "print('Writing surface contours ...')" + "\n"
    timport = timport + "paraview.simple.SaveData('contoursz.pvd', contoursz, WriteTimeSteps=True)" + "\n"
    timport = timport + "\n"
    timport = timport + "print ('completed.')" + "\n"

    print(timport, file=fimport)
    fimport.close()
        
    if paraview:
    
        cwd = os.getcwd()
        os.chdir( outpathf0 )
        subprocess.call( "pvpython import.py --slave --quiet", shell=True )
        os.chdir( cwd )

    # Exiting

    os.system( "rm -rf " + outpathf + "x*" )

if __name__ == "__main__":
    options, flags = grass.parser()
    main()
