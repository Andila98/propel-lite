
"use client";

import { useState, useEffect } from 'react';
import { useForm, type UseFormProps, type FieldValues } from 'react-hook-form';

const ONBOARDING_STORAGE_KEY = 'onboardingData';

// Function to get all onboarding data from localStorage
const getOnboardingData = () => {
  if (typeof window === 'undefined') return {};
  const data = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
  return data ? JSON.parse(data) : {};
};

// Function to clear all onboarding data from localStorage
export const clearOnboardingData = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    // Also clear image preview if it exists
    window.localStorage.removeItem('propertyImagePreview');
};

export function useOnboardingForm<T extends FieldValues>(
  formKey: string,
  props: UseFormProps<T>
) {
  const [isInitialized, setIsInitialized] = useState(false);

  // Load initial data from localStorage
  const allData = getOnboardingData();
  const initialData = allData[formKey];

  const form = useForm<T>({
    ...props,
    defaultValues: initialData || props.defaultValues,
  });

  const { watch, getValues } = form;

  // Function to set data for a specific form key
  const setOnboardingData = (data: T) => {
    const currentData = getOnboardingData();
    const newData = { ...currentData, [formKey]: data };
    if (typeof window !== 'undefined') {
        window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(newData));
    }
  };

  // Auto-save form data on change
  useEffect(() => {
    // We only start watching after the form is initialized with stored data
    if (!isInitialized) return;

    const subscription = watch(() => {
      setOnboardingData(getValues());
    });

    return () => subscription.unsubscribe();
  }, [watch, getValues, formKey, isInitialized]);

  // Effect to mark the form as initialized
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  return { form, setOnboardingData };
}
