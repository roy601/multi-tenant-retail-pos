"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/utils/supabase/component";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  async function logIn() {
    setLoginError("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setLoginError(error.message);
        return;
      }

      if (!data?.user) {
        setLoginError("Authentication failed - no user found");
        return;
      }

      // 1. Check if the user is active in our users table
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('is_active, role')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile error during login:", profileError);
        setLoginError(`Database error: ${profileError.message}`);
        return;
      }

      if (!profile) {
        setLoginError("User profile not found. If you just signed up, please make sure you completed the shop setup process.");
        return;
      }

      if (!profile.is_active) {
        setLoginError("Your account has been deactivated. Please contact your administrator.");
        await supabase.auth.signOut();
        return;
      }

      // 2. Update last login timestamp
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.user.id);

      // 3. Conditional redirect based on role
      if (profile.role === 'owner') {
        router.push("/select-shop");
      } else {
        router.push("/main");
      }
    } catch (err) {
      console.error("Login error:", err);
      setLoginError("An unexpected error occurred");
    }
  }

  async function signUp() {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error || !data.session) {
      router.push("/login");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 to-white">
      <div className="w-full max-w-sm p-6 bg-white rounded-2xl shadow-xl border border-green-200">
        {/* POS Branding Title */}
        <div className="text-center mb-6">
          <div className="text-3xl font-extrabold text-green-600 tracking-tight">
            POS Login
          </div>
          <p className="text-sm text-gray-500">Manage your sales effortlessly</p>
        </div>

        {loginError && (
          <div className="mb-4 p-2 bg-red-100 text-red-600 rounded text-sm text-center">
            {loginError}
          </div>
        )}

        <form className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@store.com"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-400 transition"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-400 transition"
            />
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button
              type="button"
              onClick={logIn}
              className="w-full py-2 bg-green-600 text-white font-semibold rounded-lg shadow hover:bg-green-700 transition"
            >
              Log In
            </button>
            <p className="text-xs text-gray-400 text-center mt-6">
                Don’t have an account?{" "}
              <a href="/signup" className="text-green-600 hover:underline font-medium">
               Sign up
              </a>
            </p>
          </div>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          © {new Date().getFullYear()} MobilePOS. All rights reserved.
        </p>
      </div>
    </main>
  );
}
