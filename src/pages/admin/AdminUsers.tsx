import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState({ username: '', name: '', role: 'A' });

  const load = async () => setUsers(await api.get('/api/users'));
  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/api/users', form);
    load();
    setForm({ username: '', name: '', role: 'A' });
  };

  const remove = async (id: string) => {
    if (confirm('Are you sure?')) {
      await api.delete(`/api/users/${id}`);
      load();
    }
  };

  const resetPassword = async (id: string) => {
    const newPassword = prompt('Enter new password:');
    if (newPassword) {
      await api.put(`/api/users/${id}/password`, { password: newPassword });
      alert('Password updated successfully');
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="flex gap-3 items-end bg-slate-50 p-4 border border-slate-200 rounded-lg flex-wrap">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Username</label>
          <Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} required className="bg-white" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Name</label>
          <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="bg-white" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Role</label>
          <select 
            className="flex h-9 w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
            value={form.role} onChange={e => setForm({...form, role: e.target.value})}
          >
            {['A', 'B', 'C', 'D', 'E'].map(r => <option key={r} value={r}>Inspector {r}</option>)}
          </select>
        </div>
        <Button type="submit" className="bg-slate-800 hover:bg-slate-900 text-white font-bold">Add Inspector</Button>
      </form>

      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-4 font-bold text-slate-600">Username</th>
              <th className="py-2.5 px-4 font-bold text-slate-600">Name</th>
              <th className="py-2.5 px-4 font-bold text-slate-600">Role</th>
              <th className="py-2.5 px-4 font-bold text-slate-600 w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="text-slate-700">
            {users.filter(u => u.role !== 'admin').map(user => (
              <tr key={user.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="py-2.5 px-4 font-mono text-xs">{user.username}</td>
                <td className="py-2.5 px-4">{user.name}</td>
                <td className="py-2.5 px-4 font-bold text-blue-600 bg-blue-50/50">{user.role}</td>
                <td className="py-2.5 px-4 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => resetPassword(user.id)}>Password</Button>
                  <Button variant="destructive" size="sm" onClick={() => remove(user.id)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
