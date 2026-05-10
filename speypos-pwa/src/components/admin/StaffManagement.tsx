import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { staffApi } from '@/lib/api';
import type { Staff } from '@/types/pos';
import { ImageUpload } from './ImageUpload';
import { useTranslation } from '@/lib/i18n';

interface StaffFormData {
  name: string;
  password: string;
  role: 'admin' | 'staff';
  status: 'active' | 'inactive';
  image_url: string;
}

const initialFormData: StaffFormData = {
  name: '',
  password: '',
  role: 'staff',
  status: 'active',
  image_url: '',
};

export function StaffManagement() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState<StaffFormData>(initialFormData);

  const fetchStaff = async () => {
    setIsLoading(true);
    const response = await staffApi.getStaff();
    if (response.data) {
      setStaffList(response.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const openCreateForm = () => {
    setEditingStaff(null);
    setFormData(initialFormData);
    setIsFormOpen(true);
  };

  const openEditForm = (staff: Staff) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name,
      password: '',
      role: staff.role,
      status: staff.status,
      image_url: (staff as any).image_url || '',
    });
    setIsFormOpen(true);
  };

  const openDeleteDialog = (staff: Staff) => {
    setDeletingStaff(staff);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: t('toast.error'), description: t('validation.nameRequired'), variant: 'destructive' });
      return;
    }
    if (!editingStaff && !formData.password.trim()) {
      toast({ title: t('toast.error'), description: t('validation.passwordRequired'), variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingStaff) {
        const updateData: any = {
          name: formData.name.trim(),
          role: formData.role,
          status: formData.status,
          image_url: formData.image_url || null,
        };
        if (formData.password.trim()) {
          updateData.password = formData.password.trim();
        }
        const response = await staffApi.updateStaff(editingStaff.id, updateData);
        if (response.error) throw new Error(response.error);
        toast({ title: t('toast.success'), description: t('toast.staffUpdated') });
      } else {
        const response = await staffApi.createStaff({
          name: formData.name.trim(),
          password: formData.password.trim(),
          role: formData.role,
          status: formData.status,
          image_url: formData.image_url || undefined,
        } as any);
        if (response.error) throw new Error(response.error);
        toast({ title: t('toast.success'), description: t('toast.staffCreated') });
      }
      
      setIsFormOpen(false);
      fetchStaff();
    } catch (error) {
      toast({ title: t('toast.error'), description: t('toast.failedToSave'), variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingStaff) return;

    setIsSubmitting(true);
    try {
      const response = await staffApi.deleteStaff(deletingStaff.id);
      if (response.error) throw new Error(response.error);
      toast({ title: t('toast.success'), description: t('toast.staffDeleted') });
      setIsDeleteOpen(false);
      fetchStaff();
    } catch (error) {
      toast({ title: t('toast.error'), description: t('toast.failedToDelete'), variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('admin.staff.title')}</h1>
          <p className="text-muted-foreground">{t('admin.staff.description')}</p>
        </div>
        <Button onClick={openCreateForm} className="gap-2">
          <Plus className="w-4 h-4" />
          {t('admin.staff.add')}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('admin.staff.name')}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('admin.staff.role')}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('admin.staff.status')}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">{t('admin.menuItems.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {staffList.map((staff) => (
                <tr key={staff.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{staff.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      staff.role === 'admin'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {staff.role === 'admin' ? t('admin.staff.roleAdmin') : t('admin.staff.roleStaff')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-sm ${
                      staff.status === 'active' ? 'text-success' : 'text-muted-foreground'
                    }`}>
                      {staff.status === 'active' ? (
                        <UserCheck className="w-4 h-4" />
                      ) : (
                        <UserX className="w-4 h-4" />
                      )}
                      {staff.status === 'active' ? t('admin.staff.statusActive') : t('admin.staff.statusInactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditForm(staff)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(staff)} className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {staffList.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    {t('admin.staff.noStaff')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingStaff ? t('admin.staff.edit') : t('admin.staff.addTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('admin.staff.name')}</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('admin.staff.enterName')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('admin.staff.password')} {editingStaff && <span className="text-muted-foreground font-normal">{t('admin.staff.passwordHint')}</span>}
              </label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingStaff ? t('admin.staff.enterNewPassword') : t('admin.staff.enterPassword')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('admin.staff.role')}</label>
              <Select value={formData.role} onValueChange={(value: 'admin' | 'staff') => setFormData({ ...formData, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">{t('admin.staff.roleStaff')}</SelectItem>
                  <SelectItem value="admin">{t('admin.staff.roleAdmin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('admin.staff.status')}</label>
              <Select value={formData.status} onValueChange={(value: 'active' | 'inactive') => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('admin.staff.statusActive')}</SelectItem>
                  <SelectItem value="inactive">{t('admin.staff.statusInactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ImageUpload
              type="staff"
              value={formData.image_url}
              onChange={(url) => setFormData({ ...formData, image_url: url })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingStaff ? t('common.update') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('admin.staff.delete')}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            {t('admin.staff.deleteConfirm')} <span className="font-medium text-foreground">{deletingStaff?.name}</span>? {t('admin.staff.deleteWarning')}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
