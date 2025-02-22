import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Save, X, Trash2, Edit } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PropertyMap } from "@/components/PropertyMap";
import { PropertyImages } from "@/components/PropertyImages";
import { clsx } from "clsx";

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

interface PropertyDetails {
  bedrooms?: string;
  bathrooms?: string;
  square_meters?: number;
  description?: string;
  price_per_meter?: number;
  area_average?: number;
  difference_percent?: number;
  area_name?: string;
}

interface PropertyAnalysis {
  id: string;
  address: string;
  price: number;
  monthly_rent: number;
  estimated_expenses: number;
  roi: number;
  details: PropertyDetails;
  property_url: string;
  user_id: string;
  created_at?: string;
  agent_notes?: string;
  ai_analysis?: Json;
  images?: string[];
  location_lat?: number;
  location_lng?: number;
}

export const PropertyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editedProperty, setEditedProperty] = useState<PropertyAnalysis | null>(null);
  
  const { data: property, isLoading } = useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_analyses")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data as PropertyAnalysis;
    },
  });

  // Update state when property data is loaded
  useEffect(() => {
    if (property) {
      setEditedProperty(property);
    }
  }, [property]);

  const { mutate: updateProperty } = useMutation({
    mutationFn: async (updatedData: Partial<PropertyAnalysis>) => {
      const { data, error } = await supabase
        .from('property_analyses')
        .update({
          ...updatedData,
          details: updatedData.details as Json
        })
        .eq('id', id);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property", id] });
      toast({
        title: "Success",
        description: "Property updated successfully",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update property. Please try again.",
      });
    }
  });

  const { mutate: deleteProperty } = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('property_analyses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Property deleted successfully",
      });
      navigate("/properties");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete property. Please try again.",
      });
    }
  });

  const getDetailsValue = (details: PropertyDetails | null, key: keyof PropertyDetails): string | number => {
    if (!details) return '';
    const value = details[key];
    return value === null || value === undefined ? '' : value;
  };

  const handleInputChange = (field: string, value: any) => {
    if (!editedProperty) return;

    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      if (parent === 'details') {
        setEditedProperty({
          ...editedProperty,
          details: {
            ...editedProperty.details,
            [child]: value
          }
        });
      }
    } else {
      setEditedProperty({
        ...editedProperty,
        [field]: value
      });
    }
  };

  const handleSave = () => {
    if (!editedProperty) return;

    const price = Number(editedProperty.price);
    const monthlyRent = Number(editedProperty.monthly_rent) || price * 0.008;
    const estimatedExpenses = Number(editedProperty.estimated_expenses) || monthlyRent * 0.4;
    const annualIncome = (monthlyRent - estimatedExpenses) * 12;
    const roi = ((annualIncome / price) * 100).toFixed(2);

    const updatedData: PropertyAnalysis = {
      ...editedProperty,
      price,
      monthly_rent: monthlyRent,
      estimated_expenses: estimatedExpenses,
      roi: Number(roi)
    };

    updateProperty(updatedData);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-32">Loading...</div>;
  }

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center h-32 space-y-4">
        <div>Property not found</div>
        <Button onClick={() => navigate("/properties")}>Back to Properties</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {isEditing ? (
            <Input
              value={editedProperty?.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className="text-3xl font-bold"
            />
          ) : (
            property.address || "Untitled Property"
          )}
        </h1>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button onClick={handleSave} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save
              </Button>
              <Button variant="outline" onClick={() => {
                setIsEditing(false);
                setEditedProperty(property);
              }} className="flex items-center gap-2">
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button variant="default" onClick={() => setIsEditing(true)} className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => setShowDeleteDialog(true)}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the property
              and all its associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteProperty()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Financial Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium">Price</h3>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editedProperty?.price || ''}
                    onChange={(e) => handleInputChange('price', Number(e.target.value))}
                    className="text-2xl font-bold"
                  />
                ) : (
                  <>
                    <p className="text-3xl font-bold">€{property.price?.toLocaleString()}</p>
                    {property.price && property.details?.square_meters && (
                      <div className="text-sm mt-1">
                        <span className="text-muted-foreground">
                          €{Math.round(property.price / property.details.square_meters).toLocaleString()}/m²
                        </span>
                        {property.details?.area_average && (
                          <span className={clsx(
                            "ml-2",
                            property.details.difference_percent > 0 ? "text-red-500" : "text-green-500"
                          )}>
                            ({property.details.difference_percent > 0 ? '+' : ''}{property.details.difference_percent}% vs {property.details.area_name || 'area'})
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div>
                <h3 className="text-lg font-medium">Monthly Rent</h3>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editedProperty?.monthly_rent || ''}
                    onChange={(e) => handleInputChange('monthly_rent', Number(e.target.value))}
                    className="text-2xl font-bold"
                  />
                ) : (
                  <p className="text-3xl font-bold">€{property.monthly_rent?.toLocaleString()}</p>
                )}
              </div>
              <div>
                <h3 className="text-lg font-medium">Monthly Expenses</h3>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editedProperty?.estimated_expenses || ''}
                    onChange={(e) => handleInputChange('estimated_expenses', Number(e.target.value))}
                    className="text-2xl font-bold"
                  />
                ) : (
                  <p className="text-3xl font-bold">€{property.estimated_expenses?.toLocaleString()}</p>
                )}
              </div>
              <div>
                <h3 className="text-lg font-medium">ROI</h3>
                <p className="text-3xl font-bold text-green-600">{property.roi}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Property Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <h3 className="text-lg font-medium">Bedrooms</h3>
                {isEditing ? (
                  <Input
                    type="number"
                    value={getDetailsValue(editedProperty?.details, 'bedrooms')}
                    onChange={(e) => handleInputChange('details.bedrooms', e.target.value)}
                    className="text-2xl font-bold"
                  />
                ) : (
                  <p className="text-2xl font-bold">{property.details?.bedrooms || 'N/A'}</p>
                )}
              </div>
              <div>
                <h3 className="text-lg font-medium">Bathrooms</h3>
                {isEditing ? (
                  <Input
                    type="number"
                    value={getDetailsValue(editedProperty?.details, 'bathrooms')}
                    onChange={(e) => handleInputChange('details.bathrooms', e.target.value)}
                    className="text-2xl font-bold"
                  />
                ) : (
                  <p className="text-2xl font-bold">{property.details?.bathrooms || 'N/A'}</p>
                )}
              </div>
              <div>
                <h3 className="text-lg font-medium">Area</h3>
                {isEditing ? (
                  <Input
                    type="number"
                    value={getDetailsValue(editedProperty?.details, 'square_meters')}
                    onChange={(e) => handleInputChange('details.square_meters', Number(e.target.value))}
                    className="text-2xl font-bold"
                  />
                ) : (
                  <p className="text-2xl font-bold">{property.details?.square_meters || 'N/A'} m²</p>
                )}
              </div>
            </div>
            <div className="mt-6">
              <h3 className="text-lg font-medium">Description</h3>
              {isEditing ? (
                <textarea
                  value={getDetailsValue(editedProperty?.details, 'description')}
                  onChange={(e) => handleInputChange('details.description', e.target.value)}
                  className="w-full min-h-[100px] mt-2 p-2 border rounded-md"
                />
              ) : (
                <p className="mt-2 text-muted-foreground">{property.details?.description}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <PropertyImages
        propertyId={property.id}
        existingImages={property.images || []}
        onImagesUpdated={() => queryClient.invalidateQueries({ queryKey: ["property", id] })}
      />

      <PropertyMap
        propertyId={property.id}
        address={property.address}
        initialLat={property.location_lat}
        initialLng={property.location_lng}
        onLocationUpdated={() => queryClient.invalidateQueries({ queryKey: ["property", id] })}
      />
    </div>
  );
};

export default PropertyDetails;
