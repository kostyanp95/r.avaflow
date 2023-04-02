#!/usr/bin/env python3

##############################################################################
#
# MODULE:       r.avaflow.mult.py
#
# AUTHOR:       Martin Mergili
# CONTRIBUTORS: Massimiliano Alvioli and Ivan Marchesini
#
# PURPOSE:      The simulation model for avalanche and debris flows
#               Script for multi-core processing
#
# COPYRIGHT:    (c) 2013 - 2023 by the author
#               (c) 2020 - 2023 by the University of Graz
#               (c) 2013 - 2021 by the BOKU University, Vienna
#               (c) 2015 - 2020 by the University of Vienna
#               (c) 1999 - 2023 by the GRASS Development Team
#
# VERSION:      20230105 (5 January 2023)
#
#               This program is free software under the GNU General Public
#               License (>=v2). Read the file COPYING that comes with GRASS
#               for details.
#
##############################################################################

#%module
#% description: The mass flow simulation tool: multi-core processing
#% keywords: Raster
#% keywords: Landslide
#% keywords: Numerical simulation
#%end

import grass.script as grass  # importing libraries
import os


def main():

    cellsize = os.environ["cellsize"]  # importing pixel size
    rnorth = os.environ["rnorth"]  # importing boundaries
    rsouth = os.environ["rsouth"]
    rwest = os.environ["rwest"]
    reast = os.environ["reast"]

    jid = os.environ["jid"]  # importing number of model run
    os.environ["XINT"] = jid  # exporting number of model run

    grass.run_command("g.region", flags="d")  # setting default region
    grass.run_command(
        "g.region", flags="a", n=rnorth, s=rsouth, w=rwest, e=reast
    )  # updating bounds
    grass.run_command("g.region", flags="a", res=cellsize)  # updating pixel size

    print()
    print("Routing flow.")
    print()

    grass.run_command("r.avaflow.main")  # executing r.avaflow.main

    print()
    print("Completed.")
    print()


if __name__ == "__main__":
    options, flags = grass.parser()
    main()
