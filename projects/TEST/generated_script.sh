g.region -d
r.in.gdal -o --overwrite input=DATA/ba_elevation1.tif output=ba_elevation
r.in.gdal -o --overwrite input=DATA/ba_hrelease1.tif output=ba_hrelease1
r.in.gdal -o --overwrite input=DATA/ba_hrelease3.tif output=ba_hrelease3


g.region -s rast=ba_elevation r.avaflow -e -v cellsize=3 phases=s,fs,f elevation=ba_elevation hrelease1=ba_hrelease1 hrelease3=ba_hrelease3 density=2500,1500,1000 time=60,3000


g.region -d