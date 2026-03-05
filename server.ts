import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import nodemailer from "nodemailer";

dotenv.config();

const db = new Database("scms.db");

// Migration: Add register_number if it doesn't exist (for existing databases)
try {
  // Ensure table exists first
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL
    );
  `);

  const tableInfo = db.prepare("PRAGMA table_info(users)").all() as any[];
  const hasRegisterNumber = tableInfo.some(col => col.name === 'register_number');
  
  if (!hasRegisterNumber) {
    console.log("Migration: register_number column missing. Attempting to add...");
    db.exec("ALTER TABLE users ADD COLUMN register_number TEXT");
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_register_number ON users(register_number)");
    console.log("Migration: register_number column added successfully.");
  }

  const hasDepartment = tableInfo.some(col => col.name === 'department');
  if (!hasDepartment) {
    db.exec("ALTER TABLE users ADD COLUMN department TEXT");
  }

  const complaintsInfo = db.prepare("PRAGMA table_info(complaints)").all() as any[];
  const hasImage = complaintsInfo.some(col => col.name === 'image');
  if (!hasImage) {
    db.exec("ALTER TABLE complaints ADD COLUMN image TEXT");
  }
} catch (e) {
  console.error("Migration failed:", e);
}

const JWT_SECRET = process.env.JWT_SECRET || "scms-secret-key-2026";

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    register_number TEXT UNIQUE,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('Student', 'Staff', 'Admin')) NOT NULL,
    department TEXT
  );

  CREATE TABLE IF NOT EXISTS complaints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    original_text TEXT,
    translation TEXT,
    category TEXT,
    priority TEXT CHECK(priority IN ('Low', 'Medium', 'High', 'Critical')),
    status TEXT DEFAULT 'Pending',
    sentiment TEXT,
    assigned_staff_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (assigned_staff_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id INTEGER NOT NULL,
    rating INTEGER CHECK(rating BETWEEN 1 AND 5),
    comment TEXT,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS audit_trail (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    hash TEXT,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Migration for existing complaints table
try {
  const complaintCols = db.prepare("PRAGMA table_info(complaints)").all() as any[];
  if (!complaintCols.some(c => c.name === 'original_text')) {
    db.exec("ALTER TABLE complaints ADD COLUMN original_text TEXT");
  }
  if (!complaintCols.some(c => c.name === 'translation')) {
    db.exec("ALTER TABLE complaints ADD COLUMN translation TEXT");
  }
} catch (e) {}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Email Transporter Configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_PORT === "465", // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendEmailNotification(to: string, subject: string, html: string) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log("Email notification skipped: EMAIL_USER or EMAIL_PASS not configured.");
    return;
  }

  try {
    await transporter.sendMail({
      from: `"SCMS Notification" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`Email notification sent to ${to}`);
  } catch (error) {
    console.error("Failed to send email notification:", error);
  }
}

async function logAudit(complaintId: number, userId: number, action: string, details: string) {
  const prevLog = db.prepare("SELECT hash FROM audit_trail ORDER BY id DESC LIMIT 1").get() as any;
  const prevHash = prevLog ? prevLog.hash : "GENESIS";
  const currentContent = `${complaintId}-${userId}-${action}-${details}-${prevHash}`;
  // Simple hash simulation for "Blockchain" feel
  const hash = Buffer.from(currentContent).toString('base64').substring(0, 32);
  
  db.prepare("INSERT INTO audit_trail (complaint_id, user_id, action, details, hash) VALUES (?, ?, ?, ?, ?)").run(
    complaintId, userId, action, details, hash
  );
}

// Seed initial data if empty
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  const hashedPassword = bcrypt.hashSync("password123", 10);
  db.prepare("INSERT INTO users (name, email, register_number, password, role, department) VALUES (?, ?, ?, ?, ?, ?)").run(
    "Student User", "student@example.com", "REG001", hashedPassword, "Student", null
  );
  db.prepare("INSERT INTO users (name, email, register_number, password, role, department) VALUES (?, ?, ?, ?, ?, ?)").run(
    "Academic Staff", "academic@example.com", "STAFF001", hashedPassword, "Staff", "Academic"
  );
  db.prepare("INSERT INTO users (name, email, register_number, password, role, department) VALUES (?, ?, ?, ?, ?, ?)").run(
    "Facilities Staff", "facilities@example.com", "STAFF002", hashedPassword, "Staff", "Facilities"
  );
  db.prepare("INSERT INTO users (name, email, register_number, password, role, department) VALUES (?, ?, ?, ?, ?, ?)").run(
    "Admin User", "admin@example.com", "ADMIN001", hashedPassword, "Admin", "Administration"
  );
}

// Fix for user: shalinisenthilkumar63751@gmail.com
try {
  db.prepare("UPDATE users SET role = 'Admin' WHERE email = 'shalinisenthilkumar63751@gmail.com'").run();
} catch (e) {}

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// WebSocket connection handling
const clients = new Map<number, WebSocket>();

wss.on("connection", (ws, req) => {
  const cookies = req.headers.cookie;
  if (!cookies) return ws.close();
  
  const token = cookies.split(';').find(c => c.trim().startsWith('auth_token='))?.split('=')[1];
  if (!token) return ws.close();

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    clients.set(decoded.id, ws);
    
    ws.on("close", () => {
      clients.delete(decoded.id);
    });
  } catch (e) {
    ws.close();
  }
});

function sendNotification(userId: number, message: string, type: string) {
  const info = db.prepare("INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)").run(userId, message, type);
  const notification = {
    id: info.lastInsertRowid,
    user_id: userId,
    message,
    type,
    is_read: 0,
    created_at: new Date().toISOString()
  };

  const client = clients.get(userId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify({ type: "NOTIFICATION", data: notification }));
  }
}

app.use(express.json());
app.use(cookieParser());

// API Routes
app.post("/api/register", async (req, res) => {
  const { name, email, register_number, password, role } = req.body;
  
  if (!name || !email || !register_number || !password || !role) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // Check if email or register number already exists
    const existingUser = db.prepare("SELECT * FROM users WHERE email = ? OR register_number = ?").get(email, register_number);
    
    if (existingUser) {
      return res.status(400).json({ error: "Account already exists. Please login." });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const info = db.prepare("INSERT INTO users (name, email, register_number, password, role) VALUES (?, ?, ?, ?, ?)").run(
      name, email, register_number, hashedPassword, role
    );

    res.status(201).json({ success: true, id: info.lastInsertRowid });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ error: "Internal server error during registration" });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password, role } = req.body;
  try {
    // Check both email and register_number along with role
    const user = db.prepare("SELECT * FROM users WHERE (email = ? OR register_number = ?) AND role = ?").get(email, email, role) as any;
    if (user && bcrypt.compareSync(password, user.password)) {
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
      res.cookie("auth_token", token, { 
        httpOnly: true, 
        sameSite: 'none', 
        secure: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Internal server error during login" });
  }
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("auth_token", { sameSite: 'none', secure: true });
  res.json({ success: true });
});

app.get("/api/me", (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ error: "Not logged in" });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = db.prepare("SELECT id, name, email, register_number, role, department FROM users WHERE id = ?").get(decoded.id);
    if (!user) return res.status(401).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
});

app.put("/api/user/profile", (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ error: "Not logged in" });

  const { name, department } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    db.prepare("UPDATE users SET name = ?, department = ? WHERE id = ?").run(name, department, decoded.id);
    
    const updatedUser = db.prepare("SELECT id, name, email, register_number, role, department FROM users WHERE id = ?").get(decoded.id);
    res.json(updatedUser);
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
});

 app.post("/api/complaints", async (req, res) => {
  const { student_id, title, text, category, priority, sentiment, image } = req.body;
  
  try {
    // Multi-lingual support: Translate to English if needed
    const translationResponse = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Translate the following student complaint to English if it is in another language (like Tamil). If it is already in English, return it as is. Output ONLY the translated text.\n\nComplaint: ${text}`
    });
    const translatedText = translationResponse.text.trim();

    const finalCategory = category || "General";
    const finalPriority = priority || "Medium";
    const finalSentiment = sentiment || "Neutral";
    
    // Smart Routing: Find staff in that department
    const staff = db.prepare("SELECT id FROM users WHERE role = 'Staff' AND department = ?").get(finalCategory);
    const assignedStaffId = staff ? (staff as any).id : null;

    const info = db.prepare(`
      INSERT INTO complaints (student_id, title, text, original_text, translation, category, priority, sentiment, assigned_staff_id, image)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(student_id, title, translatedText, text, translatedText !== text ? translatedText : null, finalCategory, finalPriority, finalSentiment, assignedStaffId, image);

    const complaintId = info.lastInsertRowid as number;

    // Audit Trail
    await logAudit(complaintId, student_id, "CREATED", `Complaint submitted in ${translatedText !== text ? 'non-English' : 'English'}`);

    // Notify Staff
    if (assignedStaffId) {
      sendNotification(assignedStaffId as number, `New complaint assigned to your department: ${title}`, "ASSIGNMENT");
    }

    // Notify Admins
    const admins = db.prepare("SELECT id, email, name FROM users WHERE role = 'Admin'").all() as any[];
    admins.forEach(admin => {
      sendNotification(admin.id, `New complaint submitted: ${title}`, "NEW_COMPLAINT");
      
      // Send Email Notification to Admin
      const adminEmail = process.env.ADMIN_EMAIL || admin.email;
      sendEmailNotification(
        adminEmail,
        `New Complaint Registered: ${title}`,
        `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #4f46e5;">New Complaint Received</h2>
          <p>Hello ${admin.name},</p>
          <p>A new complaint has been registered in the system.</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Title:</strong> ${title}</p>
            <p><strong>Category:</strong> ${finalCategory}</p>
            <p><strong>Priority:</strong> ${finalPriority}</p>
            <p><strong>Description:</strong> ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}</p>
          </div>
          <p>Please log in to the SCMS portal to review and assign this complaint.</p>
          <a href="${process.env.APP_URL || 'http://localhost:3000'}" style="display: inline-block; background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Portal</a>
          <p style="margin-top: 30px; font-size: 0.8em; color: #666;">This is an automated notification from the Student Complaint Management System.</p>
        </div>
        `
      );
    });

    res.json({ id: complaintId, category: finalCategory, priority: finalPriority, translation: translatedText !== text ? translatedText : null });
  } catch (error) {
    console.error("Complaint Error:", error);
    res.status(500).json({ error: "Failed to process complaint" });
  }
});

app.get("/api/complaints", (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ error: "Not logged in" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(decoded.id) as any;
    if (!user) return res.status(401).json({ error: "User not found" });

    const { viewAll } = req.query;
    let complaints;
    const query = `
      SELECT c.*, u.name as student_name, f.id as feedback_id 
      FROM complaints c 
      JOIN users u ON c.student_id = u.id
      LEFT JOIN feedback f ON c.id = f.complaint_id
    `;

    if (user.role === 'Admin') {
      complaints = db.prepare(`${query} ORDER BY c.created_at DESC`).all();
    } else if (user.role === 'Staff') {
      // Staff always filtered by department
      complaints = db.prepare(`${query} WHERE c.category = ? ORDER BY c.created_at DESC`).all(user.department);
    } else if (user.role === 'Student') {
      if (viewAll === 'true') {
        complaints = db.prepare(`${query} ORDER BY c.created_at DESC`).all();
      } else {
        complaints = db.prepare(`${query} WHERE c.student_id = ? ORDER BY c.created_at DESC`).all(user.id);
      }
    } else {
      complaints = db.prepare(`${query} ORDER BY c.created_at DESC`).all();
    }
    res.json(complaints);
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
});

app.post("/api/feedback", (req, res) => {
  const { complaint_id, rating, comment } = req.body;
  try {
    const info = db.prepare("INSERT INTO feedback (complaint_id, rating, comment) VALUES (?, ?, ?)").run(complaint_id, rating, comment);
    
    // Notify Admin and Staff
    const complaint = db.prepare("SELECT title, assigned_staff_id FROM complaints WHERE id = ?").get(complaint_id) as any;
    if (complaint) {
      if (complaint.assigned_staff_id) {
        sendNotification(complaint.assigned_staff_id, `New feedback received for: ${complaint.title}`, "FEEDBACK");
      }
      const admins = db.prepare("SELECT id FROM users WHERE role = 'Admin'").all() as any[];
      admins.forEach(admin => {
        sendNotification(admin.id, `New feedback received for: ${complaint.title}`, "FEEDBACK");
      });
    }

    res.json({ success: true, id: info.lastInsertRowid });
  } catch (error) {
    console.error("Feedback Error:", error);
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});

app.patch("/api/complaints/:id", async (req, res) => {
  const { status } = req.body;
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ error: "Not logged in" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    db.prepare("UPDATE complaints SET status = ? WHERE id = ?").run(status, req.params.id);
    
    // Audit Trail
    await logAudit(Number(req.params.id), decoded.id, "STATUS_UPDATE", `Status changed to ${status}`);

    // Notify Student
    const complaint = db.prepare("SELECT student_id, title FROM complaints WHERE id = ?").get(req.params.id) as any;
    if (complaint) {
      sendNotification(complaint.student_id, `Your complaint "${complaint.title}" is now ${status}`, "STATUS_CHANGE");
    }

    res.json({ success: true });
  } catch (e) {
    res.status(401).json({ error: "Invalid token" });
  }
});

app.get("/api/complaints/:id/audit", (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ error: "Not logged in" });

  try {
    const logs = db.prepare(`
      SELECT a.*, u.name as user_name 
      FROM audit_trail a 
      JOIN users u ON a.user_id = u.id 
      WHERE a.complaint_id = ? 
      ORDER BY a.timestamp ASC
    `).all(req.params.id);
    res.json(logs);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch audit trail" });
  }
});

// AI Advanced Features Endpoints
app.post("/api/ai/draft-reply", async (req, res) => {
  const { complaint_id } = req.body;
  try {
    const complaint = db.prepare("SELECT * FROM complaints WHERE id = ?").get(complaint_id) as any;
    if (!complaint) return res.status(404).json({ error: "Complaint not found" });

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `You are an administrative assistant at a university. Draft a professional, empathetic, and concise reply to the following student complaint. Also provide a 1-sentence SOP (Standard Operating Procedure) for the staff to follow.\n\nComplaint Title: ${complaint.title}\nComplaint Text: ${complaint.text}\nCategory: ${complaint.category}\nPriority: ${complaint.priority}`
    });

    res.json({ draft: response.text });
  } catch (error) {
    res.status(500).json({ error: "AI failed to generate draft" });
  }
});

app.get("/api/ai/root-causes", async (req, res) => {
  try {
    const complaints = db.prepare("SELECT text, category, created_at FROM complaints WHERE created_at >= date('now', '-30 days')").all() as any[];
    if (complaints.length < 5) return res.json({ alerts: [] });

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Analyze the following list of student complaints from the last 30 days. Identify recurring issues or "root causes". Return a JSON array of objects, each with "issue" (string), "department" (string), and "recommendation" (string). Output ONLY the JSON.\n\nComplaints: ${JSON.stringify(complaints)}`
    });

    const text = response.text.replace(/```json|```/g, "").trim();
    res.json({ alerts: JSON.parse(text) });
  } catch (error) {
    res.status(500).json({ error: "AI failed to mine root causes" });
  }
});

app.get("/api/ai/forecast", async (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT category, COUNT(*) as count, date(created_at) as date 
      FROM complaints 
      WHERE created_at >= date('now', '-30 days')
      GROUP BY category, date(created_at)
    `).all();

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Based on the following historical complaint data from the last 30 days, forecast the complaint volume for the NEXT 7 days. Identify which department is likely to see a surge. Return a JSON object with "forecast" (array of {date, predicted_count}), "surge_department" (string), and "reason" (string). Output ONLY the JSON.\n\nData: ${JSON.stringify(stats)}`
    });

    const text = response.text.replace(/```json|```/g, "").trim();
    res.json(JSON.parse(text));
  } catch (error) {
    res.status(500).json({ error: "AI failed to generate forecast" });
  }
});

app.get("/api/notifications", (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ error: "Not logged in" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const notifications = db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50").all(decoded.id);
    res.json(notifications);
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
});

app.patch("/api/notifications/:id/read", (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ error: "Not logged in" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?").run(req.params.id, decoded.id);
    res.json({ success: true });
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
});

app.get("/api/stats", (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ error: "Not logged in" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = db.prepare("SELECT role, id, department FROM users WHERE id = ?").get(decoded.id) as any;
    if (!user) return res.status(401).json({ error: "User not found" });

    let stats;
    if (user.role === 'Student') {
      stats = {
        total: (db.prepare("SELECT COUNT(*) as count FROM complaints WHERE student_id = ?").get(user.id) as any).count,
        resolved: (db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'Resolved' AND student_id = ?").get(user.id) as any).count,
        byCategory: db.prepare("SELECT category as name, COUNT(*) as value FROM complaints WHERE student_id = ? GROUP BY category").all(user.id),
        byStatus: db.prepare("SELECT status as name, COUNT(*) as value FROM complaints WHERE student_id = ? GROUP BY status").all(user.id),
        byPriority: db.prepare("SELECT priority as name, COUNT(*) as value FROM complaints WHERE student_id = ? GROUP BY priority").all(user.id),
        overTime: db.prepare(`
          SELECT date(created_at) as date, COUNT(*) as count 
          FROM complaints 
          WHERE student_id = ? AND created_at >= date('now', '-7 days')
          GROUP BY date(created_at)
          ORDER BY date ASC
        `).all(user.id),
        riskHeatmap: db.prepare(`
          SELECT category, priority, COUNT(*) as count 
          FROM complaints 
          WHERE student_id = ?
          GROUP BY category, priority
        `).all(user.id)
      };
    } else if (user.role === 'Staff') {
      stats = {
        total: (db.prepare("SELECT COUNT(*) as count FROM complaints WHERE category = ?").get(user.department) as any).count,
        resolved: (db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'Resolved' AND category = ?").get(user.department) as any).count,
        byCategory: db.prepare("SELECT category as name, COUNT(*) as value FROM complaints WHERE category = ? GROUP BY category").all(user.department),
        byStatus: db.prepare("SELECT status as name, COUNT(*) as value FROM complaints WHERE category = ? GROUP BY status").all(user.department),
        byPriority: db.prepare("SELECT priority as name, COUNT(*) as value FROM complaints WHERE category = ? GROUP BY priority").all(user.department),
        overTime: db.prepare(`
          SELECT date(created_at) as date, COUNT(*) as count 
          FROM complaints 
          WHERE category = ? AND created_at >= date('now', '-7 days')
          GROUP BY date(created_at)
          ORDER BY date ASC
        `).all(user.department),
        riskHeatmap: db.prepare(`
          SELECT category, priority, COUNT(*) as count 
          FROM complaints 
          WHERE category = ?
          GROUP BY category, priority
        `).all(user.department)
      };
    } else {
      stats = {
        total: (db.prepare("SELECT COUNT(*) as count FROM complaints").get() as any).count,
        resolved: (db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'Resolved'").get() as any).count,
        byCategory: db.prepare("SELECT category as name, COUNT(*) as value FROM complaints GROUP BY category").all(),
        byStatus: db.prepare("SELECT status as name, COUNT(*) as value FROM complaints GROUP BY status").all(),
        byPriority: db.prepare("SELECT priority as name, COUNT(*) as value FROM complaints GROUP BY priority").all(),
        overTime: db.prepare(`
          SELECT date(created_at) as date, COUNT(*) as count 
          FROM complaints 
          WHERE created_at >= date('now', '-7 days')
          GROUP BY date(created_at)
          ORDER BY date ASC
        `).all(),
        riskHeatmap: db.prepare(`
          SELECT category, priority, COUNT(*) as count 
          FROM complaints 
          GROUP BY category, priority
        `).all(),
        governance: {
          trustScore: (db.prepare(`
            SELECT AVG(rating) * 20 as score 
            FROM feedback
          `).get() as any).score || 75,
          slaBreachProb: (db.prepare(`
            SELECT (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM complaints)) as prob
            FROM complaints 
            WHERE status != 'Resolved' AND priority IN ('High', 'Critical')
          `).get() as any).prob || 15,
          policyEffectiveness: (db.prepare(`
            SELECT (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM complaints)) as score
            FROM complaints 
            WHERE status = 'Resolved'
          `).get() as any).score || 80
        }
      };
    }
    res.json(stats);
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
});

// Vite Integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  server.listen(3000, "0.0.0.0", () => {
    console.log("SCMS v3.0 Server running on port 3000");
  });
}

startServer();
