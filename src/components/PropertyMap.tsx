import { useState, useEffect, useCallback, useRef } from "react";
import { GoogleMap } from "@react-google-maps/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Save, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Extend Window interface to include our custom property
declare global {
  interface Window {
    googleMapsLoaded?: boolean;
  }
}

interface PropertyMapProps {
  propertyId: string;
  address: string;
  initialLat?: number;
  initialLng?: number;
  onLocationUpdated?: () => void;
}

// Custom marker component that uses AdvancedMarkerElement
const AdvancedMarker = ({ position, map, draggable, onDragEnd }: { 
  position: google.maps.LatLngLiteral; 
  map?: google.maps.Map | null;
  draggable?: boolean;
  onDragEnd?: (position: google.maps.LatLngLiteral) => void;
}) => {
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps?.marker) return;

    try {
      if (markerRef.current) {
        markerRef.current.map = null;
      }

      const marker = new google.maps.marker.AdvancedMarkerElement({
        position,
        map,
        gmpDraggable: !!draggable
      });
      markerRef.current = marker;

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
        if (markerRef.current) {
          markerRef.current.map = null;
          markerRef.current = null;
        }
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
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(
    typeof window !== 'undefined' && 
    typeof google !== 'undefined' && 
    typeof google.maps !== 'undefined'
  );
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);

  // Check if Google Maps is loaded
  useEffect(() => {
    if (isGoogleMapsLoaded) return;
    
    const checkGoogleMapsLoaded = () => {
      if (typeof google !== 'undefined' && typeof google.maps !== 'undefined') {
        setIsGoogleMapsLoaded(true);
      } else {
        setMapLoadError("Google Maps failed to load. Please refresh the page.");
      }
    };
    
    // Check immediately and after a timeout
    checkGoogleMapsLoaded();
    
    // Wait for the initMap callback which sets googleMapsLoaded to true
    const waitForMapsLoaded = setInterval(() => {
      if (window.googleMapsLoaded === true) {
        checkGoogleMapsLoaded();
        clearInterval(waitForMapsLoaded);
      }
    }, 500);
    
    // Set a timeout to prevent waiting indefinitely
    setTimeout(() => {
      clearInterval(waitForMapsLoaded);
      if (!isGoogleMapsLoaded) {
        setMapLoadError("Google Maps took too long to load. Please check your internet connection and refresh the page.");
      }
    }, 10000);
    
    return () => {
      clearInterval(waitForMapsLoaded);
    };
  }, [isGoogleMapsLoaded]);

  const geocodeAddress = useCallback(async (address: string) => {
    if (typeof google === 'undefined' || !google.maps) {
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
    if (isGoogleMapsLoaded && address && !initialLat && !initialLng) {
      geocodeAddress(address);
    }
  }, [isGoogleMapsLoaded, address, initialLat, initialLng, geocodeAddress]);

  if (mapLoadError) {
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
              {mapLoadError}
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

  if (!isGoogleMapsLoaded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full flex items-center justify-center">
            <p>Loading Google Maps...</p>
          </div>
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
        </div>
      </CardContent>
    </Card>
  );
};

export default PropertyMap; 