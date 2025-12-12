![Weather Now Banner](banner.jpeg)

# Weather Now

Weather Now is a pixel-art styled Chrome extension that shows real-time weather conditions, air quality, and short-term forecasts based on your current location. It features a retro desktop-inspired UI with animated characters that adapt to the weather and time of day.

## Features

- Real-time weather data using the OpenWeather API  
- Air Quality Index (AQI) with PM2.5 information  
- Tomorrow’s weather forecast  
- Smart clothing recommendations based on temperature and conditions  
- Pixel-art character animations that change with weather and day/night  
- Compact Chrome extension popup with a retro UI aesthetic  

## Tech Stack

- Vanilla JavaScript  
- HTML5 & CSS3  
- OpenWeather API  
- Chrome Extension (Manifest V3)

## Installation (Chrome Extension)

1. Clone or download this repository  
2. Open Google Chrome and navigate to:
3. Enable **Developer mode** (top-right)  
4. Click **Load unpacked**  
5. Select the project folder  
6. Pin **Weather Now** to the toolbar and open it  

## Configuration

This project requires an OpenWeather API key.

1. Create a free account at https://openweathermap.org  
2. Generate an API key  
3. Open `script.js` and replace:
```js
const API_KEY = "YOUR_KEY_HERE";
with your own API key.

Note: New API keys may take a short time to activate.

Permissions
Geolocation – used to fetch weather data for your current location

Host permissions – required to access OpenWeather API endpoints

## Author

GitHub: kashish-238
