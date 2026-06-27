import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize SQLite database
const dbPath = process.env.DB_PATH || 'database.sqlite';
const db = new Database(dbPath, { verbose: console.log });

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS classes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    building TEXT NOT NULL,
    gender TEXT NOT NULL,
    room_number TEXT NOT NULL,
    capacity INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS class_rooms (
    class_id TEXT NOT NULL,
    room_id TEXT NOT NULL,
    PRIMARY KEY (class_id, room_id),
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS template_items (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    title TEXT NOT NULL,
    code TEXT,
    description TEXT,
    role TEXT NOT NULL,
    type TEXT NOT NULL,
    max_qty INTEGER,
    point_per_qty REAL,
    point_per_bed REAL,
    point_if_yes REAL,
    order_num INTEGER NOT NULL,
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    name TEXT,
    template_id TEXT NOT NULL,
    base_score REAL NOT NULL,
    status TEXT NOT NULL,
    target_mean REAL,
    target_variance REAL,
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS task_room_groups (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    building TEXT NOT NULL,
    gender TEXT NOT NULL,
    inspector_A_id TEXT,
    inspector_B_id TEXT,
    inspector_C_id TEXT,
    inspector_D_id TEXT,
    inspector_E_id TEXT,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (inspector_A_id) REFERENCES users(id),
    FOREIGN KEY (inspector_B_id) REFERENCES users(id),
    FOREIGN KEY (inspector_C_id) REFERENCES users(id),
    FOREIGN KEY (inspector_D_id) REFERENCES users(id),
    FOREIGN KEY (inspector_E_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS inspections (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    room_id TEXT NOT NULL,
    inspector_id TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (inspector_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS inspection_results (
    id TEXT PRIMARY KEY,
    inspection_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    value REAL NOT NULL,
    bed_num INTEGER,
    FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES template_items(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS room_task_scores (
    task_id TEXT NOT NULL,
    room_id TEXT NOT NULL,
    raw_score REAL NOT NULL,
    final_score REAL NOT NULL,
    PRIMARY KEY (task_id, room_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
  );

`);

// Migrations
try {
  db.prepare("ALTER TABLE template_items ADD COLUMN code TEXT").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE tasks ADD COLUMN name TEXT").run();
} catch (e) {}

// Seed Admin User if not exists

const adminCount = db.prepare("SELECT count(*) as count FROM users WHERE role = 'admin'").get() as { count: number };
if (adminCount.count === 0) {
  db.prepare("INSERT INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)").run(
    uuidv4(),
    'admin',
    'admin123',
    'Admin',
    'admin'
  );
}

// Ensure proper JSON response for errors
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Helper for sending DB query results safely
function safeQuery<T>(req: any, res: any, queryFn: () => T) {
  try {
    const result = queryFn();
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

// --------------------------------------------------------
// API Routes
// --------------------------------------------------------

// Users API
app.get('/api/users', (req, res) => {
  safeQuery(req, res, () => db.prepare("SELECT * FROM users").all());
});

app.put('/api/users/:id/password', (req, res) => {
  safeQuery(req, res, () => {
    const { password } = req.body;
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(password, req.params.id);
    return { success: true };
  });
});

app.put('/api/users/me/password', (req, res) => {
  safeQuery(req, res, () => {
    const { oldPassword, newPassword, username } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, oldPassword);
    if (!user) throw new Error("Incorrect old password");
    db.prepare("UPDATE users SET password = ? WHERE username = ?").run(newPassword, username);
    return { success: true };
  });
});

app.post('/api/users', (req, res) => {
  safeQuery(req, res, () => {
    const { username, password, name, role } = req.body;
    const id = uuidv4();
    db.prepare("INSERT INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)").run(
      id, username, password || '123456', name, role
    );
    return { id, username, name, role };
  });
});

app.delete('/api/users/:id', (req, res) => {
  safeQuery(req, res, () => {
    db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
    return { success: true };
  });
});

app.post('/api/login', (req, res) => {
  safeQuery(req, res, () => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT id, username, name, role FROM users WHERE username = ? AND password = ?").get(username, password);
    if (!user) throw new Error("Invalid credentials");
    return user;
  });
});

// Classes API
app.get('/api/classes', (req, res) => {
  safeQuery(req, res, () => db.prepare("SELECT * FROM classes").all());
});

app.post('/api/classes', (req, res) => {
  safeQuery(req, res, () => {
    const { name } = req.body;
    const id = uuidv4();
    db.prepare("INSERT INTO classes (id, name) VALUES (?, ?)").run(id, name);
    return { id, name };
  });
});

app.delete('/api/classes/:id', (req, res) => {
  safeQuery(req, res, () => {
    db.prepare("DELETE FROM classes WHERE id = ?").run(req.params.id);
    return { success: true };
  });
});

// Rooms API
app.get('/api/rooms', (req, res) => {
  safeQuery(req, res, () => db.prepare("SELECT * FROM rooms").all());
});

app.post('/api/rooms', (req, res) => {
  safeQuery(req, res, () => {
    const { building, gender, room_number, capacity } = req.body;
    const id = uuidv4();
    db.prepare("INSERT INTO rooms (id, building, gender, room_number, capacity) VALUES (?, ?, ?, ?, ?)").run(
      id, building, gender, room_number, capacity
    );
    return { id, building, gender, room_number, capacity };
  });
});

app.delete('/api/rooms/:id', (req, res) => {
  safeQuery(req, res, () => {
    db.prepare("DELETE FROM rooms WHERE id = ?").run(req.params.id);
    return { success: true };
  });
});

// Class Rooms API
app.get('/api/class_rooms', (req, res) => {
  safeQuery(req, res, () => db.prepare("SELECT * FROM class_rooms").all());
});

app.post('/api/class_rooms', (req, res) => {
  safeQuery(req, res, () => {
    const { class_id, room_id } = req.body;
    db.prepare("INSERT INTO class_rooms (class_id, room_id) VALUES (?, ?)").run(class_id, room_id);
    return { success: true };
  });
});

// Templates API
app.get('/api/templates', (req, res) => {
  safeQuery(req, res, () => {
    const templates = db.prepare("SELECT * FROM templates").all();
    const items = db.prepare("SELECT * FROM template_items").all();
    return templates.map((t: any) => ({
      ...t,
      items: items.filter((i: any) => i.template_id === t.id)
    }));
  });
});

app.post('/api/templates', (req, res) => {
  safeQuery(req, res, () => {
    const { name, items } = req.body;
    const id = uuidv4();
    const tx = db.transaction(() => {
      db.prepare("INSERT INTO templates (id, name) VALUES (?, ?)").run(id, name);
      const insertItem = db.prepare("INSERT INTO template_items (id, template_id, title, code, description, role, type, max_qty, point_per_qty, point_per_bed, point_if_yes, order_num) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      items.forEach((item: any, index: number) => {
        insertItem.run(
          uuidv4(), id, item.title, item.code || null, item.description || null, item.role, item.type,
          item.max_qty || null, item.point_per_qty || null, item.point_per_bed || null, item.point_if_yes || null, item.order_num || index
        );
      });
    });
    tx();
    return { id, name };
  });
});

app.delete('/api/templates/:id', (req, res) => {
  safeQuery(req, res, () => {
    db.prepare("DELETE FROM templates WHERE id = ?").run(req.params.id);
    return { success: true };
  });
});

// Tasks API
app.get('/api/tasks', (req, res) => {
  safeQuery(req, res, () => {
    const tasks = db.prepare("SELECT * FROM tasks").all();
    const groups = db.prepare("SELECT * FROM task_room_groups").all();
    return tasks.map((t: any) => ({
      ...t,
      groups: groups.filter((g: any) => g.task_id === t.id)
    }));
  });
});

app.post('/api/tasks', (req, res) => {
  safeQuery(req, res, () => {
    const { name, template_id, base_score, groups } = req.body;
    const id = uuidv4();
    const tx = db.transaction(() => {
      // Create Task
      db.prepare("INSERT INTO tasks (id, name, template_id, base_score, status) VALUES (?, ?, ?, ?, ?)").run(
        id, name || 'Unnamed Task', template_id, base_score, 'active'
      );
      
      const insertGroup = db.prepare("INSERT INTO task_room_groups (id, task_id, building, gender, inspector_A_id, inspector_B_id, inspector_C_id, inspector_D_id, inspector_E_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
      
      const insertInspection = db.prepare("INSERT INTO inspections (id, task_id, room_id, inspector_id, role, status) VALUES (?, ?, ?, ?, ?, ?)");
      
      groups.forEach((group: any) => {
        const groupId = uuidv4();
        insertGroup.run(
          groupId, id, group.building, group.gender,
          group.inspector_A_id || null, group.inspector_B_id || null,
          group.inspector_C_id || null, group.inspector_D_id || null,
          group.inspector_E_id || null
        );

        // Find rooms for this building + gender
        const rooms = db.prepare("SELECT id FROM rooms WHERE building = ? AND gender = ?").all(group.building, group.gender) as {id: string}[];
        
        // Create pending inspections for each assigned inspector per room
        rooms.forEach(room => {
          if (group.inspector_A_id) insertInspection.run(uuidv4(), id, room.id, group.inspector_A_id, 'A', 'pending');
          if (group.inspector_B_id) insertInspection.run(uuidv4(), id, room.id, group.inspector_B_id, 'B', 'pending');
          if (group.inspector_C_id) insertInspection.run(uuidv4(), id, room.id, group.inspector_C_id, 'C', 'pending');
          if (group.inspector_D_id) insertInspection.run(uuidv4(), id, room.id, group.inspector_D_id, 'D', 'pending');
          if (group.inspector_E_id) insertInspection.run(uuidv4(), id, room.id, group.inspector_E_id, 'E', 'pending');
        });
      });
    });
    tx();
    return { id, status: 'active' };
  });
});

app.put('/api/tasks/:id/status', (req, res) => {
  safeQuery(req, res, () => {
    const { status } = req.body;
    db.prepare("UPDATE tasks SET status = ? WHERE id = ?").run(status, req.params.id);
    return { success: true };
  });
});

app.put('/api/tasks/:id/transform', (req, res) => {
  safeQuery(req, res, () => {
    const { target_mean, target_variance } = req.body;
    db.prepare("UPDATE tasks SET target_mean = ?, target_variance = ? WHERE id = ?").run(target_mean, target_variance, req.params.id);
    return { success: true };
  });
});

app.put('/api/tasks/:id/scores', (req, res) => {
  safeQuery(req, res, () => {
    const taskId = req.params.id;
    const { scores } = req.body;
    
    const tx = db.transaction(() => {
      // Clear old scores for this task if any
      db.prepare("DELETE FROM room_task_scores WHERE task_id = ?").run(taskId);
      
      const insert = db.prepare("INSERT INTO room_task_scores (task_id, room_id, raw_score, final_score) VALUES (?, ?, ?, ?)");
      scores.forEach((s: any) => {
        insert.run(taskId, s.room_id, s.raw_score, s.final_score);
      });
    });
    tx();
    
    return { success: true };
  });
});

// Inspector Endpoints
app.get('/api/inspector/tasks/:inspectorId', (req, res) => {
  safeQuery(req, res, () => {
    const { inspectorId } = req.params;
    // Find active tasks where inspector has pending or completed inspections
    const tasks = db.prepare(`
      SELECT DISTINCT t.* 
      FROM tasks t
      JOIN inspections i ON t.id = i.task_id
      WHERE i.inspector_id = ? AND t.status IN ('active', 'paused')
    `).all(inspectorId);
    return tasks;
  });
});

app.get('/api/inspector/tasks/:taskId/rooms/:inspectorId', (req, res) => {
  safeQuery(req, res, () => {
    const { taskId, inspectorId } = req.params;
    const inspections = db.prepare(`
      SELECT i.*, r.building, r.gender, r.room_number, r.capacity 
      FROM inspections i
      JOIN rooms r ON i.room_id = r.id
      WHERE i.task_id = ? AND i.inspector_id = ?
    `).all(taskId, inspectorId);
    return inspections;
  });
});

app.get('/api/inspector/tasks/:taskId/template/:role', (req, res) => {
  safeQuery(req, res, () => {
    const { taskId, role } = req.params;
    const task = db.prepare("SELECT template_id FROM tasks WHERE id = ?").get(taskId) as any;
    if (!task) throw new Error("Task not found");
    const items = db.prepare("SELECT * FROM template_items WHERE template_id = ? AND role = ? ORDER BY order_num ASC").all(task.template_id, role);
    return items;
  });
});

app.post('/api/inspector/inspections/:inspectionId', (req, res) => {
  safeQuery(req, res, () => {
    const { inspectionId } = req.params;
    const { results } = req.body; // Array of { item_id, value, bed_num }
    
    const tx = db.transaction(() => {
      // Delete existing results for this inspection to allow overwriting
      db.prepare("DELETE FROM inspection_results WHERE inspection_id = ?").run(inspectionId);
      
      const insertRes = db.prepare("INSERT INTO inspection_results (id, inspection_id, item_id, value, bed_num) VALUES (?, ?, ?, ?, ?)");
      results.forEach((r: any) => {
        insertRes.run(uuidv4(), inspectionId, r.item_id, r.value, r.bed_num || null);
      });
      
      db.prepare("UPDATE inspections SET status = 'completed' WHERE id = ?").run(inspectionId);
    });
    tx();
    return { success: true };
  });
});

// Admin Dashboard & Progress
app.get('/api/tasks/:id/progress', (req, res) => {
  safeQuery(req, res, () => {
    const taskId = req.params.id;
    const inspections = db.prepare(`
      SELECT i.*, r.building, r.gender, r.room_number
      FROM inspections i
      JOIN rooms r ON i.room_id = r.id
      WHERE i.task_id = ?
    `).all(taskId);
    return inspections;
  });
});

app.get('/api/tasks/:id/results', (req, res) => {
  safeQuery(req, res, () => {
    const taskId = req.params.id;
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);
    
    // Get all results, inspections, rooms, classes
    const results = db.prepare(`
      SELECT res.*, i.room_id, i.role, r.building, r.gender, r.room_number, r.capacity, t.base_score, ti.title, ti.code, ti.point_if_yes, ti.point_per_qty, ti.point_per_bed
      FROM inspection_results res
      JOIN inspections i ON res.inspection_id = i.id
      JOIN rooms r ON i.room_id = r.id
      JOIN tasks t ON i.task_id = t.id
      JOIN template_items ti ON res.item_id = ti.id
      WHERE i.task_id = ?
    `).all(taskId);

    const rooms = db.prepare(`
      SELECT DISTINCT r.id, r.building, r.gender, r.room_number, cr.class_id, c.name as class_name
      FROM inspections i
      JOIN rooms r ON i.room_id = r.id
      LEFT JOIN class_rooms cr ON r.id = cr.room_id
      LEFT JOIN classes c ON cr.class_id = c.id
      WHERE i.task_id = ?
    `).all(taskId);
    
    return { task, results, rooms };
  });
});

// Public Query API
app.get('/api/public/results', (req, res) => {
  safeQuery(req, res, () => {
    const { classId } = req.query;
    // Simplified public query, just fetch all processed tasks or similar.
    // Assuming we want the latest completed task data for this class.
    if (!classId) return [];
    
    // Get all processed tasks
    const tasks = db.prepare("SELECT * FROM tasks WHERE status = 'processed'").all();
    if (tasks.length === 0) return [];
    
    // For simplicity, just return the most recent processed task's results for this class
    const latestTask = tasks[tasks.length - 1] as any;
    
    const results = db.prepare(`
      SELECT res.*, ti.title, ti.code, i.room_id, r.building, r.gender, r.room_number
      FROM inspection_results res
      JOIN inspections i ON res.inspection_id = i.id
      JOIN rooms r ON i.room_id = r.id
      JOIN template_items ti ON res.item_id = ti.id
      JOIN class_rooms cr ON r.id = cr.room_id
      WHERE i.task_id = ? AND cr.class_id = ?
    `).all(latestTask.id, classId);

    const scores = db.prepare(`
      SELECT rts.*, r.building, r.gender, r.room_number
      FROM room_task_scores rts
      JOIN class_rooms cr ON rts.room_id = cr.room_id
      JOIN rooms r ON rts.room_id = r.id
      WHERE rts.task_id = ? AND cr.class_id = ?
    `).all(latestTask.id, classId);

    return { taskId: latestTask.id, results, scores };
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
