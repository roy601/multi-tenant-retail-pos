"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/utils/supabase/component";

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupError, setSignupError] = useState("");

  async function handleSignUp() {
    setSignupError("");

    if (!fullName || !email || !password) {
      setSignupError("Please fill in all required fields.");
      return;
    }

    try {
      // 1. Sign up the user in Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone,
          },
        },
      });

      if (authError) {
        setSignupError(authError.message);
        return;
      }

      if (!data?.user) {
        setSignupError("Signup failed. Please try again.");
        return;
      }

      const userId = data.user.id;

      if (!data?.session) {
        setSignupError("Account created! Please check your email and confirm it before you can log in and set up your shop.");
        // router.push("/login"); // Optional: redirect to login
        return;
      }

      // 2. Register organization and user profile atomically
      const { data: regResult, error: regError } = await supabase.rpc('register_organization_and_user', {
        p_org_name: `${fullName}'s Shop`,
        p_full_name: fullName,
        p_email: email,
        p_phone: phone,
      });

      if (regError) {
        console.error("Error setting up shop:", regError);
        setSignupError(`Account created, but failed to set up your shop: ${regError.message}`);
        return;
      }

      router.push("/main");
    } catch (err) {
      console.error("Unexpected signup error:", err);
      setSignupError("An unexpected error occurred.");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 to-white">
      <div className="w-full max-w-sm p-6 bg-white rounded-2xl shadow-xl border border-green-200">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-green-600">Create Account</h1>
          <p className="text-sm text-gray-500">Sign up for your POS dashboard</p>
        </div>

        {signupError && (
          <div className="mb-4 p-2 bg-red-100 text-red-600 rounded text-sm text-center">
            {signupError}
          </div>
        )}

        <form className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-400 transition"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-gray-700">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+8801XXXXXXXXX"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-400 transition"
            />
          </div>

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

          <button
            type="button"
            onClick={handleSignUp}
            className="w-full py-2 bg-green-600 text-white font-semibold rounded-lg shadow hover:bg-green-700 transition"
          >
            Sign Up
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          Already have an account?{" "}
          <button
            onClick={() => router.push("/login")}
            className="text-green-600 hover:underline font-medium ml-1"
          >
            Log in
          </button>
        </p>
      </div>
    </main>
  );
}
