import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export function AdminClasses() {
  const [classes, setClasses] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [classRooms, setClassRooms] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');

  const load = async () => {
    setClasses(await api.get('/api/classes'));
    setRooms(await api.get('/api/rooms'));
    setClassRooms(await api.get('/api/class_rooms'));
  };
  useEffect(() => { load(); }, []);

  const addClass = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/api/classes', { name });
    load();
    setName('');
  };

  const assignRoom = async (class_id: string) => {
    if (!selectedRoom) return;
    await api.post('/api/class_rooms', { class_id, room_id: selectedRoom });
    load();
    setSelectedRoom('');
  };

  return (
    <div className="space-y-8">
      <form onSubmit={addClass} className="flex gap-3 items-end bg-slate-50 p-4 border border-slate-200 rounded-lg">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Class Name</label>
          <Input value={name} onChange={e => setName(e.target.value)} required className="bg-white min-w-[250px]" placeholder="e.g. 计科2101" />
        </div>
        <Button type="submit" className="bg-slate-800 text-white font-bold hover:bg-slate-900">Add Class</Button>
      </form>

      <div className="space-y-4">
        {classes.map(cls => (
          <div key={cls.id} className="border border-slate-200 bg-white p-5 rounded-lg space-y-4 shadow-sm">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800">{cls.name}</h3>
              <Button variant="destructive" size="sm" onClick={() => api.delete(`/api/classes/${cls.id}`).then(load)}>Delete Class</Button>
            </div>
            
            <div className="flex gap-3 items-center bg-slate-50 p-3 rounded border border-slate-200">
              <select className="border border-slate-300 p-2 rounded text-sm w-64 bg-white focus:ring-1 focus:ring-blue-500 outline-none" value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)}>
                <option value="">Select Room to Assign</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.building}{r.gender}{r.room_number}</option>)}
              </select>
              <Button size="sm" variant="outline" onClick={() => assignRoom(cls.id)}>Assign Room</Button>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              {classRooms.filter(cr => cr.class_id === cls.id).map(cr => {
                const room = rooms.find(r => r.id === cr.room_id);
                if (!room) return null;
                return (
                  <span key={cr.room_id} className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-mono font-medium">
                    {room.building}{room.gender}{room.room_number}
                  </span>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
