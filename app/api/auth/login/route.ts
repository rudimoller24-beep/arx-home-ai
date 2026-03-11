import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const jwtSecret = process.env.JWT_SECRET;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables.');
}

if (!jwtSecret) {
  throw new Error('Missing JWT_SECRET environment variable.');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const secret = new TextEncoder().encode(jwtSecret);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '').trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const { data: user, error } = await supabase
      .from('profiles')
      .select('id, email, password_hash, role, subscription_status, trial_end')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: 'Login failed.', details: error.message },
        { status: 500 }
      );
    }

    if (!user || !user.password_hash) {
      return NextResponse.json(
        { error: 'Invalid credentials.' },
        { status: 401 }
      );
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return NextResponse.json(
        { error: 'Invalid credentials.' },
        { status: 401 }
      );
    }

    const token = await new SignJWT({
      sub: user.id,
      email: user.email,
      role: user.role || 'user',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret);

    return NextResponse.json(
      {
        message: 'Login successful.',
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role || 'user',
          subscription_status: user.subscription_status,
          trial_end: user.trial_end,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown login error';

    return NextResponse.json(
      { error: 'Login failed.', details: message },
      { status: 500 }
    );
  }
}