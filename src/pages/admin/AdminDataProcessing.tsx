import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export function AdminDataProcessing() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [resultsData, setResultsData] = useState<any>(null);
  
  const [targetMean, setTargetMean] = useState<number>(90);
  const [targetVariance, setTargetVariance] = useState<number>(10);

  const load = async () => setTasks(await api.get('/api/tasks'));
  useEffect(() => { load(); }, []);

  const loadResults = async (taskId: string) => {
    setSelectedTask(taskId);
    if (!taskId) {
      setResultsData(null);
      return;
    }
    const data = await api.get(`/api/tasks/${taskId}/results`);
    
    if (data.task) {
      setTargetMean(data.task.target_mean || 90);
      setTargetVariance(data.task.target_variance || 10);
    }
    
    // Process results
    const processed = processTaskData(data);
    setResultsData(processed);
  };

  const processTaskData = (data: any) => {
    const { results, rooms } = data;
    if (!rooms || rooms.length === 0) return null;
    
    // Group deductions by room
    const roomScores: Record<string, { rawScore: number, items: string[], className: string }> = {};
    const baseScore = results.length > 0 ? results[0].base_score : 9.0;
    
    rooms.forEach((r: any) => {
      roomScores[r.id] = { rawScore: baseScore, items: [], className: r.class_name || 'Unassigned' };
    });
    
    results.forEach((r: any) => {
      const room = roomScores[r.room_id];
      if (!room) return;
      
      let deduction = 0;
      let detail = r.code ? r.code : (r.title || 'Unknown Item');
      
      if (r.bed_num) {
        deduction = r.point_per_bed;
        detail += ` (Bed ${r.bed_num})`;
      } else if (r.value > 0 && r.point_per_qty) {
        deduction = r.value * r.point_per_qty;
        detail += ` x${r.value}`;
      } else if (r.value > 0 && r.point_if_yes) {
        deduction = r.point_if_yes;
      }
      
      room.rawScore -= deduction;
      room.items.push(detail);
    });

    // Calculate raw mean and variance
    const scores = Object.values(roomScores).map(r => r.rawScore);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance) || 1; // avoid div by 0
    
    return { roomScores, rooms, rawMean: mean, rawVariance: variance, rawStdDev: stdDev };
  };

  const getTransformedScore = (rawScore: number) => {
    if (!resultsData) return rawScore;
    const zScore = (rawScore - resultsData.rawMean) / resultsData.rawStdDev;
    const targetStdDev = Math.sqrt(targetVariance);
    return Number((zScore * targetStdDev + targetMean).toFixed(2));
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-center bg-slate-50 p-4 border border-slate-200 rounded-lg">
        <label className="text-sm font-bold text-slate-700">Select Task to Process</label>
        <select className="border border-slate-300 bg-white p-2 rounded text-sm min-w-[200px]" value={selectedTask} onChange={e => loadResults(e.target.value)}>
          <option value="">-- Select --</option>
          {tasks.filter(t => t.status === 'ended' || t.status === 'processed').map(t => (
            <option key={t.id} value={t.id}>{t.name || 'Unnamed Task'} ({t.status})</option>
          ))}
        </select>
      </div>

      {resultsData && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white border border-slate-200 p-6 rounded-lg shadow-sm">
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Raw Mean</div>
              <div className="text-2xl font-mono text-slate-800">{resultsData.rawMean.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Raw Variance</div>
              <div className="text-2xl font-mono text-slate-800">{resultsData.rawVariance.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Target Mean</div>
              <Input type="number" step="0.1" value={targetMean} onChange={e => setTargetMean(parseFloat(e.target.value))} className="font-mono" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Target Variance</div>
              <Input type="number" step="0.1" value={targetVariance} onChange={e => setTargetVariance(parseFloat(e.target.value))} className="font-mono" />
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button onClick={async () => {
              try {
                await api.put(`/api/tasks/${selectedTask}/status`, { status: 'processed' });
                await api.put(`/api/tasks/${selectedTask}/transform`, { target_mean: targetMean, target_variance: targetVariance });
                
                const uniqueRooms = Array.from(new Set(resultsData.rooms.map((r: any) => r.id)));
                const scoresToSave = uniqueRooms.map((roomId: any) => ({
                  room_id: roomId,
                  raw_score: resultsData.roomScores[roomId].rawScore,
                  final_score: getTransformedScore(resultsData.roomScores[roomId].rawScore)
                }));
                await api.put(`/api/tasks/${selectedTask}/scores`, { scores: scoresToSave });
                
                alert('Task marked as processed and scores saved.');
              } catch (e) {
                alert('Failed to save.');
              }
            }} className="bg-slate-800 text-white hover:bg-slate-900 font-bold">Save & Mark Processed</Button>
            
            <Button variant="outline" onClick={() => {
              let csv = "Class,Room,Transformed Score\n";
              resultsData.rooms.forEach((r: any) => {
                const data = resultsData.roomScores[r.id];
                const transformed = getTransformedScore(data.rawScore);
                csv += `"${r.class_name || 'Unassigned'}","${r.building}${r.gender}${r.room_number}",${transformed}\n`;
              });
              const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = "summary_report.csv";
              a.click();
            }}>Export Summary Table</Button>
            
            <Button variant="outline" onClick={() => {
              let csv = "Class,Room,Raw Score,Transformed Score,Deductions\n";
              resultsData.rooms.forEach((r: any) => {
                const data = resultsData.roomScores[r.id];
                const transformed = getTransformedScore(data.rawScore);
                csv += `"${r.class_name || 'Unassigned'}","${r.building}${r.gender}${r.room_number}",${data.rawScore},${transformed},"${[...data.items].sort().join(', ')}"\n`;
              });
              const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = "detailed_report.csv";
              a.click();
            }}>Export Detailed Table</Button>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-lg">
            <h4 className="font-bold mb-3 text-slate-800">数据统计预览</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-4 font-bold text-slate-600">Class</th>
                    <th className="py-2 px-4 font-bold text-slate-600">Room</th>
                    <th className="py-2 px-4 font-bold text-slate-600">Raw Score</th>
                    <th className="py-2 px-4 font-bold text-blue-600">Transformed</th>
                    <th className="py-2 px-4 font-bold text-slate-600">Deductions</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600">
                  {resultsData.rooms.map((r: any, i: number) => {
                    const data = resultsData.roomScores[r.id];
                    return (
                      <tr key={`${r.id}-${i}`} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 px-4 text-xs">{r.class_name || 'Unassigned'}</td>
                        <td className="py-2 px-4 font-mono text-xs text-slate-800">{r.building}{r.gender}{r.room_number}</td>
                        <td className="py-2 px-4 font-mono text-xs">{data.rawScore.toFixed(2)}</td>
                        <td className="py-2 px-4 font-mono font-bold text-blue-600 text-xs">{getTransformedScore(data.rawScore)}</td>
                        <td className="py-2 px-4 text-[10px] text-slate-400">{[...data.items].sort().join(', ')}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
