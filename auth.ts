import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { userService } from '@/services/user.service';
import type { User } from '@/types/user.types';
import { cookies } from 'next/headers';

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  debug: process.env.NODE_ENV === 'development',
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await userService.authenticateUser(
            credentials.email as string,
            credentials.password as string
          );

          if (user) {
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              emailVerified: user.email_verified,
              subscription_plan: user.subscription_plan,
            };
          }

          return null;
        } catch (error) {
          console.error('Authentication error:', error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.emailVerified = Boolean(user.emailVerified);
        token.subscription_plan = user.subscription_plan;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        (session.user as { emailVerified: boolean }).emailVerified = token.emailVerified as boolean;
        session.user.subscription_plan = token.subscription_plan as string | null;

        // Check if admin is impersonating a user
        const cookieStore = await cookies();
        const impersonationTarget = cookieStore.get('impersonation_target');

        if (impersonationTarget?.value && session.user.role === 'admin') {
          try {
            // Fetch the impersonated user's data
            const targetUser = await userService.getUserById(impersonationTarget.value);

            if (targetUser) {
              // Override session.user with impersonated user's data
              session.user.id = targetUser.id;
              session.user.name = targetUser.name;
              session.user.email = targetUser.email;
              session.user.role = targetUser.role;
              (session.user as { emailVerified: boolean }).emailVerified = targetUser.email_verified;
              session.user.subscription_plan = targetUser.subscription_plan;
            }
          } catch (error) {
            console.error('Error fetching impersonated user:', error);
            // If fetch fails, continue with original session
          }
        }
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
});
