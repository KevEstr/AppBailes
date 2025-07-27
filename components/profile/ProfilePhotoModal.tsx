'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';
import { ProfilePhotoUpload } from './ProfilePhotoUpload';

interface ProfilePhotoModalProps {
  studentId: string;
  currentPhotoUrl?: string;
  onSuccess?: (newPhotoUrl: string) => void;
  triggerText?: string | React.ReactNode;
  customTrigger?: React.ReactNode;
}

export function ProfilePhotoModal({ 
  studentId, 
  currentPhotoUrl, 
  onSuccess,
  triggerText = "Cambiar Foto",
  customTrigger
}: ProfilePhotoModalProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = (newPhotoUrl: string) => {
    onSuccess?.(newPhotoUrl);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {customTrigger || (
          <Button
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <Camera className="w-4 h-4 mr-2" />
            {triggerText}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">
            Cambiar Foto de Perfil
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[80vh] overflow-y-auto">
          <ProfilePhotoUpload
            studentId={studentId}
            currentPhotoUrl={currentPhotoUrl}
            onSuccess={handleSuccess}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
