import { z } from 'zod';

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
export type Timeframe = 'DAILY' | 'FOUR_HOUR' | 'ONE_HOUR';
export type DivergenceType = 'BULLISH' | 'BEARISH' | 'NONE';

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
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MethodAnalysis {
  id: string;
  tradeId: string;
  timeframe: Timeframe;
  indicator: string;
  signal: string;
  divergence: DivergenceType;
  notes: string | null;
  createdAt: Date;
}

export interface MindsetTag {
  id: string;
  tradeId: string;
  tag: string;
  createdAt: Date;
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
  notes: z.string().nullable(),
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

export const MethodAnalysisSchema = z.object({
  id: z.string().cuid(),
  tradeId: z.string().cuid(),
  timeframe: z.enum(['DAILY', 'FOUR_HOUR', 'ONE_HOUR']),
  indicator: z.string().min(1),
  signal: z.string().min(1),
  divergence: z.enum(['BULLISH', 'BEARISH', 'NONE']),
  notes: z.string().nullable(),
  createdAt: z.date(),
});

export const MindsetTagSchema = z.object({
  id: z.string().cuid(),
  tradeId: z.string().cuid(),
  tag: z.string().min(1),
  createdAt: z.date(),
});

// Request/Response Types
export type CreateTradeRequest = z.infer<typeof CreateTradeRequestSchema>;

export type TradeResponse = ApiResponse<Trade>;
export type TradesResponse = ApiResponse<Trade[]>;