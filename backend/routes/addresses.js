const express = require('express');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get municipalities (from Philippine address API or static data)
router.get('/municipalities', async (req, res) => {
  try {
    // Option 1: Use Philippine Address API (if available)
    // const response = await fetch('https://philippines-address-api.com/municipalities');
    // const data = await response.json();
    // return res.json(data);

    // Option 2: Return static list for now (can be expanded)
    const municipalities = [
      'Dalaguete',
      'Cebu City',
      'Lapu-Lapu',
      'Mandaue',
      'Talisay',
      'Toledo',
      'Naga',
      'Consolacion',
      'Liloan',
      'Compostela',
      // Add more as needed
    ];

    res.json(municipalities);
  } catch (error) {
    console.error('Get municipalities error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get barangays for a municipality
router.get('/barangays/:municipality', async (req, res) => {
  try {
    const { municipality } = req.params;

    // Option 1: Use Philippine Address API
    // const response = await fetch(`https://philippines-address-api.com/municipalities/${encodeURIComponent(municipality)}/barangays`);
    // const data = await response.json();
    // return res.json(data);

    // Option 2: Use static data (fallback)
    // This would be loaded from a database or static file
    // For now, return empty array - frontend will use its own data
    res.json([]);
  } catch (error) {
    console.error('Get barangays error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search addresses using external API
router.get('/search', async (req, res) => {
  try {
    const { query, municipality } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Option 1: Use Google Places API or similar
    // Option 2: Use Philippine-specific address API
    // Option 3: Use Nominatim (OpenStreetMap) for geocoding
    
    // Example with Nominatim (free, no API key required)
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + (municipality ? `, ${municipality}, Philippines` : ', Philippines'))}&format=json&addressdetails=1&limit=10`;
    
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'PAMS Application' // Required by Nominatim
      }
    });

    if (!response.ok) {
      throw new Error('Geocoding service unavailable');
    }

    const data = await response.json();
    
    // Format the response
    const addresses = data.map((item) => ({
      display_name: item.display_name,
      address: item.address,
      lat: item.lat,
      lon: item.lon,
      municipality: item.address?.city || item.address?.municipality || item.address?.town,
      province: item.address?.state || item.address?.province,
      barangay: item.address?.suburb || item.address?.village || item.address?.neighbourhood,
    }));

    res.json(addresses);
  } catch (error) {
    console.error('Address search error:', error);
    res.status(500).json({ error: 'Address search service unavailable' });
  }
});

module.exports = router;

