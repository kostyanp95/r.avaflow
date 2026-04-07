# r.avaflow Parameter Reference

> Complete parameter reference for web-app tooltips, validation, and form configuration.
> Sources: r.avaflow.40G.py, landslidemodels.org/r.avaflow/direct.php, FORM_COMPARISON_REPORT.md.

---

## Step 0: Project and Simulation Setup

| Parameter | Description (EN) | Affects (EN) | Description (RU) | Affects (RU) | Type | Default | Min | Max | Validation |
|-----------|-----------------|-------------|------------------|-------------|------|---------|-----|-----|------------|
| prefix | Prefix for output files and folders | Affects: naming of all output files | Префикс для выходных файлов и папок | Влияет на: именование файлов | string | avf | null | null | Alphanumeric+underscore, max 20 |
| cellsize | Cell size in metres. Smaller=more accurate, quadratically slower | Affects: resolution, time (~x4 per halving), memory | Размер ячейки (м). Меньше=точнее, квадратично дольше | Влияет на: разрешение, время, память | float | from DEM | 1 | null | >= 1 |
| phases | 1=single-phase, 3=multi-phase (P1 Solid, P2 Fine-solid, P3 Fluid) | Affects: material params, outputs, inter-phase interactions | 1=однофазная, 3=многофазная (P1 Твёрдая, P2 Мелко-твёрдая, P3 Жидкая) | Влияет на: параметры, выход, взаимодействия | integer | 1 | null | null | 1 or 3 |
| ctopo | 0=vertical heights, 1=slope-normal | Affects: height interpretation. Slope-normal better for steep | 0=вертикальные высоты, 1=по нормали к склону | Влияет на: интерпретацию высот | integer | 0 | 0 | 1 | 0 or 1 |
| limiter | TVD: 1=Minmod(stable), 2=Superbee(sharp), 3=Woodward, 4=vanLeer | Affects: numerical diffusion of flow fronts | TVD: 1=Minmod(устойч.), 2=Superbee(резкий), 3=Woodward, 4=vanLeer | Влияет на: диффузию фронтов потока | integer | 1 | 1 | 4 | 1-4 |
| gravity | Gravitational acceleration (m/s2). Earth=9.81 | Affects: all forces - velocity, runout, pressure, energy | Ускорение свободного падения (м/с2). Земля=9.81 | Влияет на: все силы | float | 9.81 | 0.01 | null | > 0 |
| cores | CPU cores for parallel Monte Carlo runs | Affects: parallelization of multiple runs only | Ядра CPU для параллельных Монте-Карло | Влияет на: параллелизацию множественных запусков | integer | 8 | 1 | null | Only flag_m=1 |
| threshold1 | Min flow height for display (m) | Affects: visible cells. Lower=more detail+noise | Мин. высота потока для отображения (м) | Влияет на: видимые ячейки | float | 0.1 | 0 | null | >= 0 |
| threshold2 | Kinetic energy threshold (J) | Affects: KE map filtering | Порог кинетической энергии (Дж) | Влияет на: фильтрацию карт КЭ | float | 10000 | 0 | null | >= 0 |
| threshold3 | Pressure threshold (Pa) | Affects: pressure map filtering | Порог давления (Па) | Влияет на: фильтрацию карт давления | float | 10000 | 0 | null | >= 0 |
| threshold4 | Height for velocity display (m) | Affects: velocity maps | Порог высоты для скорости (м) | Влияет на: карты скоростей | float | 0.1 | 0 | null | >= 0 |
| threshold5 | Numerical threshold (m). Below=dry. Critical | Affects: stability, active cell detection | Численный порог (м). Ниже=сухая. Критичен | Влияет на: устойчивость | float | 0.000001 | 1e-7 | 0.01 | > 0 |
| cfl_number | CFL number. Lower=stable, slower. Max 0.5 | Affects: time step, stability | Число CFL. Меньше=устойчивее. Макс 0.5 | Влияет на: шаг, устойчивость | float | 0.40 | 0.01 | 0.5 | (0, 0.5] |
| cfl_timestep | Fixed alt timestep (s). >0 overrides CFL | Affects: time stepping | Фикс. шаг (с). >0 заменяет CFL | Влияет на: шаг по времени | float | 0.001 | 0 | null | Typically 0.001 |
| slomo_time | Time scale. 1=real. min=60, h=3600, d=86400. Neg=geological | Affects: temporal scale for slow processes | Масштаб времени. 1=реальное. min=60, h=3600 | Влияет на: масштаб | float | 1.0 | null | null | Presets ok |
| slomo_viscosity | Viscosity scaling. 1.0=no change | Affects: viscosity in slow-motion | Масштаб вязкости. 1.0=без изм. | Влияет на: вязкость | float | 1.0 | null | null | Usually 1.0 |
| slomo_flux | Flux scaling. 1.0=no change | Affects: mass flux in slow-motion | Масштаб потока. 1.0=без изм. | Влияет на: поток массы | float | 1.0 | null | null | Usually 1.0 |
| flag_m | Monte Carlo multiple runs | Affects: single vs ensemble mode | Множественные запуски Монте-Карло | Влияет на: режим | boolean | false | null | null | Requires sampling |
| sampling | +N=random, 0=controlled, -N=OAT sensitivity | Affects: MC run count/method | +N=случайные, 0=контр., -N=OAT | Влияет на: число/метод запусков | integer | 100 | null | null | Only flag_m=1 |
| aoi_north | North boundary coordinate | Affects: computation domain | Северная граница | Влияет на: расч. область | float | from DEM | null | null | Valid bbox |
| aoi_south | South boundary coordinate | Affects: computation domain | Южная граница | Влияет на: расч. область | float | from DEM | null | null | < north |
| aoi_west | West boundary coordinate | Affects: computation domain | Западная граница | Влияет на: расч. область | float | from DEM | null | null | < east |
| aoi_east | East boundary coordinate | Affects: computation domain | Восточная граница | Влияет на: расч. область | float | from DEM | null | null | Valid bbox |

---


## Step 1: Terrain and Release


| Parameter | Description (EN) | Affects (EN) | Description (RU) | Affects (RU) | Type | Default | Min | Max | Validation |
|-----------|-----------------|-------------|------------------|-------------|------|---------|-----|-----|------------|
| elevation | Input DEM raster. In release area = bottom of flow. Required | Affects: all topographic computations | Входной растр высот. В зоне выпуска = дно потока. Обязателен | Влияет на: все топографические расчёты | raster | null | null | null | Required |
| hrelease1 | Release height P1 Solid (m). Non-zero=release area | Affects: initial solid volume and location | Высота выпуска P1 Твёрдая (м) | Влияет на: начальный объём твёрдой фазы | raster | null | null | null | hrelease or hydrograph req |
| hrelease2 | Release height P2 Fine-solid (m). phases=3 | Affects: initial fine-solid volume | Высота выпуска P2 Мелко-твёрдая (м) | Влияет на: объём мелко-твёрдой фазы | raster | null | null | null | Only phases=3 |
| hrelease3 | Release height P3 Fluid (m). phases=3 | Affects: initial fluid volume | Высота выпуска P3 Жидкая (м) | Влияет на: объём жидкой фазы | raster | null | null | null | Only phases=3 |
| rhrelease1 | P1 ratio (0-1) of total release | Affects: phase partitioning | Доля P1 (0-1) общего выпуска | Влияет на: распределение по фазам | float | null | 0 | 1 | Req if hrelease+phases=3 |
| vhrelease | Release height variation (min,max) | Affects: MC height variation | Вариация высоты выпуска | Влияет на: вариацию высоты | list | null | null | null | Only flag_m=1 |
| trelease | Release start time raster (s) | Affects: temporal sequence | Растр начала выпуска (с) | Влияет на: последовательность | raster | null | null | null | Optional |
| trelstop | Release stop time raster (s). Continuous source | Affects: source duration | Растр остановки выпуска (с) | Влияет на: длительность источника | raster | null | null | null | Optional |
| vinx1-3 | Phase velocity X rasters (m/s). East=positive | Affects: initial momentum | Скорость по X (м/с). Восток=полож. | Влияет на: начальный импульс | raster | null | null | null | Optional |
| viny1-3 | Phase velocity Y rasters (m/s). North=positive | Affects: initial momentum | Скорость по Y (м/с). Север=полож. | Влияет на: начальный импульс | raster | null | null | null | Optional |
| hydrograph | Hydrograph file(s). Time-varying inflow | Affects: mass inflow over time | Файл(ы) гидрографа | Влияет на: приток массы | string | null | null | null | Requires hydrocoords |
| hydrocoords | Hydro coords: x,y,length,direction(deg) | Affects: inflow location | Координаты: x,y,длина,направление | Влияет на: расположение притока | list | null | null | null | Req with hydrograph |
---


## Step 2: Material Properties


### Core Parameters


| Parameter | Description (EN) | Description (RU) | Type | Def 1ph | Def 3ph | Min | Max | Validation |
|-----------|-----------------|------------------|------|---------|---------|-----|-----|------------|
| density0 | P1 density (kg/m3). Rock=2700 | P1 плотность. Порода=2700 | float | 2700 | 2700 | 1 | null | Required |
| density1 | P2 density. Wet debris=1800 | P2 плотность. Обломки=1800 | float | - | 1850 | 1 | null | phases=3 |
| density2 | P3 density. Water=1000 | P3 плотность. Вода=1000 | float | - | 1000 | 1 | null | phases=3 |
| friction0 | P1 internal friction (deg). 30-40 | P1 внутр. трение. 30-40 | float | 35 | 35 | 0 | 90 | Degrees |
| friction1 | P1 basal friction. Runout control | P1 базальное. Контроль дальности | float | 20 | 17.5 | 0 | 90 | <friction0 |
| friction2 | P1 fluid friction. 0=Coulomb | P1 жидкое. 0=кулоновский | float | 0.0 | 0.0 | 0 | null | >=0 |
| friction3-5 | P2 int/basal/fluid (phases=3) | P2 внутр/базальн/жидк | float | - | 17.5,10,0 | 0 | 90 | phases=3 |
| friction6-8 | P3 int/basal/fluid. Water=0 | P3 трения. Вода=0 | float | - | 0,0,0 | 0 | 90 | phases=3 |
| cohesion0 | P1 cohesion (N/m2). 0=non-cohesive | P1 когезия. 0=несвязный | float | 0.0 | 0.0 | 0 | null | >=0 |
| cohesion1-2 | P2,P3 cohesion (phases=3) | P2,P3 когезия | float | - | 0.0,0.0 | 0 | null | phases=3 |
| viscosity0 | P1 log10(visc) (m2/s). -7=1e-7 | P1 log10(вязк). -7=1e-7 | float | -7.0 | -7.0 | null | null | Log10 |
| viscosity1-2 | P2,P3 log10(visc) | P2,P3 log10(вязк) | float | - | -7,-7 | null | null | phases=3 |
| deformation0 | P1 deform (0-1). 1=full,0=rigid | P1 деформ. 1=полная,0=блок | float | 1.0 | 1.0 | 0 | 1 | 0-1 |
| deformation1-2 | P2,P3 deform (phases=3) | P2,P3 деформ | float | - | 1.0,1.0 | 0 | 1 | phases=3 |

### Controls


| Parameter | Description (EN) | Description (RU) | Default | Options |
|-----------|-----------------|------------------|---------|---------|
| clayers | 0=off, 1=solid basal layer, 2=adv | 0=выкл, 1=твёрдая снизу, 2=расш | 0 | 0,1,2 |
| cdispersion | 0=off, 1-3=pressure spreading | 0=выкл, 1-3=дисперсия | 0 | 0,1,2,3 |
| csurface | 0=off, 1=edges, 2=within, 3=both | 0=выкл, 1=края, 2=внутри, 3=оба | 0 | 0,1,2,3 |

### Inter-phase Drag (phases=3)


| Parameter | Description (EN) | Description (RU) | Default |
|-----------|-----------------|------------------|---------|
| drag0 | KDrag (m/s). Momentum exchange | KDrag (м/с). Обмен импульсом | 1 |
| drag1 | Exponent J. Stokes=3 | Показатель J. Стокс=3 | 3 |
| drag2 | Drag type | Тип сопротивления | 1 |
| drag3 | Terminal velocity Ut (m/s) | Конечная скорость (м/с) | 0.1 |
| drag4 | Reynolds Rep | Число Рейнольдса | 1 |
| drag5 | Drag control | Контроль сопр. | 1 |
| vm0 | Virtual mass number (10) | Виртуальная масса (10) | 10 |
| vm1 | VM coefficient | Коэфф. ВМ | 0.12 |
| vm2 | VM control | Контроль ВМ | 1 |

### Advanced (default 0.0)


| Parameter | Description (EN) | Description (RU) | Type |
|-----------|-----------------|------------------|------|
| slidepar0-5 | Sliding exp+frac per phase. 0=deform | Скольжение по фазам. 0=деформ | float |
| shearing | Energy loss through shearing | Потери через сдвиг | float |
| fragmentation0-1 | Rock breakup. 0=none | Фрагментация. 0=нет | float |
| ambient | Air drag. 0=none | Сопр. воздуха. 0=нет | float |

### Spatial Raster Overrides


| Parameter | Description | Type |
|-----------|-------------|------|
| phi1-3 | Spatial internal friction per phase | raster |
| delta1-3 | Spatial basal friction per phase | raster |
| addfri1-3 | Spatial additional friction | raster |
| coh1-3 | Spatial cohesion per phase | raster |
| ny1-3 | Spatial viscosity per phase | raster |
| cdeform | Spatial deformation (0-1) | raster |
| zfrag | Fragmentation zones | raster |
| ambdrag | Spatial ambient drag | raster |
| frictiograph | Time-varying friction file | string |
| tslide | Initial sliding time (s) | raster |
---

## Step 3: Entrainment, Stopping and Phase Transformation

### Entrainment

| Parameter | Description (EN) | Description (RU) | Type | Default | Validation |
|-----------|-----------------|------------------|------|---------|------------|
| centrainment | 0=off, 1=momentum-based, 9=experimental | 0=off, 1=impulse, 9=exp | integer | 0 | Must be 0,1,9 |
| entrainment_coeff | LOG10 of coeff. -7.0=1e-7 | LOG10. -7.0=1e-7 | float | -7.0 | Only centrainment=1 |
| stopping_threshold | Deposit when criterion below this | Deposit below threshold | float | 0.0 | Only cstopping>0 |
| hentrmax1-3 | Max entrainment depth per phase (m) | Max depth per phase | raster | null | Only centrainment=1 |
| rhentrmax1 | P1 entrainment ratio (0-1) | P1 ratio (0-1) | float | null | Req if hentrmax+phases=3 |
| vhentrmax | Entrainment variation (min,max) | Variation | list | null | Only flag_m=1 |
| centr | Spatial entrainment coeff (log10) | Spatial coeff (log10) | raster | null | Only centrainment=1 |

### Stopping

| Parameter | Description (EN) | Description (RU) | Default | Options |
|-----------|-----------------|------------------|---------|----------|
| cstopping | 0=off, 1=KE, 2=momentum, 3=pressure | 0=off, 1=KE, 2=momentum, 3=pressure | 0 | 0,1,2,3 |
| tstop | Stopping time raster (s) | Stopping time (s) | null | Optional |

### Phase Transformation

| Parameter | Description (EN) | Description (RU) | Default | Validation |
|-----------|-----------------|------------------|---------|------------|
| cmelt | 0=off, 1=temperature/melting | 0=off, 1=melt | 0 | 0 or 1 |
| transformation0 | P1-P2 (log10). 0=none | P1-P2 (log10) | 0.0 | phases=3 |
| transformation1 | P1-P3 (log10) | P1-P3 (log10) | 0.0 | phases=3 |
| transformation2 | P2-P3 (log10) | P2-P3 (log10) | 0.0 | phases=3 |
| melting0 | Landslide temp (C) | Temp landslide (C) | 0 | cmelt=1 |
| melting1 | Atmospheric temp (C) | Temp atmosphere (C) | 0 | cmelt=1 |
| melting2 | Ground temp (C) | Temp ground (C) | 0 | cmelt=1 |
| melting3 | Melt efficiency (0-1) | Efficiency (0-1) | 0.2 | cmelt=1, 0-1 |
| melting4 | Sliding fraction (0-1) | Sliding frac (0-1) | 0.5 | cmelt=1, 0-1 |
| ctrans12-23 | Spatial transform rasters | Transform rasters | null | phases=3 |
| transformograph | Time-varying file | Time-varying file | null | Optional |

---

## Step 4: Output and Timing

| Parameter | Description (EN) | Description (RU) | Type | Default | Validation |
|-----------|-----------------|------------------|------|---------|------------|
| tint | Output interval (s) | Interval (s) | float | 10 | >=1, <=tend |
| tend | End time (s) | End time (s) | float | 300 | >=tint |
| flag_k | Keep GRASS rasters | Keep GRASS | boolean | false | Optional |
| flag_a | Velocity/pressure/KE rasters | V/P/KE rasters | boolean | false | Optional |
| flag_t | Tsunami height rasters | Tsunami rasters | boolean | false | Optional |
| flag_v | R visualizations. Default on | R viz. Default on | boolean | true | Requires R |
| impactarea | Observed impact (binary 0/1) | Impact (0/1) | raster | null | Optional |
| hdeposit | Observed deposit height (m) | Deposit (m) | raster | null | Optional |
| zones | Zone classification | Zones | raster | null | Optional |
| profile | Profile coords (x1,y1,...) | Profile (x1,y1,...) | list | null | Even count |
| ctrlpoints | Control points (x1,y1,...) | Points (x1,y1,...) | list | null | Even count |

---

## Step 5: Visualization

| Parameter | Description (EN) | Description (RU) | Type | Default | Min | Max |
|-----------|-----------------|------------------|------|---------|-----|-----|
| pbgr/pbgg/pbgb | RGB orthophoto channels | RGB ортофото | raster | null | null | null |
| viz_deform | 0=none, 1=deform with flow | 0=none, 1=with flow | integer | 0 | 0 | 1 |
| viz_hflowmin | Min flow height for viz (m) | Min height (m) | float | 0.1 | 0 | null |
| viz_hflowref | Ref flow height for color (m) | Ref height (m) | float | 5.0 | 0.01 | null |
| viz_htsunref | Ref tsunami height (m) | Ref tsunami (m) | float | 5.0 | 0.01 | null |
| viz_hcontmin | Min flow contour (m) | Min contour (m) | float | 1 | 0 | null |
| viz_hcontmax | Max flow contour (m) | Max contour (m) | float | 100 | 0 | null |
| viz_hcontint | Flow contour interval (m) | Interval (m) | float | 2 | 0.1 | null |
| viz_zcontmin | Min elev contour (m) | Min elev (m) | float | -11000 | null | null |
| viz_zcontmax | Max elev contour (m) | Max elev (m) | float | 9000 | null | null |
| viz_zcontint | Elev contour interval (m) | Elev interval (m) | float | 100 | 1 | null |
| viz_pred | Red weight (0-1) | Red (0-1) | float | 0.60 | 0 | 1 |
| viz_pgreen | Green weight (0-1) | Green (0-1) | float | 0.25 | 0 | 1 |
| viz_pblue | Blue weight (0-1) | Blue (0-1) | float | 0.15 | 0 | 1 |
| viz_pexp | Transparency exponent | Transparency | float | 0.2 | 0 | null |
| viz_phexagg | Profile height exaggeration | Exaggeration | float | 1.0 | 0.1 | null |
| viz_pvpath | ParaView pvpython path | pvpython path | string | see code | null | null |
| viz_rscriptpath | Rscript path | Rscript path | string | see code | null | null |

---

## Flow Parameter Encoding

**Single-phase (15):** density, friction(3: int,basal,fluid), cohesion, viscosity, deformation, slidepar(2: exp,frac), shearing, fragmentation(2), ambient, entrainment_coeff, stopping_threshold
Default: 2700, 35,20,0.0, 0.0, -7.0, 1.0, 0.0,0.0, 0.0, 0.0,0.0, 0.0, -7.0, 0.0

**Multi-phase (50):** density(3), friction(9: 3x[int,basal,fluid]), cohesion(3), viscosity(3), deformation(3), slidepar(6: 3x[exp,frac]), shearing, fragmentation(2), ambient, entrainment_coeff, stopping_threshold, drag(6), virtualmass(3), transformation(3), melting(5)
Default: 2700,1850,1000, 35,17.5,0,20,10,0,0,0,0, 0,0,0, -7,-7,-7, 1,1,1, 0,0,0,0,0,0, 0, 0,0, 0, -7,0, 1,3,1,0.1,1,1, 10,0.12,1, 0,0,0, 0,0,0,0.2,0.5

**Visualization (18):** viz_deform, hflowmin, hflowref, htsunref, hcontmin, hcontmax, hcontint, zcontmin, zcontmax, zcontint, pred, pgreen, pblue, pexp, phexagg, pvpath, rscriptpath, ortho
Default: 0, 0.1, 5.0, 5.0, 1, 100, 2, -11000, 9000, 100, 0.60, 0.25, 0.15, 0.2, 1.0, [pvpython], [Rscript], None

---

## Key Validation Rules

1. **elevation** required for execution
2. **At least one release**: hrelease, hrelease1/2/3, or hydrograph
3. **phases=3 + hrelease** requires rhrelease1
4. **phases=3 + hentrmax** requires rhentrmax1
5. **hydrograph** requires hydrocoords
6. **centrainment=1** required for entrainment params
7. **cstopping > 0** required for stopping_threshold
8. **cmelt=1** required for melting params
9. **Entrainment coeff = LOG10** (NOT linear). -7.0 = 1e-7
10. **Viscosity = LOG10** (m2/s). -7.0 = 1e-7
11. **CFL <= 0.5**
12. **tend >= tint**
13. **thresholds**: exactly 5 values
14. **CFL**: exactly 2 values
15. **visualization**: exactly 18 values
