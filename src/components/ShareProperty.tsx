import { useMutation } from 'react-query';
import { supabase } from '../lib/supabase';

// New component for sharing properties
export const ShareProperty = ({ propertyId }) => {
  const { mutate: shareProperty } = useMutation({
    mutationFn: async ({ clientIds }) => {
      const { data, error } = await supabase
        .from('property_shares')
        .insert(
          clientIds.map(clientId => ({
            property_id: propertyId,
            user_id: clientId
          }))
        );

      if (error) throw error;
      return data;
    }
  });
}; 