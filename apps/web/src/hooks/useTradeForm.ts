import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { 
  CreateTradeRequestSchema, 
  TradeDirection,
  calculateTradeRisk,
  exceedsIndividualRiskLimit,
} from '@trading-log/shared';
import { tradeApi, userApi } from '../lib/api';

interface TradeFormData {
  symbol: string;
  direction: TradeDirection;
  entryPrice: number;
  positionSize: number;
  stopLoss: number;
  notes?: string;
}

interface UseTradeFormProps {
  onSuccess?: () => void;
}

export const useTradeForm = ({ onSuccess }: UseTradeFormProps = {}) => {
  const [riskAmount, setRiskAmount] = useState<number>(0);
  const [riskWarning, setRiskWarning] = useState<string>('');
  const queryClient = useQueryClient();

  // Get user data for risk calculations
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: userApi.getUser,
  });

  const form = useForm<TradeFormData>({
    resolver: zodResolver(CreateTradeRequestSchema),
    defaultValues: {
      direction: 'LONG' as TradeDirection,
    },
  });

  const { watch, reset } = form;

  // Watch form values for real-time risk calculation
  const watchedValues = watch(['entryPrice', 'positionSize', 'stopLoss']);
  const [entryPrice, positionSize, stopLoss] = watchedValues;

  // Real-time risk calculation
  useEffect(() => {
    if (entryPrice && positionSize && stopLoss && user) {
      try {
        const calculatedRisk = calculateTradeRisk(entryPrice, stopLoss, positionSize);
        setRiskAmount(calculatedRisk);

        // Check risk warnings
        if (exceedsIndividualRiskLimit(calculatedRisk, user.totalEquity)) {
          const maxRisk = user.totalEquity * 0.02;
          setRiskWarning(
            `⚠️ Trade risk ($${calculatedRisk.toFixed(2)}) exceeds 2% limit ($${maxRisk.toFixed(2)})`
          );
        } else {
          setRiskWarning('');
        }
      } catch (error) {
        // Handle invalid input gracefully
        setRiskAmount(0);
        setRiskWarning('');
      }
    } else {
      setRiskAmount(0);
      setRiskWarning('');
    }
  }, [entryPrice, positionSize, stopLoss, user]);

  // Create trade mutation
  const createTradeMutation = useMutation({
    mutationFn: tradeApi.createTrade,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      reset();
      setRiskAmount(0);
      setRiskWarning('');
      onSuccess?.();
    },
    onError: (error: Error) => {
      console.error('Error creating trade:', error);
    },
  });

  const onSubmit = async (data: TradeFormData) => {
    try {
      await createTradeMutation.mutateAsync(data);
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const resetForm = () => {
    reset();
    setRiskAmount(0);
    setRiskWarning('');
  };

  return {
    form,
    riskAmount,
    riskWarning,
    user,
    createTradeMutation,
    onSubmit,
    resetForm,
  };
};