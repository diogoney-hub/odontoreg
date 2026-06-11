'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    
    // O Supabase já usou o "code" da URL para abrir uma sessão segura temporária.
    // Basta chamarmos updateUser com a nova senha para essa sessão.
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess('Senha redefinida com sucesso! Redirecionando para o seu portal...');
      setTimeout(() => {
        router.push('/');
      }, 3000);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface-container-lowest rounded-2xl shadow-sm border border-line-border p-8">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.png" alt="OdontoConforme" width={200} height={40} className="mb-6" />
          <h2 className="text-2xl font-semibold text-text-high">Crie uma nova senha</h2>
          <p className="text-text-low text-center mt-2 text-sm">
            Quase lá! Digite a sua nova senha de acesso abaixo.
          </p>
        </div>

        {error && (
          <div className="bg-support-error-light/10 text-support-error-base p-4 rounded-xl text-sm mb-6 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}

        {success && (
          <div className="bg-support-success-light/10 text-support-success-base p-4 rounded-xl text-sm mb-6 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            {success}
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-high mb-1">Nova Senha</label>
            <input
              type="password"
              className="w-full bg-surface-container border border-line-border rounded-xl px-4 py-3 text-text-high focus:outline-none focus:ring-2 focus:ring-brand-base transition-colors"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading || success}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-high mb-1">Confirmar Nova Senha</label>
            <input
              type="password"
              className="w-full bg-surface-container border border-line-border rounded-xl px-4 py-3 text-text-high focus:outline-none focus:ring-2 focus:ring-brand-base transition-colors"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading || success}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full bg-brand-base hover:bg-brand-dark text-text-onBrand py-3 rounded-xl font-medium transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? 'Salvando...' : 'Salvar Nova Senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
