
export const getUserProfileQuery = /* GraphQL */ `
  query GetUserProfile($cognito_id: String!) {
    getUserProfile(cognito_id: $cognito_id) {
      id
      cognito_id
      username
      email
      role
      status
      created_at
      updated_at
      profile {
        full_name
        phone
        language
        preferences {
          email_notifications
          theme
        }
      }
    }
  }
`;
