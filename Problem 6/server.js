const express = require('express');
const cors = require('cors');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/', limiter);

// Free APIs we'll use
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || 'demo'; // OpenWeatherMap (free tier)
const WEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Backend API Routes

// Get weather by city name
app.get('/api/weather/city/:cityName', async (req, res) => {
    try {
        const { cityName } = req.params;
        
        const response = await axios.get(`${WEATHER_BASE_URL}/weather`, {
            params: {
                q: cityName,
                appid: WEATHER_API_KEY,
                units: 'metric'
            }
        });

        const weatherData = {
            city: response.data.name,
            country: response.data.sys.country,
            temperature: Math.round(response.data.main.temp),
            description: response.data.weather[0].description,
            icon: response.data.weather[0].icon,
            humidity: response.data.main.humidity,
            pressure: response.data.main.pressure,
            windSpeed: response.data.wind.speed,
            feelsLike: Math.round(response.data.main.feels_like),
            visibility: response.data.visibility / 1000, // Convert to km
            timestamp: new Date().toISOString()
        };

        res.json({
            success: true,
            data: weatherData,
            source: 'backend'
        });

    } catch (error) {
        console.error('Weather API error:', error.response?.data || error.message);
        
        if (error.response?.status === 404) {
            return res.status(404).json({
                success: false,
                message: 'City not found'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to fetch weather data'
        });
    }
});

// Get weather by coordinates
app.get('/api/weather/coordinates', async (req, res) => {
    try {
        const { lat, lon } = req.query;
        
        if (!lat || !lon) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and longitude are required'
            });
        }

        const response = await axios.get(`${WEATHER_BASE_URL}/weather`, {
            params: {
                lat: parseFloat(lat),
                lon: parseFloat(lon),
                appid: WEATHER_API_KEY,
                units: 'metric'
            }
        });

        const weatherData = {
            city: response.data.name,
            country: response.data.sys.country,
            temperature: Math.round(response.data.main.temp),
            description: response.data.weather[0].description,
            icon: response.data.weather[0].icon,
            humidity: response.data.main.humidity,
            pressure: response.data.main.pressure,
            windSpeed: response.data.wind.speed,
            feelsLike: Math.round(response.data.main.feels_like),
            visibility: response.data.visibility / 1000,
            coordinates: { lat: parseFloat(lat), lon: parseFloat(lon) },
            timestamp: new Date().toISOString()
        };

        res.json({
            success: true,
            data: weatherData,
            source: 'backend'
        });

    } catch (error) {
        console.error('Weather API error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch weather data'
        });
    }
});

// Get random quote (another free API)
app.get('/api/quote', async (req, res) => {
    try {
        const response = await axios.get('https://api.quotable.io/random');
        
        res.json({
            success: true,
            data: {
                quote: response.data.content,
                author: response.data.author,
                tags: response.data.tags
            },
            source: 'backend'
        });

    } catch (error) {
        console.error('Quote API error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch quote'
        });
    }
});

// Get random cat fact (another free API)
app.get('/api/catfact', async (req, res) => {
    try {
        const response = await axios.get('https://catfact.ninja/fact');
        
        res.json({
            success: true,
            data: {
                fact: response.data.fact,
                length: response.data.length
            },
            source: 'backend'
        });

    } catch (error) {
        console.error('Cat fact API error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch cat fact'
        });
    }
});

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

const PORT = process.env.PORT || 3006;

app.listen(PORT, () => {
    console.log(`Weather Utility Server running on port ${PORT}`);
    console.log(`Access the application at: http://localhost:${PORT}`);
    console.log('APIs integrated: OpenWeatherMap, Quotable, Cat Facts');
});
