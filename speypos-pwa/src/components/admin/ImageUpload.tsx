import { useState, useRef } from 'react';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { uploadApi, resolveImageUrl } from '@/lib/api';

interface ImageUploadProps {
  type: 'menu' | 'category' | 'staff';
  value: string;
  onChange: (url: string) => void;
}

export function ImageUpload({ type, value, onChange }: ImageUploadProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Please select an image file', variant: 'destructive' });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Image must be less than 5MB', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const response = await uploadApi.upload(type, file);
      if (response.error) throw new Error(response.error);
      if (response.data?.url) {
        onChange(response.data.url);
        toast({ title: 'Success', description: 'Image uploaded' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to upload image', variant: 'destructive' });
    } finally {
      setIsUploading(false);
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    // Extract filename from URL if it's a relative path
    if (value && value.startsWith('/media/')) {
      const parts = value.split('/');
      const filename = parts[parts.length - 1];
      try {
        await uploadApi.deleteImage(type, filename);
      } catch {
        // Ignore delete errors, just remove from form
      }
    }
    onChange('');
  };

  const resolvedUrl = resolveImageUrl(value);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Image</label>
      
      {resolvedUrl ? (
        <div className="relative group">
          <div className="aspect-video bg-muted rounded-lg overflow-hidden border border-border">
            <img 
              src={resolvedUrl} 
              alt="Preview" 
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '';
              }}
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleRemove}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div
          className="aspect-video bg-muted/50 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? (
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          ) : (
            <>
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Click to upload</span>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={isUploading}
      />

      {value && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Upload className="w-4 h-4 mr-2" />
          Replace Image
        </Button>
      )}
    </div>
  );
}
