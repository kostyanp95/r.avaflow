g.region -d

g.region -s rast=ba_elevation1.tif

r.in.gdal -o --overwrite input=DATA/ba_elevation1.tif output=ba_elevation1
r.in.gdal -o --overwrite input=DATA/ba_hrelease3.tif output=ba_hrelease3
r.in.gdal -o --overwrite input=DATA/ba_hrelease1.tif output=ba_hrelease1
r.in.gdal -o --overwrite input=DATA/ba_hentrmax1.tif output=ba_hentrmax1
r.in.gdal -o --overwrite input=DATA/ba_hentrmax3.tif output=ba_hentrmax3

# 1 Experiment: 1
r.avaflow -e -v cellsize=3 phases=s,fs,f elevation=ba_elevation1.tif hrelease1=ba_hrelease3.tif hrelease2=null hrelease3=ba_hrelease1.tif hentrmax1=ba_hentrmax1.tif hentrmax2=null hentrmax3=ba_hentrmax3.tif rhentrmax1=1 density=2000,1000,500 time=100,1000

# 2 Experiment: 1
r.avaflow -e -v cellsize=3 phases=s,fs,f elevation=ba_elevation1.tif hrelease1=ba_hrelease3.tif hrelease2=null hrelease3=ba_hrelease1.tif hentrmax1=ba_hentrmax1.tif hentrmax2=null hentrmax3=ba_hentrmax3.tif rhentrmax1=1 density=2000,1000,500 time=100,1000

g.region -d