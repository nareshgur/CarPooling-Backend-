const request = require('supertest');
const express = require('express');
const path = require('path');

jest.mock('axios');
const axios = require('axios');

const controllerPath = path.resolve(__dirname, '../controllers/RouteController');

function loadRouterWithEnv(key) {
	const prev = process.env.ORS_API_KEY;
	process.env.ORS_API_KEY = key;
	delete require.cache[controllerPath];
	// eslint-disable-next-line global-require
	const router = require('../controllers/RouteController');
	process.env.ORS_API_KEY = prev;
	return router;
}

function makeApp(router) {
	const app = express();
	app.use(express.json());
	app.use('/api/directions', router);
	return app;
}

describe('RouteController', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('POST /api/directions', () => {
		test('returns 500 when ORS_API_KEY is not configured', async () => {
			const router = loadRouterWithEnv(undefined);
			const app = makeApp(router);

			const res = await request(app).post('/api/directions').send({
				coordinates: [[77.5946, 12.9716], [78.4867, 17.3850]],
			});

			expect(res.status).toBe(500);
			expect(res.body).toEqual({
				error: 'ORS API key not configured. Please check server configuration.',
			});
		});

		test('successfully proxies ORS directions (200)', async () => {
			const router = loadRouterWithEnv('key123');
			const app = makeApp(router);

			axios.post.mockResolvedValue({ data: { routes: [{ geometry: 'poly' }] } });

			const body = {
				coordinates: [[77.5946, 12.9716], [78.4867, 17.3850]],
				alternatives: true,
			};
			const res = await request(app).post('/api/directions').send(body);

			expect(res.status).toBe(200);
			expect(res.body).toEqual({ routes: [{ geometry: 'poly' }] });
			expect(axios.post).toHaveBeenCalledWith(
				'https://api.openrouteservice.org/v2/directions/driving-car',
				expect.objectContaining({
					coordinates: body.coordinates,
					instructions: false,
					geometry: true,
					alternative_routes: expect.any(Object),
				}),
				expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'key123' }) })
			);
		});

		test('validates body and returns 400 for invalid coordinates', async () => {
			const router = loadRouterWithEnv('key123');
			const app = makeApp(router);

			const res = await request(app).post('/api/directions').send({ coordinates: [1, 2] });
			expect(res.status).toBe(400);
			expect(res.body).toEqual({
				error: 'Invalid body. Expect { coordinates: [[lng,lat],[lng,lat]], alternatives?: boolean }',
			});
		});

		test('ORS error bubbles as 500 with details payload', async () => {
			const router = loadRouterWithEnv('key123');
			const app = makeApp(router);

			axios.post.mockRejectedValue({ response: { status: 401, data: { message: 'unauthorized' } } });

			const res = await request(app)
				.post('/api/directions')
				.send({ coordinates: [[1, 2], [3, 4]] });

			expect(res.status).toBe(500);
			expect(res.body).toEqual({
				error: 'Failed to fetch directions',
				details: { message: 'unauthorized' },
				status: 401,
			});
		});
	});

	describe('GET /api/directions/geocode', () => {
		test('requires query param', async () => {
			const router = loadRouterWithEnv('key123');
			const app = makeApp(router);
			const res = await request(app).get('/api/directions/geocode');
			expect(res.status).toBe(400);
			expect(res.body).toEqual({ message: 'Query parameter required' });
		});

		test('returns geocode results', async () => {
			const router = loadRouterWithEnv('key123');
			const app = makeApp(router);
			axios.get.mockResolvedValue({ data: [{ lat: '1', lon: '2' }] });

			const res = await request(app).get('/api/directions/geocode').query({ query: 'Hyderabad' });
			expect(res.status).toBe(200);
			expect(res.body).toEqual([{ lat: '1', lon: '2' }]);
		});

		test('server error returns 500', async () => {
			const router = loadRouterWithEnv('key123');
			const app = makeApp(router);
			axios.get.mockRejectedValue(new Error('network'));

			const res = await request(app).get('/api/directions/geocode').query({ query: 'Hyderabad' });
			expect(res.status).toBe(500);
			expect(res.body).toEqual({ error: 'Failed to geocode address' });
		});
	});
});

