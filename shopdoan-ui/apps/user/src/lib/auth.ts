import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { login, refresh } from '@/services/authService';

function getJwtExpiresAt(token?: string) {
  if (!token) return 0;

  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1] || '', 'base64url').toString('utf8'),
    );
    return typeof payload.exp === 'number' ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

async function refreshAccessToken(token: any) {
  if (!token.refreshToken) return token;

  try {
    const data = await refresh(token.refreshToken);
    return {
      ...token,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken || token.refreshToken,
      accessTokenExpires: getJwtExpiresAt(data.accessToken),
      error: undefined,
    };
  } catch (error) {
    console.error('Refresh access token failed:', error);
    return { ...token, error: 'RefreshAccessTokenError' };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const data = await login({
            email: credentials.email,
            password: credentials.password,
          });

          const role = typeof data.user.role === 'string' ? data.user.role.toLowerCase() : '';

          return {
            id: String(data.user.id),
            email: data.user.email,
            name: data.user.name,
            role,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          };
        } catch (error: any) {
          const message =
            error?.response?.data?.message ||
            error?.message ||
            'Không đăng nhập được';
          console.error('Auth error:', message);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.accessTokenExpires = getJwtExpiresAt(user.accessToken);
        return token;
      }

      const expiresAt =
        typeof token.accessTokenExpires === 'number'
          ? token.accessTokenExpires
          : getJwtExpiresAt(token.accessToken);

      if (expiresAt && Date.now() < expiresAt - 30_000) {
        token.accessTokenExpires = expiresAt;
        return token;
      }

      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      if (token && session?.user) {
        session.user.id = token.sub!;
        session.user.role = token.role?.toLowerCase();
        session.user.accessToken = token.accessToken;
        session.user.refreshToken = token.refreshToken;
        session.accessToken = token.accessToken;
        session.refreshToken = token.refreshToken;
        (session as any).error = token.error;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
};
