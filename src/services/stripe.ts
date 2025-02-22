import { loadStripe } from '@stripe/stripe-js';

export const createSubscription = async (userId: string) => {
  const stripe = await loadStripe(process.env.STRIPE_PUBLIC_KEY);
  
  const { data: session } = await supabase.functions.invoke('create-subscription', {
    body: { userId }
  });

  await stripe.redirectToCheckout({
    sessionId: session.id
  });
}; 