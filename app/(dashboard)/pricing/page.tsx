"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { RateCard } from "@/components/pricing/RateCard";
import { FeeWorksheet } from "@/components/pricing/FeeWorksheet";
import { calculatePricing, type PricingInputs } from "@/lib/utils/pricing-engine";
import { Calculator, ChevronDown, ChevronUp } from "lucide-react";

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA",
  "ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK",
  "OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

type FormValues = {
  loanAmount: string;
  propertyValue: string;
  creditScore: string;
  loanType: PricingInputs["loanType"];
  loanPurpose: PricingInputs["loanPurpose"];
  state: string;
  originationPoints: string;
  appraisalFee: string;
  titleInsuranceFee: string;
  titleSearchFee: string;
  settlementFee: string;
  recordingFees: string;
  monthlyInsurance: string;
  monthlyPropertyTax: string;
};

export default function PricingPage() {
  const [showFees, setShowFees] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState(0);
  const [result, setResult] = useState<ReturnType<typeof calculatePricing> | null>(null);

  const { register, handleSubmit, setValue, watch } = useForm<FormValues>({
    defaultValues: {
      loanAmount: "400000",
      propertyValue: "500000",
      creditScore: "740",
      loanType: "conventional",
      loanPurpose: "primary_residence",
      state: "CA",
      originationPoints: "1",
      appraisalFee: "600",
      titleInsuranceFee: "1200",
      titleSearchFee: "300",
      settlementFee: "500",
      recordingFees: "150",
      monthlyInsurance: "150",
      monthlyPropertyTax: "500",
    },
  });

  const onSubmit = (values: FormValues) => {
    const inputs: PricingInputs = {
      loanAmount: Number(values.loanAmount),
      propertyValue: Number(values.propertyValue),
      creditScore: Number(values.creditScore),
      loanType: values.loanType,
      loanPurpose: values.loanPurpose,
      state: values.state,
      originationPoints: Number(values.originationPoints),
      appraisalFee: Number(values.appraisalFee),
      titleInsuranceFee: Number(values.titleInsuranceFee),
      titleSearchFee: Number(values.titleSearchFee),
      settlementFee: Number(values.settlementFee),
      recordingFees: Number(values.recordingFees),
      monthlyInsurance: Number(values.monthlyInsurance),
      monthlyPropertyTax: Number(values.monthlyPropertyTax),
    };
    setResult(calculatePricing(inputs));
    setSelectedScenario(0);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <Calculator className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pricing Engine</h1>
          <p className="text-muted-foreground">Rate scenarios and fee worksheet for any loan</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Inputs */}
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Loan Scenario</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Loan Type</Label>
                  <Select
                    defaultValue="conventional"
                    onValueChange={(v) => setValue("loanType", v as PricingInputs["loanType"])}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conventional">Conventional</SelectItem>
                      <SelectItem value="fha">FHA</SelectItem>
                      <SelectItem value="va">VA</SelectItem>
                      <SelectItem value="usda">USDA</SelectItem>
                      <SelectItem value="non_qm">Non-QM</SelectItem>
                      <SelectItem value="heloc">HELOC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Loan Purpose</Label>
                  <Select
                    defaultValue="primary_residence"
                    onValueChange={(v) => setValue("loanPurpose", v as PricingInputs["loanPurpose"])}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary_residence">Primary Residence</SelectItem>
                      <SelectItem value="second_home">Second Home</SelectItem>
                      <SelectItem value="investment">Investment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Loan Amount ($)</Label>
                  <Input type="number" {...register("loanAmount")} />
                </div>

                <div className="space-y-2">
                  <Label>Property Value ($)</Label>
                  <Input type="number" {...register("propertyValue")} />
                </div>

                <div className="space-y-2">
                  <Label>Credit Score</Label>
                  <Input type="number" min={580} max={850} {...register("creditScore")} />
                </div>

                <div className="space-y-2">
                  <Label>State</Label>
                  <Select defaultValue="CA" onValueChange={(v) => setValue("state", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader
                className="pb-3 cursor-pointer"
                onClick={() => setShowFees(!showFees)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Fee Worksheet Inputs</CardTitle>
                  {showFees ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
              {showFees && (
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label>Origination Points (%)</Label>
                    <Input type="number" step="0.125" min={0} max={3} {...register("originationPoints")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Appraisal Fee ($)</Label>
                    <Input type="number" {...register("appraisalFee")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Title Insurance ($)</Label>
                    <Input type="number" {...register("titleInsuranceFee")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Title Search ($)</Label>
                    <Input type="number" {...register("titleSearchFee")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Settlement Fee ($)</Label>
                    <Input type="number" {...register("settlementFee")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Recording Fees ($)</Label>
                    <Input type="number" {...register("recordingFees")} />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Monthly Insurance ($)</Label>
                    <Input type="number" {...register("monthlyInsurance")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Monthly Property Tax ($)</Label>
                    <Input type="number" {...register("monthlyPropertyTax")} />
                  </div>
                </CardContent>
              )}
            </Card>

            <Button type="submit" className="w-full">Calculate Rates</Button>
          </form>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-6">
          {result ? (
            <>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-sm">LTV {result.ltv}%</Badge>
                <Badge
                  variant="outline"
                  className={`text-sm ${result.ltv > 80 ? "text-orange-600 border-orange-200" : "text-green-600 border-green-200"}`}
                >
                  {result.ltv > 80 ? "PMI Required" : "No PMI"}
                </Badge>
                {result.miMonthly > 0 && (
                  <Badge variant="outline" className="text-sm text-orange-600">
                    MI: ${result.miMonthly}/mo
                  </Badge>
                )}
              </div>

              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {result.scenarios.map((scenario, i) => (
                  <RateCard
                    key={scenario.program}
                    scenario={scenario}
                    selected={selectedScenario === i}
                    onSelect={() => setSelectedScenario(i)}
                    loanAmount={Number(watch("loanAmount"))}
                    miMonthly={result.miMonthly}
                  />
                ))}
              </div>

              <FeeWorksheet
                fees={result.feeWorksheet}
                totalClosingCosts={result.totalClosingCosts}
                cashToClose={result.cashToClose}
                downPayment={result.downPayment}
              />
            </>
          ) : (
            <Card>
              <CardContent className="py-20 text-center text-muted-foreground">
                <Calculator className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">Enter loan details and click Calculate Rates</p>
                <p className="text-sm mt-1">
                  Get rate scenarios across all programs with a full fee worksheet estimate.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
