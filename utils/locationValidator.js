const { INDIAN_CITIES } = require('./locationUtils');

// Function to validate if a location name is valid (permissive)
function validateLocationName(locationName) {
  if (locationName === undefined || locationName === null) {
    return { isValid: false, error: 'Location name is required' };
  }

  if (typeof locationName !== 'string') {
    return { isValid: false, error: 'Location must be a string' };
  }

  const normalizedName = locationName.trim();
  if (normalizedName.length < 2) {
    return { isValid: false, error: 'Location must be at least 2 characters' };
  }

  const exact = Object.keys(INDIAN_CITIES).find(
    (city) => city.toLowerCase() === normalizedName.toLowerCase()
  );

  if (exact) {
    return { isValid: true, city: exact, coordinates: INDIAN_CITIES[exact] };
  }

  // Unknown names are allowed; return suggestions as a warning
  const suggestions = Object.keys(INDIAN_CITIES)
    .filter((city) => city.toLowerCase().includes(normalizedName.toLowerCase()))
    .slice(0, 5);

  return {
    isValid: true,
    warning: suggestions.length
      ? `Did you mean: ${suggestions.join(', ')}?`
      : undefined,
    suggestions,
  };
}

// Function to validate search parameters
function validateSearchParams(searchParams) {
  const errors = [];
  const warnings = [];

  // Validate origin/destination only for basic shape; unknowns are allowed
  if (searchParams.from) {
    const v = validateLocationName(searchParams.from);
    if (!v.isValid) errors.push(`Origin: ${v.error}`);
    if (v.warning) warnings.push(`Origin: ${v.warning}`);
  }
  if (searchParams.to) {
    const v = validateLocationName(searchParams.to);
    if (!v.isValid) errors.push(`Destination: ${v.error}`);
    if (v.warning) warnings.push(`Destination: ${v.warning}`);
  }

  // Validate date (allow today and future)
  if (searchParams.date) {
    const d = new Date(searchParams.date);
    if (Number.isNaN(d.getTime())) {
      errors.push('Invalid date');
    }
  }

  // Validate passengers
  if (searchParams.passengers !== undefined) {
    const p = parseInt(searchParams.passengers);
    if (Number.isNaN(p) || p < 1 || p > 10) {
      errors.push('Number of passengers must be between 1 and 10');
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

// Function to get location suggestions
function getLocationSuggestions(query) {
  if (!query || query.length < 2) return [];
  const normalizedQuery = query.toLowerCase().trim();
  return Object.keys(INDIAN_CITIES)
    .filter((city) => city.toLowerCase().includes(normalizedQuery))
    .slice(0, 10);
}

module.exports = {
  validateLocationName,
  validateSearchParams,
  getLocationSuggestions,
};
