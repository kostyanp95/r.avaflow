#r.avaflow start script for 2904 - created by myself

g.region -d

r.in.gdal -o --overwrite input=DATA/ba_elev.tif output=ba_elev
r.in.gdal -o --overwrite input=DATA/ba_hrelease1.tif output=ba_hrelease1
r.in.gdal -o --overwrite input=DATA/ba_hrelease3.tif output=ba_hrelease3
r.in.gdal -o --overwrite input=DATA/ba_hentrmax1.tif output=ba_hentrmax
r.in.gdal -o --overwrite input=DATA/ba_hentrmax3.tif output=ba_hentrmax3

g.region -s rast=ba_elev

r.avaflow -e -v prefix=2904 cellsize=5 phases=s,fs,f elevation=ba_elev hrelease1=ba_hrelease1 hrelease3=ba_hrelease3 hentrmax1=ba_hentrmax hentrmax3=ba_hentrmax3 density=2600,1300,1000 time=120,3000

g.region -d