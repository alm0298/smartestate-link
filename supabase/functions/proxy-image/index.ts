// @deno-types="https://deno.land/std@0.168.0/http/server.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Simple logger implementation to avoid dependency issues
const logger = {
  debug: (...args: any[]) => console.debug('[DEBUG]', ...args),
  info: (...args: any[]) => console.info('[INFO]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args)
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    // Support both POST with JSON body and GET with query params
    let imageUrl = '';
    
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        imageUrl = body.imageUrl || '';
        logger.info(`[proxy-image] POST request for image: ${imageUrl.substring(0, 100)}...`);
      } catch (parseError) {
        logger.error(`[proxy-image] Error parsing JSON body: ${parseError.message}`);
        return new Response(
          JSON.stringify({ error: `Invalid JSON body: ${parseError.message}` }),
          { 
            status: 400, 
            headers: { 
              ...corsHeaders,
              'Content-Type': 'application/json' 
            } 
          }
        );
      }
    } else if (req.method === 'GET') {
      const url = new URL(req.url);
      imageUrl = url.searchParams.get('url') || '';
      logger.info(`[proxy-image] GET request for image: ${imageUrl.substring(0, 100)}...`);
    }
    
    if (!imageUrl) {
      logger.error('[proxy-image] Missing imageUrl parameter');
      return new Response(
        JSON.stringify({ error: 'Missing imageUrl parameter' }),
        { 
          status: 400, 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    try {
      // Fetch the image with custom headers to mimic a browser
      logger.info(`[proxy-image] Fetching image from: ${imageUrl.substring(0, 100)}...`);
      
      const imageResponse = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': new URL(imageUrl).origin
        }
      });
      
      if (!imageResponse.ok) {
        const errorStatus = imageResponse.status;
        const errorText = await imageResponse.text();
        logger.error(`[proxy-image] Failed to fetch image: ${errorStatus} - ${errorText.substring(0, 100)}`);
        
        return new Response(
          JSON.stringify({ 
            error: `Failed to fetch image: ${errorStatus}`,
            details: errorText.substring(0, 200)
          }),
          { 
            status: 502, 
            headers: { 
              ...corsHeaders,
              'Content-Type': 'application/json' 
            } 
          }
        );
      }

      // Get the image data and content type
      const imageData = await imageResponse.arrayBuffer();
      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
      
      logger.info(`[proxy-image] Successfully fetched image (${imageData.byteLength} bytes, type: ${contentType})`);

      // Return the image with appropriate headers
      return new Response(imageData, {
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400'
        }
      });
    } catch (fetchError) {
      logger.error(`[proxy-image] Error fetching image: ${fetchError.message}`);
      return new Response(
        JSON.stringify({ 
          error: `Failed to fetch image: ${fetchError.message}`,
          url: imageUrl
        }),
        { 
          status: 500, 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }
  } catch (error) {
    logger.error(`[proxy-image] Server error: ${error.message}`);
    return new Response(
      JSON.stringify({ error: `Server error: ${error.message}` }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
}); 