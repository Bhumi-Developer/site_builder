// import {Request, Response} from 'express'
// import Stripe from 'stripe';
// import prisma from '../lib/prisma.js';

// export const stripeWebhook = async(request: Request, response: Response)=>{

//     const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)
//     const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string

//     if (endpointSecret) {
//         // Get the signature sent by Stripe
//         const signature = request.headers['stripe-signature'] as string;
//         let event;
//       try {
//         event = stripe.webhooks.constructEvent(
//           request.body,
//           signature,
//           endpointSecret
//         );
//       } catch (err: any) {
//         console.log(`⚠️ Webhook signature verification failed.`, err.message);
//         return response.sendStatus(400);
//       }
  
//     // Handle the event
//     switch (event.type) {
//       case 'payment_intent.succeeded':
//         const paymentIntent = event.data.object;
//        const sessionList = await stripe.checkout.sessions.list({
//         payment_intent: paymentIntent.id
//        })
//        const session = sessionList.data[0]
//        const {transactionId, appId} = session.metadata as {transactionId : string; appId : string}

//        if(appId === 'ai-site-builder' && transactionId){
//         const transaction = await prisma.transaction.update({
//             where: {id: transactionId},
//             data: {isPaid: true}
//         })
       

//        await prisma.user.update({
//         where: {id: transaction.userId},
//         data: {credits: {increment: transaction.credits}}
//        })
//     }
//         break;
     
//       default:
//         console.log(`Unhandled event type ${event.type}`);
//     }
  
//     // Return a response to acknowledge receipt of the event
//     response.json({received: true});
//   };
  
// }


import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';

export const razorpayWebhook = async (request: Request, response: Response) => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET as string;
    
    // Get the signature sent by Razorpay
    const razorpaySignature = request.headers['x-razorpay-signature'] as string;
    
    if (!webhookSecret) {
        console.log('⚠️ Webhook secret not configured');
        return response.sendStatus(500);
    }

    // Verify webhook signature
    const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(request.body))
        .digest('hex');

    if (razorpaySignature !== expectedSignature) {
        console.log('⚠️ Webhook signature verification failed');
        return response.sendStatus(400);
    }

    const { event, payload } = request.body;

    // Handle the event
    switch (event) {
        case 'payment.captured':
            const payment = payload.payment.entity;
            const { order_id, id: paymentId, notes } = payment;
            
            const { transactionId, appId } = notes as { transactionId: string; appId: string };

            if (appId === 'ai-site-builder' && transactionId) {
                try {
                    // Check if transaction already processed
                    const existingTransaction = await prisma.transaction.findUnique({
                        where: { id: transactionId }
                    });

                    if (!existingTransaction) {
                        console.log(`⚠️ Transaction not found: ${transactionId}`);
                        return response.sendStatus(404);
                    }

                    if (existingTransaction.isPaid) {
                        console.log(`⚠️ Transaction already processed: ${transactionId}`);
                        return response.json({ received: true, alreadyProcessed: true });
                    }

                    // Update transaction as paid
                    const transaction = await prisma.transaction.update({
                        where: { id: transactionId },
                        data: {
                            isPaid: true,
                            // Add these fields if you added them to your schema
                            // razorpayOrderId: order_id,
                            // razorpayPaymentId: paymentId
                        }
                    });

                    // Add credits to user
                    await prisma.user.update({
                        where: { id: transaction.userId },
                        data: {
                            credits: { increment: transaction.credits }
                        }
                    });

                    console.log(`✅ Payment processed successfully for transaction: ${transactionId}`);
                } catch (error) {
                    console.error('Error processing webhook:', error);
                    return response.sendStatus(500);
                }
            }
            break;

        case 'payment.failed':
            const failedPayment = payload.payment.entity;
            console.log(`❌ Payment failed for order: ${failedPayment.order_id}`);
            // Optionally update transaction status to failed
            break;

        case 'refund.created':
            const refund = payload.refund.entity;
            console.log(`💰 Refund created for payment: ${refund.payment_id}`);
            // Handle refund logic if needed
            break;

        default:
            console.log(`Unhandled event type ${event}`);
    }

    // Return a response to acknowledge receipt of the event
    response.json({ received: true });
};
