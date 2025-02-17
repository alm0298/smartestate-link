
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";

export const Properties = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: properties, isLoading, error } = useQuery({
    queryKey: ["properties", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_analyses")
        .select("*")
        .eq("user_id", user?.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load properties. Please try again.",
        });
        throw error;
      }
      return data;
    },
    enabled: !!user, // Only run query if user is authenticated
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

  if (error) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center text-red-500">
          Error loading properties. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Properties</h1>
      {properties && properties.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <Card key={property.id}>
              <CardHeader>
                <CardTitle className="text-lg">{property.address}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">${property.price?.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">ROI: {property.roi}%</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No properties found. Add your first property to get started.</p>
        </div>
      )}
    </div>
  );
};

export default Properties;
