
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
        formats: ['html'],
        // Define XPath or CSS selectors for property data
        queries: [
          { name: 'price', selector: 'span[data-testid="price"], .price, .listing-price' },
          { name: 'address', selector: 'h1[data-testid="address"], .address, .listing-address' },
          { name: 'description', selector: '.description, .listing-description' },
          { name: 'bedrooms', selector: '.beds, .bedrooms' },
          { name: 'bathrooms', selector: '.baths, .bathrooms' },
          { name: 'squareFeet', selector: '.sqft, .square-feet' }
        ]
      }
    });

    if (!result.success) {
      throw new Error('Failed to scrape property data');
    }

    console.log('Scraping result:', result);

    // Process the scraped data
    const scrapedData = result.data[0];
    let price = 0;
    
    // Extract price from the queries results
    const priceData = scrapedData.queries?.find(q => q.name === 'price')?.value;
    if (priceData) {
      const priceMatch = priceData.match(/[\d,]+/);
      if (priceMatch) {
        price = parseInt(priceMatch[0].replace(/,/g, ''));
      }
    }

    // Extract other data from queries
    const address = scrapedData.queries?.find(q => q.name === 'address')?.value || 'Address not found';
    const description = scrapedData.queries?.find(q => q.name === 'description')?.value;
    const bedrooms = scrapedData.queries?.find(q => q.name === 'bedrooms')?.value;
    const bathrooms = scrapedData.queries?.find(q => q.name === 'bathrooms')?.value;
    const squareFeet = scrapedData.queries?.find(q => q.name === 'squareFeet')?.value;

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
