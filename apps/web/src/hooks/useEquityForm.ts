import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { validateEquityValue } from '@trading-log/shared';

// Form validation schema
const EquityFormSchema = z.object({
  totalEquity: z
    .string()
    .min(1, 'Equity is required')
    .refine((val) => !isNaN(Number(val)), 'Must be a valid number')
    .refine((val) => Number(val) >= 0, 'Equity must be positive')
    .refine((val) => validateEquityValue(Number(val)), 'Invalid equity value')
    .transform((val) => Number(val)),
});

export type EquityFormInput = {
  totalEquity: string;
};

export type EquityFormData = z.infer<typeof EquityFormSchema>;

interface UseEquityFormProps {
  initialEquity: number;
  onSubmit: (equity: number) => Promise<void>;
}

/**
 * Custom hook for equity form logic and validation
 * Separates form logic from UI rendering for better testability
 */
export const useEquityForm = ({ initialEquity, onSubmit }: UseEquityFormProps) => {
  const form = useForm<EquityFormInput>({
    resolver: zodResolver(EquityFormSchema),
    defaultValues: {
      totalEquity: String(initialEquity || 0),
    },
    mode: 'onChange', // Enable real-time validation
  });

  const currentValue = form.watch('totalEquity');

  const handleFormSubmit = async (data: EquityFormInput) => {
    try {
      console.log('Form data received:', data, 'Type of totalEquity:', typeof data.totalEquity);
      
      // Ensure data.totalEquity is a string before validation
      const formData = {
        totalEquity: String(data.totalEquity)
      };
      
      // Validate and transform the data through the schema
      const validatedData = EquityFormSchema.parse(formData);
      await onSubmit(validatedData.totalEquity);
    } catch (error) {
      console.error('Failed to update equity:', error);
      console.error('Form data that caused error:', data);
      throw error; // Re-throw so the caller can handle it
    }
  };

  const showPreview = currentValue && !isNaN(Number(currentValue)) && Number(currentValue) > 0;
  const previewValue = showPreview ? Number(currentValue) : 0;

  return {
    form,
    handleFormSubmit,
    currentValue,
    showPreview,
    previewValue,
    isSubmitting: form.formState.isSubmitting,
    errors: form.formState.errors,
  };
};