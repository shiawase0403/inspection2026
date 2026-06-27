import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export function AdminTasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const [form, setForm] = useState({ name: '', template_id: '', base_score: 9.0 });
  const [groups, setGroups] = useState<any[]>([]);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [taskProgress, setTaskProgress] = useState<any[]>([]);

  const load = async () => {
    setTasks(await api.get('/api/tasks'));
    setTemplates(await api.get('/api/templates'));
    setUsers(await api.get('/api/users'));
    const allRooms = await api.get('/api/rooms');
    setRooms(allRooms);

    // Compute unique room groups
    const uniqueGroups = new Set(allRooms.map((r: any) => `${r.building}|${r.gender}`));
    const defaultGroups = Array.from(uniqueGroups).map((g: any) => {
      const [building, gender] = g.split('|');
      return { building, gender, inspector_A_id: '', inspector_B_id: '', inspector_C_id: '', inspector_D_id: '', inspector_E_id: '' };
    });
    setGroups(defaultGroups);
  };
  useEffect(() => { load(); }, []);

  const updateGroup = (index: number, role: string, userId: string) => {
    const newGroups = [...groups];
    newGroups[index][`inspector_${role}_id`] = userId;
    setGroups(newGroups);
  };

  const createTask = async () => {
    // Determine which roles are required by the selected template
    if (!form.template_id) return;
    const items = await api.get('/api/templates');
    const template = items.find((t: any) => t.id === form.template_id);
    if (!template || !template.items) return;
    
    const requiredRoles = new Set(template.items.map((i: any) => i.role));
    
    const activeGroups = groups.filter(g => 
      g.inspector_A_id || g.inspector_B_id || g.inspector_C_id || g.inspector_D_id || g.inspector_E_id
    );

    if (activeGroups.length === 0) {
      alert("Please assign at least one group.");
      return;
    }

    for (const g of activeGroups) {
      const assignedRoles = new Set();
      if (g.inspector_A_id) assignedRoles.add('A');
      if (g.inspector_B_id) assignedRoles.add('B');
      if (g.inspector_C_id) assignedRoles.add('C');
      if (g.inspector_D_id) assignedRoles.add('D');
      if (g.inspector_E_id) assignedRoles.add('E');

      for (const role of Array.from(requiredRoles)) {
        if (!assignedRoles.has(role)) {
          alert(`Validation Error: Group ${g.building}${g.gender} is missing required Inspector ${role}`);
          return;
        }
      }
    }

    await api.post('/api/tasks', { ...form, groups: activeGroups });
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    await api.put(`/api/tasks/${id}/status`, { status });
    load();
  };

  const loadProgress = async (taskId: string) => {
    if (expandedTask === taskId) {
      setExpandedTask(null);
      return;
    }
    const progress = await api.get(`/api/tasks/${taskId}/progress`);
    setTaskProgress(progress);
    setExpandedTask(taskId);
  };

  const renderProgress = () => {
    if (!taskProgress || taskProgress.length === 0) return <div>No inspections generated.</div>;
    
    // Group by room group (building+gender)
    const roomGroups: any = {};
    taskProgress.forEach(i => {
      const g = `${i.building}${i.gender}`;
      if (!roomGroups[g]) roomGroups[g] = {};
      if (!roomGroups[g][i.room_number]) roomGroups[g][i.room_number] = [];
      roomGroups[g][i.room_number].push(i);
    });

    return (
      <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-6">
        <h4 className="font-semibold text-sm text-slate-500 uppercase tracking-wider">Live Progress</h4>
        {Object.keys(roomGroups).map(g => {
          const roomsObj = roomGroups[g];
          const allInspections = Object.values(roomsObj).flat() as any[];
          const completedInspections = allInspections.filter(i => i.status === 'completed');
          const percent = allInspections.length > 0 ? Math.round((completedInspections.length / allInspections.length) * 100) : 0;
          
          return (
            <div key={g} className="space-y-3">
              <div className="flex justify-between items-center bg-white border border-slate-200 p-3 rounded shadow-sm">
                <span className="font-bold text-slate-800">Group {g}</span>
                <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{percent}% Completed</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {Object.keys(roomsObj).map(r => {
                  const items = roomsObj[r];
                  const completed = items.filter((i: any) => i.status === 'completed').length;
                  const total = items.length;
                  return (
                    <div key={r} className="border border-slate-200 bg-white p-2 text-sm rounded shadow-sm">
                      <div className="text-[10px] text-slate-400 mb-1 text-center font-medium">Room {r} ({completed}/{total})</div>
                      <div className="flex gap-0.5 h-3 mt-1">
                        {items.map((i: any) => (
                          <div key={i.role} className={`flex-1 rounded-sm ${i.status === 'completed' ? 'bg-blue-500' : 'bg-slate-200'}`} title={`Role ${i.role}`} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="bg-slate-50 p-6 border border-slate-200 rounded-lg space-y-6">
        <h3 className="font-semibold text-lg text-slate-800">Create New Task</h3>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-700">Task Name</label>
            <Input placeholder="E.g., 2024 Fall Mid-term Inspection" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-700">Template</label>
            <select className="border border-slate-300 w-full p-2 rounded text-sm bg-white" value={form.template_id} onChange={e => setForm({...form, template_id: e.target.value})}>
              <option value="">Select Template...</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="w-32">
            <label className="text-sm font-medium text-slate-700">Base Score</label>
            <Input type="number" step="0.1" value={form.base_score} onChange={e => setForm({...form, base_score: parseFloat(e.target.value)})} />
          </div>
        </div>

        {form.template_id && (
          <div className="space-y-4">
            <h4 className="font-medium text-slate-800">Assign Inspectors per Room Group</h4>
            {groups.map((g, i) => (
              <div key={i} className="border border-slate-200 p-4 bg-white rounded flex items-center gap-4">
                <div className="w-24 font-bold text-center bg-slate-100 p-2 rounded text-slate-700">{g.building} {g.gender}</div>
                <div className="flex-1 grid grid-cols-5 gap-2">
                  {['A', 'B', 'C', 'D', 'E'].map(role => (
                    <div key={role}>
                      <label className="text-xs text-slate-500">Role {role}</label>
                      <select 
                        className="border border-slate-300 bg-white w-full p-1.5 rounded text-xs" 
                        value={g[`inspector_${role}_id`]} 
                        onChange={e => updateGroup(i, role, e.target.value)}
                      >
                        <option value="">--</option>
                        {users.filter(u => u.role === role).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <Button onClick={createTask}>Create Task</Button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg text-slate-800">Existing Tasks</h3>
        {tasks.map(t => {
          const template = templates.find(temp => temp.id === t.template_id);
          return (
            <div key={t.id} className="border border-slate-200 p-4 rounded-lg bg-white shadow-sm transition-all">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium text-lg text-slate-800">{t.name || 'Unnamed Task'}</h4>
                  <div className="text-sm text-slate-500 space-x-4">
                    <span>Template: <strong>{template?.name || 'Unknown Template'}</strong></span>
                    <span>Status: <strong className="uppercase text-slate-700">{t.status}</strong></span>
                    <span>Base Score: {t.base_score}</span>
                    <span>Groups: {t.groups?.length || 0}</span>
                  </div>
                </div>
                <div className="space-x-2">
                  <Button variant="secondary" onClick={() => loadProgress(t.id)}>
                    {expandedTask === t.id ? 'Hide Progress' : 'View Progress'}
                  </Button>
                  {t.status === 'active' && <Button variant="outline" onClick={() => updateStatus(t.id, 'paused')}>Pause</Button>}
                  {t.status === 'paused' && <Button variant="outline" onClick={() => updateStatus(t.id, 'active')}>Resume</Button>}
                  {t.status !== 'ended' && t.status !== 'processed' && <Button variant="destructive" onClick={() => updateStatus(t.id, 'ended')}>End Task</Button>}
                  {t.status === 'ended' && <Button variant="default" onClick={() => updateStatus(t.id, 'processed')}>Process Data</Button>}
                </div>
              </div>
              {expandedTask === t.id && renderProgress()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
