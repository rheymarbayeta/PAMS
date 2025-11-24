// Barangays by Municipality
// This can be expanded to include more municipalities as needed

export interface MunicipalityBarangays {
  [municipality: string]: string[];
}

export const BARANGAYS_BY_MUNICIPALITY: MunicipalityBarangays = {
  'Dalaguete': [
    // Source: https://tl.wikipedia.org/wiki/Dalaguete and PSA.gov.ph
    // Complete list of 33 barangays in Dalaguete, Cebu
    'Ablayan',
    'Babayongan',
    'Balud',
    'Banhigan',
    'Bulak',
    'Caliongan',
    'Caleriohan',
    'Casay',
    'Catolohan',
    'Cawayan',
    'Consolacion',
    'Coro',
    'Dugyan',
    'Dumalan',
    'Jolomaynon',
    'Lanao',
    'Langkas',
    'Lumbang',
    'Malones',
    'Maloray',
    'Mananggal',
    'Manlapay',
    'Mantalongon',
    'Nalhub',
    'Obo',
    'Obong',
    'Panas',
    'Poblacion',
    'Sacsac',
    'Salug',
    'Tabon',
    'Tapon',
    'Tuba',
  ],
  // Add more municipalities as needed
  // 'Cebu City': [...],
  // 'Lapu-Lapu': [...],
};

// Get barangays for a specific municipality
export const getBarangaysByMunicipality = (municipality: string): string[] => {
  return BARANGAYS_BY_MUNICIPALITY[municipality] || [];
};

// Legacy export for backward compatibility
export const DALAGUETE_BARANGAYS = BARANGAYS_BY_MUNICIPALITY['Dalaguete'] || [];
