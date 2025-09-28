
"use client";

import React, { useRef, useCallback } from 'react';
import useSWR from 'swr';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Message } from '@/lib/types';
import { Send, Loader2, Mic } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { toISOString, fetcher } from '@/lib/utils';

interface ChatThreadProps {
  tenantId: string;
  tenantName: string;
}

type FormValues = {
  content: string;
};

export function ChatThread({ tenantId, tenantName }: ChatThreadProps) {
  const { data: messages, error, isLoading, mutate } = useSWR<Message[]>(`/api/tenants/${tenantId}/messages`, fetcher);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValues>();
  
  React.useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight });
    }
  }, [messages]);


  const onSubmit: SubmitHandler<FormValues> = useCallback(async (data) => {
    const newMessageContent = data.content;
    if (!newMessageContent.trim()) return;

    try {
      const response = await fetch(`/api/tenants/${tenantId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessageContent }),
      });
      if (!response.ok) throw new Error('Failed to send message.');
      
      const sentMessage = await response.json();
      mutate(currentMessages => [...(currentMessages || []), sentMessage], false);
      reset();

    } catch (err: unknown) {
      const typedError = err as Error;
      console.error("Failed to send message:", typedError);
      toast({
          title: "Send Failed",
          description: "Could not send the message. Please try again.",
          variant: "destructive"
      });
    }
  }, [tenantId, mutate, reset, toast]);

  const handleFeatureClick = useCallback((featureName: string) => {
    toast({
      title: "Coming Soon!",
      description: `${featureName} integration is not yet available.`,
    });
  }, [toast]);

  const landlordId = "user_12345"; // Mocked landlordId

  if (isLoading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (error) return <p className="text-destructive text-center">{error.info?.error || error.message}</p>;

  const getMessageTime = (timestamp: unknown): string => {
    const isoString = toISOString(timestamp);
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[500px]">
      <ScrollArea className="flex-grow p-4 border rounded-lg" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages?.map((msg) => (
            <div
              key={msg.id}
              className={cn('flex items-end gap-2', {
                'justify-end': msg.senderId === landlordId,
                'justify-start': msg.senderId !== landlordId,
              })}
            >
              <div
                className={cn('max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-2', {
                  'bg-primary text-primary-foreground': msg.senderId === landlordId,
                  'bg-muted': msg.senderId !== landlordId,
                })}
              >
                <p className="text-sm">{msg.content}</p>
                 <p className="text-xs opacity-70 mt-1 text-right">
                    {getMessageTime(msg.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="mt-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => handleFeatureClick('Voice note')}>
            <Mic className="h-5 w-5" />
            <span className="sr-only">Record voice note</span>
        </Button>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-grow flex gap-2">
            <Input
            {...register('content', { required: true })}
            placeholder={`Message ${tenantName}...`}
            autoComplete="off"
            disabled={isSubmitting}
            />
            <Button type="submit" size="icon" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
        </form>
      </div>
    </div>
  );
}
