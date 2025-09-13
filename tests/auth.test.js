const request = require('supertest');
const express = require('express');

jest.mock('../services/AuthServices', () => ({
	registerUser: jest.fn(),
	loginUser: jest.fn(),
	updateUser: jest.fn(),
}));

// Stub auth middleware to always set a user id for update route
jest.mock('../middleware/auth', () => (req, res, next) => {
	req.user = { _id: 'user123' };
	next();
});

const AuthService = require('../services/AuthServices');
const router = require('../controllers/AuthController');

const makeApp = () => {
	const app = express();
	app.use(express.json());
	app.use('/api/user', router);
	return app;
};

describe('AuthController', () => {
	let app;

	beforeEach(() => {
		app = makeApp();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('POST /api/user/register', () => {
	// test('success', async () => {
	// 	AuthService.registerUser.mockResolvedValue({
	// 		status: 200,
	// 		data: { message: 'Registered successfully' },
	// 	});

	// 	const res = await request(app)
	// 		.post('/api/user/register')
	// 		.send({ name: 'A', email: 'a@a.com', Password: 'p', phone: '1' });

	// 	expect(res.status).toBe(200);
	// 	expect(res.body).toEqual({ message: 'Registered successfully' });
	// 	expect(AuthService.registerUser).toHaveBeenCalledWith({
	// 		name: 'A',
	// 		email: 'a@a.com',
	// 		Password: 'p',
	// 		phone: '1',
	// 	});
	// });

		test('known error (400) is passed through', async () => {
			AuthService.registerUser.mockResolvedValue({
				status: 400,
				data: 'User already registered.',
			});

			const res = await request(app)
				.post('/api/user/register')
				.send({ name: 'A', email: 'a@a.com', Password: 'p', phone: '1' });

			expect(res.status).toBe(400);
			expect(res.text).toBe('User already registered.');
		});

		test('unexpected throw returns 500', async () => {
			AuthService.registerUser.mockRejectedValue(new Error('DB down'));

			const res = await request(app)
				.post('/api/user/register')
				.send({ name: 'A' });

			expect(res.status).toBe(500);
			expect(res.text).toBe('Internal Server Error');
		});
	});

	describe('POST /api/user/login', () => {
		// test('success', async () => {
		// 	AuthService.loginUser.mockResolvedValue({
		// 		status: 200,
		// 		message: 'Login successful',
		// 		data: { token: 'abc123' },
		// 	});

		// 	const res = await request(app)
		// 		.post('/api/user/login')
		// 		.send({ email: 'a@a.com', Password: 'p' });

		// 	expect(res.status).toBe(200);
		// 	expect(res.body).toEqual({
		// 		message: 'Login successful',
		// 		data: { token: 'abc123' },
		// 	});
			// Controller sets header to an object; Express coerces it to "[object Object]"
		// 	expect(res.headers['x-auth-token']).toBe('[object Object]');
		// });

		// test('invalid credentials (400)', async () => {
		// 	AuthService.loginUser.mockResolvedValue({
		// 		status: 400,
		// 		data: 'Invalid email or password',
		// 	});

		// 	const res = await request(app)
		// 		.post('/api/user/login')
		// 		.send({ email: 'a@a.com', Password: 'wrong' });

		// 	expect(res.status).toBe(400);
		// 	expect(res.body).toEqual({
		// 		message: undefined,
		// 		data: 'Invalid email or password',
		// 	});
		// 	expect(res.headers['x-auth-token']).toBe('Invalid email or password');
		// });

		test('unexpected throw returns 500', async () => {
			AuthService.loginUser.mockRejectedValue(new Error('service error'));

			const res = await request(app)
				.post('/api/user/login')
				.send({ email: 'a@a.com', Password: 'p' });

			expect(res.status).toBe(500);
			expect(res.text).toBe('Internal Server Error');
		});
	});

	describe('PUT /api/user/update', () => {
		test('success', async () => {
			AuthService.updateUser.mockResolvedValue({
				status: 200,
				data: {
					message: 'User updated successfully',
					user: { _id: 'user123', name: 'New Name' },
				},
			});

			const res = await request(app)
				.put('/api/user/update')
				.set('x-auth-token', 'any')
				.send({ name: 'New Name' });

			expect(res.status).toBe(200);
			expect(res.body).toEqual({
				message: 'User updated successfully',
				user: { _id: 'user123', name: 'New Name' },
			});
			expect(AuthService.updateUser).toHaveBeenCalledWith('user123', {
				name: 'New Name',
			});
		});

		test('user not found (404)', async () => {
			AuthService.updateUser.mockResolvedValue({
				status: 404,
				data: { message: 'User not found' },
			});

			const res = await request(app)
				.put('/api/user/update')
				.set('x-auth-token', 'any')
				.send({ name: 'New Name' });

			expect(res.status).toBe(404);
			expect(res.body).toEqual({ message: 'User not found' });
		});

		test('unexpected throw returns 500', async () => {
			AuthService.updateUser.mockRejectedValue(new Error('db error'));

			const res = await request(app)
				.put('/api/user/update')
				.set('x-auth-token', 'any')
				.send({ name: 'X' });

			expect(res.status).toBe(500);
			expect(res.body).toEqual({ message: 'Something went wrong while updating' });
		});
	});
});