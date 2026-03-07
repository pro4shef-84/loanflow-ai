import { createClient } from "@/lib/supabase/server";
import { PortalChecklist } from "@/components/portal/PortalChecklist";
import { PortalUploader } from "@/components/portal/PortalUploader";
import { Progress } from "@/components/ui/progress";
import { Zap, CheckCircle } from "lucide-react";
import type { LoanType, DocumentType } from "@/lib/types/loan.types";
import type { Database } from "@/lib/types/database.types";

type Document = Database["public"]["Tables"]["documents"]["Row"];

interface PortalPageProps {
  params: Promise<{ token: string }>;
}

export default async function PortalPage({ params }: PortalPageProps) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: loan } = await supabase
    .from("loan_files")
    .select("*, documents(*)")
    .eq("portal_token", token)
    .single();

  type LoanRow = Database["public"]["Tables"]["loan_files"]["Row"] & { documents: Document[] };
  const loanData = loan as unknown as LoanRow | null;

  if (!loanData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold">Link not found or expired</p>
          <p className="text-muted-foreground text-sm">Please contact your loan officer for a new link.</p>
        </div>
      </div>
    );
  }

  // Check portal expiry
  if (loanData.portal_expires_at && new Date(loanData.portal_expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold">This link has expired</p>
          <p className="text-muted-foreground text-sm">Please contact your loan officer for a new link.</p>
        </div>
      </div>
    );
  }

  const documents = (loanData.documents ?? []) as Document[];
  const uploaded = documents.filter((d) => d.status !== "pending").length;
  const total = documents.length;
  const progress = total > 0 ? (uploaded / total) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-2">
          <Zap className="h-6 w-6 text-blue-600" />
          <span className="font-bold text-lg">Document Upload Portal</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-8 pb-16">
        {/* Welcome */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Hello! 👋</h1>
          <p className="text-muted-foreground">
            Your loan officer needs a few documents to process your loan. This is secure and takes just a few minutes.
          </p>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
          <div className="text-center">
            {progress === 100 ? (
              <div className="flex flex-col items-center gap-2 text-green-600">
                <CheckCircle className="h-10 w-10" />
                <p className="font-semibold text-lg">All documents submitted!</p>
                <p className="text-sm text-muted-foreground">Your loan officer will review them shortly.</p>
              </div>
            ) : (
              <>
                <p className="text-3xl font-bold">{uploaded} of {total}</p>
                <p className="text-muted-foreground">documents submitted</p>
              </>
            )}
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        {/* Checklist */}
        <PortalChecklist
          loanType={loanData.loan_type as LoanType}
          documents={documents}
        />
      </main>
    </div>
  );
}
