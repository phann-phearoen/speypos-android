import { useState, useEffect } from 'react';
import { Play, User, AlertCircle, RefreshCw } from 'lucide-react';
import { staffApi, shiftApi } from '@/lib/api';
import type { Staff, Shift } from '@/types/pos';

interface ShiftScreenProps {
  onOpenShift: (shift: Shift, staff: Staff) => void;
  isConnected: boolean;
}

export function ShiftScreen({ onOpenShift, isConnected }: ShiftScreenProps) {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingShift, setOpeningShift] = useState(false);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    setLoading(true);
    setError(null);
    
    const result = await staffApi.getStaff();
    
    if (result.error) {
      setError(result.error);
      setStaffList([]);
    } else {
      setStaffList(result.data || []);
    }
    
    setLoading(false);
  };

  const handleOpenShift = async () => {
    if (!selectedStaff) return;
    
    setOpeningShift(true);
    setError(null);
    
    // Backend handles date using store timezone - no date param needed
    const result = await shiftApi.openShift(selectedStaff.id);
    
    if (result.error) {
      setError(result.error);
      setOpeningShift(false);
      return;
    }
    
    onOpenShift(result.data, selectedStaff);
    setOpeningShift(false);
  };

  const handleReload = () => {
    window.location.reload();
  };

  const activeStaff = staffList.filter(s => s.status === 'active');

  // Show backend unavailable state when there's an error and no staff loaded
  const isBackendUnavailable = error && staffList.length === 0 && !loading;

  return (
    <div className="flex-1 flex items-center justify-center bg-background p-8">
      <div className="w-full max-w-lg">
        {/* Backend Unavailable State */}
        {isBackendUnavailable ? (
          <div className="bg-card rounded-xl border border-border p-6 shadow-md">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">
                  Backend Not Available
                </h2>
                <p className="text-muted-foreground text-sm">
                  Unable to connect to the server. Please ensure the backend is running and try again.
                </p>
              </div>
              <button
                onClick={handleReload}
                className="pos-btn gap-2 px-6 py-3 rounded-xl font-medium bg-primary text-primary-foreground"
              >
                <RefreshCw className="w-4 h-4" />
                Reload
              </button>
            </div>
          </div>
        ) : (
          /* Staff Selection */
          <div className="bg-card rounded-xl border border-border p-6 shadow-md">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Select Staff Member
            </h2>

            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : activeStaff.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                <User className="w-10 h-10 text-muted-foreground/50" />
                <p className="text-muted-foreground text-sm">
                  No active staff members found.<br />
                  Please add staff in the admin panel.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {activeStaff.map(staff => (
                  <button
                    key={staff.id}
                    onClick={() => setSelectedStaff(staff)}
                    className={`
                      pos-btn flex-col p-4 gap-1 rounded-xl border-2 transition-all
                      ${selectedStaff?.id === staff.id 
                        ? 'border-accent bg-accent/10 text-accent-foreground' 
                        : 'border-border bg-card hover:bg-muted/50'
                      }
                    `}
                  >
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mb-1">
                      <span className="text-lg font-semibold text-secondary-foreground">
                        {staff.name.charAt(0)}
                      </span>
                    </div>
                    <span className="font-medium">{staff.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{staff.role}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Open Shift Button - only show when has staff */}
            {!loading && activeStaff.length > 0 && (
              <button
                onClick={handleOpenShift}
                disabled={!selectedStaff || openingShift}
                className={`
                  w-full pos-btn gap-3 py-4 rounded-xl font-semibold text-lg
                  ${selectedStaff 
                    ? 'bg-success text-success-foreground shadow-md' 
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }
                `}
              >
                {openingShift ? (
                  <>
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Opening Shift...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Open Shift
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
