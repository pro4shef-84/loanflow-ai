export function buildExtractDocumentPrompt(documentType: string, documentText: string): string {
  return `You are a mortgage document data extractor. Extract structured data from the following ${documentType} document.

Return a JSON object with the relevant fields for this document type. Do not include any PII that has already been redacted. Extract only what is present in the document.

For W-2: { employer_name, employee_name, tax_year, wages, federal_tax_withheld, state_wages }
For pay_stub: { employer_name, employee_name, pay_period_start, pay_period_end, gross_pay_ytd, gross_pay_period, net_pay, pay_frequency }
For bank_statement: { institution_name, account_holder, account_type, statement_period, beginning_balance, ending_balance, total_deposits, total_withdrawals }
For tax_return_1040: { tax_year, filing_status, total_income, agi, total_deductions, taxable_income }
For purchase_contract: { property_address, purchase_price, earnest_money, closing_date, seller_name, buyer_name }
For mortgage_statement: { servicer_name, property_address, original_loan_amount, current_balance, monthly_payment, interest_rate, maturity_date }

Document type: ${documentType}

Document text:
${documentText}

Return only valid JSON. Include a "confidence" field (0.0-1.0) indicating extraction quality. Also include a "flags" array of any issues or anomalies found.`;
}
