/**
 * Unified feedback utility for Haptics and Audio.
 * Triggers both native vibrations and synthetic digital beeps.
 */

const getBridge = () => (window as any).SpeyposNativeBridge;

export const triggerImpact = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  const bridge = getBridge();

  // Trigger Haptics
  if (bridge?.vibrateImpact) {
    bridge.vibrateImpact(type);
  }

  // Trigger Sound
  if (bridge?.playSound) {
    // Map impact types to sound profiles
    const soundType = type === 'light' ? 'click' : 'tick';
    bridge.playSound(soundType);
  }

  if (!bridge) {
    console.debug(`[Feedback Fallback] Impact: ${type}`);
  }
};

export const triggerNotification = (type: 'success' | 'warning' | 'error') => {
  const bridge = getBridge();

  // Trigger Haptics
  if (bridge?.vibrateNotification) {
    bridge.vibrateNotification(type);
  }

  // Trigger Sound
  if (bridge?.playSound) {
    bridge.playSound(type);
  }

  if (!bridge) {
    console.debug(`[Feedback Fallback] Notification: ${type}`);
  }
};

export const triggerSuccess = () => triggerNotification('success');
export const triggerWarning = () => triggerNotification('warning');
export const triggerError = () => triggerNotification('error');
