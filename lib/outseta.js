const OUTSETA_API_KEY = process.env.OUTSETA_API_KEY || '';
const OUTSETA_DOMAIN = process.env.OUTSETA_DOMAIN || 'placeholder.outseta.com';

// Base64 encode API key for Basic Auth
const authHeader = OUTSETA_API_KEY 
  ? `Basic ${Buffer.from(OUTSETA_API_KEY + ':').toString('base64')}`
  : '';

// Create account in Outseta
export async function createOutsetaAccount({ firstName, lastName, email, password, phone }) {
  if (!OUTSETA_API_KEY) {
    throw new Error('Outseta API key not configured');
  }
  
  try {
    const response = await fetch(`https://${OUTSETA_DOMAIN}/api/v1/crm/people`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        Email: email,
        FirstName: firstName,
        LastName: lastName,
        PhoneMobile: phone || '',
        Password: password,
        Account: {
          Name: `${firstName} ${lastName}`,
        }
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.Message || 'Failed to create account');
    }

    return await response.json();
  } catch (error) {
    console.error('Outseta signup error:', error);
    throw error;
  }
}

// Rest of the functions with same pattern...
export async function loginOutseta({ email, password }) {
  if (!OUTSETA_DOMAIN) {
    throw new Error('Outseta domain not configured');
  }
  
  try {
    const response = await fetch(`https://${OUTSETA_DOMAIN}/api/v1/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: email,
        password: password,
      }),
    });

    if (!response.ok) {
      throw new Error('Invalid email or password');
    }

    return await response.json();
  } catch (error) {
    console.error('Outseta login error:', error);
    throw error;
  }
}

export async function getUserSubscription(personUid) {
  if (!OUTSETA_API_KEY) return null;
  
  try {
    const response = await fetch(
      `https://${OUTSETA_DOMAIN}/api/v1/billing/subscriptions?Person.Uid=${personUid}`,
      {
        headers: {
          'Authorization': authHeader,
        },
      }
    );

    if (!response.ok) return null;
    const data = await response.json();
    return data.items?.[0] || null;
  } catch (error) {
    console.error('Get subscription error:', error);
    return null;
  }
}

export async function getPersonDetails(personUid) {
  if (!OUTSETA_API_KEY) {
    throw new Error('Outseta API key not configured');
  }
  
  try {
    const response = await fetch(
      `https://${OUTSETA_DOMAIN}/api/v1/crm/people/${personUid}`,
      {
        headers: {
          'Authorization': authHeader,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get person details');
    }

    return await response.json();
  } catch (error) {
    console.error('Get person error:', error);
    throw error;
  }
}

export function hasToolAccess(planUid) {
  const PRO_PLAN = process.env.OUTSETA_PRO_PLAN_UID;
  const FOUNDER_PLAN = process.env.OUTSETA_FOUNDER_PLAN_UID;
  return planUid === PRO_PLAN || planUid === FOUNDER_PLAN;
}

export function getPlanName(planUid) {
  const plans = {
    [process.env.OUTSETA_FREE_PLAN_UID]: 'Free',
    [process.env.OUTSETA_STANDARD_PLAN_UID]: 'Standard',
    [process.env.OUTSETA_PRO_PLAN_UID]: 'Pro',
    [process.env.OUTSETA_FOUNDER_PLAN_UID]: 'Founder',
  };
  return plans[planUid] || 'Unknown';
}