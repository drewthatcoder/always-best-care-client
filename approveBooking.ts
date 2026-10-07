import { supabase } from './supabase';

/** Moves a pending booking to approved. Does not charge the card on file. */
export async function approveBookingStatus(bookingId: string): Promise<void> {
  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'approved' } as any)
    .eq('id', bookingId)
    .eq('status', 'pending_client')
    .select('id');

  if (error) {
    throw new Error(error.message || 'Could not approve shift');
  }
  if (!data || data.length !== 1) {
    throw new Error('Could not approve shift');
  }
}
