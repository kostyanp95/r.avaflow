const gdal = require('gdal');

// Замените 'path/to/your/raster.tif' на путь к вашему TIFF файлу
const dataset = gdal.open(
  'C:/Work/MyProjects/open-source/r.avaflow/web-app/server/uploads/bs_elev.tif',
);
const rasterBand = dataset.bands.get(1);

// Размер ячеек
const geoTransform = dataset.geoTransform;
const cellWidth = geoTransform[1];
const cellHeight = -geoTransform[5]; // Отрицательное значение, т.к. ось Y идет сверху вниз

// Количество ячеек
const rasterWidth = dataset.rasterSize.x;
const rasterHeight = dataset.rasterSize.y;
const totalCells = rasterWidth * rasterHeight;

console.log(`Размер ячеек: ${cellWidth} x ${cellHeight}`);
console.log(
  `Количество ячеек: ${totalCells} (${rasterWidth} x ${rasterHeight})`,
);
