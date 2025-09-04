import { z } from 'zod';

// Export all analysis types
export * from './analysis';
export * from './alignment';

// Import and re-export mindset types
import { MindsetTag } from './mindset';
export * from './mindset';

// User Types
export interface User {
  id: string;
  email: string;
  totalEquity: number;
  createdAt: Date;
  updatedAt: Date;
}

// Zod Validation Schemas
export const UserSchema = z.object({
  id: z.string().cuid(),
  email: z.string().email(),
  totalEquity: z.number().min(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateUserRequestSchema = z.object({
  email: z.string().email(),
  totalEquity: z.number().min(0),
});

export const UpdateUserEquityRequestSchema = z.object({
  totalEquity: z.number().min(0),
});

// Request/Response Types
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
export type UpdateUserEquityRequest = z.infer<typeof UpdateUserEquityRequestSchema>;

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type UserResponse = ApiResponse<User>;
export type UsersResponse = ApiResponse<User[]>;

// Trade Types
export type TradeDirection = 'LONG' | 'SHORT';
export type TradeStatus = 'ACTIVE' | 'CLOSED';

export interface Trade {
  id: string;
  userId: string;
  symbol: string;
  direction: TradeDirection;
  entryPrice: number;
  positionSize: number;
  stopLoss: number;
  exitPrice: number | null;
  status: TradeStatus;
  entryDate: Date;
  exitDate: Date | null;
  realizedPnL: number | null;
  riskAmount: number;
  riskPercentage: number;
  notes: string | null;
  // Alignment Analysis fields
  alignmentScore: number | null;
  alignmentLevel: string | null;
  alignmentWarnings: string | null; // JSON string
  alignmentConfirmations: string | null; // JSON string
  createdAt: Date;
  updatedAt: Date;
  mindsetTags?: MindsetTag[];
}

// Extended Trade interface with resolved alignment analysis
export interface TradeWithAlignment extends Trade {
  alignmentAnalysis?: import('./alignment').AlignmentAnalysis;
  methodAnalysis?: import('./analysis').MethodAnalysis[];
}



// Trade Zod Validation Schemas
export const TradeSchema = z.object({
  id: z.string().cuid(),
  userId: z.string().cuid(),
  symbol: z.string().min(1).max(10).toUpperCase(),
  direction: z.enum(['LONG', 'SHORT']),
  entryPrice: z.number().positive(),
  positionSize: z.number().positive(),
  stopLoss: z.number().positive(),
  exitPrice: z.number().positive().nullable(),
  status: z.enum(['ACTIVE', 'CLOSED']),
  entryDate: z.date(),
  exitDate: z.date().nullable(),
  realizedPnL: z.number().nullable(),
  riskAmount: z.number().min(0),
  riskPercentage: z.number().min(0),
  notes: z.string().nullable(),
  // Alignment Analysis fields
  alignmentScore: z.number().min(-1).max(1).nullable(),
  alignmentLevel: z.string().nullable(),
  alignmentWarnings: z.string().nullable(),
  alignmentConfirmations: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateTradeRequestSchema = z.object({
  symbol: z.string().min(1).max(10).transform(val => val.toUpperCase()),
  direction: z.enum(['LONG', 'SHORT']),
  entryPrice: z.number().positive(),
  positionSize: z.number().positive(),
  stopLoss: z.number().positive(),
  notes: z.string().optional(),
});



// Request/Response Types
export type CreateTradeRequest = z.infer<typeof CreateTradeRequestSchema>;

export type TradeResponse = ApiResponse<Trade>;
export type TradesResponse = ApiResponse<Trade[]>;

// EquitySnapshot Types
export type EquitySnapshotSource = 'TRADE_CLOSE' | 'MANUAL_UPDATE' | 'DAILY_SNAPSHOT' | 'CASH_DEPOSIT' | 'CASH_WITHDRAWAL';
export type CashAdjustmentType = 'DEPOSIT' | 'WITHDRAWAL';

export interface EquitySnapshot {
  id: string;
  userId: string;
  totalEquity: number;
  timestamp: Date;
  source: EquitySnapshotSource;
  amount?: number | null;
  description?: string | null;
}

// Cash Adjustment Types
export const CashAdjustmentRequestSchema = z.object({
  type: z.enum(['DEPOSIT', 'WITHDRAWAL']),
  amount: z.number().positive(),
  description: z.string().optional(),
});

export type CashAdjustmentRequest = z.infer<typeof CashAdjustmentRequestSchema>;
export type CashAdjustmentResponse = ApiResponse<User>;

// Cash History Types
export interface CashHistoryEntry {
  id: string;
  timestamp: Date;
  type: CashAdjustmentType | 'TRADE_PNL';
  amount: number;
  description?: string;
  totalEquityAfter: number;
}

export type CashHistoryResponse = ApiResponse<CashHistoryEntry[]>;

// Trade Close Request Schema
export const CloseTradeRequestSchema = z.object({
  exitPrice: z.number().positive(),
});

export type CloseTradeRequest = z.infer<typeof CloseTradeRequestSchema>;

// Portfolio Risk Types
export type RiskLevel = 'SAFE' | 'WARNING' | 'DANGER';

export interface PortfolioRisk {
  totalRiskAmount: number;
  totalRiskPercentage: number;
  exceedsLimit: boolean;
  riskLevel: RiskLevel;
  userEquity: number;
  activeTrades: Array<{
    id: string;
    symbol: string;
    riskAmount: number;
    riskPercentage: number;
  }>;
}

export type PortfolioRiskResponse = ApiResponse<PortfolioRisk>;