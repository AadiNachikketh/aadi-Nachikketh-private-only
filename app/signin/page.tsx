'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, getOAuthRedirectUrl } from '../../src/supabaseClient.js';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get('email');
      const isSignupSuccess = params.get('signup') === 'success';
      if (emailParam) {
        setEmail(emailParam);
      }
      if (isSignupSuccess) {
        setSignupSuccess(true);
      }
    }

    // If user returns from Google OAuth with a valid session, go straight to Home ("/")
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/');
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.replace('/');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    if (data?.session) {
      router.push('/');
    } else {
      setErrorMsg('Check your email and confirm your account before logging in.');
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getOAuthRedirectUrl(),
      },
    });
    if (error) {
      setErrorMsg(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
        <div>
          <h1 className="text-lg font-bold text-white">Sign In</h1>
          <p className="text-xs text-slate-400 mt-1">
            Sign in to your Agency Command Center account
          </p>
        </div>

        {signupSuccess && (
          <p className="text-xs text-emerald-400">
            Your account has been created. Please check your email and verify your address before logging in.
          </p>
        )}

        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            Continue with Google
          </button>

          {errorMsg && (
            <p className="text-xs text-rose-400 mt-2">{errorMsg}</p>
          )}
        </form>

        <div className="text-xs text-slate-400 text-center pt-2 border-t border-slate-800">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-blue-400 hover:underline">
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
