import { useState, useEffect, useCallback } from "react";
import { GoogleMap, useLoadScript } from "@react-google-maps/api";
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

// Custom marker component that uses AdvancedMarkerElement
const AdvancedMarker = ({ position, map, draggable, onDragEnd }: { 
  position: google.maps.LatLngLiteral; 
  map?: google.maps.Map | null;
  draggable?: boolean;
  onDragEnd?: (position: google.maps.LatLngLiteral) => void;
}) => {
  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps?.marker) return;

    try {
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position,
        map,
        gmpDraggable: !!draggable
      });

      if (draggable && onDragEnd) {
        marker.addListener("dragend", () => {
          if (marker.position) {
            const pos = marker.position as google.maps.LatLng;
            onDragEnd({
              lat: pos.lat(),
              lng: pos.lng()
            });
          }
        });
      }

      return () => {
        marker.map = null;
      };
    } catch (error) {
      console.error("Error creating advanced marker:", error);
      return () => {};
    }
  }, [map, position, draggable, onDragEnd]);

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

  // Use script loader without API key since it's in index.html
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: "",
    libraries
  });

  const geocodeAddress = useCallback(async (address: string) => {
    if (typeof google === 'undefined') {
      toast({
        variant: "destructive",
        title: "Google Maps Not Loaded",
        description: "Please check your internet connection and try again.",
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
  }, [toast]);

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

  if (loadError) {
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
            <AlertTitle>Google Maps Error</AlertTitle>
            <AlertDescription>
              {loadError.message}
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
                <AdvancedMarker 
                  position={markerPosition}
                  map={map}
                  draggable={isEditing}
                  onDragEnd={(position) => {
                    setMarkerPosition(position);
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