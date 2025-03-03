import { useState, useEffect, useCallback } from "react";
import { GoogleMap, useLoadScript, Marker } from "@react-google-maps/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Save, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PropertyMapProps {
  propertyId: string;
  address: string;
  initialLat?: number;
  initialLng?: number;
  onLocationUpdated?: () => void;
}

const libraries: ("places")[] = ["places"];

// Get API key with fallback message
const getGoogleMapsApiKey = () => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  // Check if API key is the placeholder value
  if (!apiKey || apiKey === "your_google_maps_api_key") {
    return "";  // Return empty for better error handling
  }
  return apiKey;
};

// Custom marker component that uses AdvancedMarkerElement
const AdvancedMarker = ({ position, map }: { position: google.maps.LatLngLiteral; map?: google.maps.Map | null }) => {
  useEffect(() => {
    if (!map) return;

    const marker = new google.maps.marker.AdvancedMarkerElement({
      position,
      map
    });

    return () => {
      marker.map = null;
    };
  }, [map, position]);

  return null;
};

export const PropertyMap = ({ 
  propertyId, 
  address, 
  initialLat, 
  initialLng,
  onLocationUpdated 
}: PropertyMapProps) => {
  const { toast } = useToast();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchAddress, setSearchAddress] = useState(address);
  const [center, setCenter] = useState({
    lat: initialLat || 41.1579,
    lng: initialLng || -8.6291
  });
  const [markerPosition, setMarkerPosition] = useState({
    lat: initialLat || 41.1579,
    lng: initialLng || -8.6291
  });

  const apiKey = getGoogleMapsApiKey();
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries
  });

  const geocodeAddress = useCallback(async (address: string) => {
    if (!apiKey) {
      toast({
        variant: "destructive",
        title: "Google Maps API Key Missing",
        description: "Please configure a valid Google Maps API key in your .env file",
      });
      return;
    }

    const geocoder = new google.maps.Geocoder();
    try {
      const result = await geocoder.geocode({ address });
      if (result.results[0]) {
        const { lat, lng } = result.results[0].geometry.location;
        const newPos = { lat: lat(), lng: lng() };
        setCenter(newPos);
        setMarkerPosition(newPos);
        setSearchAddress(result.results[0].formatted_address);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to find address. Please try again.",
      });
    }
  }, [toast, apiKey]);

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (!isEditing || !e.latLng) return;
    const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setMarkerPosition(newPos);
  };

  const handleSaveLocation = async () => {
    try {
      const pid = propertyId as any;
      const { error } = await supabase
        .from('property_analyses')
        .update({
          address: searchAddress,
          location_lat: markerPosition.lat,
          location_lng: markerPosition.lng
        } as any)
        .eq('id', pid);

      if (error) throw error;

      setIsEditing(false);
      onLocationUpdated?.();
      
      toast({
        title: "Success",
        description: "Location updated successfully",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update location",
      });
    }
  };

  useEffect(() => {
    if (isLoaded && address && !initialLat && !initialLng) {
      geocodeAddress(address);
    }
  }, [isLoaded, address, initialLat, initialLng, geocodeAddress]);

  // Show no API key warning
  if (!apiKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Google Maps API Key Missing</AlertTitle>
            <AlertDescription>
              Please add a valid Google Maps API key to your <code>.env</code> file. 
              Set the <code>VITE_GOOGLE_MAPS_API_KEY</code> variable with your API key.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <p className="text-sm font-medium">Property Address:</p>
            <p className="text-sm">{address}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isEditing ? (
            <div className="flex gap-2">
              <Input
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                placeholder="Enter address..."
              />
              <Button onClick={() => geocodeAddress(searchAddress)} className="flex items-center gap-2">
                Search
              </Button>
              <Button onClick={handleSaveLocation} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm">{address}</p>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            </div>
          )}
          
          {loadError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error loading Google Maps</AlertTitle>
              <AlertDescription>
                {loadError.message}
              </AlertDescription>
            </Alert>
          )}
          
          {isLoaded ? (
            <div className="h-[400px] w-full">
              <GoogleMap
                mapContainerStyle={{ height: "100%", width: "100%" }}
                zoom={13}
                center={center}
                onClick={handleMapClick}
                options={{
                  disableDefaultUI: true,
                  zoomControl: true,
                  streetViewControl: true,
                  mapTypeControl: true,
                }}
                onLoad={setMap}
                onUnmount={() => setMap(null)}
              >
                <Marker
                  position={markerPosition}
                  draggable={isEditing}
                  onDragEnd={(e) => {
                    if (e.latLng) {
                      setMarkerPosition({
                        lat: e.latLng.lat(),
                        lng: e.latLng.lng()
                      });
                    }
                  }}
                />
              </GoogleMap>
            </div>
          ) : (
            <div className="h-[400px] w-full flex items-center justify-center">
              {loadError ? "Error loading map" : "Loading map..."}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PropertyMap; 