import express from 'express';
import { 
  analyzeAlignment, 
  validateAlignmentRequest,
  AnalyzeAlignmentRequest,
  AlignmentAnalysisResponse 
} from '@trading-log/shared';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = express.Router();

/**
 * POST /api/alignment/analyze
 * Analyzes the alignment between trade direction and method analysis
 */
router.post('/analyze', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { direction, methodAnalysis }: AnalyzeAlignmentRequest = req.body;

    // Validate request
    const validation = validateAlignmentRequest(direction, methodAnalysis);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      } as AlignmentAnalysisResponse);
    }

    // Perform alignment analysis
    const alignmentAnalysis = analyzeAlignment(direction, methodAnalysis);

    res.json({
      success: true,
      data: alignmentAnalysis
    } as AlignmentAnalysisResponse);

  } catch (error) {
    console.error('Alignment analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze alignment'
    } as AlignmentAnalysisResponse);
  }
});

export default router;