const Razorpay = require('razorpay');

const instance = new Razorpay({
  key_id: 'rzp_test_TKHImgbQ7afleT',
  key_secret: 'tbVKeivZJbOq208neER18qqP',
});

async function setupPlans() {
  try {
    console.log('Creating Pro Plan...');
    const proPlan = await instance.plans.create({
      period: 'monthly',
      interval: 1,
      item: {
        name: 'Waitless Pro - Monthly',
        amount: 250000, // 2500 INR in paise
        currency: 'INR',
        description: 'Unlimited tokens and up to 5 branches'
      },
      notes: {
        internal_name: 'pro_monthly'
      }
    });
    console.log('✅ Pro Plan created:', proPlan.id);

    console.log('Creating Enterprise Plan...');
    const entPlan = await instance.plans.create({
      period: 'monthly',
      interval: 1,
      item: {
        name: 'Waitless Enterprise - Monthly',
        amount: 1000000, // 10000 INR in paise
        currency: 'INR',
        description: 'Unlimited tokens, unlimited branches, custom features'
      },
      notes: {
        internal_name: 'enterprise_monthly'
      }
    });
    console.log('✅ Enterprise Plan created:', entPlan.id);

    console.log('\n--- Save these IDs in your .env.local ---');
    console.log(`NEXT_PUBLIC_RAZORPAY_PRO_PLAN_ID=${proPlan.id}`);
    console.log(`NEXT_PUBLIC_RAZORPAY_ENT_PLAN_ID=${entPlan.id}`);

  } catch (error) {
    console.error('Error creating plans:', error);
  }
}

setupPlans();
