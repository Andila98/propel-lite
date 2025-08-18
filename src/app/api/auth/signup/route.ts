
import { type NextRequest, NextResponse } from 'next/server';
import { isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { authService } from '@/services/auth-service';
import { z } from 'zod';

const signupSchema = z.object({
  idToken: z.string(),
});

/**
 * Handles the final step of the user signup process for landlords.
 * Delegates the core logic to the AuthService.
 */
export async function POST(req: NextRequest) {
  if (!isFirebaseAdminInitialized) {
    return NextResponse.json({ error: 'Firebase not configured.' }, { status: 500 });
  }
  
  try {
    const body = await req.json();
    
    const validationResult = signupSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    
    const { idToken } = validationResult.data;

    const userId = await authService.provisionUser(idToken);

    console.log(`[API_SIGNUP] Signup successful for UID: ${userId}`);
    
    return NextResponse.json(
      { message: 'Landlord account provisioned successfully. Please log in.', userId },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('[API_SIGNUP_ERROR]', {
        message: error.message,
        code: error.code,
    });
  
    const status = error.code?.includes('auth/') ? 401 : 500;
    const message = error.message || 'An internal server error occurred during signup provisioning.';

    return NextResponse.json({ error: message }, { status });
  }
}
