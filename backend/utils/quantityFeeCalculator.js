// Utility for calculating fees based on quantity and formula
const DECIMAL = require('decimal.js');

/**
 * Calculate fees based on quantity and quantity-based fee configuration
 * @param {number} quantity - The quantity entered by assessor
 * @param {object} quantityFeeConfig - Configuration with base_rate, rate_formula, additional_charges
 * @returns {object} { baseAmount, additionalCharges, totalAmount, breakdown }
 */
const calculateQuantityBasedFees = (quantity, quantityFeeConfig) => {
  try {
    if (!quantityFeeConfig) {
      throw new Error('No quantity fee configuration provided');
    }

    const qty = new DECIMAL(quantity);
    let baseAmount = new DECIMAL(0);
    let breakdown = [];

    // Calculate base amount using formula or simple rate
    if (quantityFeeConfig.rate_formula) {
      // Use custom formula with {qty} placeholder
      try {
        // Replace {qty} placeholder with actual quantity
        let formula = quantityFeeConfig.rate_formula.replace(/{qty}/g, qty.toString());
        
        // Safely evaluate the formula (only math operations allowed)
        // Using a simple approach: only allow numbers and operators
        if (!/^[\d\+\-\*\/\(\)\.\s]+$/.test(formula)) {
          throw new Error('Invalid formula - only numbers and math operators allowed');
        }
        
        // eslint-disable-next-line no-eval
        baseAmount = new DECIMAL(eval(formula));
        breakdown.push({
          name: `Calculated Fee (Formula: ${quantityFeeConfig.rate_formula})`,
          amount: baseAmount.toNumber(),
          formula: `${quantityFeeConfig.rate_formula}`
        });
      } catch (error) {
        throw new Error(`Failed to calculate formula: ${error.message}`);
      }
    } else {
      // Simple: quantity × base_rate
      const baseRate = new DECIMAL(quantityFeeConfig.base_rate);
      baseAmount = qty.times(baseRate);
      breakdown.push({
        name: `${quantityFeeConfig.quantity_label} × ${quantityFeeConfig.base_rate_label}`,
        quantity: quantity,
        rate: quantityFeeConfig.base_rate,
        amount: baseAmount.toNumber()
      });
    }

    // Parse and add additional charges
    let additionalTotal = new DECIMAL(0);
    const additionalChargesBreakdown = [];

    if (quantityFeeConfig.additional_charges) {
      try {
        const charges = typeof quantityFeeConfig.additional_charges === 'string'
          ? JSON.parse(quantityFeeConfig.additional_charges)
          : quantityFeeConfig.additional_charges;

        if (Array.isArray(charges)) {
          charges.forEach(charge => {
            const chargeAmount = new DECIMAL(charge.amount);
            additionalTotal = additionalTotal.plus(chargeAmount);
            additionalChargesBreakdown.push({
              name: charge.charge_name || 'Additional Charge',
              amount: chargeAmount.toNumber()
            });
            breakdown.push({
              name: charge.charge_name || 'Additional Charge',
              amount: chargeAmount.toNumber()
            });
          });
        }
      } catch (error) {
        console.error('Error parsing additional charges:', error);
      }
    }

    const totalAmount = baseAmount.plus(additionalTotal);

    return {
      baseAmount: baseAmount.toNumber(),
      additionalCharges: additionalChargesBreakdown,
      additionalTotal: additionalTotal.toNumber(),
      totalAmount: totalAmount.toNumber(),
      breakdown: breakdown,
      quantity: quantity,
      quantityUnit: quantityFeeConfig.quantity_label
    };
  } catch (error) {
    throw new Error(`Fee calculation error: ${error.message}`);
  }
};

/**
 * Validate quantity against min/max constraints
 * @param {number} quantity - The quantity to validate
 * @param {object} quantityFeeConfig - Configuration with min/max values
 * @returns {object} { isValid, error }
 */
const validateQuantity = (quantity, quantityFeeConfig) => {
  const qty = parseInt(quantity, 10);

  if (isNaN(qty)) {
    return { isValid: false, error: 'Quantity must be a number' };
  }

  if (quantityFeeConfig.min_quantity && qty < quantityFeeConfig.min_quantity) {
    return {
      isValid: false,
      error: `Minimum quantity is ${quantityFeeConfig.min_quantity}`
    };
  }

  if (quantityFeeConfig.max_quantity && qty > quantityFeeConfig.max_quantity) {
    return {
      isValid: false,
      error: `Maximum quantity is ${quantityFeeConfig.max_quantity}`
    };
  }

  return { isValid: true };
};

module.exports = {
  calculateQuantityBasedFees,
  validateQuantity
};
