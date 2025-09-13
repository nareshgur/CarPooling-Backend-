const request = require('supertest');
const express = require('express');

jest.mock('../services/VechileService', () => ({
	createVechile: jest.fn(),
	updateVechile: jest.fn(),
	getMyVechiles: jest.fn(),
	deleteVechile: jest.fn(),
}));

// Stub auth to inject a user id
jest.mock('../middleware/auth', () => (req, res, next) => {
	req.user = { _id: 'user123' };
	next();
});

const VechileService = require('../services/VechileService');
const router = require('../controllers/VechileController');

const makeApp = () => {
	const app = express();
	app.use(express.json());
	app.use('/api/vechile', router);
	return app;
};

describe('VechileController', () => {
	let app;

	beforeEach(() => {
		app = makeApp();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('POST /api/vechile', () => {
		test('creates vechile (201)', async () => {
			const vechile = { _id: 'v1', make: 'T', model: '3' };
			VechileService.createVechile.mockResolvedValue(vechile);

			const res = await request(app)
				.post('/api/vechile')
				.set('x-auth-token', 'token')
				.send({ make: 'T', model: '3' });

			expect(res.status).toBe(201);
			expect(res.body).toEqual(vechile);
			expect(VechileService.createVechile).toHaveBeenCalledWith('user123', { make: 'T', model: '3' });
		});

		test('service error returns 500', async () => {
			VechileService.createVechile.mockRejectedValue(new Error('create error'));

			const res = await request(app)
				.post('/api/vechile')
				.set('x-auth-token', 'token')
				.send({});

			expect(res.status).toBe(500);
			expect(res.body).toEqual({ error: 'create error' });
		});
	});

	describe('PUT /api/vechile/:vechileId', () => {
		test('updates vechile (200)', async () => {
			const updated = { _id: 'v1', make: 'T', model: 'Y' };
			VechileService.updateVechile.mockResolvedValue(updated);

			const res = await request(app)
				.put('/api/vechile/v1')
				.set('x-auth-token', 'token')
				.send({ model: 'Y' });

			expect(res.status).toBe(200);
			expect(res.body).toEqual(updated);
			expect(VechileService.updateVechile).toHaveBeenCalledWith('user123', 'v1', { model: 'Y' });
		});

		test('update error returns 500', async () => {
			VechileService.updateVechile.mockRejectedValue(new Error('not owned'));

			const res = await request(app)
				.put('/api/vechile/v1')
				.set('x-auth-token', 'token')
				.send({ model: 'Y' });

			expect(res.status).toBe(500);
			expect(res.body).toEqual({ error: 'not owned' });
		});
	});

	describe('GET /api/vechile', () => {
		test('lists my vechiles (200)', async () => {
			const list = [{ _id: 'v1' }, { _id: 'v2' }];
			VechileService.getMyVechiles.mockResolvedValue(list);

			const res = await request(app)
				.get('/api/vechile')
				.set('x-auth-token', 'token');

			expect(res.status).toBe(200);
			expect(res.body).toEqual(list);
			expect(VechileService.getMyVechiles).toHaveBeenCalledWith('user123');
		});

		test('list error returns 500', async () => {
			VechileService.getMyVechiles.mockRejectedValue(new Error('db'));

			const res = await request(app)
				.get('/api/vechile')
				.set('x-auth-token', 'token');

			expect(res.status).toBe(500);
			expect(res.body).toEqual({ error: 'db' });
		});
	});

	describe('DELETE /api/vechile/:vechileId', () => {
		test('deletes vechile (200)', async () => {
			VechileService.deleteVechile.mockResolvedValue({ message: 'Vehicle deleted successfully' });

			const res = await request(app)
				.delete('/api/vechile/v1')
				.set('x-auth-token', 'token');

			expect(res.status).toBe(200);
			expect(res.body).toEqual({ message: 'Vehicle deleted successfully' });
			expect(VechileService.deleteVechile).toHaveBeenCalledWith('user123', 'v1');
		});

		test('delete error returns 500', async () => {
			VechileService.deleteVechile.mockRejectedValue(new Error('not owned'));

			const res = await request(app)
				.delete('/api/vechile/v1')
				.set('x-auth-token', 'token');

			expect(res.status).toBe(500);
			expect(res.body).toEqual({ error: 'not owned' });
		});
	});
});


