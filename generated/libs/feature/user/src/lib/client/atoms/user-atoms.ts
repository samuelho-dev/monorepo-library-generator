import { Atom } from "@effect-atom/atom";

/**
 * User Client State
 *
 * Uses @effect-atom/atom for React state management.
Client-side only state - NO server dependencies.
 *
 * @module @myorg/feature-user/client/atoms
 */

export interface UserState {
  isLoading: boolean;
  data: unknown | null;
  error: string | null;
}

/**
 * Main state atom for user
 */
export const userAtom = Atom.make<UserState>({
  isLoading: false,
  data: null,
  error: null,
});
