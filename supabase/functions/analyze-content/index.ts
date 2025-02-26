// @deno-types="https://deno.land/std@0.168.0/http/server.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { debug, info, warn, error as loggerError } from '../logger.ts';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface AreaStats {
  average_price_per_meter: number;
  area_name: string;
  data_source?: string;
  last_updated?: string;
  trend_percentage?: number;
}

interface CachedAreaStats extends AreaStats {
  cached_at: string;
  cache_valid_until: string;
}

async function extractLocationDetails(address: string): Promise<{ municipality: string; district: string; region: string }> {
  try {
    // Extract location details using OpenAI
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      loggerError('[analyze-content] OpenAI API key not configured for location extraction');
      // Return default values if no API key
      return {
        municipality: address.split(',')[0]?.trim() || 'Unknown',
        district: address.split(',')[1]?.trim() || 'Unknown',
        region: 'Portugal'
      };
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o", // Updated to gpt-4o which is more reliable
        messages: [{
          role: "system",
          content: "You are a location data extraction expert for Portuguese addresses. Extract the municipality (concelho), district, and region from Portuguese addresses. Return ONLY a JSON object with these three fields, no other text."
        }, {
          role: "user",
          content: `Extract municipality, district, and region from this address: "${address}". Return as JSON: { "municipality": "", "district": "", "region": "" }`
        }],
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      loggerError('[analyze-content] OpenAI API error:', errorText);
      throw new Error('Failed to extract location details: ' + errorText);
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      loggerError('[analyze-content] Unexpected OpenAI response format:', data);
      throw new Error('Unexpected OpenAI response format');
    }
    
    try {
      return JSON.parse(data.choices[0].message.content);
    } catch (parseError) {
      loggerError('[analyze-content] Failed to parse OpenAI response:', parseError);
      loggerError('[analyze-content] Raw content:', data.choices[0].message.content);
      throw new Error('Failed to parse location data from AI response');
    }
  } catch (error) {
    loggerError('[analyze-content] Error in extractLocationDetails:', error);
    // Return default values on error
    return {
      municipality: address.split(',')[0]?.trim() || 'Unknown',
      district: address.split(',')[1]?.trim() || 'Unknown',
      region: 'Portugal'
    };
  }
}

async function fetchINEPortugalData(municipality: string): Promise<{ price: number | null; trend: number | null }> {
  try {
    // INE Portugal API endpoint for real estate statistics
    // Note: This is a placeholder URL - we'd need to use the actual INE Portugal API endpoint
    const ineUrl = `https://www.ine.pt/xportal/xmain?xpid=INE&xpgid=ine_indicadores&indOcorrCod=0009492&contexto=bd&selTab=tab2`;
    const response = await fetch(ineUrl);
    const data = await response.json();
    
    // For now, using the national average as a baseline
    return {
      price: 1644, // Latest national average from Q1 2024
      trend: 5.0   // Latest YoY growth rate
    };
  } catch (error) {
    console.error('Error fetching INE Portugal data:', error);
    return { price: null, trend: null };
  }
}

async function fetchPordataStats(municipality: string): Promise<number | null> {
  try {
    // Pordata API endpoint
    // Note: This is a placeholder - we'd need to use the actual Pordata API
    const pordataUrl = `https://www.pordata.pt/api/municipalities/${encodeURIComponent(municipality)}/housing`;
    const response = await fetch(pordataUrl);
    const data = await response.json();
    
    return data?.average_price || null;
  } catch (error) {
    console.error('Error fetching Pordata stats:', error);
    return null;
  }
}

async function getCachedStats(area_name: string): Promise<CachedAreaStats | null> {
  const { data, error } = await supabase
    .from('area_statistics')
    .select('*')
    .eq('area_name', area_name)
    .single();

  if (error || !data) return null;

  // Check if cache is still valid (7 days)
  const cacheValidUntil = new Date(data.cache_valid_until);
  if (cacheValidUntil < new Date()) return null;

  return data as CachedAreaStats;
}

async function getAreaStats(address: string): Promise<AreaStats> {
  try {
    // Extract location details
    const location = await extractLocationDetails(address);
    const areaName = `${location.municipality}, ${location.district}`;

    // Check cache first
    const cachedStats = await getCachedStats(areaName);
    if (cachedStats) {
      return {
        average_price_per_meter: cachedStats.average_price_per_meter,
        area_name: cachedStats.area_name,
        data_source: cachedStats.data_source,
        last_updated: cachedStats.last_updated,
        trend_percentage: cachedStats.trend_percentage
      };
    }

    // Fetch data from multiple sources
    const [ineData, pordataPrice] = await Promise.all([
      fetchINEPortugalData(location.municipality),
      fetchPordataStats(location.municipality)
    ]);

    // Calculate weighted average (giving more weight to INE data if available)
    let averagePrice = 1644; // National average as fallback
    let trendPercentage = 5.0; // National trend as fallback
    let dataSource = 'national average';
    
    if (ineData.price && pordataPrice) {
      // If we have both sources, use a weighted average
      averagePrice = (ineData.price * 0.7 + pordataPrice * 0.3);
      trendPercentage = ineData.trend || 5.0;
      dataSource = 'INE+Pordata';
    } else if (ineData.price) {
      averagePrice = ineData.price;
      trendPercentage = ineData.trend || 5.0;
      dataSource = 'INE';
    } else if (pordataPrice) {
      averagePrice = pordataPrice;
      dataSource = 'Pordata';
    }

    // Apply regional adjustments based on known market patterns
    // These adjustments should be refined based on actual data
    if (location.region.toLowerCase().includes('lisboa')) {
      averagePrice *= 1.4; // Lisbon area premium
    } else if (location.region.toLowerCase().includes('porto')) {
      averagePrice *= 1.2; // Porto area premium
    } else if (location.region.toLowerCase().includes('algarve')) {
      averagePrice *= 1.3; // Algarve premium
    }

    // Cache the results
    const now = new Date();
    const cacheValidUntil = new Date(now.setDate(now.getDate() + 7)); // Cache for 7 days

    const statsToCache = {
      area_name: areaName,
      average_price_per_meter: averagePrice,
      data_source: dataSource,
      last_updated: new Date().toISOString(),
      cached_at: new Date().toISOString(),
      cache_valid_until: cacheValidUntil.toISOString(),
      trend_percentage: trendPercentage
    };

    // Store in cache
    const { error: cacheError } = await supabase
      .from('area_statistics')
      .upsert(statsToCache);

    if (cacheError) {
      console.error('Error caching stats:', cacheError);
    }

    return {
      average_price_per_meter: averagePrice,
      area_name: areaName,
      data_source: dataSource,
      last_updated: new Date().toISOString(),
      trend_percentage: trendPercentage
    };
  } catch (error) {
    console.error('Error in getAreaStats:', error);
    // Return national average as fallback
    return {
      average_price_per_meter: 1644, // Latest national average
      area_name: address.split(',').slice(-2)[0]?.trim() || 'Unknown Area',
      data_source: 'national average (fallback)',
      last_updated: new Date().toISOString(),
      trend_percentage: 5.0
    };
  }
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
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured',
        details: 'Please configure the OPENAI_API_KEY environment variable'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    info('[analyze-content] Starting content analysis with OpenAI');
    
    // Call OpenAI API to analyze the content
    let response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
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
    } catch (fetchError) {
      loggerError('[analyze-content] OpenAI API fetch error:', fetchError);
      return new Response(JSON.stringify({ 
        error: 'Failed to connect to OpenAI API',
        details: fetchError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    info('[analyze-content] Received response from OpenAI');

    if (!response.ok) {
      const errorData = await response.text();
      loggerError('[analyze-content] OpenAI API error:', errorData);
      return new Response(JSON.stringify({ 
        error: 'Failed to analyze content with AI',
        details: errorData,
        status: response.status
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      loggerError('[analyze-content] Raw content:', aiResponse.choices?.[0]?.message?.content || 'No content available');
      return new Response(JSON.stringify({ 
        error: 'Failed to parse AI response',
        details: parseError.message,
        raw_content: aiResponse.choices?.[0]?.message?.content || null
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process the extracted data
    try {
      const price = Math.round(parseFloat(extractedData.price) || 0);
      const squareMeters = Math.round(parseFloat(extractedData.square_meters) || 0);
      const pricePerMeter = squareMeters > 0 ? Math.round(price / squareMeters) : 0;
      
      // Get area statistics
      const areaStats = await getAreaStats(extractedData.address || '');
      const priceDiffPercent = pricePerMeter > 0 
        ? Math.round(((pricePerMeter - areaStats.average_price_per_meter) / areaStats.average_price_per_meter) * 100)
        : 0;

      // Use variable rent yield based on property price and area statistics
      // Higher-priced properties typically have lower yield percentages
      let rentYieldPercentage = 0.008; // Default 0.8%
      
      // Adjust yield based on price range
      if (price > 500000) {
        rentYieldPercentage = 0.006; // 0.6% for luxury properties
      } else if (price > 300000) {
        rentYieldPercentage = 0.007; // 0.7% for mid-high properties
      } else if (price < 100000) {
        rentYieldPercentage = 0.009; // 0.9% for lower-priced properties
      }
      
      // Further adjust based on area price comparison
      if (priceDiffPercent > 10) {
        // Property is overpriced compared to area, expect lower yield
        rentYieldPercentage -= 0.0005;
      } else if (priceDiffPercent < -10) {
        // Property is underpriced compared to area, expect higher yield
        rentYieldPercentage += 0.0005;
      }
      
      // Calculate monthly rent with the variable yield
      const monthlyRent = Math.round(price * rentYieldPercentage);
      
      // Variable expenses based on property characteristics
      let expensePercentage = 0.4; // Default 40%
      
      // Adjust expenses based on property age (using a heuristic from the description)
      const description = extractedData.description?.toLowerCase() || '';
      if (description.includes('new') || description.includes('renovated') || description.includes('modern')) {
        expensePercentage = 0.35; // Lower expenses for newer properties
      } else if (description.includes('old') || description.includes('needs work') || description.includes('fixer')) {
        expensePercentage = 0.45; // Higher expenses for older properties
      }
      
      const estimatedExpenses = Math.round(monthlyRent * expensePercentage);
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
          area_name: areaStats.area_name,
          rent_yield_percentage: (rentYieldPercentage * 100).toFixed(1) + "%",
          expense_percentage: (expensePercentage * 100).toFixed(1) + "%"
        }
      };

      info('[analyze-content] Final analysis result:', analysisResult);

      return new Response(JSON.stringify(analysisResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (processError) {
      loggerError('[analyze-content] Error processing extracted data:', processError);
      return new Response(JSON.stringify({ 
        error: 'Failed to process extracted data',
        details: processError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
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