
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const Properties = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: properties, isLoading, isError } = useQuery({
    queryKey: ["properties", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_analyses")
        .select("*")
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching properties:", error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!user,
    initialData: () => [], // Convert to function to match expected type
    retry: 1,
    meta: { // Use meta for error handling
      onError: () => {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load properties. Please try again.",
        });
      }
    }
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center text-muted-foreground">
          Please log in to view your properties.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center">Loading properties...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-32 space-y-4">
        <div className="text-center text-muted-foreground">
          Unable to load properties. Please try again later.
        </div>
        <Button 
          variant="outline" 
          onClick={() => navigate(0)}
          className="flex items-center gap-2"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Properties</h1>
        <Button onClick={() => navigate("/property/new")} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Property
        </Button>
      </div>
      
      {properties && properties.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <Card 
              key={property.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/property/${property.id}`)}
            >
              <CardHeader>
                <CardTitle className="text-lg">{property.address || "Untitled Property"}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {property.price ? `$${property.price?.toLocaleString()}` : "Price not set"}
                </p>
                {property.roi !== null && (
                  <p className="text-sm text-muted-foreground">ROI: {property.roi}%</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 space-y-4">
          <p className="text-muted-foreground">You haven't added any properties yet.</p>
          <Button onClick={() => navigate("/property/new")} variant="outline" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Your First Property
          </Button>
        </div>
      )}
    </div>
  );
};

export default Properties;
