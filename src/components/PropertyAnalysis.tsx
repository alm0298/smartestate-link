
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, TrendingUp, MapPin, Home, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface PropertyAnalysis {
  id: string;
  property_url: string;
  address: string;
  price: number;
  monthly_rent: number;
  estimated_expenses: number;
  roi: number;
  created_at: string;
}

export const PropertyAnalysis = () => {
  const [url, setUrl] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's analyses
  const { data: analyses, isLoading: isLoadingAnalyses } = useQuery({
    queryKey: ["analyses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_analyses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PropertyAnalysis[];
    },
    enabled: !!user,
  });

  // Mutation for creating new analysis
  const { mutate: analyzeProperty, isLoading: isAnalyzing } = useMutation({
    mutationFn: async (propertyUrl: string) => {
      // Simulate property analysis with mock data
      // In a real app, this would call an API to scrape and analyze the listing
      const mockAnalysis = {
        property_url: propertyUrl,
        address: "123 Sample St",
        price: 300000,
        monthly_rent: 2000,
        estimated_expenses: 500,
        roi: 8.0,
        user_id: user?.id,
      };

      const { data, error } = await supabase
        .from("property_analyses")
        .insert(mockAnalysis)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analyses"] });
      toast({
        title: "Success!",
        description: "Property has been analyzed.",
      });
      setUrl("");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to analyze property. Please try again.",
      });
    },
  });

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please sign in to analyze properties.",
      });
      return;
    }
    if (!url) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a property URL.",
      });
      return;
    }
    analyzeProperty(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Card className="p-6 backdrop-blur-lg bg-white/50">
        <div className="space-y-4">
          <h2 className="text-2xl font-display font-bold text-gray-900">Analyze Property</h2>
          <p className="text-gray-600">
            Paste a property listing URL to automatically extract and analyze the details.
          </p>
          <form onSubmit={handleAnalyze} className="flex space-x-2">
            <Input
              placeholder="Enter property listing URL..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isAnalyzing}>
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Analyze
            </Button>
          </form>

          {/* Analysis Results */}
          {isLoadingAnalyses ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : analyses && analyses.length > 0 ? (
            <div className="space-y-4 mt-8">
              <h3 className="text-xl font-semibold">Your Recent Analyses</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analyses.map((analysis) => (
                  <Card key={analysis.id} className="p-4 bg-white/80">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h4 className="font-semibold">{analysis.address}</h4>
                        <span className="text-primary font-bold">{analysis.roi}% ROI</span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Price: ${analysis.price.toLocaleString()}</p>
                        <p>Monthly Rent: ${analysis.monthly_rent.toLocaleString()}</p>
                        <p>Monthly Expenses: ${analysis.estimated_expenses.toLocaleString()}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <Card className="p-4 bg-white/80 hover:shadow-lg transition-all duration-300">
              <TrendingUp className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-display font-semibold">Market Analysis</h3>
              <p className="text-sm text-gray-600">Get instant market insights and trends</p>
            </Card>
            <Card className="p-4 bg-white/80 hover:shadow-lg transition-all duration-300">
              <MapPin className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-display font-semibold">Location Score</h3>
              <p className="text-sm text-gray-600">View neighborhood ratings and amenities</p>
            </Card>
            <Card className="p-4 bg-white/80 hover:shadow-lg transition-all duration-300">
              <Home className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-display font-semibold">Property Details</h3>
              <p className="text-sm text-gray-600">Auto-extract listing information</p>
            </Card>
          </div>
        </div>
      </Card>
    </div>
  );
};
