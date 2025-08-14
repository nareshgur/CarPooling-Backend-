// Common Indian city coordinates [longitude, latitude]
const INDIAN_CITIES = {
  'Hyderabad': [78.4867, 17.3850],
  'Nizamabad': [78.2298, 18.6725],
  'Medchal': [78.4813, 17.6295],
  'Metpally': [78.8419, 18.8298],
  'Vijayanagaram': [83.4032, 18.4723],
  'Kakinada': [82.2381, 16.9891],
  'Mumbai': [72.8777, 19.0760],
  'Delhi': [77.2090, 28.6139],
  'Bangalore': [77.5946, 12.9716],
  'Chennai': [80.2707, 13.0827],
  'Kolkata': [88.3639, 22.5726],
  'Pune': [73.8567, 18.5204],
  'Ahmedabad': [72.5714, 23.0225],
  'Jaipur': [75.7873, 26.9124],
  'Lucknow': [80.9462, 26.8467],
  'Kanpur': [80.3319, 26.4499],
  'Nagpur': [79.0882, 21.1458],
  'Indore': [75.8573, 22.7196],
  'Thane': [72.9661, 19.2183],
  'Bhopal': [77.4050, 23.2599],
  'Visakhapatnam': [83.2185, 17.6868],
  'Pimpri-Chinchwad': [73.7996, 18.6298],
  'Patna': [85.1376, 25.5941],
  'Vadodara': [73.1811, 22.3072],
  'Ghaziabad': [77.4538, 28.6692],
  'Ludhiana': [75.8573, 30.9010],
  'Agra': [77.9629, 27.1767],
  'Nashik': [73.7898, 19.9975],
  'Faridabad': [77.3199, 28.4089],
  'Meerut': [77.7064, 28.6139],
  'Rajkot': [70.8022, 22.3039],
  'Kalyan-Dombivali': [73.1299, 19.2350],
  'Vasai-Virar': [72.8199, 19.4259],
  'Varanasi': [82.9739, 25.3176],
  'Srinagar': [74.7973, 34.0837],
  'Aurangabad': [75.3422, 19.8762],
  'Dhanbad': [86.4396, 23.7957],
  'Amritsar': [74.8570, 31.6340],
  'Allahabad': [81.8463, 25.4358],
  'Ranchi': [85.3096, 23.3441],
  'Howrah': [88.2636, 22.5958],
  'Coimbatore': [76.9558, 11.0168],
  'Jabalpur': [79.9864, 23.1815],
  'Gwalior': [78.1828, 26.2183],
  'Vijayawada': [80.6480, 16.5062],
  'Jodhpur': [73.8563, 26.2389],
  'Madurai': [78.1198, 9.9252],
  'Raipur': [81.6296, 21.2514],
  'Kota': [75.8641, 25.2138],
  'Guwahati': [91.7506, 26.1445],
  'Chandigarh': [76.7794, 30.7333],
  'Solapur': [75.9064, 17.6599],
  'Hubli-Dharwad': [75.1238, 15.3647],
  'Mysore': [76.6394, 12.2958],
  'Tiruchirappalli': [78.7047, 10.7905],
  'Bareilly': [79.4304, 28.3670],
  'Aligarh': [78.0880, 27.8974],
  'Tiruppur': [77.5563, 11.1085],
  'Gurgaon': [77.0266, 28.4595],
  'Moradabad': [78.7748, 28.8389],
  'Jalandhar': [75.5762, 31.3260],
  'Bhubaneswar': [85.8173, 20.2961],
  'Salem': [78.1601, 11.6643],
  'Warangal': [79.5882, 17.9689],
  'Guntur': [80.4397, 16.2990],
  'Bhiwandi': [73.0629, 19.2965],
  'Saharanpur': [77.5498, 29.9675],
  'Gorakhpur': [83.3732, 26.7606],
  'Bikaner': [73.3149, 28.0229],
  'Amravati': [77.7578, 20.9374],
  'Noida': [77.3910, 28.5355],
  'Jamshedpur': [86.2029, 22.8046],
  'Bhilai': [81.4281, 21.2094],
  'Cuttack': [85.8812, 20.4625],
  'Firozabad': [78.4018, 27.1591],
  'Kochi': [76.2673, 9.9312],
  'Nellore': [79.9864, 14.4426],
  'Bhavnagar': [72.1519, 21.7645],
  'Dehradun': [78.0322, 30.3165],
  'Durgapur': [87.3215, 23.5204],
  'Asansol': [86.9667, 23.6889],
  'Rourkela': [84.8544, 22.2494],
  'Nanded': [77.3205, 19.1383],
  'Kolhapur': [74.2433, 16.7050],
  'Ajmer': [74.6399, 26.4499],
  'Akola': [77.0022, 20.7096],
  'Gulbarga': [76.8376, 17.3297],
  'Jamnagar': [70.0669, 22.4707],
  'Ujjain': [75.8573, 23.1765],
  'Loni': [77.2905, 28.7515],
  'Siliguri': [88.3639, 26.7271],
  'Jhansi': [78.5682, 25.4484],
  'Ulhasnagar': [73.1463, 19.2183],
  'Jammu': [74.8570, 32.7266],
  'Sangli-Miraj & Kupwad': [74.5698, 16.8524],
  'Mangalore': [74.8560, 12.9716],
  'Erode': [77.7274, 11.3410],
  'Belgaum': [74.5270, 15.8497],
  'Ambattur': [80.1485, 13.1147],
  'Tirunelveli': [77.7311, 8.7139],
  'Malegaon': [74.5270, 20.5535],
  'Gaya': [85.0019, 24.7914],
  'Jalgaon': [75.5626, 21.0077],
  'Udaipur': [73.7125, 24.5854],
  'Maheshtala': [88.2636, 22.5086],
  'Tirupur': [77.5563, 11.1085],
  'Davanagere': [75.9220, 14.4644],
  'Kozhikode': [75.7804, 11.2588],
  'Akola': [77.0022, 20.7096],
  'Kurnool': [78.0411, 15.8281],
  'Rajpur Sonarpur': [88.3639, 22.4499],
  'Bokaro': [85.9917, 23.6693],
  'South Dumdum': [88.3639, 22.6100],
  'Bellary': [76.9366, 15.1394],
  'Patiala': [76.4009, 30.3398],
  'Gopalpur': [84.9449, 19.2599],
  'Agartala': [91.2868, 23.8315],
  'Bhagalpur': [86.9826, 25.2445],
  'Muzaffarnagar': [77.7039, 29.4709],
  'Bhatpara': [88.4084, 22.8664],
  'Panihati': [88.3639, 22.6941],
  'Latur': [76.5604, 18.4088],
  'Dhule': [74.7789, 20.9028],
  'Rohtak': [76.2794, 28.8955],
  'Korba': [82.7191, 22.3458],
  'Bhilwara': [74.6353, 25.3463],
  'Berhampur': [84.7941, 19.3148],
  'Muzaffarpur': [85.3906, 26.1209],
  'Ahmednagar': [74.7478, 19.0952],
  'Mathura': [77.6737, 27.4924],
  'Kollam': [76.6141, 8.8932],
  'Avadi': [80.0999, 13.1147],
  'Kadapa': [78.8236, 14.4753],
  'Anantapur': [77.6000, 14.6819],
  'Tiruchengode': [77.9333, 11.3833],
  'Bharatpur': [77.4909, 27.1767],
  'Bijapur': [75.7156, 16.8244],
  'Rampur': [79.0282, 28.8154],
  'Shivamogga': [75.5716, 13.9299],
  'Ratlam': [75.0366, 23.3343],
  'Modinagar': [77.8478, 28.5708],
  'Durg': [81.2867, 21.1904],
  'Shillong': [91.8933, 25.5788],
  'Imphal': [93.9063, 24.8170],
  'Hapur': [77.7807, 28.7299],
  'Anantapur': [77.6000, 14.6819],
  'Arrah': [84.6700, 25.5540],
  'Karimnagar': [79.1288, 18.4386],
  'Parbhani': [76.7781, 19.2686],
  'Etawah': [79.0219, 26.7767],
  'Bharatpur': [77.4909, 27.1767],
  'Begusarai': [86.1347, 25.4180],
  'New Delhi': [77.2090, 28.6139],
  'Chandigarh': [76.7794, 30.7333],
  'Gandhinagar': [72.6369, 23.2156],
  'Panaji': [73.8563, 15.4909],
  'Port Blair': [92.7265, 11.6234],
  'Silvassa': [72.9965, 20.2769],
  'Daman': [72.8324, 20.3974],
  'Diu': [70.9874, 20.7144],
  'Kavaratti': [72.6369, 10.5593],
  'Puducherry': [79.8083, 11.9416],
  'Karaikal': [79.8435, 10.9254],
  'Mahe': [75.5342, 11.7081],
  'Yanam': [82.2137, 16.7331]
};

// Function to get coordinates for a city
function getCityCoordinates(cityName) {
  const normalizedName = cityName.toLowerCase().trim();
  
  for (const [city, coords] of Object.entries(INDIAN_CITIES)) {
    if (city.toLowerCase() === normalizedName) {
      return coords;
    }
  }
  
  return null;
}

// Function to validate coordinates
function validateCoordinates(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return false;
  }
  
  const [lng, lat] = coordinates;
  
  // Check if coordinates are within reasonable bounds for India
  // India roughly spans from 68°E to 97°E longitude and 8°N to 37°N latitude
  if (lng < 68 || lng > 97 || lat < 8 || lat > 37) {
    return false;
  }
  
  return true;
}

// Function to check if coordinates are default/wrong coordinates
function areDefaultCoordinates(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return true;
  }
  
  const [lng, lat] = coordinates;
  
  // Check for common default coordinates that are clearly wrong for India
  const defaultCoords = [
    [-74.006, 40.7128], // New York
    [-71.0589, 42.3601], // Boston
    [0, 0], // Null Island
    [-180, -90], // Invalid coordinates
    [180, 90] // Invalid coordinates
  ];
  
  return defaultCoords.some(([dlng, dlat]) => 
    Math.abs(lng - dlng) < 0.001 && Math.abs(lat - dlat) < 0.001
  );
}

module.exports = {
  INDIAN_CITIES,
  getCityCoordinates,
  validateCoordinates,
  areDefaultCoordinates
};
