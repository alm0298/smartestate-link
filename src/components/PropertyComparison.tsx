import React, { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { supabase } from '../lib/supabase';

// New component for property comparison
export const PropertyComparison = () => {
  const { data: properties } = useQuery({
    queryKey: ['properties-comparison'],
    queryFn: async () => {
      const { data } = await supabase
        .from('property_analyses')
        .select('*')
        .order('created_at', { ascending: false });
      return data;
    }
  });

  return (
    <div className="comparison-grid">
      {/* Comparison table implementation */}
    </div>
  );
}; 