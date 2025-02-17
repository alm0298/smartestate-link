
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Properties = () => {
  const { data: properties, isLoading } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_analyses")
        .select("*");
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Properties</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {properties?.map((property) => (
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
    </div>
  );
};

export default Properties;
