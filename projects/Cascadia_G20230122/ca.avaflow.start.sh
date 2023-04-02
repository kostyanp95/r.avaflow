#Launching r.avaflow 3 computational experiments for the Cascadia Training Site

g.region -d
g.region -s rast=ca_elev

r.in.gdal -o --overwrite input=DATA/ca_elev.tif output=ca_elev
r.in.gdal -o --overwrite input=DATA/ca_avalanche.tif output=ca_avalanche
r.in.gdal -o --overwrite input=DATA/ca_debrisflow.tif output=ca_debrisflow
r.in.gdal -o --overwrite input=DATA/ca_progressiveflow.tif output=ca_progressiveflow
r.in.gdal -o --overwrite input=DATA/ca_viscousflow.tif output=ca_viscousflow
r.in.gdal -o --overwrite input=DATA/ca_landslide.tif output=ca_landslide
r.in.gdal -o --overwrite input=DATA/ca_moraine.tif output=ca_moraine
r.in.gdal -o --overwrite input=DATA/ca_impactarea.tif output=ca_impactarea

#Experiment #1 - Rock avalanche
r.avaflow -a prefix=ca_exp1 cellsize=20 aoicoords=4400,2200,1000,4000 phases=x elevation=ca_elev hrelease=ca_avalanche density=2800 friction=35,15,3 time=5,150 visualization=1.0,5.0,5.0,1,200,5,0,3000,50,0.60,0.60,0.10,0.2,1.0,None,None,None basal=-7.0,0.05

#Experiment #2 - Debris flow
r.avaflow prefix=ca_exp2 cellsize=20 aoicoords=4300,1500,3500,5500 phases=m elevation=ca_elev hrelease=ca_debrisflow rhrelease1=0.7 density=2800,1800,1000 friction=35,22,0,0,0,0,0.05 time=5,200 impactarea=ca_impactarea profile=4470,4095,4415,3350,4200,2355,4700,2240,5075,1870 visualization=1.0,5.0,5.0,1,200,5,0,3000,50,0.30,0.30,0.60,0.2,1.0,None,None,None

#Experiment #3 - Flood 
r.avaflow prefix=ca_exp3 cellsize=20 aoicoords=4400,0,5700,7400 phases=f elevation=ca_elev friction=0,0,0.05 time=5,300 hydrocoords=6765,4065,300,75,6520,1100,-600,130 hydrograph=DATA/ca_hydrograph3.txt visualization=1.0,5.0,5.0,1,100,5,0,3000,50,0.20,0.20,0.90,0.2,1.0,None,None,None

#Experiment #4 - Landslide-induced lake outburst flood
r.lakefill cellsize=20 elevation=ca_elev lakedepth=ca_lake4 level=1390 seedcoords=2500,2800

r.avaflow -t prefix=ca_exp4 cellsize=20 phases=m layers=2 controls=0,0,1,2,0,0,0,0,0,2,0 elevation=ca_elev hrelease1=ca_landslide hrelease3=ca_lake4 density=2800,1000,1000 viscosity=2.0,2.0,0,0,1.0,1.0 time=5,150 visualization=1.0,5.0,5.0,1,1000,20,0,3000,50,0.50,0.50,0.50,0.2,1.0,None,None,None

#Experiment #5 - Multi-process scenario
r.mapcalc --overwrite "ca_elev1 = ca_elev+ca_landslide"

r.lakefill cellsize=20 elevation=ca_elev1 lakedepth=ca_lake5 level=1390 seedcoords=2500,2800

r.mapcalc --overwrite "ca_hrelease1 = ca_avalanche+2*ca_debrisflow+ca_progressiveflow*0.6"
r.mapcalc --overwrite "ca_hrelease2 = ca_viscousflow"
r.mapcalc --overwrite "ca_hrelease3 = ca_lake5+ca_progressiveflow*0.4"
r.mapcalc --overwrite "ca_trelease = if(ca_avalanche>0,100,if(ca_viscousflow>0,200,if(ca_progressiveflow>0,100,0)))"
r.mapcalc --overwrite "ca_trelstop = if(ca_avalanche>0,101,if(ca_viscousflow>0,201,if(ca_progressiveflow>0,400,-9999)))"

r.avaflow prefix=ca_exp5 cellsize=20 phases=m controls=0,0,1,2,1,0,0,0,0,2,0 layers=1 elevation=ca_elev1 hrelease1=ca_hrelease1 hrelease2=ca_hrelease2 hrelease3=ca_hrelease3 trelease=ca_trelease trelstop=ca_trelstop hentrmax1=ca_moraine basal=-6.0,0 density=2800,1000,1000 friction=35,22,0,0,0,0,0.05 viscosity=-9999,0.0,1.5,0.0,-3.0,0.0 time=5,600 thresholds=1.0,10000,10000,0.000001 ortho=DATA/ca_ortho.tif hydrocoords=6765,4065,300,75,4870,2145,1000,130 hydrograph=DATA/ca_hydrograph5.txt visualization=1.0,5.0,5.0,1,1000,25,0,3000,50,0.60,0.60,0.10,0.2,1.0,None,None,None

#Experiment #6 - Rock glacier
r.avaflow prefix=ca_exp6 cellsize=20 aoicoords=4400,1800,3500,5500 phases=f controls=0,0,0,0,0,0,0,0,0,2,0 elevation=ca_elev1 hrelease=ca_debrisflow density=2800 viscosity=10,-9999 time=2,200 thresholds=1.0,10000,10000,0.000001 slomo=315360000 ortho=DATA/ca_ortho.tif frictiograph=DATA/ca_frictiograph.txt visualization=1.0,5.0,5.0,5,200,5,0,3000,50,0.50,0.80,0.10,0.2,1.0,None,None,None

#Experiment #7 - Deep-seated gravitational slope deformation
r.mapcalc --overwrite "ca_surf1 = min(max(500,450+(x()-30)*0.24+(y()-1550)*0.58),ca_elev1)"
r.mapcalc --overwrite "ca_surf2 = min(max(500,550+(x()-30)*0.24+(y()-1550)*0.58),ca_elev1)"
r.mapcalc --overwrite "ca_surf3 = min(max(500,650+(x()-30)*0.24+(y()-1550)*0.58),ca_elev1)"

r.mapcalc --overwrite "ca_hrelease1 = if(y()<3900,ca_surf2-ca_surf1,0)"
r.mapcalc --overwrite "ca_hrelease2 = if(y()<3900,ca_surf3-ca_surf2,0)"
r.mapcalc --overwrite "ca_hrelease3 = if(y()<3900,ca_elev1-ca_surf3,0)"
r.mapcalc --overwrite "ca_tslide = 1000"

r.mapcalc --overwrite "ca_elev7 = ca_elev1-ca_hrelease1-ca_hrelease2-ca_hrelease3"

r.avaflow prefix=ca_exp7 cellsize=20 phases=m layers=2 controls=0,0,0,0,0,0,0,0,0,2,0 elevation=ca_elev7 hrelease1=ca_hrelease1 hrelease2=ca_hrelease2 hrelease3=ca_hrelease3 density=2800,2800,2800 viscosity=20,10000000000,20,10000000000,20,10000000000 time=2,100 thresholds=1.0,10000,10000,0.000001 slomo=31536000000 ortho=DATA/ca_ortho.tif visualization=5.0,5.0,5.0,5,1000,5,0,3000,50,0.5,0.5,0.5,0.2,1.0,None,None,None tslide=ca_tslide slidepar=0,0,0 cfl=0.5,0.1 profile=2500,3000,100,100

#Experiment #8 - Rock avalanche, multiple model runs
r.avaflow -m prefix=ca_exp8 cellsize=20 aoicoords=4400,2200,1000,4000 phases=x elevation=ca_elev hrelease=ca_avalanche vhrelease=0.5,2.0,4 density=2800,2800,0 friction=35,35,0,10,25,4,3,3,0 time=5,100 visualization=1.0,5.0,5.0,1,200,5,0,3000,50,0.60,0.60,0.10,0.2,1.0,None,None,None sampling=0 cores=16

#Experiment #9 - Debris flow, multiple model runs
r.avaflow -m prefix=ca_exp9 cellsize=20 phases=m elevation=ca_elev hrelease=ca_debrisflow rhrelease1=0.6,1.0,5 density=2800,2800,0,1800,1800,0,1000,1000,0 friction=35,35,0,16,32,5,0,0,0,0,0,0,0,0,0,0,0,0,0.05,0.05,0 time=5,200 impactarea=ca_impactarea profile=4470,4095,4415,3350,4200,2355,4700,2240,5075,1870 visualization=1.0,5.0,5.0,1,200,5,0,3000,50,0.30,0.30,0.60,0.2,1.0,None,None,None sampling=0 cores=16



g.region -d

