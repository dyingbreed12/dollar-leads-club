import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import jwt from 'jsonwebtoken';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const secretKey = process.env.FIN_CLIENT_SECRET;

  if (!secretKey) {
    return NextResponse.json({ error: 'Secret not configured' }, { status: 500 });
  }

  // Remove quotes if present (env var might have them)
  const cleanSecretKey = secretKey.replace(/^['"]|['"]$/g, '');

  // JWT payload with user identification
  const payload = {
    user_id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    subscription_plan: session.user.subscription_plan,
  };

  // Sign JWT with 1 hour expiration
  const token = jwt.sign(payload, cleanSecretKey, { expiresIn: '1h' });

  return NextResponse.json({ token });
}
