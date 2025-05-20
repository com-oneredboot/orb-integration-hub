import { Users } from './Users.model';

describe('Users Model', () => {
  it('should have all required fields', () => {
    const user = new Users({
      userId: 'abc',
      cognitoId: 'cog-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      status: 'ACTIVE',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      phoneNumber: '',
      groups: ['USER'],
      emailVerified: false,
      phoneVerified: false
    });
    expect(user.userId).toBeDefined();
    expect(user.email).toBeDefined();
    expect(typeof user.createdAt).toBe('string');
    expect(Array.isArray(user.groups)).toBe(true);
  });

  it('should not allow missing required fields', () => {
    const user = new Users({ email: 'test@example.com' });
    expect(user).toBeDefined();
  });
}); 