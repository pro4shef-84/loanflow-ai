import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import type { Database, Json } from "@/lib/types/database.types";
import type { LoanApplication } from "@/lib/types/application.types";

type ApplicationRow = Database["public"]["Tables"]["loan_applications"]["Row"];
type ApplicationInsert = Database["public"]["Tables"]["loan_applications"]["Insert"];

/**
 * Convert a nested LoanApplication (from the frontend) into flat DB columns.
 * Unknown/extra fields are silently ignored.
 */
function toDbColumns(app: Partial<LoanApplication>): Omit<ApplicationInsert, "loan_file_id"> {
  const row: Record<string, unknown> = {};

  // Borrower
  if (app.borrower) {
    row.borrower_first_name = app.borrower.first_name || null;
    row.borrower_last_name = app.borrower.last_name || null;
    row.borrower_ssn_last4 = app.borrower.ssn_last4 || null;
    row.borrower_dob = app.borrower.dob || null;
    row.borrower_marital_status = app.borrower.marital_status || null;
    row.borrower_dependents = app.borrower.dependents ?? null;
    row.borrower_citizenship = app.borrower.citizenship || null;
  }

  // Address
  if (app.current_address) {
    row.current_address = app.current_address.street || null;
    row.current_city = app.current_address.city || null;
    row.current_state = app.current_address.state || null;
    row.current_zip = app.current_address.zip || null;
    row.current_housing = app.current_address.housing_status === "living_with_family"
      ? "living_rent_free"
      : (app.current_address.housing_status as ApplicationRow["current_housing"]) || null;
    row.years_at_address = app.current_address.years_at_address ?? null;
  }

  // Employment
  if (app.employment) {
    row.employer_name = app.employment.employer_name || null;
    row.job_title = app.employment.position || null;
    row.employment_start_date = app.employment.start_date || null;
    row.self_employed = app.employment.is_self_employed ?? null;
    row.years_employed = app.employment.years_employed ?? null;
    row.base_income = app.employment.monthly_base_income ?? null;
    row.overtime_income = app.employment.monthly_overtime ?? null;
    row.bonus_income = app.employment.monthly_bonus ?? null;
    row.other_income = app.employment.monthly_other_income ?? null;
  }

  // Assets
  if (app.assets) {
    row.other_assets = app.assets as unknown as Json;
  }

  // Liabilities
  if (app.liabilities) {
    row.liabilities = app.liabilities as unknown as Json;
  }

  // Declarations
  if (app.declarations) {
    row.outstanding_judgments = app.declarations.outstanding_judgments ?? null;
    row.declared_bankruptcy = app.declarations.bankruptcy ?? null;
    row.property_foreclosed = app.declarations.foreclosure ?? null;
    row.party_to_lawsuit = app.declarations.lawsuit ?? null;
    row.delinquent_federal_debt = app.declarations.federal_debt ?? null;
    row.intend_to_occupy = app.declarations.primary_residence ?? null;
  }

  // Co-borrower
  if (app.coborrower) {
    row.co_borrower = app.coborrower as unknown as Json;
  }

  // Completed sections tracking
  if (app.step_completed !== undefined) {
    const sections: string[] = [];
    const steps = ["borrower", "address", "employment", "assets", "liabilities", "declarations"];
    for (let i = 0; i < Math.min(app.step_completed, steps.length); i++) {
      sections.push(steps[i]);
    }
    row.completed_sections = sections;
    if (app.step_completed >= steps.length) {
      row.completed_at = new Date().toISOString();
    }
  }

  return row as Omit<ApplicationInsert, "loan_file_id">;
}

/**
 * Convert flat DB row back to nested LoanApplication shape for the frontend.
 */
function toNestedShape(row: ApplicationRow): LoanApplication {
  return {
    id: row.id,
    loan_file_id: row.loan_file_id,
    step_completed: row.completed_sections?.length ?? 0,
    borrower: {
      first_name: row.borrower_first_name ?? "",
      last_name: row.borrower_last_name ?? "",
      ssn_last4: row.borrower_ssn_last4 ?? undefined,
      dob: row.borrower_dob ?? undefined,
      marital_status: row.borrower_marital_status ?? undefined,
      dependents: row.borrower_dependents ?? undefined,
      citizenship: row.borrower_citizenship ?? undefined,
    },
    current_address: {
      street: row.current_address ?? "",
      city: row.current_city ?? "",
      state: row.current_state ?? "",
      zip: row.current_zip ?? "",
      housing_status: row.current_housing === "living_rent_free"
        ? "living_with_family"
        : (row.current_housing as "own" | "rent" | undefined) ?? undefined,
      years_at_address: row.years_at_address ?? undefined,
    },
    employment: {
      employer_name: row.employer_name ?? "",
      position: row.job_title ?? undefined,
      start_date: row.employment_start_date ?? undefined,
      is_self_employed: row.self_employed ?? undefined,
      years_employed: row.years_employed ?? undefined,
      monthly_base_income: row.base_income ?? undefined,
      monthly_overtime: row.overtime_income ?? undefined,
      monthly_bonus: row.bonus_income ?? undefined,
      monthly_other_income: row.other_income ?? undefined,
    },
    assets: (row.other_assets as unknown as LoanApplication["assets"]) ?? [],
    liabilities: (row.liabilities as unknown as LoanApplication["liabilities"]) ?? [],
    declarations: {
      outstanding_judgments: row.outstanding_judgments ?? undefined,
      bankruptcy: row.declared_bankruptcy ?? undefined,
      foreclosure: row.property_foreclosed ?? undefined,
      lawsuit: row.party_to_lawsuit ?? undefined,
      federal_debt: row.delinquent_federal_debt ?? undefined,
      primary_residence: row.intend_to_occupy ?? undefined,
    },
    coborrower: row.co_borrower as unknown as LoanApplication["coborrower"],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  // Verify the loan belongs to this user
  const { data: loan } = await supabase
    .from("loan_files")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!loan) return NextResponse.json(errorResponse("Not found"), { status: 404 });

  const { data: application, error } = await supabase
    .from("loan_applications")
    .select("*")
    .eq("loan_file_id", id)
    .maybeSingle();

  if (error) return NextResponse.json(errorResponse(error.message), { status: 500 });

  // Return nested shape that the frontend expects, or null if no application yet
  const result = application ? toNestedShape(application as unknown as ApplicationRow) : null;
  return NextResponse.json(successResponse(result));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  const rawBody: Partial<LoanApplication> = await request.json();

  // Verify the loan belongs to this user
  const { data: loan } = await supabase
    .from("loan_files")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!loan) return NextResponse.json(errorResponse("Not found"), { status: 404 });

  // Convert nested frontend shape to flat DB columns
  const dbPayload: ApplicationInsert = {
    ...toDbColumns(rawBody),
    loan_file_id: id,
  };

  // Upsert -- creates on first save, updates on subsequent saves
  const { data, error } = await supabase
    .from("loan_applications")
    .upsert(dbPayload, { onConflict: "loan_file_id" })
    .select()
    .single();

  if (error) return NextResponse.json(errorResponse(error.message), { status: 500 });

  const result = toNestedShape(data as unknown as ApplicationRow);
  return NextResponse.json(successResponse(result));
}
