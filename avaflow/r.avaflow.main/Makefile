MODULE_TOPDIR = ../..

PGM = r.avaflow.main

EXTRA_INC = $(PROJINC) $(GDALCFLAGS)
EXTRA_CFLAGS = -fopenmp -O3 -fno-math-errno -funroll-loops
LIBES = $(GISLIB) $(SEGMENTLIB) $(RASTERLIB) $(GMATHLIB) -lgomp
DEPENDENCIES = $(GPROJDEP) $(GISDEP) $(GMATHDEP)

include $(MODULE_TOPDIR)/include/Make/Module.make

default: cmd
