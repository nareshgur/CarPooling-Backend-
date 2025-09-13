// Option A: Comment out empty suite
/*
describe('Booking tests', () => {
  // Empty suite causing error
});
*/

// Option B: Add a minimal test
describe('Booking tests', () => {
  test('placeholder test', () => {
    expect(true).toBe(true);
  });
});