
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const PropertyDetails = () => {
  const { id } = useParams();
  
  const { data: property, isLoading } = useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_analyses")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!property) {
    return <div>Property not found</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{property.address}</h1>
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Property Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>Price: ${property.price?.toLocaleString()}</p>
              <p>Monthly Rent: ${property.monthly_rent?.toLocaleString()}</p>
              <p>ROI: {property.roi}%</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PropertyDetails;
