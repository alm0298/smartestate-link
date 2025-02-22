import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { debug } from "@/lib/logger";

interface PropertyAnalysis {
  id: string;
  address: string;
  price: number;
  monthly_rent: number;
  estimated_expenses: number;
  roi: number;
  details: any;
  property_url: string;
  user_id: string;
  created_at?: string;
  agent_notes?: string;
  ai_analysis?: any;
  images?: string[];
  location_lat?: number;
  location_lng?: number;
}

interface PropertyDetails {
  bedrooms?: string;
  bathrooms?: string;
  square_feet?: string;
  description?: string;
}

export const NewProperty = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [pastedContent, setPastedContent] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Manual input state
  const [manualInput, setManualInput] = useState({
    address: "",
    price: "",
    bedrooms: "",
    bathrooms: "",
    squareFeet: "",
    description: "",
    monthlyRent: "",
    estimatedExpenses: ""
  });

  const handlePasteAnalysis = async (e: ClipboardEvent) => {
    e.preventDefault(); // Prevent default paste behavior
    
    const items = Array.from(e.clipboardData?.items || []);
    debug('[NewProperty] Clipboard items:', items.map(item => ({ type: item.type, kind: item.kind })));

    // Extract text content
    const textItem = items.find(item => item.type === 'text/plain');
    let content = '';
    if (textItem) {
      content = await new Promise(resolve => textItem.getAsString(resolve));
    }

    // Extract images
    const imageItems = items.filter(item => item.type.startsWith('image/'));
    const images: File[] = imageItems
      .map(item => item.getAsFile())
      .filter((file): file is File => file !== null);

    if (!content && images.length === 0) {
      toast({
        variant: "destructive",
        title: "No content found",
        description: "Please copy both text and images from your listing.",
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      // First analyze the text content if present
      let propertyId = '';
      if (content) {
        const { data: analysisResult, error: analysisError } = await supabase.functions.invoke('analyze-content', {
          body: { content }
        });

        if (analysisError) throw analysisError;

        // Create the property record
        const { data: propertyData, error: propertyError } = await supabase
          .from('property_analyses')
          .insert({
            ...analysisResult,
            user_id: user?.id,
            property_url: "", // Empty for paste analysis
            images: [] // Will be updated after image upload
          })
          .select()
          .single();

        if (propertyError) throw propertyError;
        propertyId = propertyData.id;
      }

      // Then upload images if present
      if (images.length > 0 && propertyId) {
        const uploadedUrls: string[] = [];

        for (const file of images) {
          const fileName = `${propertyId}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('property-images')
            .upload(fileName, file, {
              contentType: file.type,
              upsert: false
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('property-images')
            .getPublicUrl(fileName);

          uploadedUrls.push(publicUrl);
        }

        // Update property with image URLs
        const { error: updateError } = await supabase
          .from('property_analyses')
          .update({ images: uploadedUrls })
          .eq('id', propertyId);

        if (updateError) throw updateError;
      }

      toast({
        title: "Success",
        description: "Property analyzed and images uploaded successfully",
      });

      // Navigate to the property details page
      if (propertyId) {
        navigate(`/properties/${propertyId}`);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to analyze property",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    // Add paste event listener
    window.addEventListener('paste', handlePasteAnalysis);
    return () => window.removeEventListener('paste', handlePasteAnalysis);
  }, []);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const price = parseFloat(manualInput.price);
      const monthlyRent = parseFloat(manualInput.monthlyRent) || price * 0.008;
      const estimatedExpenses = parseFloat(manualInput.estimatedExpenses) || monthlyRent * 0.4;
      const annualIncome = (monthlyRent - estimatedExpenses) * 12;
      const roi = ((annualIncome / price) * 100).toFixed(2);

      const propertyData = {
        address: manualInput.address,
        price: price,
        monthly_rent: monthlyRent,
        estimated_expenses: estimatedExpenses,
        roi: parseFloat(roi),
        details: {
          bedrooms: manualInput.bedrooms,
          bathrooms: manualInput.bathrooms,
          square_feet: manualInput.squareFeet,
          description: manualInput.description
        },
        user_id: user?.id,
        property_url: ""
      };

      const { error: saveError } = await supabase
        .from('property_analyses')
        .insert([propertyData]);

      if (saveError) throw saveError;

      toast({
        title: "Success",
        description: "Property added successfully",
      });

      navigate("/properties");
    } catch (error) {
      console.error("Error adding property:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add property. Please check your input and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualInputChange = (field: string, value: string) => {
    setManualInput(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Add New Property</h1>
      </div>

      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Manual Input</TabsTrigger>
          <TabsTrigger value="paste">Paste from Website</TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle>Manual Property Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Property Address</Label>
                  <Input
                    id="address"
                    value={manualInput.address}
                    onChange={(e) => handleManualInputChange('address', e.target.value)}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={manualInput.price}
                      onChange={(e) => handleManualInputChange('price', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="monthlyRent">Monthly Rent ($)</Label>
                    <Input
                      id="monthlyRent"
                      type="number"
                      value={manualInput.monthlyRent}
                      onChange={(e) => handleManualInputChange('monthlyRent', e.target.value)}
                      placeholder="Optional - defaults to 0.8% of price"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bedrooms">Bedrooms</Label>
                    <Input
                      id="bedrooms"
                      value={manualInput.bedrooms}
                      onChange={(e) => handleManualInputChange('bedrooms', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bathrooms">Bathrooms</Label>
                    <Input
                      id="bathrooms"
                      value={manualInput.bathrooms}
                      onChange={(e) => handleManualInputChange('bathrooms', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="squareFeet">Square Feet</Label>
                    <Input
                      id="squareFeet"
                      value={manualInput.squareFeet}
                      onChange={(e) => handleManualInputChange('squareFeet', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimatedExpenses">Monthly Expenses ($)</Label>
                  <Input
                    id="estimatedExpenses"
                    type="number"
                    value={manualInput.estimatedExpenses}
                    onChange={(e) => handleManualInputChange('estimatedExpenses', e.target.value)}
                    placeholder="Optional - defaults to 40% of rent"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={manualInput.description}
                    onChange={(e) => handleManualInputChange('description', e.target.value)}
                  />
                </div>

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? "Adding..." : "Add Property"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/properties")}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paste">
          <Card>
            <CardHeader>
              <CardTitle>Paste Property Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center p-8 border-2 border-dashed rounded-lg">
                  {isAnalyzing ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <p>Analyzing property details...</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      Copy content from your property listing and paste it here (Ctrl/Cmd + V)
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NewProperty; 