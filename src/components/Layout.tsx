import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { LogOut, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from './ui/input';
import { api } from '../lib/api';

export function Layout({ children, title }: { children: React.ReactNode, title: string }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await api.put('/api/users/me/password', { username: user.username, oldPassword, newPassword });
      alert('Password changed successfully');
      setShowPasswordModal(false);
      setOldPassword('');
      setNewPassword('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to change password');
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4 border border-slate-200">
            <h3 className="font-bold text-lg text-slate-800">Change Password</h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Old Password</label>
                <Input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">New Password</label>
                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowPasswordModal(false)}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold">Save</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {user?.role === 'admin' && (
        <aside className="w-60 bg-slate-900 text-white flex flex-col shrink-0">
          <div className="p-6 border-b border-slate-800">
            <h1 className="text-xl font-bold tracking-tight text-blue-400">纪检管理系统</h1>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">
              Admin Console
            </p>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            <div className="bg-blue-600/20 text-blue-400 px-3 py-2 rounded-md text-sm font-medium cursor-pointer" onClick={() => navigate('/admin')}>
              Dashboard
            </div>
            <div className="text-slate-400 hover:bg-slate-800 px-3 py-2 rounded-md text-sm cursor-pointer" onClick={() => navigate('/query')}>
              Public Query
            </div>
          </nav>
          <div className="p-4 border-t border-slate-800 text-xs text-slate-500 flex justify-between items-center">
             <span>{user?.name} ({user?.role})</span>
             <div className="flex gap-1">
               <Button variant="ghost" size="icon" onClick={() => setShowPasswordModal(true)} className="h-6 w-6 text-slate-400 hover:text-white hover:bg-slate-800" title="Change Password">
                 <Key className="h-4 w-4" />
               </Button>
               <Button variant="ghost" size="icon" onClick={logout} className="h-6 w-6 text-slate-400 hover:text-white hover:bg-slate-800" title="Logout">
                 <LogOut className="h-4 w-4" />
               </Button>
             </div>
          </div>
        </aside>
      )}

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 sm:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-base sm:text-lg font-semibold">{title}</h2>
          </div>
          {user?.role !== 'admin' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 hidden sm:inline">{user?.name}</span>
              <Button variant="ghost" size="icon" onClick={logout} className="text-slate-500 hover:text-slate-800">
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
