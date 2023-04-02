#!/usr/bin/python3

#############################################################################
#
# MODULE:       r.lakefill
#
# AUTHOR:       Martin Mergili
#
# PURPOSE:      Script for filling lakes
# VERSION:      20201010 (10 January 2020)
#
# COPYRIGHT:    (c) 2020 by the author
#               (c) 2020 by the BOKU University, Vienna
#               (c) 2020 by the University of Vienna
#               (c) 2020 by the GRASS Development Team
#
#               This program is free software under the GNU General Public
#               License (>=v2). Read the file COPYING that comes with GRASS
#               for details.
#
#############################################################################

#%module
#% description: Script for filling lakes
#% keywords: Raster
#% keywords: Topographic analysis
#% keywords: Lake
#%end

#%option
#% key: cellsize
#% type: string
#% description: Cell size (input, m)
#% required: no
#% multiple: no
#%end

#%option
#% key: elevation
#% type: string
#% gisprompt: old,raster,dcell
#% description: Name of elevation raster map (input, m)
#% required: yes
#% multiple: no
#%end

#%option
#% key: lakedepth
#% type: string
#% gisprompt: new,raster,dcell
#% description: Name of lake control raster map (output)
#% required: yes
#% multiple: no
#%end

#%option
#% key: seedcoords
#% type: string
#% description: Comma-separated pair of coordinates of the seed of lake fill (x, y)
#% required: no
#% multiple: yes
#%end

#%option
#% key: level
#% type: string
#% description: Lake level (m)
#% required: no
#% multiple: no
#%end

#Importing libraries

import grass.script as grass
from grass.script import core as grasscore
from grass.pygrass.raster import RasterSegment
import sys

def main(): #starting main function

    #Reading and preparing parameters

    cellsize=options['cellsize']
    elevation=options['elevation']
    lakedepth=options['lakedepth']
    seedcoords=options['seedcoords']
    level=float(options['level'])

    #Setting and reading region

    grass.run_command('g.region', flags='d')
    if cellsize: grass.run_command('g.region', flags='a', res=cellsize)

    c = grass.region()
    m = int(c['rows'])
    n = int(c['cols'])
    res = float(c['nsres'])
    north = float(c['n'])
    west = float(c['w'])

    #Preparing data

    seedcoords=list(map(str, seedcoords.split(',')))
    seedx=float(seedcoords[0])
    seedy=float(seedcoords[1])

    i0 = int((north-seedy)/res)
    j0 = int((seedx-west)/res)

    ctrl = []
    for i in range(0, m):
        ctrl.append([])
        ctrl[i] = []
        for j in range(0, n):
            ctrl[i].append(0)

    #Opening raster maps

    elev = RasterSegment(elevation)
    elev.open('r')

    lakemap = RasterSegment(lakedepth)
    lakemap.open('w', 'DCELL', overwrite=True)

    print (i0, j0, elev[i0][j0])

    #Identifying lake area

    for i in range(i0, 0, -1):

        if elev[i][j0]>=level: break

        for j in range(j0, 0, -1):

            if elev[i][j]>=level: break
            else: ctrl[i][j] = 1

        for j in range(j0, n, 1):
            if elev[i][j]>=level: break
            else: ctrl[i][j] = 1

    for i in range(i0, m, 1):

        if elev[i][j0]>=level: break

        for j in range(j0, 0, -1):
            if elev[i][j]>=level: break
            else: ctrl[i][j] = 1

        for j in range(j0, n, 1):
            if elev[i][j]>=level: break
            else: ctrl[i][j] = 1

    ctrl_complete=0
    while ctrl_complete == 0:

        ctrl_complete = 1

        for i in range(1, m-1):
            for j in range(1, n-1):
        
                if ctrl[i][j] == 1:
            
                    if elev[i][j-1] < level and ctrl[i][j-1] == 0:
                        ctrl[i][j-1] = 1
                        ctrl_complete = 0

                    if elev[i][j+1] < level and ctrl[i][j+1] == 0:
                        ctrl[i][j+1] = 1
                        ctrl_complete = 0

                    if elev[i+1][j] < level and ctrl[i+1][j] == 0:
                        ctrl[i+1][j] = 1
                        ctrl_complete = 0

                    if elev[i-1][j] < level and ctrl[i-1][j] == 0:
                        ctrl[i-1][j] = 1
                        ctrl_complete = 0           

                    if elev[i+1][j-1] < level and ctrl[i+1][j-1] == 0:
                        ctrl[i+1][j-1] = 1
                        ctrl_complete = 0

                    if elev[i+1][j+1] < level and ctrl[i+1][j+1] == 0:
                        ctrl[i+1][j+1] = 1
                        ctrl_complete = 0

                    if elev[i-1][j-1] < level and ctrl[i-1][j-1] == 0:
                        ctrl[i-1][j-1] = 1
                        ctrl_complete = 0

                    if elev[i-1][j+1] < level and ctrl[i-1][j+1] == 0:
                        ctrl[i-1][j+1] = 1
                        ctrl_complete = 0  

    #Writing output and closing raster maps

    for i in range(0, m):
        for j in range(0, n):

            lakemap[i, j] = ctrl[i][j] * ( level - elev[i][j] )

    elev.close()
    lakemap.close()

    grass.run_command('g.region', flags='d')

    sys.exit()

if __name__=='__main__':
    options, flags=grass.parser()
    main()
