
"use client"

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Loader2, TestTube2, CheckCircle, AlertTriangle } from 'lucide-react';
import { PropertyFormSchema, type PropertyFormValues } from '@/lib/schemas';

// Using a simplified version of the schema for testing purposes.
const TestFormSchema = PropertyFormSchema.pick({
    name: true,
    address: true,
    type: true,
    description: true,
}).extend({
    units: PropertyFormSchema.shape.units.min(1).max(1), // Test with exactly one unit
});
type TestFormValues = Zod.infer<typeof TestFormSchema>;

export default function TestPropertyCreationPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<TestFormValues>({
    resolver: zodResolver(TestFormSchema),
    defaultValues: {
      name: "Test Property",
      address: "123 Test Street, Nairobi",
      type: "Apartment",
      description: "This is a test property created to verify API integration.",
      units: [{
        unitNumber: "T1",
        rent: 5000,
        size: "1 Test Unit",
        isOccupied: false,
      }]
    }
  });
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  const onSubmit: SubmitHandler<TestFormValues> = async (data) => {
    setLoading(true);
    setError(null);
    setResult(null);

    if (!imageFile) {
        toast({ title: "Image required", description: "Please select an image for the test property.", variant: "destructive" });
        setLoading(false);
        return;
    }

    try {
      const formData = new FormData();
      formData.append('media', imageFile);
      formData.append('propertyData', JSON.stringify(data));
      
      const response = await fetch('/api/properties', {
        method: 'POST',
        body: formData,
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Test failed with an unknown error.');
      }
      
      setResult(responseData);
      toast({ title: "Test Passed!", description: `Property "${responseData.name}" created successfully.` });

    } catch (err: any) {
        setError(err.message);
        toast({ title: "Test Failed", description: err.message, variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center gap-4">
        <TestTube2 className="h-8 w-8" />
        <h2 className="text-3xl font-bold tracking-tight">Property Creation Test</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Test Form</CardTitle>
            <CardDescription>
              This form tests the end-to-end property creation flow, from frontend submission to the OOP-based backend service and into the database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="name">Property Name</Label>
                <Input id="name" {...register("name")} />
                {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
              </div>

               <div>
                <Label htmlFor="address">Address</Label>
                <Input id="address" {...register("address")} />
                {errors.address && <p className="text-sm text-destructive mt-1">{errors.address.message}</p>}
              </div>

               <div>
                <Label htmlFor="imageFile">Property Image</Label>
                <Input id="imageFile" type="file" accept="image/*" onChange={handleFileChange} />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Loader2 className="animate-spin" /> : "Run Creation Test"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Test Result</CardTitle>
                <CardDescription>The API response will be displayed here.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading && <div className="flex justify-center items-center h-48"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}
                
                {error && (
                    <div className="flex flex-col items-center justify-center h-48 text-destructive text-center">
                        <AlertTriangle className="h-12 w-12 mb-2" />
                        <h3 className="font-semibold text-lg">Test Failed</h3>
                        <pre className="mt-2 bg-muted p-2 rounded-md text-xs whitespace-pre-wrap">{error}</pre>
                    </div>
                )}
                
                {result && (
                    <div className="flex flex-col items-center justify-center h-48 text-green-600 text-center">
                        <CheckCircle className="h-12 w-12 mb-2" />
                        <h3 className="font-semibold text-lg">Test Passed</h3>
                        <p className="text-sm text-muted-foreground">Property created with ID:</p>
                        <p className="font-mono text-xs">{result.id}</p>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
