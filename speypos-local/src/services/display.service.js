const SESSION_TIMEOUT_MS = 60000; // 60 seconds

let displaySession = {
  state: 'IDLE',
  updated_at: Date.now(),
};

/**
 * Updates the in-memory display session with the provided data.
 * @param {object} data - The new session data from the client.
 */
export async function updateDisplaySession(data) {
  displaySession = {
    ...data,
    updated_at: Date.now(),
  };
}

/**
 * Retrieves the current display session, handling auto-expiry.
 * If the session is older than SESSION_TIMEOUT_MS, it returns an IDLE state.
 * @returns {Promise<object>} The current display session data.
 */
export async function getCurrentDisplaySession() {
  // Auto-expire to IDLE if no updates for 60 seconds
  if (Date.now() - displaySession.updated_at > SESSION_TIMEOUT_MS) {
    return { state: 'IDLE' };
  }
  
  // Return current session without updated_at (internal field)
  const { updated_at, ...sessionData } = displaySession;
  return sessionData;
}