import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export function AdminTemplates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [viewTemplateId, setViewTemplateId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [items, setItems] = useState<any[]>([]);

  const load = async () => setTemplates(await api.get('/api/templates'));
  useEffect(() => { load(); }, []);

  const addItem = () => {
    setItems([...items, { title: '', code: '', description: '', role: 'A', type: 'boolean', max_qty: 0, point_per_qty: 0, point_per_bed: 0, point_if_yes: 0 }]);
  };

  const updateItem = (index: number, key: string, value: any) => {
    const newItems = [...items];
    newItems[index][key] = value;
    setItems(newItems);
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    if (index + direction < 0 || index + direction >= items.length) return;
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[index + direction];
    newItems[index + direction] = temp;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const saveTemplate = async () => {
    await api.post('/api/templates', { name, items });
    load();
    setName('');
    setItems([]);
  };

  return (
    <div className="space-y-8">
      <div className="bg-slate-50 p-6 border border-slate-200 rounded-lg space-y-6">
        <h3 className="font-bold text-slate-800 text-lg">Create New Template</h3>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Template Name</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 2026 Spring Inspection" className="max-w-md bg-white" />
        </div>
        
        <div className="space-y-4">
          {items.map((item, i) => (
            <div key={i} className="border border-slate-200 p-4 bg-white rounded-lg flex flex-col gap-3 relative group shadow-sm">
              <div className="absolute top-2 right-2 flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => moveItem(i, -1)} disabled={i === 0} className="h-6 w-6 text-slate-400">↑</Button>
                <Button variant="ghost" size="sm" onClick={() => moveItem(i, 1)} disabled={i === items.length - 1} className="h-6 w-6 text-slate-400">↓</Button>
                <button onClick={() => removeItem(i)} className="text-red-500 hover:text-red-700 font-bold px-2 py-0.5 rounded hover:bg-red-50 text-xs ml-1">X</button>
              </div>
              <div className="flex gap-4 pr-32">
                <div className="w-24">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Code</label>
                  <Input value={item.code || ''} onChange={e => updateItem(i, 'code', e.target.value)} placeholder="e.g. A1" className="bg-slate-50 font-mono" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Title</label>
                  <Input value={item.title} onChange={e => updateItem(i, 'title', e.target.value)} placeholder="e.g. Floor Cleanliness" className="bg-slate-50" />
                </div>
                <div className="w-24">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Role</label>
                  <select className="border border-slate-300 w-full p-1.5 rounded text-sm bg-slate-50" value={item.role} onChange={e => updateItem(i, 'role', e.target.value)}>
                    {['A', 'B', 'C', 'D', 'E'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="w-32">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Type</label>
                  <select className="border border-slate-300 w-full p-1.5 rounded text-sm bg-slate-50" value={item.type} onChange={e => updateItem(i, 'type', e.target.value)}>
                    <option value="boolean">Yes/No</option>
                    <option value="qty">Quantity</option>
                    <option value="bed">Per Bed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Description</label>
                <Input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Optional details..." className="bg-slate-50 text-xs" />
              </div>
              
              <div className="flex gap-4 bg-slate-100 border border-slate-200 p-3 rounded mt-2">
                {item.type === 'boolean' && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Deduction if YES</label>
                    <Input type="number" step="0.1" value={item.point_if_yes} onChange={e => updateItem(i, 'point_if_yes', parseFloat(e.target.value))} className="bg-white h-7 text-xs w-24" />
                  </div>
                )}
                {item.type === 'qty' && (
                  <>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Max Qty</label>
                      <Input type="number" value={item.max_qty} onChange={e => updateItem(i, 'max_qty', parseInt(e.target.value))} className="bg-white h-7 text-xs w-20" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Deduction per unit</label>
                      <Input type="number" step="0.1" value={item.point_per_qty} onChange={e => updateItem(i, 'point_per_qty', parseFloat(e.target.value))} className="bg-white h-7 text-xs w-24" />
                    </div>
                  </>
                )}
                {item.type === 'bed' && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Deduction per bed</label>
                    <Input type="number" step="0.1" value={item.point_per_bed} onChange={e => updateItem(i, 'point_per_bed', parseFloat(e.target.value))} className="bg-white h-7 text-xs w-24" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={addItem} className="border-dashed border-slate-400 text-slate-600">+ Add Item</Button>
          <Button onClick={saveTemplate} disabled={!name || items.length === 0} className="bg-slate-800 text-white font-bold hover:bg-slate-900">Save Template</Button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg text-slate-800">Existing Templates</h3>
        {templates.map(t => (
          <div key={t.id} className="border border-slate-200 bg-white p-4 rounded-lg shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-slate-800">{t.name}</h4>
                <p className="text-xs font-mono text-slate-500 mt-1">{t.items?.length || 0} items configured</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setViewTemplateId(viewTemplateId === t.id ? null : t.id)}>
                  {viewTemplateId === t.id ? 'Hide' : 'View'}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => api.delete(`/api/templates/${t.id}`).then(load)}>Delete</Button>
              </div>
            </div>
            {viewTemplateId === t.id && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="p-2 font-bold text-slate-600">Code</th>
                      <th className="p-2 font-bold text-slate-600">Title</th>
                      <th className="p-2 font-bold text-slate-600">Role</th>
                      <th className="p-2 font-bold text-slate-600">Type</th>
                      <th className="p-2 font-bold text-slate-600">Settings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(t.items || []).sort((a: any, b: any) => a.order_num - b.order_num).map((item: any) => (
                      <tr key={item.id} className="border-b border-slate-100 last:border-0">
                        <td className="p-2 font-mono text-xs">{item.code || '-'}</td>
                        <td className="p-2">{item.title}</td>
                        <td className="p-2">{item.role}</td>
                        <td className="p-2">{item.type}</td>
                        <td className="p-2 text-xs text-slate-500">
                          {item.type === 'boolean' && `Point if Yes: ${item.point_if_yes}`}
                          {item.type === 'qty' && `Point per Qty: ${item.point_per_qty} (Max: ${item.max_qty})`}
                          {item.type === 'bed' && `Point per Bed: ${item.point_per_bed}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
