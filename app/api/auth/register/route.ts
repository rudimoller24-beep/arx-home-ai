import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '').trim();

    if (!email || !password) {
      return NextResponse.json(
        {
          error: 'Email and password are required.',
          debug: {
            supabaseUrl,
            email,
          },
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          error: 'Password must be at least 6 characters long.',
          debug: {
            supabaseUrl,
            email,
          },
        },
        { status: 400 }
      );
    }

    const { data: existingUsers, error: existingUserError } = await supabase
      .from('profiles')
      .select('id, email, created_at')
      .ilike('email', email);

    if (existingUserError) {
      return NextResponse.json(
        {
          error: 'Failed to check existing user.',
          details: existingUserError.message,
          debug: {
            supabaseUrl,
            email,
          },
        },
        { status: 500 }
      );
    }

    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json(
        {
          error: 'User already exists.',
          debug: {
            supabaseUrl,
            email,
            existingUsers,
            existingCount: existingUsers.length,
          },
        },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 7);

    const { data, error } = await supabase
      .from('profiles')
      .insert([
        {
          email,
          password_hash: passwordHash,
          subscription_status: 'trial',
          trial_end: trialEnd.toISOString(),
          role: 'user',
        },
      ])
      .select('id, email, role, subscription_status, trial_end, created_at')
      .single();

    if (error) {
      return NextResponse.json(
        {
          error: 'Failed to create user.',
          details: error.message,
          debug: {
            supabaseUrl,
            email,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Registration successful.',
        user: data,
        debug: {
          supabaseUrl,
          email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown registration error';

    return NextResponse.json(
      {
        error: 'Registration failed.',
        details: message,
        debug: {
          supabaseUrl,
        },
      },
      { status: 500 }
    );
  }
}