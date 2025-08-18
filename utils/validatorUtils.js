
function validateBookingRequest(data) {
    const errors = [];
    
    if (!data.rideId) {
      errors.push("Ride ID is required");
    }
    
    if (data.message && typeof data.message !== 'string') {
      errors.push("Message must be a string");
    }
    
    if (data.message && data.message.trim().length > 1000) {
      errors.push("Message cannot exceed 1000 characters");
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  
  module.exports = {
    validateBookingRequest
  };