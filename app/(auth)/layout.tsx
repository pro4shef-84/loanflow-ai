import { Zap } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-950 text-white flex-col justify-between p-12">
        <div className="flex items-center gap-2">
          <Zap className="h-8 w-8 text-blue-400" />
          <span className="text-2xl font-bold tracking-tight">LoanFlow AI</span>
        </div>
        <div className="space-y-6">
          <h2 className="text-4xl font-bold leading-tight">
            Your virtual loan processor, working 24/7.
          </h2>
          <p className="text-slate-400 text-lg">
            AI-powered document intake, condition tracking, and borrower communication — so you can focus on closing deals.
          </p>
          <div className="space-y-3 text-slate-300">
            {[
              "Auto-classify and extract data from every document",
              "Parse lender conditions into plain-English tasks",
              "Borrower portal with drag-drop uploads",
              "Pulse monitoring for past-client opportunities",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-slate-600 text-sm">LoanFlow AI © {new Date().getFullYear()}</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="flex items-center gap-2 lg:hidden">
            <Zap className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold">LoanFlow AI</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
