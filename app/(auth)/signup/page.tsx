"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nmlsId, setNmlsId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, nmls_id: nmlsId },
      },
    });

    if (signupError) {
      setError(signupError.message);
      setIsLoading(false);
      return;
    }

    if (data.user) {
      // Create user profile
      await supabase.from("users").insert({
        id: data.user.id,
        email,
        full_name: fullName,
        nmls_id: nmlsId || null,
        subscription_tier: "trial",
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      });

      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Start your free trial</h1>
        <p className="text-muted-foreground mt-1">14 days free. No credit card required.</p>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            placeholder="Jane Smith"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Work Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="jane@broker.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nmlsId">NMLS ID (optional)</Label>
          <Input
            id="nmlsId"
            placeholder="1234567"
            value={nmlsId}
            onChange={(e) => setNmlsId(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
