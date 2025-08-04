
"use client";

import { useState, useEffect, useRef } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Message } from '@/lib/types';
import { Send, Loader2, Mic, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatThreadProps {
  tenantId: string;
  tenantName: string;
}

type FormValues = {
  content: string;
};

export function ChatThread({ tenantId, tenantName }: ChatThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValues>();

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tenants/${tenantId}/messages`);
      if (!response.ok) throw new Error('Failed to fetch messages.');
      const data: Message[] = await response.json();
      setMessages(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [tenantId]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight });
    }
  }, [messages]);


  const onSubmit: SubmitHandler<FormValues> = async (data) => {
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
      setMessages(prev => [...prev, sentMessage]);
      reset();

    } catch (err: any) {
      console.error("Failed to send message:", err);
      toast({
          title: "Send Failed",
          description: "Could not send the message. Please try again.",
          variant: "destructive"
      });
    }
  };

  const handleFeatureClick = (featureName: string) => {
    toast({
      title: "Coming Soon!",
      description: `${featureName} integration is not yet available.`,
    });
  };

  const landlordId = "user_12345"; // Mocked landlordId

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (error) return <p className="text-destructive text-center">{error}</p>;

  return (
    <div className="flex flex-col h-[500px]">
      <ScrollArea className="flex-grow p-4 border rounded-lg" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
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
                    {new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
         <Button variant="ghost" size="icon" onClick={() => handleFeatureClick('WhatsApp')}>
            <Phone className="h-5 w-5" />
            <span className="sr-only">Send WhatsApp message</span>
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
