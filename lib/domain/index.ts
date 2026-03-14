// Re-export all domain types and rules for convenient imports
export * from "./enums";
export * from "./entities";
export * from "./labels";
export { validateDocument, checkExpiration, getExpirationConfig } from "./rules/documentValidationRules";
export type { ExtractedFields, ExpirationCheckResult } from "./rules/documentValidationRules";
export {
  canTransitionDocWorkflow,
  getValidDocWorkflowTransitions,
  canTransitionRequirement,
  canTransitionDocument,
  canTransitionEscalation,
  allRequirementsSatisfied,
  anyRequirementNeedsCorrection,
  anyRequirementNeedsOfficerReview,
  hasOpenEscalation,
} from "./rules/workflowRules";
