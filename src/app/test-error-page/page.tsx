import { cookies } from 'next/headers';

export default async function TestErrorPage() {
  // This will throw an error in the server component
  const c = await cookies();
  const value = c.get('this-cookie-doesnt-exist');
  // Force an error
  throw new Error('TEST: Server component error for error.tsx verification');
}
