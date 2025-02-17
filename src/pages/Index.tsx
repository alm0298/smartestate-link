
import { Navigation } from "@/components/Navigation";
import { PropertyAnalysis } from "@/components/PropertyAnalysis";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navigation />
      
      {/* Hero Section */}
      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-display font-bold text-gray-900 mb-6 animate-float">
            Smart Real Estate Investment Analysis
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Transform property listings into comprehensive investment opportunities with AI-powered insights.
          </p>
          <Button className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg rounded-lg">
            Start Analyzing
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Property Analysis Section */}
      <PropertyAnalysis />
      
      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              title: "Instant Property Analysis",
              description: "Get detailed insights about any property in seconds."
            },
            {
              title: "Market Data Integration",
              description: "Access real-time market data and trends for informed decisions."
            },
            {
              title: "Client Collaboration",
              description: "Share opportunities and collaborate with investors seamlessly."
            },
            {
              title: "Advanced Analytics",
              description: "Leverage AI to predict property value and potential ROI."
            },
            {
              title: "Custom Reports",
              description: "Generate professional investment reports for your clients."
            },
            {
              title: "Smart Notifications",
              description: "Stay updated with real-time alerts and updates."
            }
          ].map((feature, index) => (
            <div
              key={index}
              className="p-6 rounded-lg bg-white/50 backdrop-blur-sm border border-gray-200 hover:shadow-lg transition-all duration-300"
            >
              <h3 className="font-display font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
