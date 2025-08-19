
"use client"

import { useState, useRef } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UploadCloud, AlertTriangle, CheckCircle, Wand2 } from 'lucide-react';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import type { AnalyzeDamageOutput } from '@/ai/flows/analyze-damage-flow';


interface DamageAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DamageAnalysisDialog({ open, onOpenChange }: DamageAnalysisDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeDamageOutput | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please upload an image to analyze.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch('/api/properties/analyze-damage', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Analysis failed');
        }

      const analysisResult: AnalyzeDamageOutput = await response.json();
      setResult(analysisResult);

    } catch (error: any) {
      toast({
        title: 'Analysis Failed',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const severityVariant = (severity: 'Low' | 'Medium' | 'High') => {
    switch (severity) {
        case 'High': return 'destructive';
        case 'Medium': return 'secondary';
        case 'Low': return 'outline';
        default: return 'default';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            AI Damage Analysis
          </DialogTitle>
          <DialogDescription>
            Upload an image of a property to let AI identify potential damage or wear and tear.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <div className="space-y-4">
            <div
              className="aspect-square w-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-4 cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <Image src={previewUrl} alt="Preview" width={400} height={400} className="max-h-full w-auto object-contain rounded-md" />
              ) : (
                <div className="text-center text-muted-foreground">
                  <UploadCloud className="mx-auto h-12 w-12" />
                  <p>Click to upload an image</p>
                  <p className="text-xs">PNG, JPG, or WEBP up to 5MB</p>
                </div>
              )}
            </div>
            <Input
              id="file-upload"
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
              accept="image/png, image/jpeg, image/webp"
            />
            <Button onClick={handleAnalyze} disabled={loading || !file} className="w-full">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Analyze Image'}
            </Button>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-center">Analysis Result</h4>
            <div className="min-h-[300px] bg-muted/50 rounded-lg p-4 space-y-4">
              {loading && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p>AI is inspecting the image...</p>
                </div>
              )}
               {result && !loading && (
                 <>
                    <div className="flex items-center gap-3">
                        {result.hasDamage ? <AlertTriangle className="h-5 w-5 text-yellow-500" /> : <CheckCircle className="h-5 w-5 text-green-500" />}
                        <p className="font-semibold">{result.damageSummary}</p>
                    </div>
                    <Separator />
                    <div className="space-y-3">
                        {result.detectedIssues.length > 0 ? (
                             result.detectedIssues.map((issue, index) => (
                                <div key={index} className="text-sm p-2 border-l-4 rounded-r-md bg-background" style={{ borderLeftColor: issue.severity === 'High' ? 'hsl(var(--destructive))' : issue.severity === 'Medium' ? 'hsl(var(--chart-4))' : 'hsl(var(--border))' }}>
                                    <div className="flex justify-between items-center">
                                         <p className="font-medium">{issue.issueType}</p>
                                         <Badge variant={severityVariant(issue.severity)}>{issue.severity}</Badge>
                                    </div>
                                    <p className="text-muted-foreground text-xs">{issue.description}</p>
                                </div>
                            ))
                        ) : (
                             <p className="text-sm text-muted-foreground text-center pt-8">No specific issues were detected.</p>
                        )}
                    </div>
                 </>
               )}
              {!loading && !result && (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>Results will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
