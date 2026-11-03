import { describe, test, expect } from '@jest/globals';
import { calculateIntake } from '../src/utils/intakeCalc.js';

describe('calculateIntake', () => {
  test('calculates uniform cartons using integer-scaled weight and volume', () => {
    const result = calculateIntake([{
      sku: 'SKU-1', productName: 'Storage bin', barcode: '12345678', packingMode: 'uniform',
      uniform: { cartons: 10, unitsPerCarton: 24, cartonWeightKg: 12, cartonLengthCm: 40, cartonWidthCm: 30, cartonHeightCm: 25 }
    }]);
    expect(result.perSku).toEqual([{ sku: 'SKU-1', productName: 'Storage bin', barcode: '12345678', cartons: 10, units: 240, grossWeightKg: 120, volumeM3: 0.3 }]);
    expect(result.totals).toEqual({ skus: 1, cartons: 10, units: 240, grossWeightKg: 120, volumeM3: 0.3 });
  });

  test('sums individual boxes before rounding the per-SKU volume', () => {
    const result = calculateIntake([{
      sku: 'BOX-1', productName: 'Small parts', barcode: '123456789012', packingMode: 'individual',
      boxes: [
        { units: 1, weightKg: 0.11, lengthCm: 10, widthCm: 10, heightCm: 10 },
        { units: 2, weightKg: 0.12, lengthCm: 10, widthCm: 10, heightCm: 10 }
      ]
    }]);
    expect(result.perSku[0]).toMatchObject({ cartons: 2, units: 3, grossWeightKg: 0.23, volumeM3: 0.002 });
  });
});
