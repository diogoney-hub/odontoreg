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
  Image as ImageIcon,
  X
} from 'lucide-react';

// LEITURA DA CHAVE NO ARQUIVO .env
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

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

// Helper para chamadas de API com Exponential Backoff
const fetchWithRetry = async (url, options, retries = 5, delay = 1000) => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`Erro na comunicação com a IA: ${response.status}`);
    return await response.json();
  } catch (error) {
    if (retries > 0) {
      await new Promise(res => setTimeout(res, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
    throw error;
  }
};

// Converte File para Base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

export default function App() {
  const [step, setStep] = useState('onboarding'); 
  const [selectedUF, setSelectedUF] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  
  // States para o anexo de imagem
  const [attachment, setAttachment] = useState(null); 
  const fileInputRef = useRef(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll para a última mensagem no chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, attachment]);

  const handleStart = () => {
    if (!selectedUF) {
      setErrorMsg('Por favor, selecione seu estado para continuar.');
      return;
    }
    setErrorMsg('');
    setStep('chat');
    setMessages([
      {
        id: Date.now(),
        role: 'model',
        text: `Olá, colega! Sou o assistente OdontoReg. Estou configurado para buscar regulamentações do **CFO** e do **CRO-${selectedUF}**. 
        
Você pode me fazer perguntas em texto ou **anexar uma imagem/print de uma postagem** para eu analisar se ela fere alguma regra ética de publicidade odontológica.`
      }
    ]);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem (PNG, JPG). Para vídeos, envie um print da tela.');
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setAttachment({
        file,
        preview: URL.createObjectURL(file),
        base64,
        mimeType: file.type
      });
      e.target.value = ''; 
    } catch (err) {
      console.error('Erro ao ler a imagem:', err);
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
      text: inputText.trim() || 'Pode analisar esta imagem com base nas regras do CFO?',
      imagePreview: attachment?.preview
    };
    
    setMessages(prev => [...prev, userMsg]);
    
    const currentInputText = inputText;
    const currentAttachment = attachment;
    setInputText('');
    setAttachment(null);
    setIsLoading(true);
    setErrorMsg('');

    const systemPrompt = `Você é um assistente jurídico e ético especializado em odontologia no Brasil. 
    Seu objetivo é ajudar dentistas a entenderem as regras do CFO (Conselho Federal de Odontologia) e dos Conselhos Regionais (CRO).
    Diretrizes obrigatórias:
    1. Utilize linguagem extremamente simples, clara, direta e empática.
    2. Pesquise na internet as normativas ATUAIS do CFO e, principalmente, do CRO do estado do usuário.
    3. Traga a fonte de onde tirou a informação no texto (ex: "Segundo o Artigo X do Código de Ética (Resolução CFO 118/2012)...").
    4. Se o usuário enviar uma imagem (foto, panfleto, print de rede social), FAÇA UMA AUDITORIA RIGOROSA DE MARKETING ODONTOLÓGICO. 
       - Analise se há promessa de resultados, uso indevido de 'Antes e Depois' (sem o nome e CRO do profissional), sensacionalismo, divulgação de preços/promoções, exposição desnecessária do paciente, ou falta das informações obrigatórias na arte.
       - Aponte os potenciais problemas éticos encontrados na imagem e sugira o que ele deve corrigir para adequar ao Código de Ética.
    5. Se não houver uma regra específica, diga claramente que não encontrou uma proibição/permissão explícita nos normativos atuais.`;

    const userQueryText = `O usuário é um dentista registrado no estado: ${selectedUF} (CRO-${selectedUF}). 
    Texto do usuário: ${currentInputText}
    Por favor, responda com base no site oficial do CFO (cfo.org.br) e no site oficial do CRO-${selectedUF}.`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
      
      const parts = [{ text: userQueryText }];
      
      if (currentAttachment) {
        const base64Data = currentAttachment.base64.split(',')[1];
        parts.push({
          inlineData: {
            mimeType: currentAttachment.mimeType,
            data: base64Data
          }
        });
      }

      const payload = {
        contents: [{ role: 'user', parts: parts }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        tools: [{ google_search: {} }]
      };

      const result = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui analisar sua requisição neste momento.";
      
      const attributions = result.candidates?.[0]?.groundingMetadata?.groundingAttributions;
      const sources = attributions 
        ? attributions.map(a => ({ uri: a.web?.uri, title: a.web?.title })).filter(s => s.uri) 
        : [];

      const uniqueSources = Array.from(new Map(sources.map(item => [item.uri, item])).values());

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'model',
        text: responseText,
        sources: uniqueSources
      }]);

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'model',
        text: "Houve um problema de conexão ao consultar as bases de dados ou processar a imagem. Por favor, certifique-se de que sua Chave de API está correta no arquivo .env e tente novamente.",
        isError: true
      }]);
    } finally {
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

  const renderFormattedText = (text) => {
    return text.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <span key={i}>
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
          {i !== text.split('\n').length - 1 && <br />}
        </span>
      );
    });
  };

  if (step === 'onboarding') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-blue-600 p-8 text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">OdontoReg</h1>
            <p className="text-blue-100">Auditoria ética e regulatória com IA</p>
          </div>
          
          <div className="p-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">
              Para começarmos, indique o seu Conselho Regional
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado de Atuação (CRO)
                </label>
                <div className="relative">
                  <select
                    className="w-full appearance-none bg-gray-50 border border-gray-300 text-gray-700 py-3 px-4 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={selectedUF}
                    onChange={(e) => setSelectedUF(e.target.value)}
                  >
                    <option value="" disabled>Selecione um estado...</option>
                    {BRAZILIAN_STATES.map(state => (
                      <option key={state.uf} value={state.uf}>
                        {state.name} (CRO-{state.uf})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                    <MapPin className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-center text-red-600 bg-red-50 p-3 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {errorMsg}
                </div>
              )}

              <button
                onClick={handleStart}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center transition-colors shadow-md hover:shadow-lg"
              >
                Acessar Assistente
                <ChevronRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
      <header className="bg-white shadow-sm border-b border-gray-200 py-3 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800 leading-tight">OdontoReg</h1>
            <p className="text-xs text-blue-600 font-medium">Análise: CFO e CRO-{selectedUF}</p>
          </div>
        </div>
        <button 
          onClick={() => setStep('onboarding')}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <Settings className="w-5 h-5" />
          <span className="hidden sm:inline">Alterar CRO</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 flex gap-3 shadow-sm">
             <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
             <p>Você pode fazer o <strong>upload de uma arte ou print de vídeo</strong> para verificar se está de acordo com as resoluções de marketing (Art. 44 do Código de Ética e afins). O app analisará a imagem enviada.</p>
          </div>

          {messages.map((msg) => (
            <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} gap-3`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm ${msg.role === 'user' ? 'bg-blue-600' : 'bg-teal-500'}`}>
                  {msg.role === 'user' ? <span className="text-white text-xs font-bold">Você</span> : <BookOpen className="w-4 h-4 text-white" />}
                </div>
                <div className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-full`}>
                  <div className={`px-4 py-3 rounded-2xl shadow-sm text-[15px] leading-relaxed max-w-full ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : msg.isError ? 'bg-red-50 text-red-700 border border-red-200 rounded-tl-none' : 'bg-white text-gray-700 border border-gray-200 rounded-tl-none'}`}>
                    {msg.imagePreview && (
                      <div className="mb-2">
                        <img src={msg.imagePreview} alt="Imagem enviada" className="max-h-48 rounded-lg object-contain bg-black/10 border border-black/5" />
                      </div>
                    )}
                    {msg.text && renderFormattedText(msg.text)}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 space-y-1 w-full bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">📚 Fontes Consultadas:</p>
                      <div className="flex flex-wrap gap-2">
                        {msg.sources.map((source, idx) => (
                          <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-md text-xs text-blue-700 transition-colors max-w-full truncate">
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{source.title || new URL(source.uri).hostname}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex w-full justify-start">
               <div className="flex max-w-[80%] flex-row gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  </div>
                  <div className="px-4 py-4 rounded-2xl bg-white border border-gray-200 rounded-tl-none shadow-sm flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                    </div>
                    <span className="text-xs text-gray-500 ml-2">Analisando e pesquisando...</span>
                  </div>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 p-4 sm:p-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-2 relative">
          {attachment && (
            <div className="absolute -top-24 left-0 bg-white border border-gray-200 shadow-md p-2 rounded-lg flex items-center gap-3">
              <img src={attachment.preview} alt="Pré-visualização" className="w-16 h-16 object-cover rounded-md bg-gray-100" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-700">Imagem Anexada</span>
                <span className="text-[10px] text-gray-400">Pronta para análise ética</span>
              </div>
              <button onClick={removeAttachment} className="ml-2 p-1.5 bg-gray-100 hover:bg-red-100 hover:text-red-600 rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="relative flex items-end gap-2">
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
            <button onClick={triggerFileInput} disabled={isLoading} className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors shadow-sm flex-shrink-0 h-[50px] w-[50px] flex items-center justify-center">
              <ImageIcon className="w-6 h-6" />
            </button>
            <div className="relative flex-1">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={attachment ? "Escreva algo sobre a imagem (opcional)..." : "Faça uma pergunta ou anexe uma arte para avaliar..."}
                className="w-full bg-gray-50 border border-gray-300 rounded-2xl pl-4 pr-14 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-[50px] max-h-[120px] shadow-inner transition-all text-gray-700"
                rows="1"
                disabled={isLoading}
              />
              <button onClick={handleSendMessage} disabled={(!inputText.trim() && !attachment) || isLoading} className="absolute right-1.5 top-1.5 bottom-1.5 w-10 flex items-center justify-center bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}