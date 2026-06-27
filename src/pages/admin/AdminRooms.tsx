import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export function AdminRooms() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [form, setForm] = useState({ building: '', gender: 'M', room_number: '', capacity: 4 });

  const load = async () => setRooms(await api.get('/api/rooms'));
  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/api/rooms', form);
    load();
    setForm({ ...form, room_number: '' }); // keep building, gender, capacity for easy mass add
  };

  const remove = async (id: string) => {
    await api.delete(`/api/rooms/${id}`);
    load();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="flex gap-3 items-end flex-wrap bg-slate-50 p-4 border border-slate-200 rounded-lg">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Building</label>
          <Input value={form.building} onChange={e => setForm({...form, building: e.target.value})} required placeholder="e.g. 1" className="bg-white w-24" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Gender</label>
          <select 
            className="flex h-9 w-20 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
            value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}
          >
            <option value="M">M</option>
            <option value="F">F</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Room #</label>
          <Input value={form.room_number} onChange={e => setForm({...form, room_number: e.target.value})} required placeholder="e.g. 101" className="bg-white w-24" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Capacity</label>
          <select 
            className="flex h-9 w-28 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
            value={form.capacity} onChange={e => setForm({...form, capacity: Number(e.target.value)})}
          >
            <option value={4}>4-bed</option>
            <option value={6}>6-bed</option>
          </select>
        </div>
        <Button type="submit" className="bg-slate-800 text-white font-bold hover:bg-slate-900">Add Room</Button>
      </form>

      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-4 font-bold text-slate-600">Name</th>
              <th className="py-2.5 px-4 font-bold text-slate-600">Building</th>
              <th className="py-2.5 px-4 font-bold text-slate-600">Gender</th>
              <th className="py-2.5 px-4 font-bold text-slate-600">Room #</th>
              <th className="py-2.5 px-4 font-bold text-slate-600">Capacity</th>
              <th className="py-2.5 px-4 font-bold text-slate-600 w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="text-slate-700">
            {rooms.map(room => (
              <tr key={room.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="py-2 px-4 font-mono font-bold text-slate-800">{room.building}{room.gender}{room.room_number}</td>
                <td className="py-2 px-4 text-xs">{room.building}</td>
                <td className="py-2 px-4 text-xs font-bold text-blue-600">{room.gender}</td>
                <td className="py-2 px-4 font-mono text-xs">{room.room_number}</td>
                <td className="py-2 px-4 text-xs">{room.capacity} beds</td>
                <td className="py-2 px-4">
                  <Button variant="destructive" size="sm" onClick={() => remove(room.id)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
