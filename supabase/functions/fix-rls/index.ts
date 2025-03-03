// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.land/manual/examples/deploy_node_server

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header is required' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a Supabase client with the user's JWT to verify authentication
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    // First, verify the user is authenticated
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Check if the user is authenticated
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Now create a client with the service role key to execute the SQL
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // SQL to update RLS policies
    const sql = `
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view own properties" ON property_analyses;
    DROP POLICY IF EXISTS "Users can view own or shared properties" ON property_analyses;
    
    -- Create new policy to allow viewing shared properties
    CREATE POLICY "Users can view own or shared properties"
    ON property_analyses
    FOR SELECT
    TO authenticated
    USING (
      auth.uid() = user_id
      OR
      EXISTS (
        SELECT 1 FROM property_shares
        WHERE property_shares.property_id = property_analyses.id
        AND property_shares.user_id = auth.uid()
      )
    );
    
    -- Make sure other policies exist for insert, update, delete
    DROP POLICY IF EXISTS "Users can insert own properties" ON property_analyses;
    CREATE POLICY "Users can insert own properties"
    ON property_analyses
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Users can update own properties" ON property_analyses;
    CREATE POLICY "Users can update own properties"
    ON property_analyses
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Users can delete own properties" ON property_analyses;
    CREATE POLICY "Users can delete own properties"
    ON property_analyses
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
    
    -- Return the policies
    SELECT * FROM pg_policies WHERE tablename = 'property_analyses';
    `;

    // Execute the SQL directly using pg_execute
    const { data, error } = await serviceClient.rpc('pg_execute', { query: sql });

    if (error) {
      // Try alternative method if pg_execute doesn't exist
      try {
        const { data: directData, error: directError } = await serviceClient.rpc('exec_sql', { sql });
        
        if (directError) {
          return new Response(
            JSON.stringify({ 
              error: 'Failed to execute SQL', 
              details: directError,
              message: 'You may need to run the SQL manually in the Supabase dashboard.'
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'RLS policies updated successfully',
            data: directData 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (innerError) {
        return new Response(
          JSON.stringify({ 
            error: 'Failed to execute SQL', 
            details: error,
            innerError,
            sql,
            message: 'You may need to run the SQL manually in the Supabase dashboard.'
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'RLS policies updated successfully',
        data 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        message: 'You may need to run the SQL manually in the Supabase dashboard.'
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}); 