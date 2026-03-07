"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Zap, CheckCircle, ArrowRight, FileText, Brain, Users, Activity,
  Calculator, Shield, Clock, TrendingUp, Building2, FileCheck,
  ChevronDown, Menu, X, Star
} from "lucide-react";

const FEATURES = [
  {
    icon: Calculator,
    title: "Pricing Engine",
    description: "Real-time rate scenarios across all loan programs with full fee worksheets and cash-to-close calculations.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: FileText,
    title: "1003 Application",
    description: "6-step URLA form capturing borrower info, employment, assets, liabilities, and declarations.",
    color: "bg-purple-50 text-purple-600",
  },
  {
    icon: Brain,
    title: "AI Underwriting (AUS)",
    description: "AI-powered DU/LP-style simulation with findings, risk assessment, and condition generation.",
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    icon: FileCheck,
    title: "Loan Estimate Generator",
    description: "TRID-formatted Loan Estimate with editable fee worksheet and print-ready PDF output.",
    color: "bg-cyan-50 text-cyan-600",
  },
  {
    icon: Shield,
    title: "Document AI",
    description: "Auto-classify and extract data from W2s, pay stubs, bank statements, and 15+ document types.",
    color: "bg-green-50 text-green-600",
  },
  {
    icon: Users,
    title: "Borrower Portal",
    description: "Branded token-based portal for drag-drop document uploads — no login required for borrowers.",
    color: "bg-orange-50 text-orange-600",
  },
  {
    icon: Building2,
    title: "Lender Submission",
    description: "Prepare and track loan package submissions to wholesale lenders with status monitoring.",
    color: "bg-rose-50 text-rose-600",
  },
  {
    icon: Activity,
    title: "Pulse Monitoring",
    description: "AI monitors past clients for rate drops, equity triggers, and refinance opportunities.",
    color: "bg-violet-50 text-violet-600",
  },
];

const STATS = [
  { value: "8+", label: "AI-Powered Modules" },
  { value: "15+", label: "Document Types Classified" },
  { value: "6", label: "Loan Programs Priced" },
  { value: "14", label: "Days Free Trial" },
];

const PLANS = [
  {
    name: "Starter",
    price: "$149",
    period: "/mo",
    description: "For solo loan officers getting started.",
    features: ["Up to 8 active loan files", "Pricing Engine", "1003 Application", "Borrower Portal", "Document AI"],
    cta: "Start Free Trial",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$299",
    period: "/mo",
    description: "For growing brokers who need everything.",
    features: ["Unlimited loan files", "AUS Simulation", "Loan Estimate Generator", "Lender Submission", "Pulse Monitoring", "Pre-Approval Letters", "Disclosures Tracker"],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Team",
    price: "$499",
    period: "/mo",
    description: "For teams and broker shops.",
    features: ["3 LO seats", "All Pro features", "MCR Reporting", "Shared pipeline", "Manager dashboard"],
    cta: "Contact Sales",
    highlighted: false,
  },
];

const STEPS = [
  { step: "01", title: "Create a Loan File", description: "Enter basic loan details and instantly get an auto-generated document checklist tailored to the loan type." },
  { step: "02", title: "AI Does the Heavy Lifting", description: "Upload documents and let AI classify, extract data, run AUS simulation, and score submission readiness." },
  { step: "03", title: "Close Faster", description: "Track conditions, generate Loan Estimates, submit to lenders, and keep borrowers updated — all in one place." },
];

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function AuthForm() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [nmlsId, setNmlsId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === "signin") {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) { setError(err.message); setLoading(false); return; }
      router.push("/dashboard");
      router.refresh();
    } else {
      const { data, error: err } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName, nmls_id: nmlsId } },
      });
      if (err) { setError(err.message); setLoading(false); return; }
      if (data.user) {
        await supabase.from("users").insert({
          id: data.user.id, email, full_name: fullName,
          nmls_id: nmlsId || null, subscription_tier: "trial",
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        });
        router.push("/dashboard");
        router.refresh();
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-slate-100">
      {/* Toggle */}
      <div className="flex rounded-lg bg-slate-100 p-1 mb-6">
        <button
          onClick={() => { setMode("signup"); setError(null); }}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${mode === "signup" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
        >
          Start Free Trial
        </button>
        <button
          onClick={() => { setMode("signin"); setError(null); }}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${mode === "signin" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
        >
          Sign In
        </button>
      </div>

      {mode === "signup" && (
        <p className="text-xs text-center text-slate-500 mb-4 -mt-2">14 days free · No credit card required</p>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full gap-2 mb-4"
        onClick={handleGoogle}
        disabled={loading}
      >
        <GoogleIcon />
        Continue with Google
      </Button>

      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-slate-400">or</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "signup" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Full Name</Label>
              <Input placeholder="Jane Smith" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">NMLS ID (optional)</Label>
              <Input placeholder="1234567" value={nmlsId} onChange={(e) => setNmlsId(e.target.value)} />
            </div>
          </div>
        )}
        <div className="space-y-1">
          <Label className="text-xs">{mode === "signup" ? "Work Email" : "Email"}</Label>
          <Input type="email" placeholder="you@broker.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Password</Label>
          <Input type="password" placeholder={mode === "signup" ? "Min. 8 characters" : "••••••••"} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
          {loading ? "Loading..." : mode === "signup" ? "Create Free Account" : "Sign In"}
        </Button>
      </form>
    </div>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* NAV */}
      <header className="sticky top-0 z-50 bg-slate-950 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Zap className="h-7 w-7 text-blue-400" />
            <span className="text-xl font-bold tracking-tight">LoanFlow AI</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <a href="#hero" className="text-sm text-slate-300 hover:text-white transition-colors">Sign in</a>
            <a href="#hero">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white">
                Start Free Trial
              </Button>
            </a>
          </div>

          {/* Mobile menu toggle */}
          <button className="md:hidden text-slate-300" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 px-4 py-4 space-y-3 text-sm text-slate-300">
            <a href="#features" className="block hover:text-white" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#how-it-works" className="block hover:text-white" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
            <a href="#pricing" className="block hover:text-white" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <a href="#hero" className="block hover:text-white" onClick={() => setMobileMenuOpen(false)}>Sign In / Sign Up</a>
          </div>
        )}
      </header>

      {/* HERO */}
      <section id="hero" className="bg-slate-950 text-white pt-20 pb-28 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: copy */}
          <div className="space-y-8">
            <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30 text-sm px-3 py-1">
              Built for Independent Mortgage Brokers
            </Badge>
            <h1 className="text-5xl sm:text-6xl font-bold leading-tight tracking-tight">
              Your virtual loan processor,{" "}
              <span className="text-blue-400">working 24/7.</span>
            </h1>
            <p className="text-slate-400 text-xl leading-relaxed max-w-xl">
              AI-powered loan origination, AUS simulation, pricing engine, and borrower portal — everything ARIVE offers, reimagined with AI at the core.
            </p>

            <div className="space-y-3">
              {[
                "Rate quotes across all loan programs in seconds",
                "1003 application, AUS, Loan Estimate in one workflow",
                "AI classifies & extracts data from every document",
                "Borrower portal — no login needed for clients",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 text-slate-300">
                  <CheckCircle className="h-5 w-5 text-blue-400 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-slate-500 pt-2">
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-blue-400" />
                <span>SOC 2 compliant</span>
              </div>
            </div>
          </div>

          {/* Right: auth form */}
          <div className="flex justify-center lg:justify-end">
            <AuthForm />
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="bg-blue-600 text-white py-10 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {STATS.map(({ value, label }) => (
            <div key={label}>
              <div className="text-4xl font-bold">{value}</div>
              <div className="text-blue-200 text-sm mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 px-4 sm:px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto space-y-14">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge variant="outline" className="text-blue-600 border-blue-200">Platform Features</Badge>
            <h2 className="text-4xl font-bold tracking-tight">Everything you need to originate faster</h2>
            <p className="text-slate-500 text-lg">From first rate quote to lender submission — all in one AI-powered platform.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(({ icon: Icon, title, description, color }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow space-y-4">
                <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{title}</h3>
                  <p className="text-slate-500 text-sm mt-1 leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto space-y-14">
          <div className="text-center space-y-3">
            <Badge variant="outline" className="text-blue-600 border-blue-200">How It Works</Badge>
            <h2 className="text-4xl font-bold tracking-tight">Go from intake to close in record time</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map(({ step, title, description }, i) => (
              <div key={step} className="relative space-y-4">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[calc(100%-1rem)] w-full h-0.5 bg-blue-100 z-0" />
                )}
                <div className="relative z-10 h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  {step}
                </div>
                <h3 className="font-bold text-lg">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURE HIGHLIGHT — AI */}
      <section className="py-24 px-4 sm:px-6 bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30">AI-Powered</Badge>
            <h2 className="text-4xl font-bold leading-tight">
              AUS that thinks like an underwriter.
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed">
              Our AI AUS simulation analyzes LTV, DTI, credit score, and loan characteristics to produce DU/LP-style recommendations — with findings, conditions, and risk levels — before you ever submit to a lender.
            </p>
            <div className="space-y-3">
              {[
                "APPROVE/ELIGIBLE, REFER, or REFER WITH CAUTION",
                "Detailed findings by category",
                "Auto-generated underwriting conditions",
                "Confidence score on every result",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 text-slate-300 text-sm">
                  <CheckCircle className="h-4 w-4 text-blue-400 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <a href="#hero">
              <Button className="bg-blue-600 hover:bg-blue-500 gap-2 mt-2">
                Try It Free <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
          </div>

          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">AUS Result</span>
              <Badge className="bg-green-600 text-white">APPROVE / ELIGIBLE</Badge>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[["LTV", "80%"], ["DTI", "38%"], ["Credit", "740"]].map(([label, value]) => (
                <div key={label} className="bg-slate-800 rounded-lg p-3 text-center">
                  <p className="text-slate-400 text-xs">{label}</p>
                  <p className="text-white font-bold text-lg">{value}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {[
                { label: "Credit Score", finding: "Score meets guidelines", ok: true },
                { label: "LTV", finding: "LTV within conventional limits", ok: true },
                { label: "DTI", finding: "Back-end DTI within guidelines", ok: true },
                { label: "Reserves", finding: "3 months reserves provided", ok: true },
              ].map(({ label, finding, ok }) => (
                <div key={label} className="flex items-center gap-3 text-sm">
                  <CheckCircle className={`h-4 w-4 shrink-0 ${ok ? "text-green-400" : "text-red-400"}`} />
                  <span className="text-slate-300">{finding}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-800 pt-3 text-xs text-slate-500">
              AI simulation · Not a commitment to lend
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto space-y-14">
          <div className="text-center space-y-3">
            <Badge variant="outline" className="text-blue-600 border-blue-200">Pricing</Badge>
            <h2 className="text-4xl font-bold tracking-tight">Simple, transparent pricing</h2>
            <p className="text-slate-500 text-lg">Start free for 14 days. No credit card required.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map(({ name, price, period, description, features, cta, highlighted }) => (
              <div
                key={name}
                className={`rounded-2xl p-8 space-y-6 border-2 ${highlighted ? "border-blue-600 bg-blue-600 text-white shadow-xl scale-[1.02]" : "border-slate-200 bg-white"}`}
              >
                {highlighted && (
                  <Badge className="bg-white text-blue-600 text-xs">Most Popular</Badge>
                )}
                <div>
                  <h3 className={`text-lg font-bold ${highlighted ? "text-white" : "text-slate-900"}`}>{name}</h3>
                  <p className={`text-sm mt-1 ${highlighted ? "text-blue-200" : "text-slate-500"}`}>{description}</p>
                </div>
                <div className="flex items-end gap-1">
                  <span className={`text-4xl font-bold ${highlighted ? "text-white" : "text-slate-900"}`}>{price}</span>
                  <span className={`text-sm mb-1 ${highlighted ? "text-blue-200" : "text-slate-500"}`}>{period}</span>
                </div>
                <ul className="space-y-2">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle className={`h-4 w-4 shrink-0 ${highlighted ? "text-blue-200" : "text-blue-600"}`} />
                      <span className={highlighted ? "text-blue-100" : "text-slate-600"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <a href="#hero">
                  <Button
                    className={`w-full ${highlighted ? "bg-white text-blue-600 hover:bg-blue-50" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
                  >
                    {cta}
                  </Button>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 px-4 sm:px-6 bg-blue-600 text-white text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-4xl font-bold">Ready to close more loans, faster?</h2>
          <p className="text-blue-200 text-lg">Join loan officers using LoanFlow AI to automate their pipeline — from first quote to clear to close.</p>
          <a href="#hero">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 font-semibold gap-2 px-8">
              Start Your Free Trial <ArrowRight className="h-5 w-5" />
            </Button>
          </a>
          <p className="text-blue-300 text-sm">14 days free · No credit card · Cancel anytime</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-400 py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-6 w-6 text-blue-400" />
                <span className="text-white font-bold">LoanFlow AI</span>
              </div>
              <p className="text-sm leading-relaxed">
                AI-powered loan origination platform for independent mortgage brokers.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-white text-sm font-semibold">Product</h4>
              <div className="space-y-2 text-sm">
                <a href="#features" className="block hover:text-white transition-colors">Features</a>
                <a href="#pricing" className="block hover:text-white transition-colors">Pricing</a>
                <a href="#how-it-works" className="block hover:text-white transition-colors">How It Works</a>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-white text-sm font-semibold">Platform</h4>
              <div className="space-y-2 text-sm">
                <span className="block">Pricing Engine</span>
                <span className="block">AUS Simulation</span>
                <span className="block">Loan Estimate</span>
                <span className="block">Borrower Portal</span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-white text-sm font-semibold">Get Started</h4>
              <div className="space-y-2 text-sm">
                <a href="#hero" className="block hover:text-white transition-colors">Start Free Trial</a>
                <a href="#hero" className="block hover:text-white transition-colors">Sign In</a>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
            <p>© {new Date().getFullYear()} LoanFlow AI. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
