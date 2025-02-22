import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { debug, info, warn, error as loggerError } from '../logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface AreaStats {
  average_price_per_meter: number;
  area_name: string;
}

async function getAreaStats(address: string): Promise<AreaStats> {
  // TODO: Implement real area stats lookup using a real estate API
  // For now, returning mock data
  return {
    average_price_per_meter: 3500,
    area_name: address.split(',').slice(-2)[0]?.trim() || 'Unknown Area'
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content } = await req.json();
    info('[analyze-content] Received content to analyze:', content.substring(0, 100) + '...');

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      loggerError('[analyze-content] OpenAI API key not configured');
      throw new Error('OpenAI API key not configured');
    }

    info('[analyze-content] Starting content analysis with OpenAI');
    
    // Call OpenAI API to analyze the content
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{
          role: "system",
          content: `You are a real estate data extraction expert. Your task is to extract specific property information from listing text and return it in a structured format.
        
          Important rules for area extraction:
          1. Identify explicit area measurements in the text.
          2. Prioritize the **main living/usable area** if multiple area values are provided.
          3. Give preference to terms indicating living space, in this order:
             - "Private Gross Area"
             - "Living Area"
             - "Usable Area"
             - "Gross Area"
             - "Built Area"
             - "Floor Space"
             - "Total Area"
             - "Construction Area"
             - "Deployment Area"
          4. Ignore **land size** or **lot size** if mentioned separately.
          5. For numerical values:
             - Extract only the numbers (no units).
             - If the area is given in m² or square meters, use that value directly.
             - If the area is in square feet, convert to m² using: **1 sq ft = 0.092903 m²**.
             - If multiple valid areas exist and no clear distinction is provided, pick the **largest** value under 500 m².
          6. Prices should always be in euros (€):
             - If the price is in dollars ($), convert to euros using the exchange rate **1 USD = 0.92 EUR**.
          7. If any value is missing or not found, return \`null\` instead of omitting the key.
          8. Return **ONLY** a valid JSON object with no extra text.
          9. All numerical values must be numbers, not strings.`
        }, {
          role: "user",
          content: `Extract the following information from this property listing text and return it as a JSON object with these exact keys:
          {
            "address": "full property address as string",
            "price": number (in euros),
            "bedrooms": number or null,
            "bathrooms": number or null,
            "square_meters": number (main living/usable area in m²),
            "description": "brief description highlighting key features"
          }

          Text to analyze:
          ${content}`
        }],
        temperature: 0.1
      }),
    });

    info('[analyze-content] Received response from OpenAI');

    if (!response.ok) {
      const errorData = await response.text();
      loggerError('[analyze-content] OpenAI API error:', errorData);
      throw new Error('Failed to analyze content with AI: ' + errorData);
    }

    const aiResponse = await response.json();
    debug('[analyze-content] OpenAI response:', JSON.stringify(aiResponse));

    let extractedData;
    try {
      // Get the content from the OpenAI response
      const content = aiResponse.choices[0].message.content;
      
      // Remove markdown code blocks if present
      const jsonString = content.replace(/```json\s*|\s*```/g, '').trim();
      
      debug('[analyze-content] Cleaned JSON string:', jsonString);
      
      // Parse the cleaned JSON string
      extractedData = JSON.parse(jsonString);
      debug('[analyze-content] Parsed extracted data:', extractedData);
    } catch (parseError) {
      loggerError('[analyze-content] Failed to parse OpenAI response:', parseError);
      loggerError('[analyze-content] Raw content:', aiResponse.choices[0].message.content);
      throw new Error('Failed to parse AI response');
    }

    // Process the extracted data
    const price = Math.round(parseFloat(extractedData.price) || 0);
    const squareMeters = Math.round(parseFloat(extractedData.square_meters) || 0);
    const pricePerMeter = squareMeters > 0 ? Math.round(price / squareMeters) : 0;
    
    // Get area statistics
    const areaStats = await getAreaStats(extractedData.address || '');
    const priceDiffPercent = pricePerMeter > 0 
      ? Math.round(((pricePerMeter - areaStats.average_price_per_meter) / areaStats.average_price_per_meter) * 100)
      : 0;

    const monthlyRent = Math.round(price * 0.008); // Estimated monthly rent at 0.8% of property value
    const estimatedExpenses = Math.round(monthlyRent * 0.4); // Estimated expenses at 40% of rent
    const annualIncome = (monthlyRent - estimatedExpenses) * 12;
    const roi = ((annualIncome / price) * 100).toFixed(2);

    const analysisResult = {
      address: extractedData.address || "Address not found",
      price: price,
      monthly_rent: monthlyRent,
      estimated_expenses: estimatedExpenses,
      roi: parseFloat(roi),
      details: {
        bedrooms: extractedData.bedrooms?.toString() || null,
        bathrooms: extractedData.bathrooms?.toString() || null,
        square_meters: extractedData.square_meters?.toString() || null,
        description: extractedData.description || "No description available",
        price_per_meter: pricePerMeter,
        area_average: areaStats.average_price_per_meter,
        difference_percent: priceDiffPercent,
        area_name: areaStats.area_name
      }
    };

    info('[analyze-content] Final analysis result:', analysisResult);

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    loggerError('[analyze-content] Error in analyze-content function:', error);
    loggerError('[analyze-content] Error stack:', error.stack);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 