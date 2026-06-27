import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = await api.post('/api/login', { username, password });
      login(user);
      if (user.role === 'admin') navigate('/admin');
      else navigate('/inspector');
    } catch (err: any) {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
        <div className="bg-slate-900 p-6 text-center border-b border-slate-800">
          <h1 className="text-2xl font-bold tracking-tight text-blue-400">纪检管理系统</h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Dormitory Inspection</p>
        </div>
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            {error && <div className="text-red-500 text-sm text-center bg-red-50 py-2 rounded">{error}</div>}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Username</label>
              <Input value={username} onChange={e => setUsername(e.target.value)} required placeholder="Enter your username" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter your password" />
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 font-bold text-white shadow-lg shadow-blue-200">Login</Button>
            
            <div className="pt-4 text-center">
              <Button variant="link" onClick={() => navigate('/query')} className="text-xs text-slate-500 hover:text-slate-800">Go to Public Query</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
