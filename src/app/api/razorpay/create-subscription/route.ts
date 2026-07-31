import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(req: Request) {
  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
  });
  try {
    // 1. Verify User Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    
    // Verify token using Firebase REST API (no admin credentials needed)
    const verifyRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token })
    });
    
    const verifyData = await verifyRes.json();
    if (!verifyRes.ok || !verifyData.users || verifyData.users.length === 0) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }
    
    const uid = verifyData.users[0].localId;

    // 2. Parse Request
    const body = await req.json();
    const { planType } = body; // 'pro' or 'enterprise'

    let planId = process.env.NEXT_PUBLIC_PRO_PLAN_ID;
    if (planType === 'enterprise') {
      planId = process.env.NEXT_PUBLIC_ENTERPRISE_PLAN_ID;
    }

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID not configured' }, { status: 400 });
    }

    // 3. Create Subscription in Razorpay
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: 120, // 10 years
      notes: {
        userId: uid,
      },
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      planId: planId,
    });
  } catch (error: any) {
    console.error('Subscription creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
