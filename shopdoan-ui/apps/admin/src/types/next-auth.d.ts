import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role?: string | null;
      accessToken?: string;
      refreshToken?: string;
    };
    accessToken?: string;
    refreshToken?: string;
    error?: string;
  }

  interface User {
    id: string;
    role?: string;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string;
    accessToken?: string;
    refreshToken?: string;
  }
}
