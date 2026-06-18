"use client";

import { useRouter } from 'next/navigation';

export default function AppShell({ 
  children, 
  activeMenu = 'consulta', 
  userEmail = '', 
  onAlterarCRO, 
  onExportar,
  selectedCRO = '',
  statusAssinatura = 'trial',
  planoAtual = ''
}) {
  const router = useRouter();

  const handleAction = (action, isHomeAction) => {
    if (isHomeAction && typeof action === 'function') {
      action();
    } else {
      router.push('/?alterarcro=true');
    }
  };

  const renderPlanBadge = () => {
    const isTrial = statusAssinatura === 'trial';
    const isExpirado = statusAssinatura === 'expirado';
    const isPagante = statusAssinatura === 'ativo';
    const isCompleto = planoAtual === 'completo';
    const isEssencial = planoAtual === 'essencial';

    if (isPagante && isCompleto) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#005f3e] text-white uppercase tracking-wide mt-1 font-inter">
          COMPLETO
        </span>
      );
    }

    if (isPagante && isEssencial) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#e4f2ea] text-black border border-[#d8e3dc] uppercase tracking-wide mt-1 font-inter">
          ESSENCIAL
        </span>
      );
    }

    if (isTrial) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#e2e2e2] text-[#dc2626] uppercase tracking-wide mt-1 font-inter">
          TRIAL
        </span>
      );
    }

    if (isExpirado) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#dc2626] text-white uppercase tracking-wide mt-1 font-inter">
          EXPIRADO
        </span>
      );
    }

    // Cancelado ou outros fallbacks
    if (statusAssinatura === 'cancelado') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#e2e2e2] text-gray-600 uppercase tracking-wide mt-1 font-inter">
          CANCELADO
        </span>
      );
    }

    if (statusAssinatura === 'pagamento_pendente') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 uppercase tracking-wide mt-1 font-inter">
          PENDENTE
        </span>
      );
    }

    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#e2e2e2] text-[#dc2626] uppercase tracking-wide mt-1 font-inter">
        TRIAL
      </span>
    );
  };

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col">
      {/* TopNavBar Otimizada */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#d8e3dc] shadow-sm h-16 flex items-center">
        <div className="flex items-center justify-between w-full h-full px-4 sm:px-6 lg:px-8 mx-auto">
          
          {/* Esquerda: Logo (70% da altura da seção) */}
          <div className="flex items-center h-full flex-shrink-0">
            <img 
              alt="OdontoConforme Logo" 
              className="h-[44px] w-auto object-contain cursor-pointer" 
              src="/logo.png" 
              onClick={() => router.push('/')} 
            />
          </div>

          {/* Centro: Navegação + CRO */}
          <div className="flex items-center gap-1 sm:gap-3 h-full">
            {/* Botão de Consulta */}
            <button 
              onClick={() => router.push('/')} 
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeMenu === 'consulta' 
                  ? 'bg-[#eef5f1] text-[#005f3e] border border-[#d8e3dc]' 
                  : 'bg-transparent text-[#54615b] hover:text-[#005f3e] border border-transparent'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">search</span>
              <span className="hidden sm:inline">Consultas</span>
            </button>

            {/* Botão Exportar */}
            {onExportar && (
              <button 
                onClick={onExportar} 
                className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm font-semibold transition-all duration-200 bg-transparent text-[#54615b] hover:text-[#005f3e] border border-transparent`}
              >
                <span className="material-symbols-outlined text-[20px]">download</span>
                <span className="hidden sm:inline">Exportar</span>
              </button>
            )}

            {/* Botão Minha Conta */}
            <button 
              onClick={() => router.push('/conta')} 
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeMenu === 'conta' 
                  ? 'bg-[#eef5f1] text-[#005f3e] border border-[#d8e3dc]' 
                  : 'bg-transparent text-[#54615b] hover:text-[#005f3e] border border-transparent'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">person</span>
              <span className="hidden sm:inline">Minha Conta</span>
            </button>

            {/* Divisória vertical | */}
            <div className="h-5 w-[1px] bg-gray-300 mx-2"></div>

            {/* CRO e link Trocar */}
            {selectedCRO && (
              <div className="flex items-center gap-1 text-sm font-bold text-gray-800 whitespace-nowrap">
                <span>CRO-{selectedCRO}</span>
                <button 
                  onClick={() => handleAction(onAlterarCRO, true)}
                  className="text-[#005f3e] hover:text-[#00472e] hover:underline font-bold cursor-pointer text-sm ml-1"
                >
                  Trocar
                </button>
              </div>
            )}
          </div>
          
          {/* Direita: E-mail do Usuário + Plano (Alinhados à direita) */}
          <div className="flex flex-col items-end justify-center text-right flex-shrink-0">
            <span className="text-sm font-semibold text-gray-900 leading-tight">
              {userEmail || 'Usuário'}
            </span>
            {renderPlanBadge()}
          </div>
          
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex w-full px-4 sm:px-6 lg:px-8 mx-auto pt-[72px] sm:pt-20 pb-8">
        <div className="flex-1 flex flex-col relative w-full h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
