/**
 * System Interaction Manager
 * Prevents biometric lock from triggering when user interacts with system UI (camera/gallery)
 */

let isInteractingWithSystem = false;

/**
 * Set system interaction state
 * Call this BEFORE opening camera/gallery to prevent unwanted biometric lock
 */
export const setSystemInteraction = (interacting: boolean) => {
  isInteractingWithSystem = interacting;
  console.log('[SystemInteraction]', interacting ? 'Started' : 'Ended');
};

/**
 * Check if currently interacting with system UI
 */
export const isSystemInteracting = (): boolean => {
  return isInteractingWithSystem;
};
