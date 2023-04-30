g.region -d
r.in.gdal -o --overwrite input=DATA/ba_elevation1.tif output=ba_elevation
r.in.gdal -o --overwrite input=DATA/ba_hrelease1.tif output=ba_hrelease1
r.in.gdal -o --overwrite input=DATA/ba_hentrmax3.tif output=ba_hentrmax3


g.region -s rast=ba_elevation r.avaflow -e -v cellsize=5 phases=f,s,fs elevation=ba_elevation hrelease1=ba_hrelease1 hentrmax3=ba_hentrmax3 density=2700,1800,1000 time=10,300


g.region -d