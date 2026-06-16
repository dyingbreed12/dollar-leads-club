import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      emailVerified: boolean;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      subscription_plan?: string | null;
    };
  }

  interface User {
    id: string;
    role: string;
    emailVerified: boolean;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    subscription_plan?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    emailVerified: boolean;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    subscription_plan?: string | null;
  }
}
