MODULE_TOPDIR = ../..

PGM = r.avaflow.main

EXTRA_INC = $(PROJINC) $(GDALCFLAGS)
LIBES = $(GISLIB) $(SEGMENTLIB) $(RASTERLIB) $(GMATHLIB)
DEPENDENCIES = $(GPROJDEP) $(GISDEP) $(GMATHDEP)

include $(MODULE_TOPDIR)/include/Make/Module.make

default: cmd
