import React, { useState } from "react";
import { appPlans } from "../assets/assets";
import Footer from "../components/Footer";
import { authClient } from "../lib/auth-client";
import { toast } from "sonner";
import api from "../configs/axios";

interface Plan {
  id: string;
  name: string;
  price: string;
  credits: number;
  description: string;
  features: string[];
}

// Declare Razorpay for TypeScript
declare global {
  interface Window {
    Razorpay: any;
  }
}

const Pricing = () => {
  const { data: session } = authClient.useSession();
  const [loading, setLoading] = useState<string | null>(null);
  const [plans] = React.useState<Plan[]>(appPlans);

  // Function to load Razorpay script dynamically
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

 

const handlePurchase = async (planId: string) => {
  try {
      if (!session?.user) {
          toast.error('Please login to purchase credits');
          return;
      }

      setLoading(planId);

      // Create order
      const { data } = await api.post('/api/user/purchase-credits', { planId });
      
      if (!data.success) {
          throw new Error('Failed to create order');
      }

      // Load Razorpay script
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
          toast.error('Failed to load payment gateway');
          return;
      }

      const options = {
          key: data.keyId,
          amount: data.amount,
          currency: data.currency,
          name: 'AI Site Builder',
          description: `Purchase ${data.credits} credits`,
          order_id: data.orderId,
          handler: async (response: any) => {
              try {
                  // ✅ यह URL सही है - /api/user/verify-payment
                  const verifyResponse = await api.post('/api/user/verify-payment', {
                      razorpay_order_id: response.razorpay_order_id,
                      razorpay_payment_id: response.razorpay_payment_id,
                      razorpay_signature: response.razorpay_signature,
                      transactionId: data.transactionId
                  });

                  if (verifyResponse.data.success) {
                      toast.success(`Successfully added ${data.credits} credits!`);
                      setTimeout(() => {
                          window.location.reload();
                      }, 1500);
                  } else {
                      toast.error('Payment verification failed');
                  }
              } catch (error: any) {
                  console.error('Verification error:', error);
                  toast.error(error?.response?.data?.message || 'Payment verification failed');
              }
          },
          modal: {
              ondismiss: function() {
                  setLoading(null);
                  toast.info('Payment cancelled');
              }
          }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
      
  } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(error?.response?.data?.message || 'Failed to process payment');
  } finally {
      setLoading(null);
  }
};

  return (
    <>
      <div className="w-full max-w-5xl mx-auto z-20 max-md:px-4 min-h-[80vh]">
        <div className="text-center mt-16">
          <h2 className="text-gray-100 text-3xl font-medium">Choose Your Plan</h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto mt-2">
            Start for free and scale up as you grow. Find the perfect plan for your content creation needs.
          </p>
        </div>
        
        <div className='pt-14 py-4 px-4'>
          <div className='grid grid-cols-1 md:grid-cols-3 flex-wrap gap-4'>
            {plans.map((plan, idx) => (
              <div 
                key={idx} 
                className="p-6 bg-black/20 ring ring-indigo-950 mx-auto w-full max-w-sm rounded-lg text-white shadow-lg hover:ring-indigo-500 transition-all duration-400"
              >
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <div className="my-2">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-gray-300"> / {plan.credits} credits</span>
                </div>

                <p className="text-gray-300 mb-6">{plan.description}</p>

                <ul className="space-y-1.5 mb-6 text-sm">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center">
                      <svg 
                        className="h-5 w-5 text-indigo-300 mr-2" 
                        xmlns="http://www.w3.org/2000/svg" 
                        fill="none" 
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-400">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <button 
                  onClick={() => handlePurchase(plan.id)} 
                  disabled={loading === plan.id}
                  className="w-full py-2 px-4 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-sm rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  {loading === plan.id ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    'Buy Now'
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
        
        <p className="mx-auto text-center text-sm max-w-md mt-10 text-white/60 font-light">
          Project <span className="text-white">Creation / Revision</span> consume 
          <span className="text-white"> 5 credits</span>. You can purchase more credits to create more projects.
        </p>
      </div>
      <Footer />
    </>
  );
};

export default Pricing;