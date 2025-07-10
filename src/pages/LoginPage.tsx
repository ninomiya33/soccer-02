import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext.js'
import GoogleLogo from '../assets/GoogleLogo.svg'

const LoginPage: React.FC = () => {
  const { signIn, signInWithGoogle, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const { error } = await signIn(email, password);
    if (error) setError(error.message || 'ログインに失敗しました');
  };

  const handleGoogle = async () => {
    setError('');
    const { error } = await signInWithGoogle();
    if (error) setError(error.message || 'Googleログインに失敗しました');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-xs">
        <h2 className="text-2xl font-bold mb-6 text-center">ログイン</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-gray-200"
            required
          />
          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-gray-200"
            required
          />
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-xl font-semibold"
            disabled={loading}
          >
            ログイン
          </button>
        </form>
        <button
          onClick={handleGoogle}
          className="w-full mt-4 flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-xl py-2 shadow hover:bg-gray-50"
        >
          <img src={GoogleLogo} alt="Google" className="w-5 h-5" />
          Googleでログイン
        </button>
      </div>
    </div>
  );
};

export default LoginPage; 