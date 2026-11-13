import { createAuthClient } from 'better-auth/react';
import { adminClient, usernameClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3333',
  fetchOptions: {
    credentials: 'include',
  },
  plugins: [adminClient(), usernameClient()],
});

export const { signIn, signOut, useSession } = authClient;
