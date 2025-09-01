# Problem 6: Weather & Utility APIs Integration

A comprehensive web application demonstrating both **Frontend** and **Backend** API integration with multiple free APIs. This utility app showcases weather information, inspirational quotes, and fun cat facts.

## Features

### 🔄 **Dual API Integration**
- **Backend API Calls**: Server-side API integration with Express.js
- **Frontend API Calls**: Direct browser-to-API communication
- **Toggle Switch**: Real-time switching between backend and frontend modes

### 🌤️ **Weather Information**
- **City Search**: Get weather by city name
- **Geolocation**: Current location weather using browser GPS
- **Comprehensive Data**: Temperature, humidity, wind, pressure, visibility
- **Weather Icons**: Visual weather representation
- **Error Handling**: City not found, location denied scenarios

### 💭 **Utility APIs**
- **Random Quotes**: Inspirational quotes from Quotable API
- **Cat Facts**: Fun cat facts from Cat Facts API
- **Real-time Loading**: Spinner animations during API calls

### 🎨 **Modern UI/UX**
- **Glass-morphism Design**: Modern translucent card layouts
- **Gradient Backgrounds**: Beautiful color transitions
- **Responsive Design**: Mobile-friendly interface
- **Loading States**: Visual feedback for all API calls
- **Error Alerts**: User-friendly error messages

## Free APIs Used

### 1. **OpenWeatherMap API**
- **Purpose**: Weather data
- **Endpoint**: `https://api.openweathermap.org/data/2.5/weather`
- **Features**: Current weather, forecasts, geocoding
- **Rate Limit**: 1000 calls/day (free tier)

### 2. **Quotable API**
- **Purpose**: Random inspirational quotes
- **Endpoint**: `https://api.quotable.io/random`
- **Features**: Quotes with authors and tags
- **Rate Limit**: No authentication required

### 3. **Cat Facts API**
- **Purpose**: Random cat facts
- **Endpoint**: `https://catfact.ninja/fact`
- **Features**: Fun cat-related trivia
- **Rate Limit**: No authentication required

## Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Axios** - HTTP client for API calls
- **CORS** - Cross-origin resource sharing
- **express-rate-limit** - API rate limiting
- **dotenv** - Environment variables

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with animations
- **JavaScript/jQuery** - Dynamic interactions
- **Geolocation API** - Browser location services
- **AJAX** - Asynchronous API communication

## Installation & Setup

1. **Navigate to Problem 6**
   ```bash
   cd "Problem 6"
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   - Update `.env` file with your OpenWeatherMap API key
   - Get free API key from: https://openweathermap.org/api
   ```env
   WEATHER_API_KEY=your_actual_api_key_here
   PORT=3006
   ```

4. **Start the Server**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

5. **Access the Application**
   - Open browser: `http://localhost:3006`
   - Toggle between Backend/Frontend API modes
   - Test weather search and utility features

## API Endpoints (Backend)

### Weather APIs
- `GET /api/weather/city/:cityName` - Weather by city name
- `GET /api/weather/coordinates?lat=X&lon=Y` - Weather by coordinates

### Utility APIs
- `GET /api/quote` - Random inspirational quote
- `GET /api/catfact` - Random cat fact

## Key Features Demonstrated

### **Backend API Integration**
```javascript
// Server-side API call with error handling
app.get('/api/weather/city/:cityName', async (req, res) => {
    try {
        const response = await axios.get(`${WEATHER_BASE_URL}/weather`, {
            params: { q: cityName, appid: API_KEY, units: 'metric' }
        });
        res.json({ success: true, data: weatherData });
    } catch (error) {
        res.status(500).json({ success: false, message: 'API Error' });
    }
});
```

### **Frontend API Integration**
```javascript
// Direct browser API call
$.ajax({
    url: 'https://api.openweathermap.org/data/2.5/weather',
    method: 'GET',
    data: { q: city, appid: API_KEY, units: 'metric' },
    success: function(data) { displayWeather(data); },
    error: function() { showAlert('API call failed'); }
});
```

### **Geolocation Integration**
```javascript
navigator.geolocation.getCurrentPosition(
    function(position) {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        fetchWeatherByCoordinates(lat, lon);
    },
    function(error) { handleLocationError(error); }
);
```

## Security Features

- **Rate Limiting**: Prevents API abuse (100 requests per 15 minutes)
- **CORS Configuration**: Secure cross-origin requests
- **Input Validation**: City name sanitization
- **Error Handling**: Graceful API failure management
- **Environment Variables**: Secure API key storage

## Usage Instructions

### **Weather Features**
1. **City Search**: Enter city name and click "Search"
2. **Current Location**: Click "Current Location" for GPS-based weather
3. **API Toggle**: Switch between Backend/Frontend API calls

### **Utility Features**
1. **Random Quote**: Click "Get Random Quote" for inspiration
2. **Cat Facts**: Click "Random Cat Fact" for fun trivia
3. **Real-time Updates**: All data refreshes instantly

### **API Mode Comparison**
- **Backend Mode**: Server processes API calls (more secure, better for production)
- **Frontend Mode**: Direct browser calls (faster, but exposes API keys)

## File Structure

```
Problem 6/
├── public/
│   ├── index.html          # Main application page
│   └── styles.css          # Modern CSS styling
├── server.js               # Express server with API routes
├── package.json            # Dependencies and scripts
├── .env                    # Environment variables
└── README.md              # Documentation
```

## Demo Features

### **Working Without API Key**
- Backend APIs work with demo endpoints
- Frontend calls show educational error messages
- All UI features fully functional

### **With Valid API Key**
- Full weather data from OpenWeatherMap
- Real-time location-based weather
- Complete feature demonstration

## Error Handling

- **Network Errors**: Graceful fallback messages
- **API Limits**: Rate limiting with user feedback
- **Invalid Input**: Input validation and sanitization
- **Geolocation**: Permission denied handling
- **CORS Issues**: Proper headers and configuration

## Future Enhancements

- **Weather Forecasts**: 5-day weather predictions
- **Multiple Locations**: Save favorite cities
- **Data Visualization**: Charts and graphs
- **Push Notifications**: Weather alerts
- **Offline Support**: Service worker implementation

## Learning Outcomes

This project demonstrates:
- **API Integration Patterns**: Both frontend and backend approaches
- **Error Handling**: Robust error management strategies
- **Modern Web Development**: Latest HTML5, CSS3, and JavaScript features
- **Security Best Practices**: API key management and rate limiting
- **User Experience**: Loading states, animations, and responsive design

Perfect for understanding the differences between client-side and server-side API integration patterns!
