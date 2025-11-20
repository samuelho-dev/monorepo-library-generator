import { Atom } from "@effect-atom/atom";

/**
 * Payment Client State
 *
 * Uses @effect-atom/atom for React state management.
Client-side only state - NO server dependencies.
 *
 * @module @custom-repo/feature-payment/client/atoms
 */


export interface PaymentState {
  isLoading: boolean;
  data: unknown | null;
  error: string | null;
}


/**
 * Main state atom for payment
 */
export const paymentAtom = Atom.make<PaymentState>({
  isLoading: false,
  data: null,
  error: null,
});

// TODO: Add more atoms as needed

// Example:

// // export const paymentFiltersAtom = Atom.make<FilterState>({...});

