"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LOAN_TYPE_LABELS } from "@/lib/types/loan.types";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";

const loanFormSchema = z.object({
  loan_type: z.enum(["purchase", "refinance", "heloc", "non_qm", "va", "fha", "usda"]),
  loan_purpose: z.enum(["primary_residence", "second_home", "investment"]).optional(),
  loan_amount: z.number().positive().optional(),
  property_address: z.string().optional(),
  property_city: z.string().optional(),
  property_state: z.string().max(2).optional(),
  property_zip: z.string().optional(),
  estimated_value: z.number().positive().optional(),
  closing_date: z.string().optional(),
  notes: z.string().optional(),
});

type LoanFormValues = z.infer<typeof loanFormSchema>;

interface LoanFormProps {
  onSubmit: (values: LoanFormValues) => void;
  isLoading?: boolean;
  defaultValues?: Partial<LoanFormValues>;
}

export function LoanForm({ onSubmit, isLoading, defaultValues }: LoanFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoanFormValues>({
    resolver: zodResolver(loanFormSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="loan_type">Loan Type *</Label>
          <Select
            onValueChange={(val) => setValue("loan_type", val as LoanFormValues["loan_type"])}
            defaultValue={defaultValues?.loan_type}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select loan type" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LOAN_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.loan_type && <p className="text-xs text-destructive">{errors.loan_type.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="loan_purpose">Loan Purpose</Label>
          <Select
            onValueChange={(val) => setValue("loan_purpose", val as LoanFormValues["loan_purpose"])}
            defaultValue={defaultValues?.loan_purpose}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select purpose" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="primary_residence">Primary Residence</SelectItem>
              <SelectItem value="second_home">Second Home</SelectItem>
              <SelectItem value="investment">Investment Property</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="loan_amount">Loan Amount</Label>
          <Input
            id="loan_amount"
            type="number"
            placeholder="350000"
            {...register("loan_amount", { setValueAs: (v) => v === "" ? undefined : Number(v) || undefined })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="estimated_value">Estimated Value</Label>
          <Input
            id="estimated_value"
            type="number"
            placeholder="425000"
            {...register("estimated_value", { setValueAs: (v) => v === "" ? undefined : Number(v) || undefined })}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="property_address">Property Address</Label>
          <AddressAutocomplete
            id="property_address"
            value={watch("property_address") ?? ""}
            placeholder="123 Main St — start typing to search"
            onChange={(v) => setValue("property_address", v)}
            onAddressSelect={(s) => {
              setValue("property_address", s.street);
              setValue("property_city", s.city);
              setValue("property_state", s.state);
              setValue("property_zip", s.zip);
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="property_city">City</Label>
          <Input id="property_city" placeholder="Dallas" {...register("property_city")} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="property_state">State</Label>
            <Input id="property_state" placeholder="TX" maxLength={2} {...register("property_state")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="property_zip">ZIP</Label>
            <Input id="property_zip" placeholder="75201" {...register("property_zip")} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="closing_date">Target Closing Date</Label>
          <Input id="closing_date" type="date" {...register("closing_date")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" placeholder="Any notes about this loan file..." {...register("notes")} />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Creating..." : "Create Loan File"}
      </Button>
    </form>
  );
}
