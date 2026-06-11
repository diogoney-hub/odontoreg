"use client";

import { useRouter } from 'next/navigation';

export default function AppShell({ 
  children, 
  activeMenu = 'consulta', 
  userEmail = '', 
  onAlterarCRO, 
  onExportar 
}) {
  const router = useRouter();

  const handleAction = (action, isHomeAction) => {
    if (isHomeAction && typeof action === 'function') {
      action();
    } else {
      router.push('/');
    }
  };

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col">
      {/* TopNavBar do Stitch (Sem Glassmorphism para performance) */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-bright border-b border-line-border dark:border-outline-variant shadow-sm">
        <div className="flex flex-col w-full px-4 sm:px-6 lg:px-8 mx-auto">
          {/* Row 1: Logo Centered */}
          <div className="flex justify-center items-center py-3 border-b border-line-border/50">
            <img alt="OdontoConforme Logo" className="h-8 w-auto object-contain" src="/logo.png" style={{height: '48px'}} />
          </div>
          {/* Row 2: Nav Buttons Centered + Email Right */}
          <div className="relative flex items-center justify-center py-1 overflow-x-auto custom-scrollbar">
            <div className="flex items-center gap-4 sm:gap-6 h-full min-w-max px-2">
              <button onClick={() => router.push('/')} className={`flex flex-col items-center justify-center h-full px-2 transition-all active:scale-95 duration-200 border-b-2 py-2 ${activeMenu === 'consulta' ? 'text-primary border-primary' : 'text-on-surface-variant hover:text-primary border-transparent'}`}>
                <span className="material-symbols-outlined">search</span>
                <span className="text-label-caps font-semibold mt-1">Consultas</span>
              </button>
              <button onClick={() => handleAction(onAlterarCRO, true)} className={`flex flex-col items-center justify-center h-full px-2 transition-all active:scale-95 duration-200 border-b-2 py-2 ${activeMenu === 'alterarcro' ? 'text-primary border-primary' : 'text-on-surface-variant hover:text-primary border-transparent'}`}>
                <span className="material-symbols-outlined">sync</span>
                <span className="text-label-caps font-semibold mt-1">Alterar CRO</span>
              </button>
              <button onClick={() => router.push('/conta')} className={`flex flex-col items-center justify-center h-full px-2 transition-all active:scale-95 duration-200 border-b-2 py-2 ${activeMenu === 'conta' ? 'text-primary border-primary' : 'text-on-surface-variant hover:text-primary border-transparent'}`}>
                <span className="material-symbols-outlined">person</span>
                <span className="text-label-caps font-semibold mt-1">Minha Conta</span>
              </button>
            </div>
            
            <div className="hidden sm:flex absolute right-0 items-center pl-4 border-l border-line-border h-8">
              <span className="text-body-sm text-on-surface-variant font-medium truncate max-w-[200px]">{userEmail || 'Usuário'}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area (Fluid Container without Sidebar) */}
      <main className="flex-1 flex w-full px-4 sm:px-6 lg:px-8 mx-auto pt-[120px] pb-8">
        <div className="flex-1 flex flex-col relative w-full h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
