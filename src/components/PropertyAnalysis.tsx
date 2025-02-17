
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, TrendingUp, MapPin, Home } from "lucide-react";
import { useState } from "react";

export const PropertyAnalysis = () => {
  const [url, setUrl] = useState("");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Card className="p-6 backdrop-blur-lg bg-white/50">
        <div className="space-y-4">
          <h2 className="text-2xl font-display font-bold text-gray-900">Analyze Property</h2>
          <p className="text-gray-600">
            Paste a property listing URL to automatically extract and analyze the details.
          </p>
          <div className="flex space-x-2">
            <Input
              placeholder="Enter property listing URL..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
            />
            <Button className="bg-primary hover:bg-primary/90">
              <Search className="h-4 w-4 mr-2" />
              Analyze
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <Card className="p-4 bg-white/80 hover:shadow-lg transition-all duration-300">
              <TrendingUp className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-display font-semibold">Market Analysis</h3>
              <p className="text-sm text-gray-600">Get instant market insights and trends</p>
            </Card>
            <Card className="p-4 bg-white/80 hover:shadow-lg transition-all duration-300">
              <MapPin className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-display font-semibold">Location Score</h3>
              <p className="text-sm text-gray-600">View neighborhood ratings and amenities</p>
            </Card>
            <Card className="p-4 bg-white/80 hover:shadow-lg transition-all duration-300">
              <Home className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-display font-semibold">Property Details</h3>
              <p className="text-sm text-gray-600">Auto-extract listing information</p>
            </Card>
          </div>
        </div>
      </Card>
    </div>
  );
};
