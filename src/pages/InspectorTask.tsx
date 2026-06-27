import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';

export function InspectorTask() {
  const { taskId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [inspections, setInspections] = useState<any[]>([]);
  const [templateItems, setTemplateItems] = useState<any[]>([]);
  const [activeInspection, setActiveInspection] = useState<any>(null);
  
  // Form State
  const [results, setResults] = useState<any>({}); // itemId -> value or array of bed values
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  useEffect(() => {
    if (user && taskId) {
      api.get(`/api/inspector/tasks/${taskId}/rooms/${user.id}`).then(setInspections);
      api.get(`/api/inspector/tasks/${taskId}/template/${user.role}`).then(setTemplateItems);
    }
  }, [user, taskId]);

  const openRoom = (inspection: any) => {
    setActiveInspection(inspection);
    // Initialize results based on template items
    const initialResults: any = {};
    templateItems.forEach(item => {
      if (item.type === 'bed') {
        initialResults[item.id] = Array(inspection.capacity).fill(0);
      } else {
        initialResults[item.id] = 0;
      }
    });
    setResults(initialResults);
  };

  const submitResults = async () => {
    if (!activeInspection) return;
    
    // Flatten results for API
    const payloadResults: any[] = [];
    Object.keys(results).forEach(itemId => {
      const item = templateItems.find(i => i.id === itemId);
      if (!item) return;
      
      if (item.type === 'bed') {
        results[itemId].forEach((val: number, idx: number) => {
          if (val === 1) { // Only send deductions
            payloadResults.push({ item_id: itemId, value: 1, bed_num: idx + 1 });
          }
        });
      } else {
        if (results[itemId] > 0) {
          payloadResults.push({ item_id: itemId, value: results[itemId] });
        }
      }
    });

    await api.post(`/api/inspector/inspections/${activeInspection.id}`, { results: payloadResults });
    
    // Refresh
    setActiveInspection(null);
    api.get(`/api/inspector/tasks/${taskId}/rooms/${user?.id}`).then(setInspections);
  };

  if (activeInspection) {
    return (
      <div className="space-y-4 max-w-md mx-auto">
        <div className="flex justify-between items-center bg-white p-4 sticky top-0 z-10 border-b border-slate-200">
          <div>
            <div className="text-xs text-slate-400">正在录入:</div>
            <h2 className="text-lg font-bold text-blue-600">{activeInspection.building}{activeInspection.gender}{activeInspection.room_number} ({activeInspection.capacity}人间)</h2>
          </div>
          <Button variant="outline" size="sm" onClick={() => setActiveInspection(null)}>Back</Button>
        </div>
        
        <div className="space-y-4 p-4">
          {templateItems.map((item, index) => (
            <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
              <div 
                className="p-3 bg-white border-b border-slate-100 flex justify-between items-center cursor-pointer select-none"
                onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">
                    {item.code ? item.code : `${user?.role}${index + 1}`}
                  </span>
                  <div className="font-bold text-sm text-slate-800">{item.title}</div>
                </div>
                <div className="text-[10px] text-slate-400">{item.type}</div>
              </div>
              
              {expandedItem === item.id && item.description && (
                <div className="px-4 py-2 text-xs text-slate-500 bg-white border-b border-slate-100">
                  {item.description}
                </div>
              )}
              
              <div className="p-3">
                {item.type === 'boolean' && (
                  <div className="flex gap-2">
                    <Button 
                      variant={results[item.id] === 0 ? "default" : "outline"} 
                      onClick={() => setResults({...results, [item.id]: 0})}
                      className={results[item.id] === 0 ? "flex-1 bg-green-500 hover:bg-green-600" : "flex-1"}
                    >合格 (0分)</Button>
                    <Button 
                      variant={results[item.id] === 1 ? "destructive" : "outline"} 
                      onClick={() => setResults({...results, [item.id]: 1})}
                      className={results[item.id] === 1 ? "flex-1 bg-red-500 hover:bg-red-600 text-white" : "flex-1 text-red-500"}
                    >扣分 (-{item.point_if_yes})</Button>
                  </div>
                )}
                
                {item.type === 'qty' && (
                  <div className="flex flex-col gap-2">
                    <div className="text-[10px] text-slate-500 text-center">
                      Max: {item.max_qty} | 单价: -{item.point_per_qty}
                    </div>
                    <div className="flex items-center justify-between">
                      <Button variant="outline" size="icon" onClick={() => setResults({...results, [item.id]: Math.max(0, (results[item.id] || 0) - 1)})}>-</Button>
                      <span className="font-mono font-bold text-lg">{results[item.id] || 0}</span>
                      <Button variant="outline" size="icon" onClick={() => setResults({...results, [item.id]: Math.min(item.max_qty, (results[item.id] || 0) + 1)})}>+</Button>
                    </div>
                  </div>
                )}
                
                {item.type === 'bed' && (
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from({ length: activeInspection.capacity }).map((_, i) => (
                      <div 
                        key={i}
                        className={`text-xs border p-2 rounded text-center cursor-pointer select-none transition-colors ${results[item.id]?.[i] === 1 ? 'bg-red-50 text-red-600 border-red-200 font-bold' : 'bg-white text-slate-600 border-slate-200'}`}
                        onClick={() => {
                          const newBeds = [...(results[item.id] || [])];
                          newBeds[i] = newBeds[i] === 1 ? 0 : 1;
                          setResults({...results, [item.id]: newBeds});
                        }}
                      >
                        床 {i + 1}: {results[item.id]?.[i] === 1 ? `-${item.point_per_bed}` : '0'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          <Button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded shadow-lg shadow-blue-200 mt-6" onClick={submitResults}>保存并检查下一间</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Button variant="ghost" onClick={() => navigate('/inspector')} className="text-slate-500">&larr; Back to Dashboard</Button>
      <h2 className="text-xl font-bold text-slate-800">Select Room</h2>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {inspections.map(insp => (
          <Button
            key={insp.id}
            variant={insp.status === 'completed' ? 'secondary' : 'outline'}
            className={`h-24 text-base flex flex-col justify-center items-center rounded-xl border ${insp.status === 'completed' ? 'bg-green-50/50 border-green-200 text-green-800' : 'bg-white border-slate-200 text-slate-700'}`}
            onClick={() => openRoom(insp)}
          >
            <span className="font-bold">{insp.building}{insp.gender}{insp.room_number}</span>
            <span className={`text-[10px] mt-1 font-medium ${insp.status === 'completed' ? 'text-green-600' : 'text-slate-400'}`}>
              {insp.status === 'completed' ? 'Completed' : 'Pending'}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
