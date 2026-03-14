"use client";

// ============================================================
// PORTAL HEADER — Branded header for the borrower upload portal
// Shows loan officer info, company branding, and trust indicators
// ============================================================

import { Zap, ShieldCheck } from "lucide-react";

interface PortalHeaderProps {
  officerName?: string | null;
  companyName?: string | null;
}

export function PortalHeader({ officerName, companyName }: PortalHeaderProps) {
  return (
    <header className="bg-white border-b sticky top-0 z-10">
      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Brand Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-600 text-white">
              <Zap className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base leading-tight">LoanFlow AI</span>
              <span className="text-xs text-muted-foreground leading-tight">Secure Document Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>256-bit encrypted</span>
          </div>
        </div>

        {/* Officer Info */}
        {(officerName || companyName) && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-sm text-muted-foreground">
              {officerName && (
                <span>
                  Your loan officer: <span className="font-medium text-foreground">{officerName}</span>
                </span>
              )}
              {officerName && companyName && <span> at </span>}
              {companyName && !officerName && <span>Company: </span>}
              {companyName && (
                <span className="font-medium text-foreground">{companyName}</span>
              )}
            </p>
          </div>
        )}
      </div>
    </header>
  );
}
