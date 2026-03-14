"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Zap, CheckCircle, ArrowRight, FileText, Brain, Users,
  Shield, Clock, TrendingUp, Building2, FileCheck,
  Menu, X, Star, Sparkles, BarChart3, Send,
  ChevronRight, Lock, Eye, Bell
} from "lucide-react";

/* ────────────────────────────────────────────────────────
   DATA
   ──────────────────────────────────────────────────────── */

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
];

const STATS = [
  { value: "60%", label: "Faster File Completion" },
  { value: "99.2%", label: "Classification Accuracy" },
  { value: "Zero", label: "Compliance Gaps" },
  { value: "14-Day", label: "Free Trial" },
];

const FEATURE_GROUPS = [
  {
    tag: "AI Document Intelligence",
    tagColor: "text-emerald-400",
    title: "Every document, instantly understood.",
    description:
      "Upload W2s, pay stubs, bank statements, and 15+ document types. Our AI classifies, extracts key data, and flags issues before they become problems.",
    features: [
      { icon: Eye, text: "Auto-classify 15+ document types on upload" },
      { icon: FileCheck, text: "Extract income, assets, and employment data" },
      { icon: Bell, text: "Flag missing or expired documents instantly" },
    ],
    visual: "doc-ai",
  },
  {
    tag: "Workflow Automation",
    tagColor: "text-blue-400",
    title: "Your pipeline runs itself.",
    description:
      "From auto-generated checklists to a borrower portal that doesn't require login, every step of the origination workflow is handled.",
    features: [
      { icon: FileText, text: "Smart checklists tailored to each loan type" },
      { icon: Users, text: "Branded borrower portal — no login needed" },
      { icon: Clock, text: "Automated reminders and status updates" },
    ],
    visual: "workflow",
  },
  {
    tag: "Compliance & Closing",
    tagColor: "text-violet-400",
    title: "Submit with confidence.",
    description:
      "Run AUS simulation before submitting to lenders. Generate TRID-compliant Loan Estimates and track every disclosure — all in one place.",
    features: [
      { icon: Brain, text: "DU/LP-style AUS simulation with findings" },
      { icon: BarChart3, text: "TRID-formatted Loan Estimates with fee worksheets" },
      { icon: Send, text: "Track lender submissions and conditions" },
    ],
    visual: "compliance",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Create a loan file",
    description:
      "Enter basic details and get an auto-generated document checklist tailored to the loan program.",
  },
  {
    num: "02",
    title: "AI does the heavy lifting",
    description:
      "Upload docs and let AI classify, extract data, run AUS, and score submission readiness.",
  },
  {
    num: "03",
    title: "Close faster",
    description:
      "Generate Loan Estimates, submit to lenders, and keep borrowers updated — all from one dashboard.",
  },
];

const PLANS = [
  {
    name: "Starter",
    price: "$99",
    period: "/mo",
    description: "For solo loan officers getting started with AI.",
    features: [
      "Up to 8 active loan files",
      "Pricing Engine",
      "1003 Application",
      "Borrower Portal",
      "Document AI",
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$249",
    period: "/mo",
    description: "For growing brokers who need the full platform.",
    features: [
      "Unlimited loan files",
      "Everything in Starter",
      "AUS Simulation",
      "Loan Estimate Generator",
      "Lender Submission",
      "Pulse Monitoring",
      "Pre-Approval Letters",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Team",
    price: "$499",
    period: "/mo",
    description: "For broker shops and teams.",
    features: [
      "3 LO seats included",
      "Everything in Pro",
      "MCR Reporting",
      "Shared pipeline view",
      "Manager dashboard",
      "Priority support",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

const TESTIMONIALS = [
  {
    quote:
      "LoanFlow cut my file prep time in half. I closed 4 extra loans last month just from the time I got back.",
    name: "Sarah M.",
    role: "Independent Broker, TX",
  },
  {
    quote:
      "The AUS simulation alone saves me from embarrassing surprises at submission. I know the result before the lender does.",
    name: "James K.",
    role: "Loan Officer, FL",
  },
  {
    quote:
      "My borrowers love the portal. They upload docs from their phone in 2 minutes. No more chasing people for paperwork.",
    name: "Michelle R.",
    role: "Branch Manager, CA",
  },
];

/* ────────────────────────────────────────────────────────
   GOOGLE ICON
   ──────────────────────────────────────────────────────── */

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────
   AUTH FORM
   ──────────────────────────────────────────────────────── */

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
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } else {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, nmls_id: nmlsId } },
      });
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      if (data.user) {
        await supabase.from("users").insert({
          id: data.user.id,
          email,
          full_name: fullName,
          nmls_id: nmlsId || null,
          subscription_tier: "trial",
          trial_ends_at: new Date(
            Date.now() + 14 * 24 * 60 * 60 * 1000
          ).toISOString(),
        });
        router.push("/dashboard");
        router.refresh();
      }
    }
  };

  return (
    <div className="relative w-full max-w-md">
      {/* Glow effect behind the card */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-600/20 via-violet-600/20 to-blue-600/20 blur-xl" />

      <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
        {/* Toggle */}
        <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
          <button
            onClick={() => {
              setMode("signup");
              setError(null);
            }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              mode === "signup"
                ? "bg-white shadow-sm text-slate-900"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Start Free Trial
          </button>
          <button
            onClick={() => {
              setMode("signin");
              setError(null);
            }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              mode === "signin"
                ? "bg-white shadow-sm text-slate-900"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Sign In
          </button>
        </div>

        {mode === "signup" && (
          <p className="text-xs text-center text-slate-500 mb-5 -mt-2">
            14 days free &middot; No credit card required
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          className="w-full gap-2.5 mb-5 h-11 rounded-xl border-slate-200 hover:bg-slate-50 transition-colors"
          onClick={handleGoogle}
          disabled={loading}
        >
          <GoogleIcon />
          Continue with Google
        </Button>

        <div className="relative mb-5">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-slate-400">or</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === "signup" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">
                  Full Name
                </Label>
                <Input
                  placeholder="Jane Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="h-10 rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">
                  NMLS ID{" "}
                  <span className="text-slate-400 font-normal">(optional)</span>
                </Label>
                <Input
                  placeholder="1234567"
                  value={nmlsId}
                  onChange={(e) => setNmlsId(e.target.value)}
                  className="h-10 rounded-lg"
                />
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">
              {mode === "signup" ? "Work Email" : "Email"}
            </Label>
            <Input
              type="email"
              placeholder="you@broker.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-10 rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">
              Password
            </Label>
            <Input
              type="password"
              placeholder={
                mode === "signup" ? "Min. 8 characters" : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              className="h-10 rounded-lg"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all duration-200 shadow-lg shadow-blue-600/25"
            disabled={loading}
          >
            {loading
              ? "Loading..."
              : mode === "signup"
                ? "Create Free Account"
                : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   FEATURE VISUAL PANELS (right side of feature rows)
   ──────────────────────────────────────────────────────── */

function FeatureVisual({ type }: { type: string }) {
  if (type === "doc-ai") {
    return (
      <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700/50 space-y-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <span>Document AI Processing</span>
        </div>
        <div className="space-y-3">
          {[
            { name: "W2_2024_Smith.pdf", type: "W-2", confidence: "99.1%" },
            { name: "BankStmt_Chase_Jan.pdf", type: "Bank Statement", confidence: "98.7%" },
            { name: "Paystub_Feb2026.pdf", type: "Pay Stub", confidence: "99.4%" },
          ].map((doc) => (
            <div
              key={doc.name}
              className="flex items-center justify-between bg-slate-800/80 rounded-xl px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <FileCheck className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{doc.name}</p>
                  <p className="text-slate-500 text-xs">{doc.type}</p>
                </div>
              </div>
              <span className="text-emerald-400 text-xs font-mono font-semibold">
                {doc.confidence}
              </span>
            </div>
          ))}
        </div>
        <div className="text-xs text-slate-500 pt-1">
          3 documents classified in 1.2s
        </div>
      </div>
    );
  }

  if (type === "workflow") {
    return (
      <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700/50 space-y-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <BarChart3 className="h-4 w-4 text-blue-400" />
          <span>Loan Pipeline</span>
        </div>
        <div className="space-y-3">
          {[
            { borrower: "Johnson, M.", status: "Docs Complete", progress: 85, color: "bg-emerald-500" },
            { borrower: "Williams, S.", status: "AUS Approved", progress: 92, color: "bg-blue-500" },
            { borrower: "Chen, L.", status: "Awaiting Docs", progress: 45, color: "bg-amber-500" },
          ].map((loan) => (
            <div
              key={loan.borrower}
              className="bg-slate-800/80 rounded-xl px-4 py-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-medium">
                  {loan.borrower}
                </span>
                <span className="text-slate-400 text-xs">{loan.status}</span>
              </div>
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${loan.color} rounded-full transition-all duration-1000`}
                  style={{ width: `${loan.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // compliance
  return (
    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700/50 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Brain className="h-4 w-4 text-violet-400" />
          <span>AUS Simulation</span>
        </div>
        <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
          APPROVE / ELIGIBLE
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          ["LTV", "80%"],
          ["DTI", "38%"],
          ["Credit", "740"],
        ].map(([label, value]) => (
          <div
            key={label}
            className="bg-slate-800/80 rounded-xl p-3 text-center"
          >
            <p className="text-slate-500 text-xs">{label}</p>
            <p className="text-white font-bold text-lg">{value}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {[
          "Credit score meets guidelines",
          "LTV within conventional limits",
          "DTI ratio acceptable",
          "Reserves verified (3 months)",
        ].map((finding) => (
          <div key={finding} className="flex items-center gap-2.5 text-sm">
            <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="text-slate-300">{finding}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   MAIN PAGE
   ──────────────────────────────────────────────────────── */

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      {/* ─── NAV ─── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
              <Zap className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              LoanFlow AI
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            {NAV_LINKS.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className="hover:text-white transition-colors duration-200"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <a
              href="#hero"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Sign in
            </a>
            <a href="#hero">
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-600/25 transition-all duration-200 hover:shadow-blue-500/40"
              >
                Start Free Trial
              </Button>
            </a>
          </div>

          <button
            className="md:hidden text-slate-400 hover:text-white transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-white/5 px-4 py-5 space-y-4 text-sm">
            {NAV_LINKS.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className="block text-slate-300 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {label}
              </a>
            ))}
            <a
              href="#hero"
              className="block text-slate-300 hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sign In / Sign Up
            </a>
          </div>
        )}
      </header>

      {/* ─── HERO ─── */}
      <section
        id="hero"
        className="relative pt-32 pb-24 lg:pb-32 px-4 sm:px-6 overflow-hidden"
      >
        {/* Background gradient orbs */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-violet-600/8 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="relative max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          {/* Left */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-sm text-blue-400">
              <Sparkles className="h-3.5 w-3.5" />
              Built for Independent Mortgage Brokers
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-[4.25rem] font-bold leading-[1.1] tracking-tight">
              Your AI{" "}
              <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-violet-400 bg-clip-text text-transparent">
                Loan Processor
              </span>
            </h1>

            <p className="text-slate-400 text-xl leading-relaxed max-w-lg">
              Independent mortgage officers close faster with AI&#8209;powered
              file completion, AUS simulation, and automated compliance — from
              first quote to clear&#8209;to&#8209;close.
            </p>

            <div className="space-y-3">
              {[
                "AI classifies and extracts data from every document",
                "Auto-generated checklists and borrower portal",
                "AUS simulation, Loan Estimates, lender submission",
                "Zero compliance gaps — every step is tracked",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 text-slate-300 text-[15px]"
                >
                  <CheckCircle className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-6 text-sm text-slate-500 pt-2">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-slate-500" />
                <span>No credit card</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-slate-500" />
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

      {/* ─── STATS BAR ─── */}
      <section className="relative border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-2 sm:grid-cols-4 gap-8">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
                {value}
              </div>
              <div className="text-slate-500 text-sm mt-1.5">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-24 lg:py-32 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-24">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm text-slate-400">
              Platform Features
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Everything you need to originate faster
            </h2>
            <p className="text-slate-400 text-lg">
              From first rate quote to lender submission — all in one
              AI-powered platform.
            </p>
          </div>

          {FEATURE_GROUPS.map((group, i) => (
            <div
              key={group.tag}
              className={`grid lg:grid-cols-2 gap-12 lg:gap-16 items-center ${
                i % 2 === 1 ? "lg:grid-flow-dense" : ""
              }`}
            >
              <div
                className={`space-y-6 ${i % 2 === 1 ? "lg:col-start-2" : ""}`}
              >
                <span
                  className={`text-sm font-semibold uppercase tracking-wider ${group.tagColor}`}
                >
                  {group.tag}
                </span>
                <h3 className="text-3xl sm:text-4xl font-bold leading-tight">
                  {group.title}
                </h3>
                <p className="text-slate-400 text-lg leading-relaxed">
                  {group.description}
                </p>
                <div className="space-y-4 pt-2">
                  {group.features.map(({ icon: Icon, text }) => (
                    <div
                      key={text}
                      className="flex items-center gap-3.5 text-slate-300"
                    >
                      <div className="h-9 w-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-slate-300" />
                      </div>
                      <span className="text-[15px]">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className={i % 2 === 1 ? "lg:col-start-1" : ""}>
                <FeatureVisual type={group.visual} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section
        id="how-it-works"
        className="py-24 lg:py-32 px-4 sm:px-6 relative"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-600/[0.03] to-transparent pointer-events-none" />

        <div className="relative max-w-5xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm text-slate-400">
              How It Works
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Go from intake to close in record time
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map(({ num, title, description }, i) => (
              <div key={num} className="relative group">
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-7 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px bg-gradient-to-r from-blue-500/30 to-blue-500/5" />
                )}
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-8 space-y-5 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-blue-600/20">
                    {num}
                  </div>
                  <h3 className="font-bold text-xl">{title}</h3>
                  <p className="text-slate-400 text-[15px] leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SOCIAL PROOF ─── */}
      <section className="py-24 px-4 sm:px-6 border-y border-white/5">
        <div className="max-w-7xl mx-auto space-y-14">
          <div className="text-center space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Trusted by loan officers nationwide
            </h2>
            <p className="text-slate-400 text-lg">
              Hear from brokers who are closing more loans with less effort.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(({ quote, name, role }) => (
              <div
                key={name}
                className="bg-white/[0.03] border border-white/5 rounded-2xl p-8 space-y-6 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300"
              >
                {/* Stars */}
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star
                      key={j}
                      className="h-4 w-4 text-amber-400 fill-amber-400"
                    />
                  ))}
                </div>
                <p className="text-slate-300 text-[15px] leading-relaxed">
                  &ldquo;{quote}&rdquo;
                </p>
                <div>
                  <p className="text-white font-semibold text-sm">{name}</p>
                  <p className="text-slate-500 text-sm">{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="py-24 lg:py-32 px-4 sm:px-6 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm text-slate-400">
              Pricing
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="text-slate-400 text-lg">
              Start free for 14 days. No credit card required. Cancel anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {PLANS.map(
              ({ name, price, period, description, features, cta, highlighted }) => (
                <div
                  key={name}
                  className={`relative rounded-2xl p-8 space-y-6 transition-all duration-300 hover:-translate-y-1 ${
                    highlighted
                      ? "bg-gradient-to-b from-blue-600 to-blue-700 shadow-2xl shadow-blue-600/20 border-2 border-blue-500/50 scale-[1.02]"
                      : "bg-white/[0.03] border border-white/10 hover:border-white/15"
                  }`}
                >
                  {highlighted && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="bg-white text-blue-700 text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div>
                    <h3
                      className={`text-lg font-bold ${
                        highlighted ? "text-white" : "text-white"
                      }`}
                    >
                      {name}
                    </h3>
                    <p
                      className={`text-sm mt-1 ${
                        highlighted ? "text-blue-200" : "text-slate-400"
                      }`}
                    >
                      {description}
                    </p>
                  </div>

                  <div className="flex items-end gap-1">
                    <span className="text-5xl font-bold text-white">
                      {price}
                    </span>
                    <span
                      className={`text-sm mb-1.5 ${
                        highlighted ? "text-blue-200" : "text-slate-500"
                      }`}
                    >
                      {period}
                    </span>
                  </div>

                  <ul className="space-y-3">
                    {features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm">
                        <CheckCircle
                          className={`h-4 w-4 shrink-0 ${
                            highlighted ? "text-blue-200" : "text-blue-400"
                          }`}
                        />
                        <span
                          className={
                            highlighted ? "text-blue-100" : "text-slate-300"
                          }
                        >
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <a href="#hero" className="block">
                    <Button
                      className={`w-full h-11 rounded-xl font-semibold transition-all duration-200 ${
                        highlighted
                          ? "bg-white text-blue-700 hover:bg-blue-50 shadow-lg"
                          : "bg-white/10 text-white hover:bg-white/15 border border-white/10"
                      }`}
                    >
                      {cta}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </a>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-24 lg:py-32 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/10 via-blue-600/5 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

        <div className="relative max-w-2xl mx-auto text-center space-y-8">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Ready to close more loans,{" "}
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              faster?
            </span>
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed">
            Join loan officers using LoanFlow AI to automate their pipeline —
            from first quote to clear to close.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#hero">
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold gap-2 px-8 h-12 rounded-xl shadow-lg shadow-blue-600/25 transition-all duration-200 hover:shadow-blue-500/40"
              >
                Start Your Free Trial
                <ArrowRight className="h-5 w-5" />
              </Button>
            </a>
          </div>
          <p className="text-slate-500 text-sm">
            14 days free &middot; No credit card &middot; Cancel anytime
          </p>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-white/5 bg-[#07070b] py-14 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-4 gap-10 pb-12 border-b border-white/5">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-md bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                  <Zap className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-white font-bold">LoanFlow AI</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">
                AI-powered loan origination for independent mortgage brokers.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="text-white text-sm font-semibold">Product</h4>
              <div className="space-y-2.5 text-sm text-slate-500">
                <a
                  href="#features"
                  className="block hover:text-white transition-colors"
                >
                  Features
                </a>
                <a
                  href="#pricing"
                  className="block hover:text-white transition-colors"
                >
                  Pricing
                </a>
                <a
                  href="#how-it-works"
                  className="block hover:text-white transition-colors"
                >
                  How It Works
                </a>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-white text-sm font-semibold">Platform</h4>
              <div className="space-y-2.5 text-sm text-slate-500">
                <span className="block">Document AI</span>
                <span className="block">AUS Simulation</span>
                <span className="block">Loan Estimates</span>
                <span className="block">Borrower Portal</span>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-white text-sm font-semibold">Get Started</h4>
              <div className="space-y-2.5 text-sm text-slate-500">
                <a
                  href="#hero"
                  className="block hover:text-white transition-colors"
                >
                  Start Free Trial
                </a>
                <a
                  href="#hero"
                  className="block hover:text-white transition-colors"
                >
                  Sign In
                </a>
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-600">
            <p>
              &copy; {new Date().getFullYear()} LoanFlow AI. All rights
              reserved.
            </p>
            <div className="flex gap-6">
              <a
                href="#"
                className="hover:text-white transition-colors"
              >
                Privacy Policy
              </a>
              <a
                href="#"
                className="hover:text-white transition-colors"
              >
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
