'use client';

import { ProfilePhotoModal } from '@/components/profile/ProfilePhotoModal';
import { Camera } from 'lucide-react';

export function PhotoUploadExamples() {
  return (
    <div className="space-y-8 p-6 bg-slate-900 text-white">
      <h2 className="text-2xl font-bold mb-6">Ejemplos de Integración - Subida de Fotos</h2>
      
      {/* Example 1: Default Button */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-blue-400">1. Botón predeterminado</h3>
        <p className="text-slate-300 text-sm">Uso básico con el botón predeterminado del modal.</p>
        <ProfilePhotoModal
          studentId="123"
          currentPhotoUrl=""
          onSuccess={(newUrl) => console.log('Foto actualizada:', newUrl)}
        />
      </div>

      {/* Example 2: Custom Trigger with User Avatar */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-blue-400">2. Avatar con botón de cámara</h3>
        <p className="text-slate-300 text-sm">Avatar circular con botón de cámara que aparece al hacer hover.</p>
        <div className="relative group w-16 h-16">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
            JD
          </div>
          <ProfilePhotoModal
            studentId="123"
            currentPhotoUrl=""
            onSuccess={(newUrl) => console.log('Foto actualizada:', newUrl)}
            customTrigger={
              <button
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                title="Cambiar foto de perfil"
              >
                <Camera className="w-3 h-3" />
              </button>
            }
          />
        </div>
      </div>

      {/* Example 3: List Item with Photo */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-blue-400">3. Lista de estudiantes con fotos</h3>
        <p className="text-slate-300 text-sm">Ejemplo de cómo integrar en listas de estudiantes.</p>
        <div className="space-y-2">
          {[
            { id: '1', name: 'Juan David', avatar: null },
            { id: '2', name: 'María García', avatar: 'https://via.placeholder.com/40' },
            { id: '3', name: 'Carlos López', avatar: null }
          ].map((student) => (
            <div key={student.id} className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
              <div className="relative group">
                {student.avatar ? (
                  <img
                    src={student.avatar}
                    alt={`Foto de ${student.name}`}
                    className="w-10 h-10 rounded-full object-cover border-2 border-slate-600"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                    {student.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </div>
                )}
                <ProfilePhotoModal
                  studentId={student.id}
                  currentPhotoUrl={student.avatar || undefined}
                  onSuccess={(newUrl) => console.log(`Foto actualizada para ${student.name}:`, newUrl)}
                  customTrigger={
                    <button
                      className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center text-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Cambiar foto"
                    >
                      <Camera className="w-2 h-2" />
                    </button>
                  }
                />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">{student.name}</h4>
                <p className="text-sm text-slate-400">ID: {student.id}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Example 4: Profile Card */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-blue-400">4. Tarjeta de perfil</h3>
        <p className="text-slate-300 text-sm">Integración en una tarjeta de perfil completa.</p>
        <div className="bg-slate-800 rounded-xl p-6 max-w-sm">
          <div className="flex flex-col items-center text-center">
            <div className="relative group mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-2xl">
                AL
              </div>
              <ProfilePhotoModal
                studentId="456"
                currentPhotoUrl=""
                onSuccess={(newUrl) => console.log('Foto de perfil actualizada:', newUrl)}
                customTrigger={
                  <button
                    className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Cambiar foto de perfil"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                }
              />
            </div>
            <h3 className="text-xl font-bold mb-1">Ana López</h3>
            <p className="text-slate-400 mb-2">Estudiante de Salsa</p>
            <div className="text-sm text-slate-300">
              <p>📧 ana.lopez@email.com</p>
              <p>📱 +57 300 123 4567</p>
            </div>
          </div>
        </div>
      </div>

      {/* Example 5: Settings Page Style */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-blue-400">5. Estilo página de configuración</h3>
        <p className="text-slate-300 text-sm">Botón independiente para cambiar foto como en configuraciones.</p>
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-lg">
              PR
            </div>
            <div className="flex-1">
              <h4 className="font-medium mb-1">Pedro Ramírez</h4>
              <p className="text-sm text-slate-400 mb-2">Última actualización: Hace 2 días</p>
              <ProfilePhotoModal
                studentId="789"
                currentPhotoUrl=""
                onSuccess={(newUrl) => console.log('Foto actualizada:', newUrl)}
                triggerText="Cambiar Foto de Perfil"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
