import { PACKING_MODES } from '../constants/intake.js';

const DIMENSION_DENOMINATOR = 1_000_000_000n;

function toHundredths(value) {
  const [whole, fraction = ''] = String(value).split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2));
}

function roundDivide(numerator, denominator) {
  return (numerator + denominator / 2n) / denominator;
}

function cartonVolumePico(lengthCm, widthCm, heightCm) {
  return toHundredths(lengthCm) * toHundredths(widthCm) * toHundredths(heightCm);
}

function buildSkuResult(product) {
  if (product.packingMode === PACKING_MODES[0]) {
    const { cartons, unitsPerCarton, cartonWeightKg } = product.uniform;
    const lengthCm = product.uniform.cartonLengthCm ?? product.uniform.lengthCm;
    const widthCm = product.uniform.cartonWidthCm ?? product.uniform.widthCm;
    const heightCm = product.uniform.cartonHeightCm ?? product.uniform.heightCm;
    return {
      cartons,
      units: cartons * unitsPerCarton,
      grossWeightCentiKg: BigInt(cartons) * toHundredths(cartonWeightKg),
      volumePicoM3: BigInt(cartons) * cartonVolumePico(lengthCm, widthCm, heightCm)
    };
  }

  return product.boxes.reduce((result, box) => ({
    cartons: result.cartons + 1,
    units: result.units + box.units,
    grossWeightCentiKg: result.grossWeightCentiKg + toHundredths(box.weightKg),
    volumePicoM3: result.volumePicoM3 + cartonVolumePico(box.lengthCm, box.widthCm, box.heightCm)
  }), { cartons: 0, units: 0, grossWeightCentiKg: 0n, volumePicoM3: 0n });
}

export function calculateIntake(products) {
  const calculations = products.map((product) => ({ product, calculated: buildSkuResult(product) }));
  const scaledPerSku = calculations.map(({ product, calculated }) => ({
      sku: product.sku,
      productName: product.productName,
      barcode: product.barcode,
      cartons: calculated.cartons,
      units: calculated.units,
      grossWeightCentiKg: calculated.grossWeightCentiKg,
      volumeMilliM3: roundDivide(calculated.volumePicoM3, DIMENSION_DENOMINATOR)
    }));
  const perSku = scaledPerSku.map(({ grossWeightCentiKg, volumeMilliM3, ...sku }) => ({
    ...sku,
    grossWeightKg: Number(grossWeightCentiKg) / 100,
    volumeM3: Number(volumeMilliM3) / 1000
  }));
  const totals = scaledPerSku.reduce((result, sku) => ({
    skus: result.skus + 1,
    cartons: result.cartons + sku.cartons,
    units: result.units + sku.units,
    grossWeightCentiKg: result.grossWeightCentiKg + sku.grossWeightCentiKg,
    volumeMilliM3: result.volumeMilliM3 + sku.volumeMilliM3
  }), { skus: 0, cartons: 0, units: 0, grossWeightCentiKg: 0n, volumeMilliM3: 0n });

  return {
    perSku,
    totals: {
      skus: totals.skus,
      cartons: totals.cartons,
      units: totals.units,
      grossWeightKg: Number(totals.grossWeightCentiKg) / 100,
      volumeM3: Number(totals.volumeMilliM3) / 1000
    }
  };
}

