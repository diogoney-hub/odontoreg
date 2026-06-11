"use client"
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import AppShell from '../../components/AppShell';

export default function MinhaConta() {
  const supabase = createClient();
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // States do Upgrade
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeCpf, setUpgradeCpf] = useState('');
  const [upgradeWhatsapp, setUpgradeWhatsapp] = useState('');
  const [upgradePlano, setUpgradePlano] = useState('completo');
  const [isProcessingUpgrade, setIsProcessingUpgrade] = useState(false);
  const [checkoutGerado, setCheckoutGerado] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }
      setSession(session);

      const { data: user } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      setDbUser(user);
      if (user?.documento) setUpgradeCpf(user.documento);
      if (user?.whatsapp) setUpgradeWhatsapp(user.whatsapp);
      setLoading(false);
    }
    loadData();
  }, [supabase, router]);

  const handleUpgrade = async (e) => {
    e.preventDefault();
    if (!upgradeCpf || !upgradeWhatsapp) {
      alert("Por favor, preencha o CPF/CNPJ e o WhatsApp para prosseguir.");
      return;
    }
    setIsProcessingUpgrade(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: upgradeCpf, whatsapp: upgradeWhatsapp, plano: upgradePlano })
      });
      const data = await res.json();
      if (res.ok && data.checkoutUrl) {
        // Redireciona para o Asaas em uma NOVA aba e muda a UX dessa tela
        window.open(data.checkoutUrl, '_blank');
        setCheckoutGerado(true);
        setIsProcessingUpgrade(false);
      } else {
        alert(data.error || 'Erro ao preparar o checkout. Tente novamente.');
        setIsProcessingUpgrade(false);
      }
    } catch (err) {
      alert('Erro de comunicação. Verifique sua conexão.');
      setIsProcessingUpgrade(false);
    }
  };

  const handleLogout = async (e) => {
    e.preventDefault();
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const res = await fetch('/api/cancel', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: dbUser.id })
      });
      if (res.ok) {
        alert('Sua assinatura foi cancelada com sucesso. Você manterá o acesso até o fim do período.');
        window.location.reload();
      } else {
        const errorData = await res.json();
        alert('Erro ao cancelar: ' + (errorData.error || 'Tente novamente.'));
      }
    } catch (err) {
      alert('Erro de conexão.');
    }
    setIsCancelling(false);
    setIsCancelModalOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-body-md text-on-surface-variant">
        Carregando informações da conta...
      </div>
    );
  }

  // Lógicas de Planos e Uso
  const isTrial = dbUser?.status_assinatura === 'trial';
  const isPagante = dbUser?.status_assinatura === 'ativo';
  const isEssencial = dbUser?.plano_atual === 'essencial';
  const isCompleto = dbUser?.plano_atual === 'completo';
  
  // Limites Conforme Regras
  let maxConsultasMensais = 10;
  let maxConsultasDiarias = null;
  if (isEssencial) { maxConsultasMensais = 300; maxConsultasDiarias = 30; }
  if (isCompleto) { maxConsultasMensais = 750; maxConsultasDiarias = 50; }

  const usoMensal = dbUser?.consultas_mes || 0;
  const usoDiario = dbUser?.consultas_dia || 0;
  
  const percentMensal = Math.min((usoMensal / maxConsultasMensais) * 100, 100);
  const percentDiario = maxConsultasDiarias ? Math.min((usoDiario / maxConsultasDiarias) * 100, 100) : 0;

  let badgeText = "Teste Grátis";
  let badgeClasses = "bg-[#f3f4f6] text-[#dc2626] border-[#e5e7eb]"; 
  
  if (isPagante) {
    badgeText = isCompleto ? "Plano Completo" : "Plano Essencial";
    badgeClasses = "bg-green-soft text-primary border-primary-fixed-dim";
  } else if (dbUser?.status_assinatura === 'pagamento_pendente') {
    badgeText = "Pagamento Pendente";
    badgeClasses = "bg-[#fff9f9] text-error border-error-container";
  } else if (dbUser?.status_assinatura === 'cancelado') {
    badgeText = "Cancelado";
    badgeClasses = "bg-surface-variant text-on-surface-variant border-outline-variant";
  } else if (dbUser?.status_assinatura === 'expirado') {
    badgeText = "Expirado";
    badgeClasses = "bg-surface-variant text-on-surface-variant border-outline-variant";
  }

  const trialFimDate = dbUser?.trial_fim 
    ? new Date(dbUser.trial_fim) 
    : new Date(new Date(dbUser?.criado_em).getTime() + 7 * 24 * 60 * 60 * 1000);

  const primeiroNome = dbUser?.nome ? dbUser.nome.split(' ')[0] : '';

  return (
    <AppShell 
      activeMenu="conta" 
      userEmail={session?.user?.email || dbUser?.email}
    >
      {/* Stitch Design System - Conta */}
      <div className="w-full h-full flex flex-col font-inter">
        <header className="mb-12">
          <h1 className="font-headline-md text-headline-md text-on-surface">
            {primeiroNome ? `Olá, ${primeiroNome}!` : 'Olá!'}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">Gerencie suas configurações, uso do sistema e faturamento.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-gap items-stretch pb-16">
          
          {/* Card 1: Plano em uso */}
          <div className="bg-surface-container-lowest border border-line-border rounded-xl p-6 shadow-sm hover:-translate-y-[2px] transition-transform duration-300 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-sm text-headline-sm text-on-surface text-[20px]">Plano em uso</h2>
              <span className={`px-3 py-1 rounded-full font-pill-tag text-pill-tag border font-bold ${badgeClasses}`}>
                {badgeText}
              </span>
            </div>
            
            <div className="flex flex-col gap-4 mt-auto">
              {(isTrial || isEssencial) && (
                <button onClick={() => setIsUpgradeModalOpen(true)} className="w-full py-2 bg-primary text-on-primary rounded-full font-body-sm text-body-sm hover:opacity-90 transition-opacity font-semibold shadow-sm">
                  Faça um upgrade do seu plano atual e ganhe mais consultas e benefícios.
                </button>
              )}
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
                {isTrial 
                  ? `Seu teste termina em ${trialFimDate.toLocaleDateString('pt-BR')}` 
                  : `Sua assinatura é de ${isCompleto ? 'R$ 39/mês' : 'R$ 29/mês'}`}
              </p>
            </div>
          </div>

          {/* Card 2: Consultas Realizadas */}
          <div className="bg-surface-container-lowest border border-line-border rounded-xl p-6 shadow-sm hover:-translate-y-[2px] transition-transform duration-300 flex flex-col gap-6">
            <h2 className="font-headline-sm text-headline-sm text-on-surface text-[20px]">Consultas Realizadas</h2>
            
            <div className="space-y-6">
              
              {/* Barra Mensal */}
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Limite Mensal</span>
                  <span className="font-label-caps text-label-caps text-on-surface">{usoMensal} / {maxConsultasMensais}</span>
                </div>
                <div className="w-full bg-surface-variant h-2 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${percentMensal > 85 ? 'bg-status-amber' : 'bg-primary'}`} style={{ width: `${Math.max(percentMensal, 2)}%` }}></div>
                </div>
              </div>

              {/* Barra Diária */}
              {maxConsultasDiarias && (
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Limite Diário</span>
                    <span className="font-label-caps text-label-caps text-on-surface">{usoDiario} / {maxConsultasDiarias}</span>
                  </div>
                  <div className="w-full bg-surface-variant h-2 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${percentDiario > 85 ? 'bg-status-amber' : 'bg-primary'}`} style={{ width: `${Math.max(percentDiario, 2)}%` }}></div>
                  </div>
                </div>
              )}
              
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 pt-2 border-t border-line-border">
                Renovação dos limites em: {trialFimDate.toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          {/* Pagamentos Card */}
          <div className="bg-surface-container-lowest border border-line-border rounded-xl p-6 shadow-sm hover:-translate-y-[2px] transition-transform duration-300 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-surface-container rounded-lg text-primary">
                <span className="material-symbols-outlined">receipt_long</span>
              </div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface text-[20px]">Pagamentos e faturas</h2>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6 flex-grow">Gerencie seus métodos de pagamento, visualize o histórico de faturas e atualize seus dados de cobrança.</p>
            <a href="https://www.asaas.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary font-semibold font-body-sm text-body-sm hover:underline group w-fit">
              Acessar plataforma Asaas
              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </a>
          </div>

          {/* Suporte Card */}
          <div className="bg-surface-container-lowest border border-line-border rounded-xl p-6 shadow-sm hover:-translate-y-[2px] transition-transform duration-300 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-surface-container rounded-lg text-secondary">
                <span className="material-symbols-outlined">support_agent</span>
              </div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface text-[20px]">Suporte</h2>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6 flex-grow">Precisa de ajuda com sua conta, plano ou encontrou alguma inconsistência técnica?</p>
            <a href="mailto:suporte@odontoconforme.com.br?subject=Suporte%20OdontoConforme" className="self-start px-6 py-2 border border-ink-soft text-ink-soft rounded-full font-body-sm text-body-sm hover:bg-surface-container-low transition-colors flex items-center gap-2 cursor-pointer w-fit">
              <span className="material-symbols-outlined text-[18px]">mail</span>
              Contatar Suporte
            </a>
          </div>

          {/* Cancelar assinatura e Logout (Danger Zone) */}
          <div className="bg-[#fff9f9] border border-error-container rounded-xl p-6 mt-4 md:col-span-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h2 className="font-headline-sm text-headline-sm text-error text-[20px] mb-2">Opções de Conta</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Ao cancelar o plano, você perderá acesso ao sistema após o fim do período atual. Se desejar apenas se desconectar, clique em sair.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => setIsCancelModalOpen(true)} className="px-6 py-2 bg-[#fbeae9] text-error rounded-full font-body-sm text-body-sm hover:bg-[#f5d9d8] transition-colors whitespace-nowrap border border-transparent">
                Cancelar assinatura
              </button>
              <button onClick={handleLogout} className="px-6 py-2 bg-transparent text-secondary rounded-full font-body-sm text-body-sm hover:bg-surface-container-low transition-colors whitespace-nowrap border border-line-border">
                Sair da conta
              </button>
            </div>
          </div>
          
        </div>
      </div>

      {/* Modal Cancelamento */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-line-border">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-3 text-[22px]">Cancelar assinatura?</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mb-8">Após o cancelamento, suas cobranças futuras serão interrompidas e o acesso cortado no fim do período. Tem certeza?</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button className="flex-1 px-4 py-3 bg-error text-on-error font-body-md font-semibold rounded-full hover:opacity-90 transition-opacity disabled:opacity-50" onClick={handleCancel} disabled={isCancelling}>
                {isCancelling ? 'Aguarde...' : 'Sim, cancelar'}
              </button>
              <button className="flex-1 px-4 py-3 bg-surface border border-line-border text-on-surface font-body-md font-semibold rounded-full hover:bg-surface-container-low transition-colors" onClick={() => setIsCancelModalOpen(false)}>
                Manter acesso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Upgrade */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-line-border flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-headline-sm text-primary text-[24px]">Faça seu Upgrade</h3>
              <button onClick={() => setIsUpgradeModalOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <p className="font-body-md text-body-md text-on-surface-variant">
              Escolha seu novo plano e informe seus dados básicos. Você será redirecionado para o nosso ambiente seguro de pagamentos.
            </p>

            {checkoutGerado ? (
              <div className="flex flex-col items-center justify-center text-center py-8 gap-6 animate-in fade-in zoom-in duration-500">
                <div className="w-16 h-16 bg-green-soft text-primary rounded-full flex items-center justify-center text-[32px] font-bold">
                  <span className="material-symbols-outlined">receipt_long</span>
                </div>
                <div className="space-y-2">
                  <h4 className="font-headline-sm text-headline-sm text-on-surface">Fatura Gerada com Sucesso</h4>
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">
                    A janela de pagamentos do Asaas foi aberta. Assim que o pagamento for concluído lá, você poderá atualizar essa página e seu acesso será liberado.
                  </p>
                </div>
                <button 
                  onClick={() => window.location.reload()} 
                  className="w-full py-4 mt-2 bg-primary text-on-primary font-bold text-body-md rounded-full shadow-sm hover:opacity-90 transition-opacity"
                >
                  Atualizar Status e Fechar
                </button>
              </div>
            ) : (
            <form onSubmit={handleUpgrade} className="flex flex-col gap-6">
              <div className="space-y-4">
                <h4 className="font-label-caps text-label-caps text-on-surface-variant font-bold">1. Qual plano atende você?</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className={`border rounded-xl p-5 cursor-pointer flex flex-col transition-all ${upgradePlano === 'essencial' ? 'border-primary bg-green-soft ring-1 ring-primary' : 'border-line-border hover:border-primary/50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-headline-sm text-[18px] text-on-surface font-bold">Essencial</span>
                      <input type="radio" name="plano" value="essencial" checked={upgradePlano === 'essencial'} onChange={() => setUpgradePlano('essencial')} className="text-primary focus:ring-primary h-5 w-5" />
                    </div>
                    <span className="font-bold text-primary text-[24px]">R$ 29<span className="text-body-sm font-normal text-on-surface-variant">/mês</span></span>
                    
                    <ul className="mt-4 space-y-2 flex-1 font-body-sm text-body-sm text-on-surface-variant">
                      <li className="flex items-start gap-2"><span className="text-primary">✓</span> 30 consultas/dia e 300/mês</li>
                      <li className="flex items-start gap-2"><span className="text-primary">✓</span> Orientação sobre normas, ética e publicidade</li>
                    </ul>
                  </label>

                  <label className={`border rounded-xl p-5 cursor-pointer flex flex-col transition-all relative ${upgradePlano === 'completo' ? 'border-primary bg-green-soft ring-1 ring-primary shadow-sm' : 'border-line-border hover:border-primary/50'}`}>
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">Recomendado</span>
                    <div className="flex items-center justify-between mb-2 mt-1">
                      <span className="font-headline-sm text-[18px] text-on-surface font-bold">Completo</span>
                      <input type="radio" name="plano" value="completo" checked={upgradePlano === 'completo'} onChange={() => setUpgradePlano('completo')} className="text-primary focus:ring-primary h-5 w-5" />
                    </div>
                    <span className="font-bold text-primary text-[24px]">R$ 39<span className="text-body-sm font-normal text-on-surface-variant">/mês</span></span>
                    
                    <ul className="mt-4 space-y-2 flex-1 font-body-sm text-body-sm text-on-surface-variant">
                      <li className="flex items-start gap-2"><span className="text-primary">✓</span> <strong>50 consultas/dia e 750/mês</strong></li>
                      <li className="flex items-start gap-2"><span className="text-primary">✓</span> Orientação sobre normas, ética e publicidade</li>
                      <li className="flex items-start gap-2"><span className="text-primary">✓</span> Newsletter mensal com mudanças do CFO</li>
                      <li className="flex items-start gap-2"><span className="text-primary">✓</span> Dicas mensais de postagens</li>
                    </ul>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-label-caps text-label-caps text-on-surface-variant font-bold">2. Seus Dados de Cobrança</h4>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-body-sm text-on-surface-variant mb-1 font-medium">CPF ou CNPJ</label>
                    <input 
                      type="text" 
                      required 
                      value={upgradeCpf} 
                      onChange={(e) => setUpgradeCpf(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-surface-bright border border-line-border text-on-surface py-3 px-4 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md"
                      placeholder="Somente números"
                      disabled={isProcessingUpgrade}
                    />
                  </div>
                  <div>
                    <label className="block text-body-sm text-on-surface-variant mb-1 font-medium">WhatsApp</label>
                    <input 
                      type="tel" 
                      required 
                      value={upgradeWhatsapp} 
                      onChange={(e) => setUpgradeWhatsapp(e.target.value)}
                      className="w-full bg-surface-bright border border-line-border text-on-surface py-3 px-4 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md"
                      placeholder="(DD) 90000-0000"
                      disabled={isProcessingUpgrade}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2 bg-surface-variant/50 p-3 rounded-lg text-body-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">lock</span>
                <span>Checkout criptografado ponta-a-ponta pelo Asaas.</span>
              </div>

              <button 
                type="submit" 
                disabled={isProcessingUpgrade || !upgradeCpf || !upgradeWhatsapp}
                className="w-full py-4 mt-2 bg-primary text-on-primary font-bold text-body-md rounded-full shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessingUpgrade ? (
                  <>Aguarde, gerando cobrança...</>
                ) : (
                  <>Avançar para Pagamento <span className="material-symbols-outlined text-[18px]">arrow_forward</span></>
                )}
              </button>
            </form>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
