"use client";

import { use, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ArrowRight, CheckCircle, Plus, Trash2, Save } from "lucide-react";
import Link from "next/link";
import type { LoanApplication, AssetInfo, LiabilityInfo } from "@/lib/types/application.types";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";

const STEPS = [
  { label: "Borrower Info", id: "borrower" },
  { label: "Address", id: "address" },
  { label: "Employment", id: "employment" },
  { label: "Assets", id: "assets" },
  { label: "Liabilities", id: "liabilities" },
  { label: "Declarations", id: "declarations" },
];

export default function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [application, setApplication] = useState<Partial<LoanApplication>>({
    loan_file_id: id,
    step_completed: 0,
    borrower: { first_name: "", last_name: "" },
    current_address: { street: "", city: "", state: "", zip: "" },
    employment: { employer_name: "" },
    assets: [],
    liabilities: [],
    declarations: {},
  });

  const [assets, setAssets] = useState<AssetInfo[]>([]);
  const [liabilities, setLiabilities] = useState<LiabilityInfo[]>([]);

  useEffect(() => {
    fetch(`/api/loans/${id}/application`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load application");
        return r.json();
      })
      .then(({ data }) => {
        if (data) {
          setApplication(data);
          setStep(Math.min(data.step_completed ?? 0, STEPS.length - 1));
          setAssets(data.assets ?? []);
          setLiabilities(data.liabilities ?? []);
        }
      })
      .catch(() => {
        // Application may not exist yet — that's OK
      });
  }, [id]);

  const updateField = (section: keyof LoanApplication, field: string, value: unknown) => {
    setApplication((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] as Record<string, unknown>),
        [field]: value,
      },
    }));
  };

  const handleSave = async (nextStep?: number) => {
    setSaving(true);
    const payload = {
      ...application,
      assets,
      liabilities,
      step_completed: Math.max(application.step_completed ?? 0, step + 1),
    };
    try {
      const res = await fetch(`/api/loans/${id}/application`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Save failed");
      }
      setApplication(payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (nextStep !== undefined) setStep(nextStep);
    } catch {
      // Save failed silently for now — could add error state
    } finally {
      setSaving(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name *</Label>
              <Input
                value={application.borrower?.first_name ?? ""}
                onChange={(e) => updateField("borrower", "first_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Middle Name</Label>
              <Input
                value={application.borrower?.middle_name ?? ""}
                onChange={(e) => updateField("borrower", "middle_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Last Name *</Label>
              <Input
                value={application.borrower?.last_name ?? ""}
                onChange={(e) => updateField("borrower", "last_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Suffix</Label>
              <Select
                value={application.borrower?.suffix ?? ""}
                onValueChange={(v) => updateField("borrower", "suffix", v)}
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Jr.">Jr.</SelectItem>
                  <SelectItem value="Sr.">Sr.</SelectItem>
                  <SelectItem value="II">II</SelectItem>
                  <SelectItem value="III">III</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Input
                type="date"
                value={application.borrower?.dob ?? ""}
                onChange={(e) => updateField("borrower", "dob", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>SSN Last 4</Label>
              <Input
                maxLength={4}
                placeholder="XXXX"
                value={application.borrower?.ssn_last4 ?? ""}
                onChange={(e) => updateField("borrower", "ssn_last4", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Marital Status</Label>
              <Select
                value={application.borrower?.marital_status ?? ""}
                onValueChange={(v) => updateField("borrower", "marital_status", v)}
              >
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="separated">Separated</SelectItem>
                  <SelectItem value="unmarried">Unmarried</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Citizenship</Label>
              <Select
                value={application.borrower?.citizenship ?? ""}
                onValueChange={(v) => updateField("borrower", "citizenship", v)}
              >
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="us_citizen">U.S. Citizen</SelectItem>
                  <SelectItem value="permanent_resident">Permanent Resident</SelectItem>
                  <SelectItem value="non_permanent_resident">Non-Permanent Resident</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Street Address *</Label>
              <AddressAutocomplete
                value={application.current_address?.street ?? ""}
                placeholder="Start typing your address..."
                onChange={(v) => updateField("current_address", "street", v)}
                onAddressSelect={(s) => {
                  setApplication((prev) => ({
                    ...prev,
                    current_address: {
                      ...(prev.current_address ?? {}),
                      street: s.street,
                      city: s.city,
                      state: s.state,
                      zip: s.zip,
                    },
                  }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Unit / Apt</Label>
              <Input
                value={application.current_address?.unit ?? ""}
                onChange={(e) => updateField("current_address", "unit", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>City *</Label>
              <Input
                value={application.current_address?.city ?? ""}
                onChange={(e) => updateField("current_address", "city", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>State *</Label>
              <Input
                maxLength={2}
                placeholder="CA"
                value={application.current_address?.state ?? ""}
                onChange={(e) => updateField("current_address", "state", e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-2">
              <Label>ZIP *</Label>
              <Input
                maxLength={5}
                value={application.current_address?.zip ?? ""}
                onChange={(e) => updateField("current_address", "zip", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Years at Address</Label>
              <Input
                type="number"
                min={0}
                value={application.current_address?.years_at_address ?? ""}
                onChange={(e) => updateField("current_address", "years_at_address", Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Housing Status</Label>
              <Select
                value={application.current_address?.housing_status ?? ""}
                onValueChange={(v) => updateField("current_address", "housing_status", v)}
              >
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="own">Own</SelectItem>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="living_with_family">Living with Family</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Monthly Housing Expense ($)</Label>
              <Input
                type="number"
                value={application.current_address?.monthly_housing_expense ?? ""}
                onChange={(e) => updateField("current_address", "monthly_housing_expense", Number(e.target.value))}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Employer Name *</Label>
              <Input
                value={application.employment?.employer_name ?? ""}
                onChange={(e) => updateField("employment", "employer_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Position / Title</Label>
              <Input
                value={application.employment?.position ?? ""}
                onChange={(e) => updateField("employment", "position", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={application.employment?.start_date ?? ""}
                onChange={(e) => updateField("employment", "start_date", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Years at Job</Label>
              <Input
                type="number"
                min={0}
                value={application.employment?.years_employed ?? ""}
                onChange={(e) => updateField("employment", "years_employed", Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Self-Employed?</Label>
              <Select
                value={application.employment?.is_self_employed ? "yes" : "no"}
                onValueChange={(v) => updateField("employment", "is_self_employed", v === "yes")}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator className="sm:col-span-2" />
            <div className="space-y-2">
              <Label>Monthly Base Income ($)</Label>
              <Input
                type="number"
                value={application.employment?.monthly_base_income ?? ""}
                onChange={(e) => updateField("employment", "monthly_base_income", Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Monthly Overtime ($)</Label>
              <Input
                type="number"
                value={application.employment?.monthly_overtime ?? ""}
                onChange={(e) => updateField("employment", "monthly_overtime", Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Monthly Bonus ($)</Label>
              <Input
                type="number"
                value={application.employment?.monthly_bonus ?? ""}
                onChange={(e) => updateField("employment", "monthly_bonus", Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Other Monthly Income ($)</Label>
              <Input
                type="number"
                value={application.employment?.monthly_other_income ?? ""}
                onChange={(e) => updateField("employment", "monthly_other_income", Number(e.target.value))}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            {assets.map((asset, i) => (
              <Card key={i} className="border-dashed">
                <CardContent className="pt-4 pb-3">
                  <div className="grid sm:grid-cols-3 gap-3">
                    <Select
                      value={asset.type}
                      onValueChange={(v) => {
                        const updated = [...assets];
                        updated[i] = { ...updated[i], type: v as AssetInfo["type"] };
                        setAssets(updated);
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checking">Checking</SelectItem>
                        <SelectItem value="savings">Savings</SelectItem>
                        <SelectItem value="retirement">Retirement (401k/IRA)</SelectItem>
                        <SelectItem value="stocks">Stocks / Investments</SelectItem>
                        <SelectItem value="gift">Gift Funds</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Institution name"
                      value={asset.institution ?? ""}
                      onChange={(e) => {
                        const updated = [...assets];
                        updated[i] = { ...updated[i], institution: e.target.value };
                        setAssets(updated);
                      }}
                    />
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Balance ($)"
                        value={asset.balance || ""}
                        onChange={(e) => {
                          const updated = [...assets];
                          updated[i] = { ...updated[i], balance: Number(e.target.value) };
                          setAssets(updated);
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setAssets(assets.filter((_, j) => j !== i))}
                        className="text-red-500 hover:text-red-700 shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setAssets([...assets, { type: "checking", balance: 0 }])}
            >
              <Plus className="h-4 w-4" />
              Add Asset
            </Button>
            {assets.length > 0 && (
              <div className="text-sm text-right text-muted-foreground">
                Total Assets: ${assets.reduce((s, a) => s + (a.balance || 0), 0).toLocaleString()}
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            {liabilities.map((liability, i) => (
              <Card key={i} className="border-dashed">
                <CardContent className="pt-4 pb-3">
                  <div className="grid sm:grid-cols-3 gap-3">
                    <Select
                      value={liability.type}
                      onValueChange={(v) => {
                        const updated = [...liabilities];
                        updated[i] = { ...updated[i], type: v as LiabilityInfo["type"] };
                        setLiabilities(updated);
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mortgage">Mortgage</SelectItem>
                        <SelectItem value="installment">Installment Loan</SelectItem>
                        <SelectItem value="revolving">Revolving / Credit Card</SelectItem>
                        <SelectItem value="student_loan">Student Loan</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Creditor name"
                      value={liability.creditor ?? ""}
                      onChange={(e) => {
                        const updated = [...liabilities];
                        updated[i] = { ...updated[i], creditor: e.target.value };
                        setLiabilities(updated);
                      }}
                    />
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Monthly payment ($)"
                        value={liability.monthly_payment || ""}
                        onChange={(e) => {
                          const updated = [...liabilities];
                          updated[i] = { ...updated[i], monthly_payment: Number(e.target.value) };
                          setLiabilities(updated);
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setLiabilities(liabilities.filter((_, j) => j !== i))}
                        className="text-red-500 hover:text-red-700 shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setLiabilities([...liabilities, { type: "revolving", monthly_payment: 0 }])}
            >
              <Plus className="h-4 w-4" />
              Add Liability
            </Button>
            {liabilities.length > 0 && (
              <div className="text-sm text-right text-muted-foreground">
                Total Monthly Debt: ${liabilities.reduce((s, l) => s + (l.monthly_payment || 0), 0).toLocaleString()}/mo
              </div>
            )}
          </div>
        );

      case 5: {
        const dec = application.declarations ?? {};
        const toggle = (field: string) => {
          const current = (dec as Record<string, boolean>)[field];
          setApplication((prev) => ({
            ...prev,
            declarations: { ...prev.declarations, [field]: !current },
          }));
        };
        const questions: Array<{ key: string; label: string }> = [
          { key: "outstanding_judgments", label: "Are there any outstanding judgments against you?" },
          { key: "bankruptcy", label: "Have you declared bankruptcy in the past 7 years?" },
          { key: "foreclosure", label: "Have you had a property foreclosed upon in the past 7 years?" },
          { key: "lawsuit", label: "Are you currently a party to a lawsuit?" },
          { key: "federal_debt", label: "Are you obligated to pay alimony or child support?" },
          { key: "alimony", label: "Will any part of the down payment be borrowed?" },
          { key: "down_payment_borrowed", label: "Are you a co-maker or endorser on any note?" },
          { key: "primary_residence", label: "Do you intend to occupy this property as your primary residence?" },
        ];
        return (
          <div className="space-y-3">
            {questions.map(({ key, label }) => {
              const val = (dec as Record<string, boolean>)[key];
              return (
                <div key={key} className="flex items-start justify-between gap-4 py-2 border-b last:border-0">
                  <p className="text-sm">{label}</p>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant={val === true ? "default" : "outline"}
                      onClick={() => { if (val !== true) toggle(key); }}
                    >
                      Yes
                    </Button>
                    <Button
                      size="sm"
                      variant={val === false ? "default" : "outline"}
                      onClick={() => { if (val !== false) toggle(key); }}
                    >
                      No
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/loans/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">1003 Loan Application</h1>
          <p className="text-muted-foreground text-sm">Uniform Residential Loan Application</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const completed = i < (application.step_completed ?? 0);
          const active = i === step;
          return (
            <button
              key={s.id}
              onClick={() => setStep(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : completed
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {completed && <CheckCircle className="h-3 w-3" />}
              {i + 1}. {s.label}
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Section {step + 1}: {STEPS[step].label}</CardTitle>
              <CardDescription>Step {step + 1} of {STEPS.length}</CardDescription>
            </div>
            {saved && (
              <Badge variant="outline" className="text-green-600 border-green-200 gap-1">
                <CheckCircle className="h-3 w-3" />
                Saved
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderStepContent()}

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              disabled={step === 0}
              onClick={() => setStep((s) => s - 1)}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleSave()}
                disabled={saving}
                className="gap-1"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save"}
              </Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={() => handleSave(step + 1)} disabled={saving}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={() => handleSave()} disabled={saving} className="gap-1 bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-4 w-4" />
                  {saving ? "Saving..." : "Complete Application"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
