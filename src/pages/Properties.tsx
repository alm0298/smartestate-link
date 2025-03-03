import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Plus, Image as ImageIcon, BarChart2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { debug, info, error as loggerError } from '@/lib/logger';
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useEffect } from "react";
import { PropertyComparison } from "@/components/PropertyComparison";
import { Checkbox } from "@/components/ui/checkbox";

interface Property {
  id: string;
  address: string;
  price: number;
  monthly_rent: number;
  estimated_expenses: number;
  roi: number;
  user_id: string;
  images?: string[];
  details?: {
    square_meters?: number;
    price_per_meter?: number;
  };
  pros?: string[];
  cons?: string[];
  summary?: string;
  score?: number;
}

export const Properties = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  debug('[Properties] Component mounting with user:', {
    userId: user?.id,
    email: user?.email,
    isAuthenticated: !!user
  });

  // Check if user session is valid
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        debug('[Properties] Invalid session, redirecting to login');
        navigate('/auth');
        return;
      }
      debug('[Properties] Valid session found:', {
        userId: session.user.id,
        expiresAt: session.expires_at
      });
    };
    
    checkSession();
  }, [navigate]);

  const { data: properties, isLoading, isError } = useQuery<Property[]>({
    queryKey: ["properties", user?.id],
    queryFn: async () => {
      debug('[Properties] Fetching properties for user:', {
        userId: user?.id,
        email: user?.email,
        isAuthenticated: !!user
      });
      
      if (!user) {
        debug('[Properties] No user found - not authenticated');
        throw new Error('Not authenticated');
      }

      try {
        debug('[Properties] Making Supabase query for user_id:', user.id);
        const { data, error } = await supabase
          .from("property_analyses")
          .select(`
            id,
            address,
            price,
            roi,
            images,
            details,
            monthly_rent,
            estimated_expenses,
            pros,
            cons,
            summary,
            score,
            user_id
          `)
          .order('created_at', { ascending: false });
        
        if (error) {
          loggerError('[Properties] Supabase error:', error);
          loggerError('[Properties] Error fetching properties:', error.message);
          loggerError('[Properties] Error details:', JSON.stringify(error));
          throw error;
        }
        
        debug('[Properties] Successfully fetched properties:', {
          count: data?.length || 0,
          properties: data
        });
        return data as unknown as Property[];
      } catch (error) {
        loggerError('[Properties] Error in queryFn:', error);
        throw error;
      }
    },
    enabled: !!user,
  });

  const handlePropertyClick = (e: React.MouseEvent, propertyId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    setSelectedProperties(prev => {
      if (prev.includes(propertyId)) {
        return prev.filter(id => id !== propertyId);
      }
      return [...prev, propertyId];
    });
  };

  const handleCompare = () => {
    if (selectedProperties.length < 2) {
      toast({
        variant: "destructive",
        title: "Select Properties",
        description: "Please select at least 2 properties to compare."
      });
      return;
    }
    setShowComparison(true);
  };

  if (!user) {
    info('[Properties] No user logged in, showing login prompt');
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center text-muted-foreground">
          Please log in to view your properties.
        </div>
      </div>
    );
  }

  if (isLoading) {
    debug('[Properties] Properties are loading...');
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center">Loading properties...</div>
      </div>
    );
  }

  if (isError) {
    debug('[Properties] Error loading properties');
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

  info('[Properties] Rendering properties list:', properties?.length || 0);

  const selectedPropertyData = properties?.filter(p => selectedProperties.includes(p.id)) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Properties</h1>
        <div className="flex items-center gap-2">
          {selectedProperties.length > 0 && (
            <Button
              variant="outline"
              onClick={handleCompare}
              className="flex items-center gap-2"
            >
              <BarChart2 className="h-4 w-4" />
              Compare ({selectedProperties.length})
            </Button>
          )}
          <Button onClick={() => navigate("/properties/new")} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Property
          </Button>
        </div>
      </div>
      
      {showComparison ? (
        <PropertyComparison
          properties={selectedPropertyData}
          onClose={() => {
            setShowComparison(false);
            setSelectedProperties([]);
          }}
        />
      ) : properties && properties.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <Card 
              key={property.id}
              className="relative cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
              onClick={() => navigate(`/properties/${property.id}`)}
            >
              <div
                className="absolute top-2 left-2 z-10"
                onClick={(e) => handlePropertyClick(e, property.id)}
              >
                <Checkbox
                  checked={selectedProperties.includes(property.id)}
                  className="h-5 w-5 bg-white/90"
                />
              </div>
              <AspectRatio ratio={16 / 9}>
                {property.images?.[0] ? (
                  <img
                    src={property.images[0]}
                    alt={property.address}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </AspectRatio>
              <CardHeader>
                <CardTitle className="text-lg">{property.address || "Untitled Property"}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {property.price ? `€${property.price.toLocaleString()}` : "Price not set"}
                </p>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-sm text-muted-foreground">
                    {property.details?.square_meters ? `${property.details.square_meters} m²` : "Area not set"}
                  </p>
                  {property.roi !== null && (
                    <p className="text-sm text-muted-foreground">ROI: {property.roi}%</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 space-y-4">
          <p className="text-muted-foreground">You haven't added any properties yet.</p>
          <Button onClick={() => navigate("/properties/new")} variant="outline" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Your First Property
          </Button>
        </div>
      )}
    </div>
  );
};