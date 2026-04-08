const { calculateQuantityBasedFees, validateQuantity } = require('../utils/quantityFeeCalculator');

/**
 * Test Quantity Fee Calculator
 * Run with: npm test -- quantityFeeCalculator.test.js
 */

console.log('🧪 QUANTITY FEE CALCULATOR TESTS\n');

// Test 1: Simple Rate Calculation (Quantity × Base Rate)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Test 1: Simple Rate Calculation');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const simpleConfig = {
  quantity_label: 'Units',
  quantity_description: 'Number of units',
  base_rate: 100,
  base_rate_label: 'Per Unit',
  min_quantity: 1,
  max_quantity: 1000
};

try {
  const result = calculateQuantityBasedFees(5, simpleConfig);
  console.log('Input: quantity=5, rate=100');
  console.log('Expected: 5 × 100 = 500');
  console.log('Result:', result);
  console.log('Status:', result.totalAmount === 500 ? '✅ PASS' : '❌ FAIL');
} catch (error) {
  console.error('❌ ERROR:', error.message);
}
console.log();

// Test 2: Formula-Based Calculation
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Test 2: Formula-Based Calculation');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const formulaConfig = {
  quantity_label: 'Sqm',
  quantity_description: 'Square meters',
  rate_formula: '{qty} * 50 + 200',  // 50 per unit + flat 200
  min_quantity: 1,
  max_quantity: 10000
};

try {
  const result = calculateQuantityBasedFees(10, formulaConfig);
  console.log('Input: quantity=10, formula="{qty} * 50 + 200"');
  console.log('Expected: (10 * 50) + 200 = 700');
  console.log('Result:', result);
  console.log('Status:', result.totalAmount === 700 ? '✅ PASS' : '❌ FAIL');
} catch (error) {
  console.error('❌ ERROR:', error.message);
}
console.log();

// Test 3: With Additional Charges
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Test 3: With Additional Charges');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const chargesConfig = {
  quantity_label: 'Units',
  quantity_description: 'Number of units',
  base_rate: 100,
  base_rate_label: 'Per Unit',
  additional_charges: [
    { charge_name: 'Processing Fee', amount: 50 },
    { charge_name: 'Documentation Fee', amount: 25 }
  ],
  min_quantity: 1,
  max_quantity: 1000
};

try {
  const result = calculateQuantityBasedFees(3, chargesConfig);
  console.log('Input: quantity=3, rate=100, additional_charges=[50, 25]');
  console.log('Expected: (3 × 100) + 50 + 25 = 375');
  console.log('Result:', result);
  console.log('Status:', result.totalAmount === 375 ? '✅ PASS' : '❌ FAIL');
  console.log('Additional Charges:', result.additionalCharges);
} catch (error) {
  console.error('❌ ERROR:', error.message);
}
console.log();

// Test 4: Quantity Validation - Min Quantity
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Test 4: Quantity Validation - Minimum');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const validationConfig = {
  quantity_label: 'Bottles',
  quantity_description: 'Number of bottles',
  base_rate: 50,
  base_rate_label: 'Per Bottle',
  min_quantity: 10,
  max_quantity: 1000
};

try {
  const result = validateQuantity(5, validationConfig);
  console.log('Input: quantity=5, min=10, max=1000');
  console.log('Expected: isValid=false (below minimum)');
  console.log('Result:', result);
  console.log('Status:', !result.isValid && result.error.includes('10') ? '✅ PASS' : '❌ FAIL');
} catch (error) {
  console.error('❌ ERROR:', error.message);
}
console.log();

// Test 5: Quantity Validation - Max Quantity
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Test 5: Quantity Validation - Maximum');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

try {
  const result = validateQuantity(1500, validationConfig);
  console.log('Input: quantity=1500, min=10, max=1000');
  console.log('Expected: isValid=false (above maximum)');
  console.log('Result:', result);
  console.log('Status:', !result.isValid && result.error.includes('1000') ? '✅ PASS' : '❌ FAIL');
} catch (error) {
  console.error('❌ ERROR:', error.message);
}
console.log();

// Test 6: Quantity Validation - Valid Range
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Test 6: Quantity Validation - Valid Range');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

try {
  const result = validateQuantity(50, validationConfig);
  console.log('Input: quantity=50, min=10, max=1000');
  console.log('Expected: isValid=true');
  console.log('Result:', result);
  console.log('Status:', result.isValid ? '✅ PASS' : '❌ FAIL');
} catch (error) {
  console.error('❌ ERROR:', error.message);
}
console.log();

// Test 7: Complex Formula
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Test 7: Complex Formula (Tiered Pricing)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const tierConfig = {
  quantity_label: 'Items',
  quantity_description: 'Number of items',
  rate_formula: '{qty} > 10 ? {qty} * 50 : {qty} * 100',  // More items = cheaper per item
  min_quantity: 1,
  max_quantity: 1000
};

try {
  const result1 = calculateQuantityBasedFees(5, tierConfig);
  const result2 = calculateQuantityBasedFees(15, tierConfig);
  
  console.log('Input 1: quantity=5 (below 10)');
  console.log('Expected: 5 * 100 = 500');
  console.log('Result:', result1.totalAmount);
  console.log('Status:', result1.totalAmount === 500 ? '✅ PASS' : '❌ FAIL');
  
  console.log('\nInput 2: quantity=15 (above 10)');
  console.log('Expected: 15 * 50 = 750');
  console.log('Result:', result2.totalAmount);
  console.log('Status:', result2.totalAmount === 750 ? '✅ PASS' : '❌ FAIL');
} catch (error) {
  console.error('❌ ERROR:', error.message);
}
console.log();

// Test 8: Decimal Precision
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Test 8: Decimal Precision');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const decimalConfig = {
  quantity_label: 'Liters',
  quantity_description: 'Volume in liters',
  base_rate: 12.50,
  base_rate_label: 'Per Liter',
  min_quantity: 0.1,
  max_quantity: 10000
};

try {
  const result = calculateQuantityBasedFees(3.75, decimalConfig);
  console.log('Input: quantity=3.75, rate=12.50');
  console.log('Expected: 3.75 × 12.50 = 46.875');
  console.log('Result:', result);
  console.log('Status:', Math.abs(result.totalAmount - 46.875) < 0.01 ? '✅ PASS' : '❌ FAIL');
} catch (error) {
  console.error('❌ ERROR:', error.message);
}
console.log();

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ ALL TESTS COMPLETED');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
