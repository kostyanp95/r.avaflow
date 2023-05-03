g.region -d
r.in.gdal -o --overwrite input=DATA/ba_elevation1.tif output=ba_elevation
r.in.gdal -o --overwrite input=DATA/ba_hrelease1.tif output=ba_hrelease1
r.in.gdal -o --overwrite input=DATA/ba_hrelease3.tif output=ba_hrelease3
r.in.gdal -o --overwrite input=DATA/ba_hentrmax1.tif output=ba_hentrmax1
r.in.gdal -o --overwrite input=DATA/ba_hentrmax3.tif output=ba_hentrmax3

#1 Experiment Name
g.region -s rast=ba_elevation r.avaflow -e -v cellsize=2 phases=s,fs,f elevation=ba_elevation hrelease1=ba_hrelease1 hrelease3=ba_hrelease3 hentrmax1=ba_hentrmax1 hentrmax3=ba_hentrmax3 rhentrmax1=1 density=2300,1200,400 time=100,1000

#2 Experiment Name
g.region -s rast=ba_elevation r.avaflow -e -v cellsize=2 phases=s,fs,f elevation=ba_elevation hrelease1=ba_hrelease1 hrelease3=ba_hrelease3 hentrmax1=ba_hentrmax1 hentrmax3=ba_hentrmax3 rhentrmax1=1 density=2300,1200,400 time=100,1000

...

#N Experiment Name
g.region -s rast=ba_elevation r.avaflow -e -v cellsize=2 phases=s,fs,f elevation=ba_elevation hrelease1=ba_hrelease1 hrelease3=ba_hrelease3 hentrmax1=ba_hentrmax1 hentrmax3=ba_hentrmax3 rhentrmax1=1 density=2300,1200,400 time=100,1000


g.region -d
