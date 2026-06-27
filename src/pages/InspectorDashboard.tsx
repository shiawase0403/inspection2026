import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export function InspectorDashboard() {
  const [tasks, setTasks] = useState<any[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      api.get(`/api/inspector/tasks/${user.id}`).then(setTasks);
    }
  }, [user]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold tracking-tight text-slate-800">Your Tasks</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tasks.map(task => (
          <Card 
            key={task.id} 
            className="cursor-pointer hover:border-blue-400 transition-colors bg-white shadow-sm"
            onClick={() => navigate(`/inspector/task/${task.id}`)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-800">{task.name || 'Unnamed Task'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-slate-500">
                Status: <span className="font-bold uppercase text-slate-700">{task.status}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {tasks.length === 0 && (
          <div className="text-slate-500 p-4 text-sm">No active tasks assigned to you.</div>
        )}
      </div>
    </div>
  );
}
