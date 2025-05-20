import * as UsersOps from './Users.graphql';

describe('Users GraphQL Operations', () => {
  it('should include UsersCreateMutation', () => {
    expect(UsersOps.UsersCreateMutation).toBeDefined();
    expect(typeof UsersOps.UsersCreateMutation).toBe('string');
  });
  it('should include UsersUpdateMutation', () => {
    expect(UsersOps.UsersUpdateMutation).toBeDefined();
    expect(typeof UsersOps.UsersUpdateMutation).toBe('string');
  });
  it('should include UsersDeleteMutation', () => {
    expect(UsersOps.UsersDeleteMutation).toBeDefined();
    expect(typeof UsersOps.UsersDeleteMutation).toBe('string');
  });
  it('should include UsersDisableMutation', () => {
    expect(UsersOps.UsersDisableMutation).toBeDefined();
    expect(typeof UsersOps.UsersDisableMutation).toBe('string');
  });
}); 