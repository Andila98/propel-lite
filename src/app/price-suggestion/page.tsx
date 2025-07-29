
"use client"
import { useState } from 'react';
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Wand2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { suggestPriceAction, type PriceSuggestionState } from "./actions";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const SuggestionFormSchema = z.object({
  address: z.string().min(5, "Please enter a valid address."),
  squareFootage: z.coerce.number().min(100, "Must be at least 100 sqft."),
  bedrooms: z.coerce.number().min(0, "Cannot be negative.").max(10, "Cannot be more than 10."),
  bathrooms: z.coerce.number().min(1, "Must have at least 1 bathroom.").max(10, "Cannot be more than 10."),
  marketData: z.string().min(20, "Please provide some basic market data."),
  propertyDescription: z.string().optional(),
});
type SuggestionFormValues = z.infer<typeof SuggestionFormSchema>;

export default function PriceSuggestionPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PriceSuggestionState | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SuggestionFormValues>({
    resolver: zodResolver(SuggestionFormSchema),
  });

  const onSubmit: SubmitHandler<SuggestionFormValues> = async (data) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await suggestPriceAction(data);
      if (res.error) {
        toast({
          title: "Error",
          description: res.error,
          variant: "destructive",
        });
      } else {
        setResult(res);
      }
    } catch (e) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">AI Price Suggestion</h2>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Property Details</CardTitle>
            <CardDescription>Enter information about the property to get a price suggestion.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="address">Address</Label>
                <Input id="address" {...register("address")} autoComplete="street-address" />
                {errors.address && <p className="text-sm text-destructive mt-1">{errors.address.message}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="squareFootage">Square Footage</Label>
                  <Input id="squareFootage" type="number" {...register("squareFootage")} />
                  {errors.squareFootage && <p className="text-sm text-destructive mt-1">{errors.squareFootage.message}</p>}
                </div>
                <div>
                  <Label htmlFor="bedrooms">Bedrooms</Label>
                  <Input id="bedrooms" type="number" {...register("bedrooms")} />
                  {errors.bedrooms && <p className="text-sm text-destructive mt-1">{errors.bedrooms.message}</p>}
                </div>
                <div>
                  <Label htmlFor="bathrooms">Bathrooms</Label>
                  <Input id="bathrooms" type="number" step="0.5" {...register("bathrooms")} />
                  {errors.bathrooms && <p className="text-sm text-destructive mt-1">{errors.bathrooms.message}</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="marketData">Market Data</Label>
                <Textarea id="marketData" placeholder="e.g., Average rent for 2-beds in this zip is 250000 Ksh. Similar units listed for 260000-290000 Ksh..." {...register("marketData")} />
                {errors.marketData && <p className="text-sm text-destructive mt-1">{errors.marketData.message}</p>}
              </div>

              <div>
                <Label htmlFor="propertyDescription">Property Description (Optional)</Label>
                <Textarea id="propertyDescription" placeholder="e.g., Corner unit with balcony, new appliances, hardwood floors..." {...register("propertyDescription")} />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Loader2 className="animate-spin" /> : <><Wand2 className="mr-2 h-4 w-4" /> Suggest Price</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className={cn("transition-opacity duration-500", !result && "opacity-0")}>
            <CardHeader>
              <CardTitle>Suggestion</CardTitle>
              <CardDescription>Our AI-powered recommendation based on your data.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading && <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
              {result && (
                <>
                  <div>
                    <Label>Suggested Monthly Rent</Label>
                    <p className="text-3xl sm:text-4xl font-bold text-primary">Ksh{result.suggestedPrice?.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label>Reasoning</Label>
                    <p className="text-muted-foreground">{result.reasoning}</p>
                  </div>
                  <div>
                    <Label>Override Considerations</Label>
                    <p className="text-muted-foreground">{result.overrideConsiderations}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
