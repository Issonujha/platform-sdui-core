/**
 * Shared Universal Dynamic Workflow Contracts & Utilities
 * Compatible with rn-backend WorkflowEngineService, rn-frontend, and rn-mobile.
 */

export interface WorkflowStageDTO {
  id: string;
  name: string;
  code: string;
  description?: string;
  position: number;
  buyStage?: boolean;
  deliveryStage?: boolean;
  ratingStage?: boolean;
  requiresOtp?: boolean;
  sendSms?: boolean;
  sendEmail?: boolean;
  allowCustomerAction?: boolean;
  allowAdminAction?: boolean;
  color?: string;
}

export interface WorkflowTransitionDTO {
  id?: string;
  versionId?: string;
  fromStageId: string;
  toStageId: string;
  fromStageCode?: string;
  toStageCode?: string;
  condition?: string;
  configJson?: string;
  rolesAllowed?: string[];
}

export interface OrderWorkflowHistoryEntryDTO {
  fromStageCode?: string;
  toStageCode: string;
  changedByUsername?: string;
  otpVerified?: boolean;
  note?: string;
  createdAt?: string;
}

export interface OrderWorkflowDTO {
  orderId: string;
  workflowName?: string;
  version?: number;
  workflowVersionId?: string;
  currentStage?: WorkflowStageDTO | null;
  orderedStages: WorkflowStageDTO[];
  allowedNext: WorkflowStageDTO[];
  canCurrentActorTransition?: boolean;
  history?: OrderWorkflowHistoryEntryDTO[];
}

export interface TransitionRequestDTO {
  toStageId: string;
  otp?: string;
  notes?: string;
  failureReason?: string;
  currentLat?: number;
  currentLng?: number;
  currentLocationLabel?: string;
  openBoxConfirmed?: boolean;
}

export const STAGE_THEME_PALETTE: Record<
  string,
  { bg: string; color: string; border: string; badge: string; icon: string }
> = {
  gray: { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', badge: '#64748b', icon: '#94a3b8' },
  amber: { bg: '#fef3c7', color: '#b45309', border: '#fcd34d', badge: '#d97706', icon: '#f59e0b' },
  orange: { bg: '#ffedd5', color: '#c2410c', border: '#fdba74', badge: '#ea580c', icon: '#fb923c' },
  purple: { bg: '#f3e8ff', color: '#7e22ce', border: '#d8b4fe', badge: '#9333ea', icon: '#c084fc' },
  blue: { bg: '#e0f2fe', color: '#0369a1', border: '#7dd3fc', badge: '#0284c7', icon: '#38bdf8' },
  green: { bg: '#dcfce7', color: '#15803d', border: '#86efac', badge: '#16a34a', icon: '#4ade80' },
  teal: { bg: '#ccfbf1', color: '#0f766e', border: '#5eead4', badge: '#0d9488', icon: '#2dd4bf' },
  red: { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5', badge: '#dc2626', icon: '#f87171' },
  rose: { bg: '#ffe4e6', color: '#be123c', border: '#fda4af', badge: '#e11d48', icon: '#fb7185' },
};

/**
 * Returns a consistent visual theme for a workflow stage.
 */
export function getStageTheme(colorName?: string | null) {
  if (!colorName) return STAGE_THEME_PALETTE.blue;
  const key = colorName.trim().toLowerCase();
  return STAGE_THEME_PALETTE[key] || STAGE_THEME_PALETTE.blue;
}

/**
 * Client-side permission helper: checks if the current actor can transition to target stage.
 */
export function canActorTransitionToStage(
  orderWorkflow: OrderWorkflowDTO | null | undefined,
  targetStageId: string
): boolean {
  if (!orderWorkflow || !orderWorkflow.allowedNext || orderWorkflow.allowedNext.length === 0) {
    return false;
  }
  return orderWorkflow.allowedNext.some((s) => s.id === targetStageId);
}
