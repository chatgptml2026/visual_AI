require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Geocode (Nominatim)
app.post('/geocode', async (req, res) => {
    try {
        const { destination } = req.body;

        const response = await axios.get(
            'https://nominatim.openstreetmap.org/search',
            {
                params: { q: destination, format: 'json', limit: 1 },
                headers: { 'User-Agent': 'accessible-navigation-app' }
            }
        );

        if (!response.data.length) {
            return res.status(404).json({ error: "Location not found" });
        }

        res.json({
            lat: response.data[0].lat,
            lon: response.data[0].lon
        });

    } catch {
        res.status(500).json({ error: "Geocoding failed" });
    }
});

// Route (OSRM)
app.post('/route', async (req, res) => {
    try {
        const { origin, destination } = req.body;

        const response = await axios.get(
            `https://router.project-osrm.org/route/v1/foot/` +
            `${origin.longitude},${origin.latitude};${destination.lon},${destination.lat}`,
            {
                params: {
                    steps: true,
                    overview: "full",
                    geometries: "geojson"
                }
            }
        );

        const route = response.data.routes[0];

        res.json({
            distance: (route.distance / 1000).toFixed(2) + " km",
            duration: Math.round(route.duration / 60) + " mins",
            geometry: route.geometry.coordinates,
            steps: route.legs[0].steps.map(s => s.maneuver.instruction)
        });

    } catch {
        res.status(500).json({ error: "Routing failed" });
    }
});

app.listen(5000, () => console.log("Server running on port 5000"));
