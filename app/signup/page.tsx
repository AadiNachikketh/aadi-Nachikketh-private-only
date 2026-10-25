'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../src/supabaseClient.js';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      setErrorMsg(error.message);
      return;
    }

    // Ensure no auto-login session remains active before user verifies email and signs in
    if (data?.session) {
      await supabase.auth.signOut();
    }

    setLoading(false);

    // Redirect to Sign In page with pre-filled email and signup success indicator
    router.push(`/signin?signup=success&email=${encodeURIComponent(email)}`);
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
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
          <h1 className="text-lg font-bold text-white">Sign Up</h1>
          <p className="text-xs text-slate-400 mt-1">
            Create your Agency Command Center account
          </p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
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
            {loading ? 'Creating account...' : 'Sign Up'}
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
          Already have an account?{' '}
          <Link href="/signin" className="text-blue-400 hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
