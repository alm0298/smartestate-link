import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Image, Upload, X } from "lucide-react";
import { debug, info, error as loggerError } from "@/lib/logger";
import { useAuth } from "@/providers/AuthProvider";

interface PropertyImagesProps {
  propertyId: string;
  existingImages?: string[];
  onImagesUpdated?: () => void;
}

export const PropertyImages = ({ propertyId, existingImages = [], onImagesUpdated }: PropertyImagesProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [images, setImages] = useState<string[]>(existingImages);
  const pid: any = propertyId;

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      debug('[PropertyImages] No files selected');
      return;
    }

    debug('[PropertyImages] Starting file upload for files:', Array.from(files).map(f => ({ name: f.name, type: f.type, size: f.size })));
    setIsUploading(true);
    const newImages: string[] = [];

    try {
      for (const file of files) {
        debug(`[PropertyImages] Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`);
        const fileExt = file.name.split('.').pop();
        const fileName = `${propertyId}/${Date.now()}.${fileExt}`;
        debug('[PropertyImages] Uploading to path:', fileName);

        // Check if bucket exists
        const { data: buckets, error: bucketsError } = await supabase
          .storage
          .listBuckets();
        
        if (bucketsError) {
          loggerError('[PropertyImages] Error listing buckets:', bucketsError);
          throw new Error(`Failed to list buckets: ${bucketsError.message}`);
        }

        debug('[PropertyImages] Available buckets:', buckets);

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('property-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
            duplex: 'half',
            metadata: {
              owner: user?.id || '',
              propertyId
            }
          });

        if (uploadError) {
          loggerError('[PropertyImages] Storage upload error:', uploadError.message);
          throw uploadError;
        }

        info('[PropertyImages] Upload successful, data:', uploadData);

        const { data: { publicUrl } } = supabase.storage
          .from('property-images')
          .getPublicUrl(fileName);

        debug('[PropertyImages] Generated public URL:', publicUrl);
        newImages.push(publicUrl);
      }

      debug('[PropertyImages] All files uploaded, updating property record with new images');
      
      // Get current record first
      const { data: currentRecord, error: fetchError } = await supabase
        .from('property_analyses')
        .select('*')
        .eq('id', pid)
        .single();

      if (fetchError) {
        loggerError('[PropertyImages] Error fetching current record:', fetchError);
        throw fetchError;
      }

      debug('[PropertyImages] Current record:', currentRecord);

      // Update property record with new images
      const { error: updateError, data: updateData } = await supabase
        .from('property_analyses')
        .update({
          images: [...(((currentRecord as any)?.images) || []), ...newImages]
        } as any)
        .eq('id', pid)
        .select();

      if (updateError) {
        loggerError('[PropertyImages] Database update error:', updateError.message);
        throw updateError;
      }

      info('[PropertyImages] Property record updated successfully:', updateData);
      setImages(prev => [...prev, ...newImages]);
      onImagesUpdated?.();

      toast({
        title: "Success",
        description: "Images uploaded successfully",
      });
    } catch (error: any) {
      loggerError('[PropertyImages] Error uploading images:', error.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to upload images. Please try again.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Add useEffect for paste event listener
  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      debug('Paste event detected');
      const items = e.clipboardData?.items;
      if (!items) {
        debug('No clipboard items found');
        return;
      }

      debug('Clipboard items:', Array.from(items).map(item => ({ type: item.type, kind: item.kind })));
      const imageItems = Array.from(items).filter(item => {
        debug('Checking item type:', item.type);
        return item.type.startsWith('image/');
      });
      
      if (imageItems.length === 0) {
        debug('No image items found in clipboard');
        toast({
          variant: "destructive",
          title: "No Image Found",
          description: "No image found in clipboard. Please copy an image first.",
        });
        return;
      }

      setIsUploading(true);
      const newImages: string[] = [];

      try {
        for (const item of imageItems) {
          const file = item.getAsFile();
          if (!file) {
            debug('Failed to get file from clipboard item');
            continue;
          }

          debug('Processing pasted image:', { type: file.type, size: file.size });

          const fileName = `${propertyId}/${Date.now()}.png`;
          debug('Uploading to path:', fileName);

          const { error: uploadError, data: uploadData } = await supabase.storage
            .from('property-images')
            .upload(fileName, file, {
              contentType: file.type
            });

          if (uploadError) {
            loggerError('Storage upload error:', uploadError);
            throw uploadError;
          }

          info('Upload successful, data:', uploadData);

          const { data: { publicUrl } } = supabase.storage
            .from('property-images')
            .getPublicUrl(fileName);

          debug('Generated public URL:', publicUrl);
          newImages.push(publicUrl);
        }

        debug('All pasted images uploaded, updating property record');
        const { error: updateError, data: updateData } = await supabase
          .from('property_analyses')
          .update({
            images: [...images, ...newImages]
          } as any)
          .eq('id', pid)
          .select();

        if (updateError) {
          loggerError('Database update error:', updateError.message);
          throw updateError;
        }

        info('Property record updated successfully:', updateData);
        setImages(prev => [...prev, ...newImages]);
        onImagesUpdated?.();

        toast({
          title: "Success",
          description: "Images pasted successfully",
        });
      } catch (error: any) {
        loggerError('Error processing pasted images:', error.message);
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to process pasted images. Please try again.",
        });
      } finally {
        setIsUploading(false);
      }
    };

    // Add the event listener to the window
    window.addEventListener('paste', handleGlobalPaste);

    // Cleanup
    return () => {
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [propertyId, images, onImagesUpdated, toast]);

  const handleDelete = async (imageUrl: string) => {
    try {
      const fileName = imageUrl.split('/').pop();
      if (!fileName) return;

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('property-images')
        .remove([`${propertyId}/${fileName}`]);

      if (deleteError) throw deleteError;

      // Update property record
      const updatedImages = images.filter(img => img !== imageUrl);
      const { error: updateError } = await supabase
        .from('property_analyses')
        .update({
          images: updatedImages
        } as any)
        .eq('id', pid);

      if (updateError) throw updateError;

      setImages(updatedImages);
      onImagesUpdated?.();

      toast({
        title: "Success",
        description: "Image deleted successfully",
      });
    } catch (error: any) {
      loggerError('Error deleting image:', error.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete image. Please try again.",
      });
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => document.getElementById('image-upload')?.click()}
              disabled={isUploading}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {isUploading ? "Uploading..." : "Upload Images"}
            </Button>
            <Input
              id="image-upload"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            <div className="text-sm text-muted-foreground">
              or paste images from clipboard (Ctrl/Cmd + V)
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((url, index) => (
              <div key={url} className="relative group">
                <img
                  src={url}
                  alt={`Property image ${index + 1}`}
                  className="w-full h-48 object-cover rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(url)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {images.length === 0 && (
              <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                <div className="text-center text-muted-foreground">
                  <Image className="h-8 w-8 mx-auto mb-2" />
                  <p>No images yet</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PropertyImages; 