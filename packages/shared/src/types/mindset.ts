import { z } from 'zod';

// Mindset Tag Type Enum
export enum MindsetTagType {
  // Positive States
  DISCIPLINED = 'DISCIPLINED',
  PATIENT = 'PATIENT',
  CONFIDENT = 'CONFIDENT',
  FOCUSED = 'FOCUSED',
  CALM = 'CALM',
  ANALYTICAL = 'ANALYTICAL',
  
  // Negative States
  ANXIOUS = 'ANXIOUS',
  FOMO = 'FOMO',
  GREEDY = 'GREEDY',
  FEARFUL = 'FEARFUL',
  IMPULSIVE = 'IMPULSIVE',
  REVENGE_TRADING = 'REVENGE_TRADING',
  OVERCONFIDENT = 'OVERCONFIDENT',
  
  // Neutral States
  NEUTRAL = 'NEUTRAL',
  UNCERTAIN = 'UNCERTAIN',
  TIRED = 'TIRED',
  DISTRACTED = 'DISTRACTED'
}

// Intensity Level Enum
export enum IntensityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

// MindsetTag Interface
export interface MindsetTag {
  id: string;
  tradeId: string;
  tag: MindsetTagType;
  intensity: IntensityLevel;
  createdAt: Date;
  updatedAt: Date;
}

// Zod Validation Schemas
export const MindsetTagTypeSchema = z.nativeEnum(MindsetTagType);
export const IntensityLevelSchema = z.nativeEnum(IntensityLevel);

export const MindsetTagSchema = z.object({
  id: z.string().cuid(),
  tradeId: z.string().cuid(),
  tag: MindsetTagTypeSchema,
  intensity: IntensityLevelSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Request Schemas
export const CreateMindsetTagRequestSchema = z.object({
  tag: MindsetTagTypeSchema,
  intensity: IntensityLevelSchema.default(IntensityLevel.MEDIUM),
});

export const UpdateMindsetTagRequestSchema = z.object({
  tags: z.array(z.object({
    tag: MindsetTagTypeSchema,
    intensity: IntensityLevelSchema,
  })),
});

// Utility function to get mindset tag category and style
export const getMindsetTagStyle = (tag: MindsetTagType) => {
  const positiveStates = [
    MindsetTagType.DISCIPLINED, 
    MindsetTagType.PATIENT, 
    MindsetTagType.CONFIDENT, 
    MindsetTagType.FOCUSED, 
    MindsetTagType.CALM, 
    MindsetTagType.ANALYTICAL
  ];
  
  const negativeStates = [
    MindsetTagType.ANXIOUS, 
    MindsetTagType.FOMO, 
    MindsetTagType.GREEDY, 
    MindsetTagType.FEARFUL, 
    MindsetTagType.IMPULSIVE, 
    MindsetTagType.REVENGE_TRADING, 
    MindsetTagType.OVERCONFIDENT
  ];
  
  if (positiveStates.includes(tag)) {
    return { backgroundColor: MINDSET_TAG_COLORS.positive, category: 'positive' as const };
  } else if (negativeStates.includes(tag)) {
    return { backgroundColor: MINDSET_TAG_COLORS.negative, category: 'negative' as const };
  } else {
    return { backgroundColor: MINDSET_TAG_COLORS.neutral, category: 'neutral' as const };
  }
};

// Request/Response Types
export type CreateMindsetTagRequest = z.infer<typeof CreateMindsetTagRequestSchema>;
export type UpdateMindsetTagRequest = z.infer<typeof UpdateMindsetTagRequestSchema>;

// Performance analysis types
export interface MindsetPerformanceStats {
  tag: MindsetTagType;
  tradeCount: number;
  winRate: number;
  averageReturn: number;
  riskAdjustedReturn: number;
  frequency: number;
}

// Forward declaration for Trade type - defined in index.ts
export interface TradeWithMindsetTags {
  id: string;
  userId: string;  
  symbol: string;
  realizedPnL: number | null;
  riskAmount: number;
  mindsetTags: MindsetTag[];
}

// Design system colors for consistent styling
export const MINDSET_TAG_COLORS = {
  positive: '#10b981', // emerald-500
  negative: '#ef4444', // red-500  
  neutral: '#6b7280',  // gray-500
} as const;