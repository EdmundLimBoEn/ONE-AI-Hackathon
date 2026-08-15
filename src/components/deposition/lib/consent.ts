export type DepositionAnalysisMode = "local" | "live";

export const OPENROUTER_DISCLOSURE = {
  processor: "OpenRouter",
  models: "a downstream model such as NVIDIA Nemotron or OpenRouter Free",
  sent: "the full extracted transcript text",
  retention: "no-storage and zero-data-retention (ZDR)",
  warning: "Do not submit material you are not authorised to disclose.",
} as const;

export function liveAnalysisDisclosure(): string {
  return (
    `Live analysis sends ${OPENROUTER_DISCLOSURE.sent} to ${OPENROUTER_DISCLOSURE.processor} ` +
    `and ${OPENROUTER_DISCLOSURE.models}. We request ${OPENROUTER_DISCLOSURE.retention}. ` +
    OPENROUTER_DISCLOSURE.warning
  );
}

export function canStartLiveAnalysis(accepted: boolean): boolean {
  return accepted === true;
}

export function consentPayload(accepted: boolean): { externalProcessingConsent: boolean } {
  return { externalProcessingConsent: accepted };
}
