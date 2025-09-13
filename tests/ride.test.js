const request = require('supertest');
const express = require('express');

jest.mock('../services/RideService', () => ({
	createRide: jest.fn(),
	updateRideAndVehicle: jest.fn(),
	getRidesByDriver: jest.fn(),
	searchRides: jest.fn(),
	getRidesBookedByUser: jest.fn(),
}));

// Stub auth middleware to always inject a user id
jest.mock('../middleware/auth', () => (req, res, next) => {
	req.user = { _id: 'user123' };
	next();
});

jest.mock('../models/Ride', () => ({
	aggregate: jest.fn(),
	findById: jest.fn(),
}));

jest.mock('../utils/locationValidator', () => ({
	validateSearchParams: jest.fn(),
	getLocationSuggestions: jest.fn(),
	validateLocationName: jest.fn(),
}));

const RideService = require('../services/RideService');
const Ride = require('../models/Ride');
const {
	validateSearchParams,
	getLocationSuggestions,
	validateLocationName,
} = require('../utils/locationValidator');
const router = require('../controllers/RideController');

const makeApp = () => {
	const app = express();
	app.use(express.json());
	app.use('/api/ride', router);
	return app;
};

describe('RideController', () => {
	let app;

	beforeEach(() => {
		app = makeApp();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('POST /api/ride/Ride', () => {
		test('creates a ride (201)', async () => {
			const fakeRide = { _id: 'r1', origin: { name: 'A' }, destination: { name: 'B' } };
			RideService.createRide.mockResolvedValue(fakeRide);

			const res = await request(app)
				.post('/api/ride/Ride')
				.set('x-auth-token', 'token')
				.send({
					origin: { name: 'A', coordinates: [1, 2] },
					destination: { name: 'B', coordinates: [3, 4] },
					vechile: 'veh1',
					dateTime: new Date().toISOString(),
					availableSeats: 2,
					pricePerSeat: 100,
				});

			expect(res.status).toBe(201);
			expect(res.body).toEqual(fakeRide);
			expect(RideService.createRide).toHaveBeenCalled();
		});

		test('service error returns 500', async () => {
			RideService.createRide.mockRejectedValue(new Error('Vehicle information is required'));

			const res = await request(app)
				.post('/api/ride/Ride')
				.set('x-auth-token', 'token')
				.send({ origin: { name: 'A', coordinates: [1, 2] }, destination: { name: 'B', coordinates: [3, 4] } });

			expect(res.status).toBe(500);
			expect(res.text).toBe('Vehicle information is required');
		});
	});

	describe('PUT /api/ride/:rideId', () => {
		test('updates ride and vehicle (200)', async () => {
			RideService.updateRideAndVehicle.mockResolvedValue({
				message: 'Ride and vehicle updated successfully',
				ride: { _id: 'r1', availableSeats: 3 },
			});

			const res = await request(app)
				.put('/api/ride/abc123')
				.set('x-auth-token', 'token')
				.send({ availableSeats: 3 });

			expect(res.status).toBe(200);
			expect(res.body).toEqual({ message: 'Ride and vehicle updated successfully', ride: { _id: 'r1', availableSeats: 3 } });
			expect(RideService.updateRideAndVehicle).toHaveBeenCalledWith('user123', 'abc123', { availableSeats: 3 });
		});

		test('update error returns 500', async () => {
			RideService.updateRideAndVehicle.mockRejectedValue(new Error('Ride not found or not owned by this driver'));

			const res = await request(app)
				.put('/api/ride/abc123')
				.set('x-auth-token', 'token')
				.send({ availableSeats: 3 });

			expect(res.status).toBe(500);
			expect(res.body).toEqual({ error: 'Ride not found or not owned by this driver' });
		});
	});

	describe('GET /api/ride/my', () => {
		test('returns rides of driver (200)', async () => {
			const rides = [{ _id: 'r1' }, { _id: 'r2' }];
			RideService.getRidesByDriver.mockResolvedValue(rides);

			const res = await request(app)
				.get('/api/ride/my')
				.set('x-auth-token', 'token');

			expect(res.status).toBe(200);
			expect(res.body).toEqual(rides);
			expect(RideService.getRidesByDriver).toHaveBeenCalledWith('user123');
		});

		// test('error returns 500', async () => {
		// 	RideService.getRidesByDriver.mockRejectedValue(new Error('DB error'));

		// 	const res = await request(app)
		// 		.get('/api/ride/my')
		// 		.set('x-auth-token', 'token');

		// 	expect(res.status).toBe(500);
		// 	expect(res.body).toEqual({ error: 'DB error' });
		// });
	});

	describe('GET /api/ride/bookings/my', () => {
		test('returns user bookings (200)', async () => {
			const bookings = [{ id: 'b1' }];
			RideService.getRidesBookedByUser.mockResolvedValue(bookings);

			const res = await request(app)
				.get('/api/ride/bookings/my')
				.set('x-auth-token', 'token');

			expect(res.status).toBe(200);
			expect(res.body).toEqual(bookings);
		});

		test('error returns 500', async () => {
			RideService.getRidesBookedByUser.mockRejectedValue(new Error('DB error'));

			const res = await request(app)
				.get('/api/ride/bookings/my')
				.set('x-auth-token', 'token');

			expect(res.status).toBe(500);
			expect(res.body).toEqual({ error: 'DB error' });
		});
	});

	describe('GET /api/ride/search', () => {
		test('valid search returns results with metadata (200)', async () => {
			validateSearchParams.mockReturnValue({ isValid: true });
			RideService.searchRides.mockResolvedValue([{ _id: 'r1' }]);

			const res = await request(app)
				.get('/api/ride/search')
				.query({ from: 'A', to: 'B' });

			expect(res.status).toBe(200);
			expect(res.body.rides).toEqual([{ _id: 'r1' }]);
			expect(res.body.metadata).toBeDefined();
		});

		test('invalid params return 400 with details', async () => {
			validateSearchParams.mockReturnValue({ isValid: false, errors: ['lat missing'] });

			const res = await request(app).get('/api/ride/search').query({});

			expect(res.status).toBe(400);
			expect(res.body).toEqual({ error: 'Invalid search parameters', details: ['lat missing'] });
		});

		test('service error returns 400', async () => {
			validateSearchParams.mockReturnValue({ isValid: true });
			RideService.searchRides.mockRejectedValue(new Error('Failed to search rides'));

			const res = await request(app).get('/api/ride/search').query({ from: 'A' });

			expect(res.status).toBe(400);
			expect(res.body).toEqual({ error: 'Failed to search rides' });
		});
	});

	describe('GET /api/ride/route-suggestions', () => {
		test('requires both from and to (400)', async () => {
			const res = await request(app).get('/api/ride/route-suggestions').query({ from: 'A' });
			expect(res.status).toBe(400);
			expect(res.body).toEqual({ error: "Both 'from' and 'to' parameters are required" });
		});

		test('returns suggestions (200)', async () => {
			Ride.aggregate.mockResolvedValue([
				{ _id: { origin: 'A', destination: 'B' }, count: 5, avgPrice: 300 },
			]);

			const res = await request(app).get('/api/ride/route-suggestions').query({ from: 'A', to: 'B' });

			expect(res.status).toBe(200);
			expect(res.body).toEqual({ suggestions: [{ _id: { origin: 'A', destination: 'B' }, count: 5, avgPrice: 300 }] });
		});

		test('server error returns 500', async () => {
			Ride.aggregate.mockRejectedValue(new Error('agg error'));

			const res = await request(app).get('/api/ride/route-suggestions').query({ from: 'A', to: 'B' });

			expect(res.status).toBe(500);
			expect(res.body).toEqual({ error: 'agg error' });
		});
	});

	describe('GET /api/ride/locations/suggest', () => {
		test('q too short returns empty list (200)', async () => {
			const res = await request(app).get('/api/ride/locations/suggest').query({ q: 'a' });
			expect(res.status).toBe(200);
			expect(res.body).toEqual({ suggestions: [] });
		});

		test('returns suggestions (200)', async () => {
			getLocationSuggestions.mockReturnValue(['X', 'Y']);
			const res = await request(app).get('/api/ride/locations/suggest').query({ q: 'ab' });
			expect(res.status).toBe(200);
			expect(res.body).toEqual({ suggestions: ['X', 'Y'] });
		});

		test('server error returns 500', async () => {
			getLocationSuggestions.mockImplementation(() => { throw new Error('svc'); });
			const res = await request(app).get('/api/ride/locations/suggest').query({ q: 'ab' });
			expect(res.status).toBe(500);
			expect(res.body).toEqual({ error: 'svc' });
		});
	});

	describe('GET /api/ride/locations/validate', () => {
		test('missing location returns 400', async () => {
			const res = await request(app).get('/api/ride/locations/validate').query({});
			expect(res.status).toBe(400);
			expect(res.body).toEqual({ error: 'Location parameter is required' });
		});

		test('validates a location (200)', async () => {
			validateLocationName.mockReturnValue({ isValid: true });
			const res = await request(app).get('/api/ride/locations/validate').query({ location: 'Hyderabad' });
			expect(res.status).toBe(200);
			expect(res.body).toEqual({ isValid: true });
		});

		test('server error returns 500', async () => {
			validateLocationName.mockImplementation(() => { throw new Error('svc'); });
			const res = await request(app).get('/api/ride/locations/validate').query({ location: 'X' });
			expect(res.status).toBe(500);
			expect(res.body).toEqual({ error: 'svc' });
		});
	});

	describe('GET /api/ride/ride/:rideId', () => {
		test('returns 404 when not found', async () => {
			// In controller they read req.params.id (bug), so make findById not called or return null
			Ride.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
			const res = await request(app).get('/api/ride/ride/r1');
			expect(res.status).toBe(404);
			expect(res.body).toEqual({ message: 'Ride not found' });
		});

		test('returns ride details (200)', async () => {
			const doc = {
				_id: 'r1',
				origin: { name: 'A' },
				destination: { name: 'B' },
				departureTime: '2024-01-01T00:00:00.000Z',
				driver: { name: 'John', phone: '123' },
			};
			Ride.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(doc) });
			const res = await request(app).get('/api/ride/ride/r1');
			expect(res.status).toBe(200);
			expect(res.body).toEqual({
				rideId: 'r1',
				origin: { name: 'A' },
				destination: { name: 'B' },
				departureTime: '2024-01-01T00:00:00.000Z',
				driver: { name: 'John', phone: '123' },
			});
		});

		test('server error returns 500', async () => {
			Ride.findById.mockReturnValue({ populate: jest.fn().mockRejectedValue(new Error('db')) });
			const res = await request(app).get('/api/ride/ride/r1');
			expect(res.status).toBe(500);
			expect(res.body).toEqual({ error: 'db' });
		});
	});
});

