import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { debug } from "@/lib/logger";
import { X } from "lucide-react";
import { clsx } from "clsx";

interface PropertyAnalysis {
  id: string;
  address: string;
  price: number;
  monthly_rent: number;
  estimated_expenses: number;
  roi: number;
  details: any;
  property_url: string;
  user_id: string;
  created_at?: string;
  agent_notes?: string;
  ai_analysis?: any;
  images?: string[];
  location_lat?: number;
  location_lng?: number;
}

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

function dataURLToBlob(dataurl: string): Blob {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch) throw new Error('Invalid data URL format');
  const mime = mimeMatch[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

export const NewProperty = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [pastedContent, setPastedContent] = useState("");
  const [pastedImages, setPastedImages] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>("");
  const [activeTab, setActiveTab] = useState("manual");
  const [analysisResult, setAnalysisResult] = useState<PropertyAnalysis | null>(null);
  
  // Manual input state
  const [manualInput, setManualInput] = useState({
    address: "",
    price: "",
    bedrooms: "",
    bathrooms: "",
    squareMeters: "",
    description: "",
    monthlyRent: "",
    estimatedExpenses: ""
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePasteAnalysis = async (e: ClipboardEvent) => {
    e.preventDefault(); // Prevent default paste behavior
    setIsAnalyzing(true);
    setAnalysisStep("Extracting content...");
    debug('[Paste Analysis] Paste event triggered.');
    
    const clipboardData = e.clipboardData;
    let content = "";
    if (clipboardData) {
      content = clipboardData.getData('text/plain').trim();
    }
    debug('[Paste Analysis] Text content extracted: ' + content.substring(0, 200));
    setPastedContent(content);

    let htmlContentStr = "";
    let fallbackText = "";
    if (clipboardData) {
      htmlContentStr = clipboardData.getData('text/html');
      if (htmlContentStr) {
        const tempDoc = new DOMParser().parseFromString(htmlContentStr, "text/html");
        fallbackText = tempDoc.body ? tempDoc.body.innerText.trim() : (tempDoc.documentElement.textContent?.trim() || '');
        debug('[Paste Analysis] Fallback HTML text extracted: ' + fallbackText.substring(0, 200));
      }
    }

    // Choose the best text: use fallback text if it's longer than plain text, otherwise use plain text
    const finalContent = fallbackText.length > content.length ? fallbackText : content;
    debug('[Paste Analysis] Final text content used for analysis:', finalContent.substring(0, 200));

    // Extract images from clipboardData.files if available
    setAnalysisStep("Processing images...");
    let images: File[] = [];
    if (clipboardData && clipboardData.files && clipboardData.files.length > 0) {
      images = Array.from(clipboardData.files);
      debug('[Paste Analysis] Extracted ' + images.length + ' image(s) from clipboardData.files.');
    }

    // Fallback: always try to parse HTML content for additional images, and merge them
    if (htmlContentStr) {
      debug('[Paste Analysis] Attempting to parse HTML for additional images...');
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContentStr, "text/html");
      
      // Extract images from <img> tags with deduplication
      const imgElements = Array.from(doc.querySelectorAll("img"));
      debug('[Paste Analysis] HTML parsing found ' + imgElements.length + ' <img> elements.');
      const seenImgSrcs = new Set<string>();
      const fetchedImgFiles = await Promise.all(imgElements.map(async (img, index) => {
        const src = img.getAttribute("src") || img.getAttribute("data-src");
        if (!src) {
          debug('[Paste Analysis] No image src attribute found for image element: ' + img.outerHTML);
          return null;
        }
        if (seenImgSrcs.has(src)) {
          debug('[Paste Analysis] Duplicate image src skipped: ' + src);
          return null;
        }
        seenImgSrcs.add(src);
        debug('[Paste Analysis] Found image src via HTML: ' + src);
        try {
          let blob: Blob;
          if (src.startsWith('data:')) {
            blob = dataURLToBlob(src);
          } else {
            const response = await fetch(src);
            blob = await response.blob();
          }
          const extension = blob.type.split('/')[1] || 'jpg';
          const fileName = `pasted-image-${Date.now()}-${index}.${extension}`;
          return new File([blob], fileName, { type: blob.type });
        } catch (err) {
          debug('[Paste Analysis] Error fetching image from src (HTML): ' + src, err);
          return null;
        }
      }));
      const htmlExtractedFiles = fetchedImgFiles.filter(file => file !== null) as File[];
      debug('[Paste Analysis] HTML extraction yielded ' + htmlExtractedFiles.length + ' images.');
      images = images.concat(htmlExtractedFiles);
      debug('[Paste Analysis] Total images after merging from HTML: ' + images.length);
    }

    // Store any pasted images in state for later upload
    if (images.length > 0) {
      setPastedImages(images);
      debug('[Paste Analysis] Pasted images stored:', images.length);
    }

    // Process analysis: parse and populate the form fields
    if (finalContent.length > 0) {
      setAnalysisStep("Analyzing property details...");
      try {
        const { data: result, error: analysisError } = await supabase.functions.invoke('analyze-content', {
          body: { content: finalContent }
        });
        debug('[Paste Analysis] Analysis result:', result);
        if (analysisError) throw analysisError;

        setAnalysisResult(result);

        // Use square_meters directly from the analysis result
        const squareMeters = result.details?.square_meters || "";

        setAnalysisStep("Populating form fields...");
        // Populate manual input fields with parsed analysis result
        setManualInput({
          address: result.address || "",
          price: result.price ? result.price.toString() : "",
          monthlyRent: result.monthly_rent ? result.monthly_rent.toString() : "",
          estimatedExpenses: result.estimated_expenses ? result.estimated_expenses.toString() : "",
          bedrooms: result.details?.bedrooms || "",
          bathrooms: result.details?.bathrooms || "",
          squareMeters: squareMeters,
          description: result.details?.description || ""
        });
        toast({ title: "Property Details Parsed", description: "Review the property details under Manual Input." });
        
        // Switch to the Manual Input tab so the user can see the results
        setActiveTab("manual");
      } catch (error) {
        console.error('Analysis error:', error);
        toast({
          variant: "destructive",
          title: "Analysis Failed",
          description: "Failed to analyze the content. Please try again or enter details manually."
        });
      } finally {
        setIsAnalyzing(false);
        setAnalysisStep("");
      }
      return;
    } else if (images.length > 0) {
      toast({ variant: "destructive", title: "No text found", description: "Only images were found. Please add property details manually." });
      setIsAnalyzing(false);
      setAnalysisStep("");
      return;
    }

    if (!finalContent && images.length === 0) {
      toast({
        variant: "destructive",
        title: "No content found",
        description: "Please copy both text and images from your listing."
      });
      setIsAnalyzing(false);
      setAnalysisStep("");
      return;
    }
  };

  const handleImagePaste = useCallback((e: ClipboardEvent) => {
    if (activeTab === 'manual' && e.clipboardData?.files.length > 0) {
      e.preventDefault();
      const newFiles = Array.from(e.clipboardData.files).filter(file => 
        file.type.startsWith('image/')
      );
      setSelectedFiles(prev => [...prev, ...newFiles]);
      toast({
        title: "Images Added",
        description: `${newFiles.length} image(s) added to the property.`
      });
    }
  }, [activeTab]);

  const removeImage = (index: number) => {
    const totalImages = [...pastedImages, ...selectedFiles];
    const imageToRemove = totalImages[index];
    
    // Check if the image is in pastedImages
    const pastedIndex = pastedImages.indexOf(imageToRemove);
    if (pastedIndex !== -1) {
      setPastedImages(prev => prev.filter((_, i) => i !== pastedIndex));
      return;
    }
    
    // If not in pastedImages, it must be in selectedFiles
    const selectedIndex = selectedFiles.indexOf(imageToRemove);
    if (selectedIndex !== -1) {
      setSelectedFiles(prev => prev.filter((_, i) => i !== selectedIndex));
    }
  };

  useEffect(() => {
    window.addEventListener('paste', handlePasteAnalysis);
    window.addEventListener('paste', handleImagePaste);
    return () => {
      window.removeEventListener('paste', handlePasteAnalysis);
      window.removeEventListener('paste', handleImagePaste);
    };
  }, [handlePasteAnalysis, handleImagePaste]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const price = parseFloat(manualInput.price);
      const monthlyRent = parseFloat(manualInput.monthlyRent) || price * 0.008;
      const estimatedExpenses = parseFloat(manualInput.estimatedExpenses) || monthlyRent * 0.4;
      const annualIncome = (monthlyRent - estimatedExpenses) * 12;
      const roi = ((annualIncome / price) * 100).toFixed(2);
      const squareMeters = Number(manualInput.squareMeters) || null;
      const pricePerMeter = squareMeters ? Math.round(price / squareMeters) : null;

      // Get area statistics for price comparison
      let areaStats = null;
      if (manualInput.address) {
        const { data: analysisData } = await supabase.functions.invoke('analyze-content', {
          body: { content: manualInput.address }
        });
        if (analysisData?.details) {
          areaStats = {
            area_average: analysisData.details.area_average,
            difference_percent: pricePerMeter ? Math.round(((pricePerMeter - analysisData.details.area_average) / analysisData.details.area_average) * 100) : null,
            area_name: analysisData.details.area_name
          };
        }
      }

      const propertyData = {
        address: manualInput.address,
        price: price,
        monthly_rent: monthlyRent,
        estimated_expenses: estimatedExpenses,
        roi: parseFloat(roi),
        details: {
          bedrooms: manualInput.bedrooms,
          bathrooms: manualInput.bathrooms,
          square_meters: squareMeters,
          description: manualInput.description,
          price_per_meter: pricePerMeter,
          ...(areaStats && {
            area_average: areaStats.area_average,
            difference_percent: areaStats.difference_percent,
            area_name: areaStats.area_name
          })
        },
        user_id: user?.id,
        property_url: ""
      };

      // Insert the property record and retrieve the inserted record with its id
      const { data: insertedData, error: saveError } = await supabase
        .from('property_analyses')
        .insert([propertyData])
        .select()
        .single();

      if (saveError) throw saveError;
      const propertyId = insertedData.id;

      // Combine both pasted and selected images for upload
      const allImages = [...pastedImages, ...selectedFiles];

      // If there are any images, upload them and update the property record
      if (allImages.length > 0 && propertyId) {
        const uploadedUrls: string[] = [];
        for (const file of allImages) {
          const fileName = `${propertyId}/${Date.now()}-${file.name}`;
          debug('[Manual Submit] Uploading file:', fileName);
          const { error: uploadError } = await supabase.storage
            .from('property-images')
            .upload(fileName, file, {
              contentType: file.type,
              upsert: false
            });
          if (uploadError) {
            debug('[Manual Submit] Upload error for file:', fileName, uploadError);
            throw uploadError;
          }
          const { data: { publicUrl } } = supabase.storage
            .from('property-images')
            .getPublicUrl(fileName);
          debug('[Manual Submit] Received publicUrl for file:', fileName, publicUrl);
          uploadedUrls.push(publicUrl);
        }
        debug('[Manual Submit] Final uploaded image URLs:', uploadedUrls);

        const { error: updateError } = await supabase
          .from('property_analyses')
          .update({ images: uploadedUrls })
          .eq('id', propertyId);

        if (updateError) {
          debug('[Manual Submit] Error updating property with images:', updateError);
          throw updateError;
        } else {
          debug('[Manual Submit] Successfully updated property with images.');
        }
      }

      toast({
        title: "Success",
        description: "Property added successfully",
      });

      navigate(`/properties/${propertyId}`);
    } catch (error: any) {
      console.error("Error adding property:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add property. Please check your input and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualInputChange = (field: string, value: string) => {
    setManualInput(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
      // Reset the input value so the same file can be selected again
      event.target.value = '';
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Add New Property</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Manual Input</TabsTrigger>
          <TabsTrigger value="paste">Paste from Website</TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle>Manual Property Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualSubmit} className="space-y-4" key="property-form">
                <div className="space-y-2">
                  <Label htmlFor="address">Property Address</Label>
                  <Input
                    id="address"
                    value={manualInput.address}
                    onChange={(e) => handleManualInputChange('address', e.target.value)}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (€)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={manualInput.price}
                      onChange={(e) => handleManualInputChange('price', e.target.value)}
                      required
                    />
                    {manualInput.price && manualInput.squareMeters && (
                      <div className="mt-1 text-sm">
                        <span className="text-muted-foreground">
                          €{Math.round(parseFloat(manualInput.price) / Number(manualInput.squareMeters)).toLocaleString()}/m²
                        </span>
                        {analysisResult?.details?.area_average && (
                          <span className={clsx(
                            "ml-2",
                            analysisResult.details.difference_percent > 0 ? "text-red-500" : "text-green-500"
                          )}>
                            ({analysisResult.details.difference_percent > 0 ? '+' : ''}{analysisResult.details.difference_percent}% vs {analysisResult.details.area_name || 'area'})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="monthlyRent">Monthly Rent (€)</Label>
                    <Input
                      id="monthlyRent"
                      type="number"
                      value={manualInput.monthlyRent}
                      onChange={(e) => handleManualInputChange('monthlyRent', e.target.value)}
                      placeholder="Optional - defaults to 0.8% of price"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bedrooms">Bedrooms</Label>
                    <Input
                      id="bedrooms"
                      type="number"
                      value={manualInput.bedrooms}
                      onChange={(e) => handleManualInputChange('bedrooms', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bathrooms">Bathrooms</Label>
                    <Input
                      id="bathrooms"
                      type="number"
                      value={manualInput.bathrooms}
                      onChange={(e) => handleManualInputChange('bathrooms', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="squareMeters">Area (m²)</Label>
                    <Input
                      id="squareMeters"
                      type="number"
                      value={manualInput.squareMeters}
                      onChange={(e) => handleManualInputChange('squareMeters', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimatedExpenses">Monthly Expenses (€)</Label>
                  <Input
                    id="estimatedExpenses"
                    type="number"
                    value={manualInput.estimatedExpenses}
                    onChange={(e) => handleManualInputChange('estimatedExpenses', e.target.value)}
                    placeholder="Optional - defaults to 40% of rent"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={manualInput.description}
                    onChange={(e) => handleManualInputChange('description', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Images</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[...pastedImages, ...selectedFiles].map((file, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Property image ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg hover:border-primary transition-colors"
                    >
                      <span className="text-sm text-muted-foreground">Upload Images</span>
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    You can also paste images directly (Ctrl/Cmd + V)
                  </p>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? "Adding..." : "Add Property"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/properties")}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paste">
          <Card>
            <CardHeader>
              <CardTitle>Paste Property Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center p-8 border-2 border-dashed rounded-lg">
                  {isAnalyzing ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <div className="space-y-2">
                        <p className="font-medium">Analyzing property details...</p>
                        {analysisStep && (
                          <p className="text-sm text-muted-foreground">{analysisStep}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      Copy content from your property listing and paste it here (Ctrl/Cmd + V)
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NewProperty; 