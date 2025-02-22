import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import FirecrawlApp from "npm:@mendable/firecrawl-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');

    if (!apiKey) {
      throw new Error('Firecrawl API key not configured');
    }

    console.log('Starting property analysis for URL:', url);
    
    const firecrawl = new FirecrawlApp({ apiKey });
    const result = await firecrawl.crawlUrl(url, {
      limit: 1,
      scrapeOptions: {
        formats: ['markdown'],
        includeImages: true,
        additionalSelectors: {
          images: 'img.property-image',
          amenities: '.amenities-list',
          location: '.property-location'
        }
      }
    });

    if (!result.success) {
      throw new Error('Failed to scrape property data');
    }

    console.log('Raw scraping result:', result);

    // Process the scraped data
    const scrapedData = result.data[0];
    let price = 0;
    let description = '';
    let address = 'Address not found';
    let bedrooms = '';
    let bathrooms = '';
    let squareFeet = '';

    // Try to extract information from the scraped content
    if (scrapedData.content) {
      // Look for price patterns like $XXX,XXX or $X,XXX,XXX
      const priceMatch = scrapedData.content.match(/\$[0-9]{1,3}(?:,?[0-9]{3})*(?:\.[0-9]{2})?/);
      if (priceMatch) {
        price = parseInt(priceMatch[0].replace(/[$,]/g, ''));
      }

      // Look for bedroom counts
      const bedroomMatch = scrapedData.content.match(/(\d+)\s*(?:bed|bedroom|br)/i);
      if (bedroomMatch) {
        bedrooms = bedroomMatch[1];
      }

      // Look for bathroom counts
      const bathroomMatch = scrapedData.content.match(/(\d+(?:\.\d+)?)\s*(?:bath|bathroom|ba)/i);
      if (bathroomMatch) {
        bathrooms = bathroomMatch[1];
      }

      // Look for square footage
      const sqftMatch = scrapedData.content.match(/(\d+(?:,\d+)?)\s*(?:sq\.?\s*ft\.?|sqft|square\s*feet)/i);
      if (sqftMatch) {
        squareFeet = sqftMatch[1].replace(',', '');
      }

      // Extract description (first 500 characters)
      description = scrapedData.content.slice(0, 500);

      // Try to find address pattern
      const addressMatch = scrapedData.content.match(/\d+\s+[A-Za-z0-9\s,\.]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Circle|Cir|Court|Ct|Place|Pl|Way)[,\s]+[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}/i);
      if (addressMatch) {
        address = addressMatch[0];
      }
    }

    // Calculate estimated values
    const monthlyRent = Math.round(price * 0.008); // Estimate monthly rent as 0.8% of purchase price
    const estimatedExpenses = Math.round(monthlyRent * 0.4); // Estimate expenses as 40% of rent
    const annualIncome = (monthlyRent - estimatedExpenses) * 12;
    const roi = ((annualIncome / price) * 100).toFixed(2);

    const analysisResult = {
      property_url: url,
      address,
      price,
      monthly_rent: monthlyRent,
      estimated_expenses: estimatedExpenses,
      roi: parseFloat(roi),
      details: {
        bedrooms,
        bathrooms,
        square_feet: squareFeet,
        description
      }
    };

    console.log('Analysis result:', analysisResult);

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error analyzing property:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
