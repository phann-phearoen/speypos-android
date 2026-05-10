import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { shiftApi, staffApi } from '@/lib/api';
import type { Shift, Staff } from '@/types/pos';

const SHIFT_STORAGE_KEY = 'speypos_active_shift';

interface StoredShiftData {
  shiftId: string;
  staffId: string;
  openedAt: number;
}

interface DetectActiveShiftResult {
  shift: Shift;
  staff: Staff;
  orphaned: Shift[];
}

interface ShiftContextType {
  currentShift: Shift | null;
  currentStaff: Staff | null;
  isLoading: boolean;
  error: string | null;
  orphanedShifts: Shift[];
  openShift: (shift: Shift, staff: Staff) => void;
  closeShift: () => Promise<void>;
  validateShift: () => Promise<boolean>;
  detectActiveShift: () => Promise<DetectActiveShiftResult | null>;
  clearOrphanedShifts: () => void;
}

const ShiftContext = createContext<ShiftContextType | null>(null);

export function ShiftProvider({ children }: { children: ReactNode }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [orphanedShifts, setOrphanedShifts] = useState<Shift[]>([]);
  
  // Extract shiftId from URL
  const shiftId = searchParams.get('shiftId');
  
  // Initialize loading state based on whether we have a shiftId but no cached data
  const [isLoading, setIsLoading] = useState(() => !!shiftId);
  
  // Track if we've already fetched for this shiftId to avoid duplicate fetches
  const fetchedShiftIdRef = useRef<string | null>(null);

  // Fetch and validate shift from backend when shiftId is in URL
  const validateShift = useCallback(async (): Promise<boolean> => {
    if (!shiftId) {
      setIsLoading(false);
      return false;
    }

    setIsLoading(true);
    setError(null);

    const result = await shiftApi.getShift(shiftId);

    if (result.error || !result.data) {
      setError(result.error || 'Shift not found');
      setCurrentShift(null);
      setCurrentStaff(null);
      // Clear localStorage if stored shift is invalid
      localStorage.removeItem(SHIFT_STORAGE_KEY);
      setIsLoading(false);
      return false;
    }

    const shift = result.data;

    // Check if shift is closed
    if (shift.status === 'closed') {
      setError('Shift has been closed');
      setCurrentShift(null);
      setCurrentStaff(null);
      // Clear localStorage if stored shift is closed
      localStorage.removeItem(SHIFT_STORAGE_KEY);
      setIsLoading(false);
      return false;
    }

    // Fetch staff info
    const staffResult = await staffApi.getStaffMember(shift.staff_id);
    if (staffResult.data) {
      setCurrentStaff(staffResult.data);
    }

    setCurrentShift(shift);
    setIsLoading(false);
    return true;
  }, [shiftId]);

  // Fetch shift data on mount and when shiftId changes
  useEffect(() => {
    const isShiftPage = location.pathname === '/pos/shift';
    
    // Skip if on shift page or no shiftId
    if (isShiftPage || !shiftId) {
      setIsLoading(false);
      return;
    }
    
    // Skip if we already fetched this shift and have the data
    if (fetchedShiftIdRef.current === shiftId && currentShift?.id === shiftId) {
      setIsLoading(false);
      return;
    }
    
    // Fetch shift data
    fetchedShiftIdRef.current = shiftId;
    validateShift().then((isValid) => {
      if (!isValid) {
        navigate('/pos/shift', { replace: true });
      }
    });
  }, [shiftId, location.pathname, validateShift, navigate, currentShift]);

  const openShift = useCallback((shift: Shift, staff: Staff) => {
    setCurrentShift(shift);
    setCurrentStaff(staff);
    setError(null);
    
    // Persist to localStorage for resilience across page reloads
    const storedData: StoredShiftData = {
      shiftId: shift.id,
      staffId: staff.id,
      openedAt: Date.now(),
    };
    localStorage.setItem(SHIFT_STORAGE_KEY, JSON.stringify(storedData));
  }, []);

  const closeShift = useCallback(async () => {
    if (currentShift) {
      await shiftApi.closeShift(currentShift.id);
    }
    setCurrentShift(null);
    setCurrentStaff(null);
    setOrphanedShifts([]);
    // Clear localStorage when closing shift
    localStorage.removeItem(SHIFT_STORAGE_KEY);
    navigate('/pos/shift', { replace: true });
  }, [currentShift, navigate]);

  const clearOrphanedShifts = useCallback(() => {
    setOrphanedShifts([]);
  }, []);

  // Detect active shift - checks localStorage first, then fetches ALL open shifts
  const detectActiveShift = useCallback(async (): Promise<DetectActiveShiftResult | null> => {
    // First, check localStorage for a stored shift
    try {
      const stored = localStorage.getItem(SHIFT_STORAGE_KEY);
      if (stored) {
        const storedData: StoredShiftData = JSON.parse(stored);
        
        // Validate the stored shift is still open
        const result = await shiftApi.getShift(storedData.shiftId);
        if (result.data && result.data.status === 'open') {
          const staffResult = await staffApi.getStaffMember(result.data.staff_id);
          if (staffResult.data) {
            // Also check for any other open shifts (orphaned)
            const allOpenResult = await shiftApi.getOpenShifts();
            const orphaned = allOpenResult.data?.filter((s: Shift) => s.id !== storedData.shiftId) || [];
            
            return { 
              shift: result.data, 
              staff: staffResult.data,
              orphaned 
            };
          }
        }
        
        // Stored shift is no longer valid, clear it
        localStorage.removeItem(SHIFT_STORAGE_KEY);
      }
    } catch {
      // Invalid stored data, clear it
      localStorage.removeItem(SHIFT_STORAGE_KEY);
    }
    
    // Fallback: fetch ALL open shifts from backend
    const shiftsResult = await shiftApi.getOpenShifts();
    
    if (shiftsResult.error || !shiftsResult.data || shiftsResult.data.length === 0) {
      return null;
    }
    
    const openShifts = shiftsResult.data;
    
    // Get the most recent open shift (latest started_at)
    const activeShift = openShifts.reduce((latest: Shift, current: Shift) => 
      current.started_at > latest.started_at ? current : latest
    );
    
    // Track orphaned shifts (all except the most recent)
    const orphaned = openShifts.filter((s: Shift) => s.id !== activeShift.id);
    
    // Fetch associated staff
    const staffResult = await staffApi.getStaffMember(activeShift.staff_id);
    
    if (staffResult.error || !staffResult.data) {
      return null;
    }
    
    // Store the active shift in localStorage for future reloads
    const storedData: StoredShiftData = {
      shiftId: activeShift.id,
      staffId: staffResult.data.id,
      openedAt: Date.now(),
    };
    localStorage.setItem(SHIFT_STORAGE_KEY, JSON.stringify(storedData));
    
    return { shift: activeShift, staff: staffResult.data, orphaned };
  }, []);

  return (
    <ShiftContext.Provider
      value={{
        currentShift,
        currentStaff,
        isLoading,
        error,
        orphanedShifts,
        openShift,
        closeShift,
        validateShift,
        detectActiveShift,
        clearOrphanedShifts,
      }}
    >
      {children}
    </ShiftContext.Provider>
  );
}

export function useShift() {
  const context = useContext(ShiftContext);
  if (!context) {
    throw new Error('useShift must be used within a ShiftProvider');
  }
  return context;
}
