"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, 
  Send, 
  Loader2, 
  AlertCircle, 
  ChevronRight,
  BookOpen,
  MapPin,
  ExternalLink,
  Upload,
  Paperclip,
  X,
  Download,
  Shield,
  LogOut,
  RefreshCcw,
  Search,
  UserCircle,
  CheckCircle
} from 'lucide-react';
import AppShell from '../components/AppShell';
import { createClient } from '../lib/supabase/client';
import { Analytics } from '@vercel/analytics/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const BRAZILIAN_STATES = [
  { uf: 'AC', name: 'Acre' }, { uf: 'AL', name: 'Alagoas' }, { uf: 'AP', name: 'Amapá' },
  { uf: 'AM', name: 'Amazonas' }, { uf: 'BA', name: 'Bahia' }, { uf: 'CE', name: 'Ceará' },
  { uf: 'DF', name: 'Distrito Federal' }, { uf: 'ES', name: 'Espírito Santo' }, { uf: 'GO', name: 'Goiás' },
  { uf: 'MA', name: 'Maranhão' }, { uf: 'MT', name: 'Mato Grosso' }, { uf: 'MS', name: 'Mato Grosso do Sul' },
  { uf: 'MG', name: 'Minas Gerais' }, { uf: 'PA', name: 'Pará' }, { uf: 'PB', name: 'Paraíba' },
  { uf: 'PR', name: 'Paraná' }, { uf: 'PE', name: 'Pernambuco' }, { uf: 'PI', name: 'Piauí' },
  { uf: 'RJ', name: 'Rio de Janeiro' }, { uf: 'RN', name: 'Rio Grande do Norte' }, { uf: 'RS', name: 'Rio Grande do Sul' },
  { uf: 'RO', name: 'Rondônia' }, { uf: 'RR', name: 'Roraima' }, { uf: 'SC', name: 'Santa Catarina' },
  { uf: 'SP', name: 'São Paulo' }, { uf: 'SE', name: 'Sergipe' }, { uf: 'TO', name: 'Tocantins' }
];

const fetchWithRetry = async (url, options, retries = 3, delay = 1000) => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      let errorMsg = `Erro na comunicação: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.error) errorMsg = errorData.error;
      } catch (e) {}
      
      // Não repete em caso de limite excedido ou não autorizado
      if (response.status === 403 || response.status === 401) {
         const error = new Error(errorMsg);
         error.status = response.status;
         throw error;
      }
      throw new Error(errorMsg);
    }
    return await response.json();
  } catch (error) {
    if (error.status === 403 || error.status === 401) throw error; // Stop retry
    
    if (retries > 0) {
      await new Promise(res => setTimeout(res, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
    throw error;
  }
};

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

export default function Home() {
  const supabase = createClient();
  const [session, setSession] = useState(null);
  const [dbUser, setDbUser] = useState(null);
  const [status, setStatus] = useState("loading");
  
  // Estados para o formulário de Cadastro/Login
  const [authMode, setAuthMode] = useState("login"); // "login" | "register" | "forgot"
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authCpf, setAuthCpf] = useState("");
  const [authWhatsapp, setAuthWhatsapp] = useState("");
  const [authPerfil, setAuthPerfil] = useState("");
  const [authConsentTerms, setAuthConsentTerms] = useState(false);
  const [authConsentMarketing, setAuthConsentMarketing] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  
  // Estados para Atribuição de Origem (UTMs)
  const [utmData, setUtmData] = useState({});

  const [step, setStep] = useState('onboarding'); 
  const [selectedUF, setSelectedUF] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [rememberCro, setRememberCro] = useState(false);
  const [cpf, setCpf] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('essencial');

  // Captura de UTMs na montagem (Rodando no cliente)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      setUtmData({
        utm_source: searchParams.get('utm_source') || null,
        utm_medium: searchParams.get('utm_medium') || null,
        utm_campaign: searchParams.get('utm_campaign') || null,
        utm_content: searchParams.get('utm_content') || null,
        headline_variante: searchParams.get('headline') || null,
        referrer: document.referrer || null,
      });
      
      const modeParam = searchParams.get('mode');
      if (modeParam === 'register' || modeParam === 'cadastrar') {
        setAuthMode('register');
      }

      const checkoutParam = searchParams.get('checkout');
      if (checkoutParam) {
        localStorage.setItem('pendingCheckout', checkoutParam);
        if (!session) {
          setAuthMode('register');
        }
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchDbUser(session.user.id);
      else setStatus("unauthenticated");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchDbUser(session.user.id);
      else setStatus("unauthenticated");
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchDbUser = async (userId) => {
    setStatus("loading");
    // Agora buscamos pelo auth.uid() = id, garantindo que o RLS funcione.
    const { data, error } = await supabase.from('usuarios').select('*').eq('id', userId).single();
    
    if (error) {
      console.error("Erro ao buscar perfil do usuário", error);
      setStatus("authenticated");
    } else {
      setDbUser(data);
      
      if (typeof window !== 'undefined') {
        const pendingCheckout = localStorage.getItem('pendingCheckout');
        if (pendingCheckout && data.documento && data.whatsapp) {
          localStorage.removeItem('pendingCheckout');
          handleDirectCheckout(pendingCheckout, data.documento, data.whatsapp);
        }
      }

      const savedCro = localStorage.getItem('saved_cro');
      if (savedCro) {
        setSelectedUF(savedCro);
        setRememberCro(true);
        setStep(prev => prev === 'onboarding' ? 'chat' : prev);
      }
      setStatus("authenticated");
    }
  };

  const handleSignInGoogle = async () => {
    setAuthError("");
    setAuthSuccess("");
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
  };
  
  const handleSignInEmail = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setAuthLoading(true);
    const { data: { user }, error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });
    if (user) {
      setDbUser(user);
      
      // Auto-Checkout Logic se o usuário já tem os dados
      if (typeof window !== 'undefined') {
        const pendingCheckout = localStorage.getItem('pendingCheckout');
        if (pendingCheckout && user.documento && user.whatsapp) {
          localStorage.removeItem('pendingCheckout');
          handleDirectCheckout(pendingCheckout, user.documento, user.whatsapp);
        }
      }
    } else {
      setDbUser(null);
    }
    setAuthLoading(false);
  };
  
  const handleDirectCheckout = async (plano, cpfData, whatsappData) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/checkout', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cpfData, whatsapp: whatsappData, plano })
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert('Erro: ' + (data.error || 'Não foi possível gerar a cobrança.'));
        setIsLoading(false);
      }
    } catch (err) {
      alert('Erro de conexão com o banco.');
      setIsLoading(false);
    }
  };

  const handleSignUpEmail = async (e) => {
    e.preventDefault();
    if (!authPerfil) {
      setAuthError("Selecione seu Perfil de Atuação.");
      return;
    }
    const cleanCpf = authCpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      setAuthError("Por favor, insira um CPF válido.");
      return;
    }
    const cleanWhatsapp = authWhatsapp.replace(/\D/g, '');
    if (cleanWhatsapp.length < 10) {
      setAuthError("Por favor, insira um WhatsApp válido com DDD.");
      return;
    }
    if (!authConsentTerms) {
      setAuthError("Você deve aceitar os Termos de Uso e Política de Privacidade.");
      return;
    }
    setAuthError("");
    setAuthSuccess("");
    setAuthLoading(true);

    // 1. Criar Auth.Users
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: authEmail,
      password: authPassword,
      options: {
        data: {
          full_name: authName
        }
      }
    });

    if (signUpError) {
      setAuthError(signUpError.message);
      setAuthLoading(false);
      return;
    }

    if (signUpData?.user) {
      // 2. Atualizar tabela usuarios (criada pela trigger automaticamente) 
      // com os dados complementares como UTM, IPs e Consents através da API do cliente (protegido por RLS para o próprio id).
      
      // Pequeno delay para garantir que a trigger PostgreSQL tenha terminado a criação inicial
      await new Promise(res => setTimeout(res, 500)); 

      const ipFetch = await fetch('https://api.ipify.org?format=json').catch(() => ({ json: () => ({ ip: null }) }));
      const ipData = await ipFetch.json();

      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          consentimento_termos: authConsentTerms,
          consentimento_marketing: authConsentMarketing,
          consentimento_versao: 'v1.0',
          consentimento_data: new Date().toISOString(),
          consentimento_ip: ipData.ip || '0.0.0.0',
          perfil_atuacao: authPerfil,
          utm_source: utmData.utm_source,
          utm_medium: utmData.utm_medium,
          utm_campaign: utmData.utm_campaign,
          utm_content: utmData.utm_content,
          referrer: utmData.referrer,
          headline_variante: utmData.headline_variante,
          documento: cleanCpf,
          whatsapp: cleanWhatsapp,
          email: authEmail
        })
        .eq('id', signUpData.user.id);
        
      if (updateError) {
        console.error("Erro ao salvar perfil extra:", updateError);
        // Se a trigger falhou em criar a linha por algum erro de permissão no Postgres, tentamos o INSERT de fallback:
        if (updateError.code === 'PGRST116' || updateError.details?.includes('0 rows')) {
          await supabase.from('usuarios').insert([{
             id: signUpData.user.id,
             nome_completo: authName,
             perfil_atuacao: authPerfil,
             consentimento_termos: authConsentTerms,
             consentimento_marketing: authConsentMarketing,
             consentimento_versao: 'v1.0',
             consentimento_data: new Date().toISOString(),
             consentimento_ip: ipData.ip || '0.0.0.0',
             documento: cleanCpf,
             whatsapp: cleanWhatsapp,
             email: authEmail
          }]);
        }
      }

      // Supabase Email Confirmations
      if (!signUpData.session) {
        setAuthSuccess("Conta criada com sucesso! Por favor, verifique seu e-mail para validar a conta antes de entrar.");
        setAuthMode("login");
      }
    }
    setAuthLoading(false);
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!authEmail) {
      setAuthError("Digite seu email para recuperar a senha.");
      return;
    }
    setAuthLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    if (error) setAuthError(error.message);
    else setAuthError("Instruções de recuperação enviadas para o seu email.");
    setAuthLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleCompleteProfile = async (e) => {
    e.preventDefault();
    if (!authPerfil) {
      setAuthError("Selecione seu Perfil de Atuação.");
      return;
    }
    const cleanCpf = authCpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      setAuthError("Por favor, insira um CPF válido.");
      return;
    }
    const cleanWhatsapp = authWhatsapp.replace(/\D/g, '');
    if (cleanWhatsapp.length < 10) {
      setAuthError("Por favor, insira um WhatsApp válido com DDD.");
      return;
    }
    if (!authConsentTerms) {
      setAuthError("Você deve aceitar os Termos de Uso e Política de Privacidade.");
      return;
    }

    setAuthError("");
    setAuthLoading(true);

    const ipFetch = await fetch('https://api.ipify.org?format=json').catch(() => ({ json: () => ({ ip: null }) }));
    const ipData = await ipFetch.json();

    const { error: updateError, data: updatedUser } = await supabase.from('usuarios').update({
      documento: cleanCpf,
      whatsapp: cleanWhatsapp,
      perfil_atuacao: authPerfil,
      consentimento_termos: authConsentTerms,
      consentimento_marketing: authConsentMarketing,
      consentimento_versao: 'v1.0',
      consentimento_data: new Date().toISOString(),
      consentimento_ip: ipData.ip || '0.0.0.0',
      email: session?.user?.email || null,
    }).eq('id', dbUser.id).select().single();

    if (updateError) {
      if (updateError.code === '23505') {
         setAuthError("Este CPF já está cadastrado em outra conta.");
      } else {
         setAuthError("Erro ao salvar perfil. Tente novamente.");
      }
    } else {
      setDbUser(updatedUser);
      if (typeof window !== 'undefined') {
        const pendingCheckout = localStorage.getItem('pendingCheckout');
        if (pendingCheckout) {
          localStorage.removeItem('pendingCheckout');
          handleDirectCheckout(pendingCheckout, cleanCpf, cleanWhatsapp);
        }
      }
    }
    setAuthLoading(false);
  };
  
  const [attachment, setAttachment] = useState(null); 
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const messagesEndRef = useRef(null);

  const exportToPDF = async () => {
    setIsLoading(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      
      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR');
      const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      const userName = dbUser?.nome_completo || session?.user?.name || 'Usuário';
      const userEmail = dbUser?.email || session?.user?.email || '';

      let conversationHtml = '';
      messages.forEach(msg => {
        const msgElement = document.getElementById(`msg-${msg.id}`);
        let contentHtml = '';
        if (msgElement) {
           const contentDiv = msgElement.querySelector('.bg-surface-bright') || msgElement.querySelector('.bg-surface-variant') || msgElement;
           const clone = contentDiv.cloneNode(true);
           clone.querySelectorAll('button').forEach(btn => btn.remove());
           contentHtml = clone.innerHTML;
        } else {
           contentHtml = `<p>${msg.text}</p>`;
        }

        if (msg.role === 'user') {
           conversationHtml += `
            <div style="margin-bottom: 24px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="font-family: 'Inter Tight', sans-serif; font-size: 13px; font-weight: 600; color: #1a1c1c; background-color: #eeeeee; padding: 4px 12px; border-radius: 9999px;">${userName}</span>
              </div>
              <div style="padding-left: 16px; border-left: 2px solid #e2e2e2; color: #1a1c1c; font-size: 10pt; line-height: 1.15;">
                ${contentHtml}
              </div>
            </div>
           `;
        } else {
           conversationHtml += `
            <div style="margin-bottom: 24px; margin-top: 8px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="font-family: 'Inter Tight', sans-serif; font-size: 13px; font-weight: 600; color: #ffffff; background-color: #005f3e; padding: 4px 12px; border-radius: 9999px; display: flex; align-items: center; gap: 4px;">
                  Assistente OdontoConforme
                </span>
              </div>
              <div style="background-color: rgba(216, 230, 222, 0.3); border: 1px solid rgba(190, 201, 192, 0.5); border-radius: 8px; padding: 20px; color: #1a1c1c; font-size: 10pt; line-height: 1.15;">
                ${contentHtml}
              </div>
            </div>
           `;
        }
      });

      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '0';
      container.style.top = '0';
      container.style.width = '794px';
      container.style.zIndex = '-9999';
      
      container.innerHTML = `
        <div style="font-family: 'Inter', sans-serif; background-color: #ffffff; padding: 40px; width: 794px; color: #1c1c1c; box-sizing: border-box;">
          
          <!-- Header Section -->
          <div style="text-align: center; border-bottom: 1px solid #bec9c0; padding-bottom: 32px; margin-bottom: 32px;">
            <img src="/logo.png" style="height: 64px; margin: 0 auto 24px auto; display: block;" />
            <div style="display: flex; justify-content: space-between; align-items: flex-end; width: 100%; text-align: left;">
              <div>
                <h1 style="margin: 0; font-size: 32px; font-weight: 600; line-height: 1.2;">${userName}</h1>
                <p style="margin: 4px 0 0 0; font-size: 16px; color: #3f4942;">${userEmail}</p>
              </div>
              <div style="text-align: right;">
                <span style="font-family: 'Inter Tight', sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; color: #54615b; text-transform: uppercase;">Detalhes da Exportação</span>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #3f4942;">Gerado em: ${dateStr} às ${timeStr}</p>
              </div>
            </div>
          </div>
          
          <!-- Content Section -->
          <div style="width: 100%;">
            <h2 style="font-size: 24px; font-weight: 600; color: #005f3e; margin: 0 0 16px 0;">Histórico de Consulta</h2>
            ${conversationHtml}
          </div>
          
        </div>
      `;
      document.body.appendChild(container);

      const contentSection = container.children[0].children[1];
      const paragraphs = contentSection.querySelectorAll('p');
      paragraphs.forEach(p => { p.style.marginBottom = '12px'; p.style.marginTop = '0'; p.style.fontSize = '10pt'; p.style.lineHeight = '1.15'; });
      const uls = contentSection.querySelectorAll('ul, ol');
      uls.forEach(ul => { ul.style.paddingLeft = '20px'; ul.style.marginBottom = '12px'; ul.style.fontSize = '10pt'; ul.style.lineHeight = '1.15'; });
      const lis = contentSection.querySelectorAll('li');
      lis.forEach(li => { li.style.marginBottom = '4px'; });
      const headings = contentSection.querySelectorAll('h1, h2, h3, h4');
      headings.forEach(h => { h.style.marginTop = '16px'; h.style.marginBottom = '12px'; h.style.color = '#111827'; });

      const safeEmail = userEmail ? userEmail.split('@')[0] : 'usuario';
      const cleanDate = dateStr.replace(/\//g, '-');
      const cleanTime = timeStr.replace(':', 'h');
      const pdfFilename = `OdontoConforme - Export ${safeEmail} - ${cleanDate} ${cleanTime}.pdf`;

      const opt = {
        margin:       0,
        filename:     pdfFilename,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' },
        enableLinks:  true
      };

      await html2pdf().set(opt).from(container.firstElementChild).toPdf().get('pdf').then(function (pdf) {
        var totalPages = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          pdf.setTextColor(150);
          pdf.text('OdontoConforme - Consulta de Conformidade Regulatória', 0.5, pdf.internal.pageSize.getHeight() - 0.3);
          pdf.text(i + ' / ' + totalPages, pdf.internal.pageSize.getWidth() - 0.8, pdf.internal.pageSize.getHeight() - 0.3);
        }
      }).save();
      
      document.body.removeChild(container);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Não foi possível gerar o PDF no momento.");
    }
    setIsLoading(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
      scrollToBottom();
  }, [messages, isLoading, attachment]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 240)}px`;
    }
  }, [inputText]);

  const handleStart = () => {
    if (!selectedUF) {
      setErrorMsg('Por favor, selecione um estado para continuar.');
      return;
    }
    setErrorMsg('');
    if (rememberCro) {
      localStorage.setItem('saved_cro', selectedUF);
    } else {
      localStorage.removeItem('saved_cro');
    }
    setStep('chat');
    setMessages([
      {
        id: Date.now(),
        role: 'model',
        text: `Olá, colega! Sou o seu assistente **OdontoConforme**, uma solução da DNA Solução Digital. Estou configurado para buscar regulamentações e orientações do **CFO** e do **CRO-${selectedUF}** e te ajudar no que for possível. \n\nVocê pode por exemplo me fazer perguntas em texto ou anexar uma **imagem/print ou arquivo PDF** para eu analisar e te indicar se é possível ferir alguma regra ética ou de compliance com este texto ou imagem (que pode ser uma postagem, por exemplo). \n\n**Vamos lá!**`
      }
    ]);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      alert('Por favor, selecione um arquivo de imagem (PNG, JPG) ou PDF.');
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setAttachment({
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        base64,
        mimeType: file.type,
        isPdf: file.type === 'application/pdf'
      });
      e.target.value = ''; 
    } catch (err) {
      console.error('Erro ao ler o arquivo:', err);
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() && !attachment) return;

    const userMsg = { 
      id: Date.now(), 
      role: 'user', 
      text: inputText.trim() || 'Pode analisar este documento/imagem com base nas regras do CFO e do CRO indicado?',
      imagePreview: attachment?.preview,
      isPdf: attachment?.isPdf,
      fileName: attachment?.file?.name
    };
    
    setMessages(prev => [...prev, userMsg]);
    
    const currentInputText = inputText;
    const currentAttachment = attachment;
    setInputText('');
    setAttachment(null);
    setIsLoading(true);
    setErrorMsg('');

    const systemPrompt = `Você é um assistente jurídico e ético especializado em odontologia no Brasil. Deve possuir todos os conhecimentos nas regras, normas, leis, orientações e atribuições do CFO (Conselho Federal de Odontologia) e de todos os Conselhos Regionais (CRO). 
    Seu objetivo é ajudar dentistas a entenderem as regras e orientações do CFO (Conselho Federal de Odontologia) e dos Conselhos Regionais (CRO).
    Diretrizes obrigatórias:
    1. Utilize linguagem extremamente simples, clara, direta e empática.
    2. Pesquise na internet as normativas ATUAIS do CFO e, principalmente, do CRO do estado do usuário.
    3. Traga sempre a fonte de onde tirou a informação no texto (ex: "Segundo o Artigo X do Código de Ética (Resolução CFO 118/2012)...") e com um link de acesso ao usuário para que ele possa acessar a fonte.
    4. Se o usuário enviar uma imagem (foto, panfleto, print de rede social), FAÇA UMA AUDITORIA RIGOROSA DE MARKETING ODONTOLÓGICO. 
       - Analise se há promessa de resultados, uso indevido de 'Antes e Depois' (sem o nome e CRO do profissional), sensacionalismo, divulgação de preços/promoções, exposição desnecessária do paciente, ou falta das informações obrigatórias na arte.
       - Aponte os potenciais problemas éticos encontrados na imagem e sugira o que ele deve corrigir para adequar ao Código de Ética.
    5. Se não houver uma regra específica, diga claramente que não encontrou uma proibição/permissão explícita nos normativos atuais.
    6. Sempre que apontar um possível erro, uma possível violação ou algum alerta, indique:
       - O que pode ser realizado para eliminar ou minimizar o erro / violação / alerta.
       - Se estiver em dúvida ou incerteza, indique claramente o nível de certeza e confiabilidade da informação.`;

    const userQueryText = `O usuário é registrado no estado: ${selectedUF} (CRO-${selectedUF}). 
    Texto do usuário: ${currentInputText}
    Por favor, responda com base no site oficial do CFO (cfo.org.br) e no site oficial do CRO-${selectedUF}.`;

    try {
      const url = '/api/chat';
      
      const history = messages
        .filter(m => !m.isError && m.role !== 'system')
        .map(m => ({ role: m.role, text: m.text }));

      // 1ª Requisição: Obter a resposta em texto instantaneamente sem o Google Search
      const payloadFast = {
        history: history,
        userQueryText: userQueryText,
        systemPrompt: systemPrompt,
        currentAttachment: currentAttachment,
        mode: 'fast-answer',
        conselhoRegional: selectedUF
      };

      const resultFast = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadFast)
      });

      const responseText = resultFast.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui analisar sua requisição neste momento.";
      const messageId = Date.now() + 1;

      setMessages(prev => [...prev, {
        id: messageId,
        role: 'model',
        text: responseText,
        sources: [],
        isSearchingSources: true
      }]);
      
      // O texto já apareceu! Desligamos o loader principal do envio.
      setIsLoading(false);

      // 2ª Requisição: Agora ligamos o Google Search para buscar os links em background
      const payloadSources = {
        history: history,
        userQueryText: userQueryText,
        systemPrompt: systemPrompt,
        currentAttachment: currentAttachment,
        mode: 'search-sources',
        conselhoRegional: selectedUF
      };

      try {
        const resultSources = await fetchWithRetry(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadSources)
        });

        const attributions = resultSources.candidates?.[0]?.groundingMetadata?.groundingAttributions;
        const sources = attributions 
          ? attributions.map(a => ({ uri: a.web?.uri, title: a.web?.title })).filter(s => s.uri) 
          : [];
        const uniqueSources = Array.from(new Map(sources.map(item => [item.uri, item])).values());

        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, sources: uniqueSources, isSearchingSources: false } 
            : msg
        ));
      } catch (sourceError) {
        console.error("Erro ao buscar as fontes:", sourceError);
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, isSearchingSources: false } 
            : msg
        ));
      }

    } catch (error) {
      console.error(error);
      
      if (error.status === 403) {
        alert(error.message || "Limite alcançado! Por favor, vá em 'Minha Conta' para realizar o Upgrade.");
        setInputText(currentInputText); 
        setAttachment(currentAttachment);
      } else {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: 'model',
          text: "Houve um problema de conexão ao consultar as bases de dados ou processar a imagem. Tente novamente em alguns segundos.",
          isError: true
        }]);
      }
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center bg-brand-bg-primary text-brand-green"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-brand-bg-primary text-brand-text-primary flex flex-col justify-center items-center p-6 text-center font-inter">
        <div className="mb-[24px] max-w-[250px]">
          <img src="/logo.png" alt="OdontoConforme" className="w-full h-auto object-contain" />
        </div>
        
        <div className="w-full max-w-md bg-brand-bg-secondary p-8 rounded-xl shadow-lg border border-gray-200">
          <div className="flex justify-center gap-4 mb-6 border-b border-gray-200 pb-4">
            <button 
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
              className={`font-semibold pb-2 border-b-2 transition-colors ${authMode === 'login' ? 'border-brand-green text-brand-green' : 'border-transparent text-brand-text-muted hover:text-brand-text-primary'}`}
            >
              Entrar
            </button>
            <button 
              onClick={() => { setAuthMode('register'); setAuthError(''); }}
              className={`font-semibold pb-2 border-b-2 transition-colors ${authMode === 'register' ? 'border-brand-green text-brand-green' : 'border-transparent text-brand-text-muted hover:text-brand-text-primary'}`}
            >
              Cadastrar
            </button>
          </div>

          {authSuccess && (
            <div className="mb-4 p-3 bg-green-50 text-green-700 rounded text-sm text-left border border-green-100 font-medium">
              {authSuccess}
            </div>
          )}

          {authError && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded text-sm text-left border border-red-100 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {authError}
            </div>
          )}

          {authMode === 'login' && (
            <form onSubmit={handleSignInEmail} className="space-y-4 text-left">
              <div>
                <label className="block text-sm font-medium text-brand-text-secondary mb-1">E-mail</label>
                <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green" />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-text-secondary mb-1">Senha</label>
                <input type="password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green" />
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={() => setAuthMode('forgot')} className="text-sm text-brand-green hover:underline">Esqueci minha senha</button>
              </div>
              <button disabled={authLoading} type="submit" className="w-full bg-brand-green hover:bg-brand-green-hover text-white font-bold py-3 px-4 rounded-lg flex justify-center items-center transition-colors">
                {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Entrar com E-mail"}
              </button>
            </form>
          )}

          {authMode === 'register' && (
            <form onSubmit={handleSignUpEmail} className="space-y-4 text-left">
              <div>
                <label className="block text-sm font-medium text-brand-text-secondary mb-1">Nome Completo</label>
                <input type="text" required value={authName} onChange={e => setAuthName(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green" />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-text-secondary mb-1">CPF</label>
                <input type="text" required value={authCpf} onChange={e => setAuthCpf(e.target.value.replace(/\D/g, ''))} maxLength={11} placeholder="Apenas números" className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green" />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-text-secondary mb-1">WhatsApp</label>
                <input type="tel" required value={authWhatsapp} onChange={e => setAuthWhatsapp(e.target.value.replace(/\D/g, ''))} maxLength={11} placeholder="DDD + Número (Apenas números)" className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green" />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-text-secondary mb-1">E-mail</label>
                <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green" />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-text-secondary mb-1">Senha</label>
                <input type="password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} minLength={6} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green" />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-text-secondary mb-1">Perfil de Atuação</label>
                <select required value={authPerfil} onChange={e => setAuthPerfil(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green bg-white">
                  <option value="" disabled>Selecione seu perfil principal...</option>
                  <option value="dono/sócio">Dono / Sócio de Clínica</option>
                  <option value="autônomo">Dentista Autônomo</option>
                  <option value="contratado">Dentista Contratado</option>
                  <option value="gestão (mkt)">Gestão / Marketing</option>
                  <option value="gestão (admin/jurídico)">Gestão / Admin / Jurídico</option>
                  <option value="estudante">Estudante de Odontologia</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
              <div className="flex items-start gap-2 pt-2">
                <input type="checkbox" id="terms" required checked={authConsentTerms} onChange={e => setAuthConsentTerms(e.target.checked)} className="mt-1" />
                <label htmlFor="terms" className="text-xs text-brand-text-secondary leading-tight">
                  Eu aceito os Termos de Uso e Política de Privacidade (obrigatório). 
                  Seus dados (incluindo IP e data) serão registrados em conformidade com a LGPD.
                </label>
              </div>
              <div className="flex items-start gap-2">
                <input type="checkbox" id="marketing" checked={authConsentMarketing} onChange={e => setAuthConsentMarketing(e.target.checked)} className="mt-1" />
                <label htmlFor="marketing" className="text-xs text-brand-text-secondary leading-tight">
                  Aceito receber comunicações, ofertas e conteúdos da DNA Clinic.
                </label>
              </div>
              <button disabled={authLoading} type="submit" className="w-full bg-brand-green hover:bg-brand-green-hover text-white font-bold py-3 px-4 rounded-lg flex justify-center items-center transition-colors">
                {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Criar minha Conta"}
              </button>
            </form>
          )}

          {authMode === 'forgot' && (
            <form onSubmit={handlePasswordReset} className="space-y-4 text-left">
              <p className="text-sm text-brand-text-secondary mb-4">Insira seu e-mail para receber um link mágico de redefinição de senha.</p>
              <div>
                <label className="block text-sm font-medium text-brand-text-secondary mb-1">E-mail</label>
                <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green" />
              </div>
              <button disabled={authLoading} type="submit" className="w-full bg-brand-green hover:bg-brand-green-hover text-white font-bold py-3 px-4 rounded-lg flex justify-center items-center transition-colors">
                {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enviar Link de Recuperação"}
              </button>
              <div className="flex justify-center mt-4">
                <button type="button" onClick={() => setAuthMode('login')} className="text-sm text-brand-text-muted hover:underline">Voltar para Login</button>
              </div>
            </form>
          )}

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-brand-bg-secondary text-brand-text-muted">OU</span>
            </div>
          </div>

          <button 
            onClick={handleSignInGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-black px-4 py-3 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Continuar com o Google
          </button>
        </div>

        <p className="mt-[48px] text-[12px] text-brand-text-muted flex items-center justify-center gap-2 max-w-md mx-auto">
          <Shield className="w-4 h-4 flex-shrink-0" /> Privacidade Garantida: Nenhum documento ou consulta é exposto a terceiros.
        </p>
      </div>
    );
  }

  // Lógica de Perfil Incompleto (Google Login)
  const needsCompleteProfile = status === "authenticated" && dbUser && (!dbUser.documento || !dbUser.whatsapp || !dbUser.perfil_atuacao);

  if (needsCompleteProfile) {
    return (
      <div className="min-h-screen bg-brand-bg-primary text-brand-text-primary flex flex-col justify-center items-center p-6 text-center font-inter">
        <div className="mb-[24px] max-w-[250px]">
          <img src="/logo.png" alt="OdontoConforme" className="w-full h-auto object-contain" />
        </div>
        
        <div className="w-full max-w-md bg-brand-bg-secondary p-8 rounded-xl shadow-lg border border-gray-200">
          <h2 className="text-xl font-bold mb-4">Complete seu Cadastro</h2>
          <p className="text-sm text-brand-text-secondary mb-6">Para usar o sistema de consultas, precisamos de algumas informações finais da sua conta.</p>

          {authError && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded text-sm text-left border border-red-100 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {authError}
            </div>
          )}

          <form onSubmit={handleCompleteProfile} className="space-y-4 text-left">
            <div>
              <label className="block text-sm font-medium text-brand-text-secondary mb-1">CPF</label>
              <input type="text" required value={authCpf} onChange={e => setAuthCpf(e.target.value.replace(/\D/g, ''))} maxLength={11} placeholder="Apenas números" className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green" />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-secondary mb-1">WhatsApp</label>
              <input type="tel" required value={authWhatsapp} onChange={e => setAuthWhatsapp(e.target.value.replace(/\D/g, ''))} maxLength={11} placeholder="DDD + Número (Apenas números)" className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green" />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-secondary mb-1">Perfil de Atuação</label>
              <select required value={authPerfil} onChange={e => setAuthPerfil(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green bg-white">
                <option value="" disabled>Selecione seu perfil principal...</option>
                <option value="dono/sócio">Dono / Sócio de Clínica</option>
                <option value="autônomo">Dentista Autônomo</option>
                <option value="contratado">Dentista Contratado</option>
                <option value="gestão (mkt)">Gestão / Marketing</option>
                <option value="gestão (admin/jurídico)">Gestão / Admin / Jurídico</option>
                <option value="estudante">Estudante de Odontologia</option>
                <option value="outros">Outros</option>
              </select>
            </div>
            <div className="flex items-start gap-2 pt-2">
              <input type="checkbox" id="termsProfile" required checked={authConsentTerms} onChange={e => setAuthConsentTerms(e.target.checked)} className="mt-1" />
              <label htmlFor="termsProfile" className="text-xs text-brand-text-secondary leading-tight">
                Eu aceito os Termos de Uso e Política de Privacidade (obrigatório). 
              </label>
            </div>
            <div className="flex items-start gap-2">
              <input type="checkbox" id="marketingProfile" checked={authConsentMarketing} onChange={e => setAuthConsentMarketing(e.target.checked)} className="mt-1" />
              <label htmlFor="marketingProfile" className="text-xs text-brand-text-secondary leading-tight">
                Aceito receber comunicações da DNA Clinic.
              </label>
            </div>
            <button disabled={authLoading} type="submit" className="w-full bg-brand-green hover:bg-brand-green-hover text-white font-bold py-3 px-4 rounded-lg flex justify-center items-center transition-colors">
              {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Concluir Cadastro"}
            </button>
          </form>
          <button onClick={handleSignOut} className="w-full mt-4 flex items-center justify-center gap-2 text-sm text-brand-text-muted hover:text-brand-text-primary transition-colors">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </div>
    );
  }

  // Lógica de Bloqueio (Regras do Trial e Assinatura Ativa)
  let isBlocked = false;
  let blockReason = '';

  if (status === "authenticated" && dbUser) {
    if (dbUser.status_assinatura === 'ativo') {
      isBlocked = false;
    } else if (dbUser.status_assinatura === 'trial') {
      // Se não houver data explícita de trial_fim, calcula 7 dias a partir da criação
      const trialEndDate = dbUser.trial_fim 
        ? new Date(dbUser.trial_fim) 
        : new Date(new Date(dbUser.criado_em).getTime() + 7 * 24 * 60 * 60 * 1000);
        
      const isExpired = new Date() > trialEndDate;
      const isLimitReached = (dbUser.consultas_mes || 0) >= 10;
      
      if (isExpired || isLimitReached) {
        isBlocked = true;
        blockReason = isExpired 
          ? 'Seu período de teste gratuito de 7 dias chegou ao fim.' 
          : 'Você atingiu o limite de 10 consultas gratuitas do período de teste.';
      }
    } else {
      isBlocked = true;
      blockReason = 'Sua assinatura está inativa ou o pagamento está pendente.';
    }
  }

  // selectedPlan movido para o topo

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-brand-bg-primary text-brand-text-primary flex flex-col justify-center items-center p-6 text-center font-inter">
        <div className="mb-[24px] max-w-[250px]">
          <img src="/logo.png" alt="OdontoConforme" className="w-full h-auto object-contain" />
        </div>
        <AlertCircle className="w-12 h-12 text-brand-red mb-4" />
        <h2 className="text-2xl font-bold mb-2">Acesso Bloqueado</h2>
        <p className="mb-8 text-brand-text-muted max-w-md">
          {blockReason} Para continuar utilizando o assistente OdontoConforme sem interrupções, assine um de nossos planos.
        </p>
        
        <div className="flex flex-col md:flex-row gap-6 mb-8 w-full max-w-2xl justify-center">
          {/* Card Essencial */}
          <div 
            onClick={() => setSelectedPlan('essencial')}
            className={`cursor-pointer border-2 rounded-xl p-6 flex flex-col text-left transition-all ${selectedPlan === 'essencial' ? 'border-brand-green bg-green-50 shadow-md' : 'border-gray-200 bg-white hover:border-brand-green/50'}`}
          >
            <div className="flex justify-between items-center mb-2">
               <h3 className="text-lg font-bold text-gray-900">Plano Essencial</h3>
               <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPlan === 'essencial' ? 'border-brand-green' : 'border-gray-300'}`}>
                  {selectedPlan === 'essencial' && <div className="w-2.5 h-2.5 bg-brand-green rounded-full" />}
               </div>
            </div>
            <p className="text-2xl font-black text-brand-green mb-4">R$ 29<span className="text-sm text-gray-500 font-normal">/mês</span></p>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-center gap-2">✓ 30 consultas por dia</li>
              <li className="flex items-center gap-2">✓ 300 consultas por mês</li>
              <li className="flex items-center gap-2">✓ Suporte via Chat</li>
            </ul>
          </div>

          {/* Card Completo */}
          <div 
            onClick={() => setSelectedPlan('completo')}
            className={`cursor-pointer border-2 rounded-xl p-6 flex flex-col text-left transition-all ${selectedPlan === 'completo' ? 'border-brand-green bg-green-50 shadow-md' : 'border-gray-200 bg-white hover:border-brand-green/50'}`}
          >
            <div className="flex justify-between items-center mb-2">
               <h3 className="text-lg font-bold text-gray-900">Plano Completo</h3>
               <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPlan === 'completo' ? 'border-brand-green' : 'border-gray-300'}`}>
                  {selectedPlan === 'completo' && <div className="w-2.5 h-2.5 bg-brand-green rounded-full" />}
               </div>
            </div>
            <p className="text-2xl font-black text-brand-green mb-4">R$ 39<span className="text-sm text-gray-500 font-normal">/mês</span></p>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-center gap-2">✓ 50 consultas por dia</li>
              <li className="flex items-center gap-2">✓ 750 consultas por mês</li>
              <li className="flex items-center gap-2 font-medium text-brand-green">✓ Análise Avançada</li>
            </ul>
          </div>
        </div>

        <button 
          onClick={async () => {
            setIsLoading(true);
            try {
              const res = await fetch('/api/checkout', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cpf, plano: selectedPlan })
              });
              const data = await res.json();
              if (data.checkoutUrl) window.location.href = data.checkoutUrl;
              else alert('Erro: ' + (data.error || 'Não foi possível gerar a cobrança.'));
            } catch (err) {
              alert('Erro de conexão com o banco.');
            }
            setIsLoading(false);
          }}
          disabled={isLoading}
          className="flex items-center justify-center gap-3 bg-brand-green hover:bg-brand-green-hover disabled:bg-gray-400 text-white w-full max-w-xs py-4 rounded-xl text-lg font-bold transition-colors shadow-sm"
        >
          {isLoading ? 'Processando...' : `Assinar o ${selectedPlan === 'completo' ? 'Completo' : 'Essencial'}`}
        </button>
        <button onClick={handleSignOut} className="mt-8 flex items-center gap-2 text-sm text-brand-text-muted hover:text-brand-text-primary transition-colors">
          <LogOut className="w-4 h-4" /> Sair da Conta
        </button>
      </div>
    );
  }

  return (
    <AppShell
      activeMenu={step === 'onboarding' ? 'alterarcro' : 'consulta'}
      userEmail={session?.user?.email || dbUser?.email}
      onAlterarCRO={() => setStep('onboarding')}
    >
      {step === 'onboarding' ? (
        <main className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-[#fafafa]">
          <div className="w-full max-w-[480px] bg-white rounded-3xl p-8 sm:p-12 shadow-[0_2px_25px_-5px_rgba(0,0,0,0.05),0_10px_10px_-5px_rgba(0,0,0,0.02)] text-center border border-gray-100 flex flex-col items-center">
            
            <div className="w-16 h-16 bg-[#e8f1ec] rounded-full flex items-center justify-center mb-6 text-[#0b5f3a]">
              <span className="material-symbols-outlined text-[32px]">location_on</span>
            </div>
            
            <h2 className="text-[28px] font-bold text-[#1c1c1c] mb-3">Alteração CRO</h2>
            <p className="text-[#555555] text-[15px] mb-8 max-w-[300px] leading-relaxed mx-auto">
              Selecione o seu Conselho Regional e clique no botão abaixo para prosseguir com a consulta.
            </p>
            
            <div className="w-full text-left space-y-6">
              <div>
                <label className="block text-[11px] font-bold text-[#888888] mb-2 uppercase tracking-wide">
                  Estado de Atuação (CRO)
                </label>
                <div className="relative">
                  <select
                    className="w-full appearance-none bg-white border border-gray-200 text-[#333333] py-4 px-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0b5f3a] focus:border-transparent transition-all text-[15px] font-medium cursor-pointer shadow-sm"
                    value={selectedUF}
                    onChange={(e) => setSelectedUF(e.target.value)}
                  >
                    <option value="" disabled>Selecione seu estado</option>
                    {BRAZILIAN_STATES.map(state => (
                      <option key={state.uf} value={state.uf}>
                        {state.name} (CRO-{state.uf})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#555555]">
                    <span className="material-symbols-outlined text-[20px]">keyboard_arrow_down</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="rememberCro"
                  checked={rememberCro}
                  onChange={(e) => setRememberCro(e.target.checked)}
                  className="w-[18px] h-[18px] text-[#0b5f3a] border-gray-300 rounded cursor-pointer accent-[#0b5f3a]"
                />
                <label htmlFor="rememberCro" className="text-[14px] text-[#555555] cursor-pointer font-medium select-none">
                  Lembrar este CRO?
                </label>
              </div>

              {errorMsg && (
                <div className="flex items-center text-red-600 bg-red-50 p-3 rounded-lg text-sm mt-4">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {errorMsg}
                </div>
              )}

              <button
                onClick={handleStart}
                className="w-full mt-8 bg-[#0b5f3a] hover:bg-[#094a2d] text-white font-semibold text-[15px] py-[18px] px-6 rounded-full flex items-center justify-center transition-colors shadow-md group"
              >
                Acessar o Assistente
                <span className="material-symbols-outlined text-[20px] ml-2 group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
            </div>
          </div>
        </main>
      ) : (
        <div className="flex-1 flex flex-col bg-surface-container-lowest rounded-xl border border-line-border shadow-sm overflow-hidden relative w-full h-[calc(100vh-140px)]">
          {/* Background Image Texture removida para evitar lentidão (re-paint a cada keystroke) */}
          <div id="chat-container" className="flex-1 px-4 sm:px-8 pb-8 pt-2 sm:pt-4 overflow-y-auto custom-scrollbar flex flex-col gap-6 relative z-10 w-full max-w-4xl mx-auto">
            
            {messages.length === 0 && (
              <div className="max-w-3xl mx-auto w-full bg-white border border-gray-100 rounded-3xl px-6 sm:px-8 pb-8 pt-4 sm:pt-5 shadow-sm text-center mt-0">
                <img src="/icone.png" alt="Ícone OdontoConforme" className="w-12 h-12 sm:w-16 sm:h-16 object-contain mx-auto mb-2" />
                <h2 className="text-[28px] sm:text-[32px] text-[#1c1c1c] mb-6 font-medium leading-tight mt-2">Olá, sou o seu<br />assistente <strong>OdontoConforme!</strong></h2>
                
                <p className="text-[15px] text-[#555555] mb-8 max-w-2xl mx-auto leading-relaxed">
                  Estou aqui para te ajudar, buscando nas regulamentações, leis, normas e orientações do<br/>
                  <strong>CFO</strong> e do seu <strong>CRO</strong> a resposta de suas dúvidas. Sempre de forma clara e direta.
                </p>
                
                <p className="text-[15px] text-[#555555] mb-8 max-w-2xl mx-auto leading-relaxed">
                  Você pode por exemplo, me perguntar <strong>diretamente com suas palavras</strong>, anexar uma<br/>
                  <strong>imagem</strong> ou <strong>arquivo PDF</strong> para que eu analise e te responda se é possível ferir alguma regra<br/>
                  ética ou de compliance (que pode até ser uma postagem). Estou aqui para ajudar!<br/>
                  <span className="block mt-2 font-bold text-[#1c1c1c]">Vamos lá!?</span>
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mt-8">
                  <button 
                    onClick={() => {
                      setInputText("Analise este post para o Instagram e veja se fere o código de ética odontológico.");
                      if (textareaRef.current) textareaRef.current.focus();
                    }}
                    className="bg-[#f6f6f6] hover:bg-[#efefef] transition-colors p-6 rounded-2xl text-[#333333] italic text-[15px] leading-relaxed border border-transparent shadow-sm text-left"
                  >
                    "Analise este post para o Instagram e veja se fere o código de ética odontológico."
                  </button>
                  <button 
                    onClick={() => {
                      setInputText("Este modelo de contrato esta adequado para...");
                      if (textareaRef.current) textareaRef.current.focus();
                    }}
                    className="bg-[#f6f6f6] hover:bg-[#efefef] transition-colors p-6 rounded-2xl text-[#333333] italic text-[15px] leading-relaxed border border-transparent shadow-sm text-left"
                  >
                    "Este modelo de contrato esta adequado para..."
                  </button>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} id={`msg-${msg.id}`} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-2`}>
                <div className={`flex max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} gap-4`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm overflow-hidden ${msg.role === 'user' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface p-1 border border-line-border'}`}>
                    {msg.role === 'user' ? <span className="text-[12px] font-bold">Você</span> : <img src="/favicon.ico" alt="IA" className="w-full h-full object-contain" />}
                  </div>
                  <div className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-full`}>
                    <div className={`px-5 py-4 rounded-xl shadow-sm text-body-md leading-relaxed max-w-full ${msg.role === 'user' ? 'bg-surface-variant text-on-surface' : msg.isError ? 'bg-error-container text-on-error-container border border-error/20' : 'bg-surface-bright text-on-surface border border-line-border'}`}>
                      {msg.imagePreview && (
                        <div className="mb-4">
                          <img src={msg.imagePreview} alt="Imagem enviada" className="max-h-64 rounded-lg object-contain bg-surface border border-line-border p-2" />
                        </div>
                      )}
                      {msg.isPdf && (
                        <div className="mb-4 flex items-center gap-3 p-3 bg-surface border border-line-border rounded-lg">
                          <BookOpen className="w-6 h-6 text-on-surface-variant" />
                          <span className="text-body-sm font-medium text-on-surface">{msg.fileName || 'Documento PDF'}</span>
                        </div>
                      )}
                      {msg.text && (
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                            a: ({node, ...props}) => <a className="underline font-semibold text-primary hover:text-primary-dim" target="_blank" rel="noopener noreferrer" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
                            h1: ({node, ...props}) => <h1 className="text-[20px] font-bold mb-4 mt-6 text-on-surface leading-tight" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-[18px] font-bold mb-3 mt-5 text-on-surface" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-[16px] font-bold mb-2 mt-4 text-on-surface" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-bold text-on-surface" {...props} />
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      )}
                    </div>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 space-y-2 w-full bg-surface-bright p-4 rounded-xl border border-line-border shadow-sm">
                        <p className="text-label-caps font-semibold text-on-surface-variant uppercase tracking-wider mb-2">📚 Fontes Consultadas:</p>
                        <div className="flex flex-wrap gap-2">
                          {msg.sources.map((source, idx) => (
                            <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-container hover:bg-surface-container-high border border-outline-variant rounded-lg text-body-sm text-on-surface-variant transition-colors max-w-full truncate">
                              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                              <span className="truncate">{source.title || new URL(source.uri).hostname}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {msg.isSearchingSources && (
                      <div className="mt-2 flex items-center gap-2 px-4 py-3 bg-surface-bright rounded-xl border border-line-border shadow-sm text-body-sm text-primary font-medium">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Buscando links oficiais...
                      </div>
                    )}
                    {msg.role === 'model' && !msg.isError && !msg.isSearchingSources && (
                      <button 
                        onClick={() => exportToPDF()}
                        className="mt-2 flex items-center gap-2 text-body-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
                        title="Exportar histórico da consulta em PDF"
                      >
                        <span className="material-symbols-outlined text-[16px]">download</span> Exportar Resposta
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex w-full justify-start">
                 <div className="flex max-w-[80%] flex-row gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1 shadow-sm text-on-primary">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                    <div className="px-5 py-4 rounded-xl bg-surface-bright border border-line-border shadow-sm flex items-center gap-3">
                      <div className="flex gap-1.5">
                        <span className="w-2.5 h-2.5 bg-outline-variant rounded-full animate-bounce"></span>
                        <span className="w-2.5 h-2.5 bg-outline-variant rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                        <span className="w-2.5 h-2.5 bg-outline-variant rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                      </div>
                      <span className="text-body-sm text-on-surface-variant ml-2">Analisando e pesquisando...</span>
                    </div>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area Stitch */}
          <div className="p-4 bg-surface-bright border-t border-line-border z-10 w-full">
            <div className="max-w-3xl mx-auto relative flex flex-col gap-2">
              {attachment && (
                <div className="bg-surface-container-lowest border border-line-border shadow-sm p-3 rounded-xl flex items-center gap-4 w-fit">
                  {attachment.isPdf ? (
                     <div className="w-12 h-12 bg-surface-container flex items-center justify-center rounded-lg"><BookOpen className="w-6 h-6 text-on-surface-variant" /></div>
                  ) : (
                     <img src={attachment.preview} alt="Preview" className="w-12 h-12 object-cover rounded-lg bg-surface-container" />
                  )}
                  <div className="flex flex-col pr-4">
                    <span className="text-body-sm font-semibold text-on-surface truncate max-w-[200px]">{attachment.isPdf ? attachment.file.name : 'Imagem Anexada'}</span>
                  </div>
                  <button onClick={removeAttachment} className="ml-auto p-1.5 hover:bg-error-container hover:text-error rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              <div className="relative flex items-end gap-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-2 focus-within:border-primary focus-within:border-2 transition-all shadow-sm">
                <input type="file" accept="image/*,application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                <button onClick={triggerFileInput} disabled={isLoading} className="p-2 text-on-surface-variant hover:text-primary rounded-full hover:bg-surface-container-low transition-colors disabled:opacity-50">
                  <span className="material-symbols-outlined">attach_file</span>
                </button>
                
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={attachment ? "Escreva algo (opcional)..." : "Faça uma pergunta ou anexe um documento para avaliar..."}
                  className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 resize-none max-h-[240px] min-h-[44px] py-3 text-on-surface font-body-md custom-scrollbar"
                  rows="1"
                  disabled={isLoading}
                />
                
                <button onClick={handleSendMessage} disabled={(!inputText.trim() && !attachment) || isLoading} className="p-3 bg-primary text-on-primary rounded-lg hover:bg-tertiary-container transition-colors shadow-sm flex items-center justify-center disabled:opacity-50">
                  <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>send</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Analytics />
    </AppShell>
  );
}
