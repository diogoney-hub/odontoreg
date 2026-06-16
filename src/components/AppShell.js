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
      {/* TopNavBar Otimizada (Single Row Elegante) */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-bright/95 backdrop-blur-sm border-b border-line-border dark:border-outline-variant shadow-sm transition-all">
        <div className="flex items-center justify-between h-16 w-full px-4 sm:px-6 lg:px-8 mx-auto">
          
          {/* Esquerda: Logo */}
          <div className="flex-shrink-0 flex items-center lg:w-[250px]">
            <img alt="OdontoConforme Logo" className="h-8 sm:h-9 w-auto object-contain cursor-pointer" src="/logo.png" onClick={() => router.push('/')} />
          </div>

          {/* Centro: Navegação Horizontal */}
          <div className="flex items-center justify-center gap-2 sm:gap-6 lg:gap-8 h-full">
            <button onClick={() => router.push('/')} className={`flex items-center justify-center transition-all active:scale-95 duration-200 border-b-2 h-full px-2 sm:px-3 ${activeMenu === 'consulta' ? 'text-primary border-primary' : 'text-on-surface-variant hover:text-primary border-transparent'}`}>
              <span className="material-symbols-outlined text-[20px] sm:mr-2">search</span>
              <span className="text-sm font-semibold hidden sm:block">Consultas</span>
            </button>
            <button onClick={() => handleAction(onAlterarCRO, true)} className={`flex items-center justify-center transition-all active:scale-95 duration-200 border-b-2 h-full px-2 sm:px-3 ${activeMenu === 'alterarcro' ? 'text-primary border-primary' : 'text-on-surface-variant hover:text-primary border-transparent'}`}>
              <span className="material-symbols-outlined text-[20px] sm:mr-2">sync</span>
              <span className="text-sm font-semibold hidden sm:block">Alterar CRO</span>
            </button>
            <button onClick={() => router.push('/conta')} className={`flex items-center justify-center transition-all active:scale-95 duration-200 border-b-2 h-full px-2 sm:px-3 ${activeMenu === 'conta' ? 'text-primary border-primary' : 'text-on-surface-variant hover:text-primary border-transparent'}`}>
              <span className="material-symbols-outlined text-[20px] sm:mr-2">person</span>
              <span className="text-sm font-semibold hidden sm:block">Minha Conta</span>
            </button>
          </div>
          
          {/* Direita: E-mail do Usuário */}
          <div className="hidden lg:flex flex-shrink-0 items-center justify-end lg:w-[250px]">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-full border border-line-border/50 shadow-sm">
               <span className="material-symbols-outlined text-[18px] text-on-surface-variant">account_circle</span>
               <span className="text-xs sm:text-sm text-on-surface-variant font-medium truncate max-w-[180px]">{userEmail || 'Usuário'}</span>
            </div>
          </div>
          
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex w-full px-4 sm:px-6 lg:px-8 mx-auto pt-20 sm:pt-24 pb-8">
        <div className="flex-1 flex flex-col relative w-full h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
