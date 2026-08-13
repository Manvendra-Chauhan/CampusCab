const campusLocations = {
  'Main Gate': [30.3582, 76.3705],
  'Hostel H': [30.3542, 76.3665],
  'Hostel J': [30.3528, 76.3638],
  'Hostel C': [30.3551, 76.3619],
  'COS': [30.3558, 76.3653],
  'Library': [30.3548, 76.3632],
  'Admin Block': [30.3575, 76.3670],
  'Auditorium': [30.3570, 76.3685],
  'Tan Building': [30.3555, 76.3695],
  'G Block': [30.3535, 76.3615],
  'Sports Complex': [30.3520, 76.3675],
  'Student Activity Center': [30.3530, 76.3645],
  'Cafeteria': [30.3562, 76.3640]
};

// Calculate distance in kilometers using Haversine formula
const getDistanceInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return Number(d.toFixed(2));
};

const deg2rad = (deg) => {
  return deg * (Math.PI / 180);
};

// Fare logic: Base Fare = ₹20 + ₹10 per kilometer
const calculateFare = (distance) => {
  const baseFare = 20;
  const ratePerKm = 10;
  const fare = baseFare + distance * ratePerKm;
  return Number(fare.toFixed(2));
};

module.exports = {
  campusLocations,
  getDistanceInKm,
  calculateFare
};
