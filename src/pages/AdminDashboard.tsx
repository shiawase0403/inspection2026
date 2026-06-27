import { useState } from 'react';
import { Button } from '../components/ui/button';
import { AdminUsers } from './admin/AdminUsers';
import { AdminClasses } from './admin/AdminClasses';
import { AdminRooms } from './admin/AdminRooms';
import { AdminTemplates } from './admin/AdminTemplates';
import { AdminTasks } from './admin/AdminTasks';
import { AdminDataProcessing } from './admin/AdminDataProcessing';

type Tab = 'users' | 'classes' | 'rooms' | 'templates' | 'tasks' | 'data';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('tasks');

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-3 border-b border-slate-200">
        {(['tasks', 'data', 'users', 'classes', 'rooms', 'templates'] as Tab[]).map(tab => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'outline'}
            onClick={() => setActiveTab(tab)}
            className="capitalize"
          >
            {tab === 'data' ? 'Data Processing' : tab}
          </Button>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        {activeTab === 'users' && <AdminUsers />}
        {activeTab === 'classes' && <AdminClasses />}
        {activeTab === 'rooms' && <AdminRooms />}
        {activeTab === 'templates' && <AdminTemplates />}
        {activeTab === 'tasks' && <AdminTasks />}
        {activeTab === 'data' && <AdminDataProcessing />}
      </div>
    </div>
  );
}
