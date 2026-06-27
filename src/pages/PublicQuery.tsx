import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export function PublicQuery() {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [results, setResults] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/classes').then(setClasses);
  }, []);

  const handleQuery = async () => {
    if (!selectedClass) return;
    const res = await api.get(`/api/public/results?classId=${selectedClass}`);
    
    if (res && res.results && res.scores) {
      const roomsMap: any = {};
      
      // Initialize with final scores from the new table
      res.scores.forEach((s: any) => {
        const roomName = `${s.building}${s.gender}${s.room_number}`;
        roomsMap[roomName] = { score: s.final_score, items: [] };
      });
      
      res.results.forEach((r: any) => {
        const roomName = `${r.building}${r.gender}${r.room_number}`;
        if (!roomsMap[roomName]) {
          roomsMap[roomName] = { score: 'N/A', items: [] };
        }
        
        let detail = r.code ? r.code : r.title;
        
        if (r.bed_num) detail += ` (Bed ${r.bed_num})`;
        else if (r.value > 1) detail += ` x${r.value}`;
        
        roomsMap[roomName].items.push(detail);
      });
      
      setResults(roomsMap);
    } else {
      setResults({});
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-blue-600">纪检管理系统</h1>
            <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Public Query</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/login')}>Login</Button>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Query by Class</h2>
          <div className="flex gap-4">
            <select 
              className="border border-slate-300 bg-slate-50 p-2 rounded flex-1 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              value={selectedClass} 
              onChange={e => setSelectedClass(e.target.value)}
            >
              <option value="">Select a class...</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Button onClick={handleQuery} className="bg-slate-800 text-white hover:bg-slate-900">Search</Button>
          </div>
        </div>
        
        {results && (
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Results</h2>
            <div>
              {Object.keys(results).length === 0 ? (
                <div className="text-slate-400 text-center py-8 text-sm bg-slate-50 rounded border border-slate-100">No results found for this class.</div>
              ) : (
                <div className="overflow-x-auto rounded border border-slate-200">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4 border-r border-slate-200 font-bold text-slate-600">Room</th>
                        <th className="py-2.5 px-4 border-r border-slate-200 font-bold text-slate-600">Score</th>
                        <th className="py-2.5 px-4 font-bold text-slate-600 w-[60%]">Deduction Details</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700">
                      {Object.keys(results).map(roomName => (
                        <tr key={roomName} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                          <td className="py-2.5 px-4 border-r border-slate-100 font-mono text-xs">{roomName}</td>
                          <td className="py-2.5 px-4 border-r border-slate-100 font-mono font-bold text-blue-600 text-xs">
                            {typeof results[roomName].score === 'number' && !isNaN(results[roomName].score) 
                              ? results[roomName].score.toFixed(2) 
                              : (results[roomName].score || 'N/A')}
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 text-xs">
                            {[...results[roomName].items].sort().join(', ') || <span className="text-green-600 font-medium">No deductions (Perfect Score)</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
