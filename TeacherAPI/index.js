const e1 = require('express');
const app = e1();

app.use(e1.json());
app.use(e1.urlencoded({ extended: true }));

// ─── IN-MEMORY STORE ──────────────────────────────────────────────────────────
let teachers = [
    { id: 1, name: 'Mr. Sokha',  age: 40, subject: 'Computer Science', email: 'sokha@example.com',  phone: '012-100-001', address: 'Phnom Penh', status: 'active' },
    { id: 2, name: 'Ms. Sreyla', age: 35, subject: 'Math',             email: 'sreyla@example.com', phone: '012-100-002', address: 'Siem Reap',   status: 'active' },
    { id: 3, name: 'Mr. Visal',  age: 38, subject: 'Physics',          email: 'visal@example.com',  phone: '012-100-003', address: 'Battambang',  status: 'inactive' },
];

let assignments = [
    { id: 1, teacherId: 1, title: 'Homework 1', subject: 'Computer Science', description: 'Build a REST API',  dueDate: '2025-04-01', status: 'open' },
    { id: 2, teacherId: 2, title: 'Homework 2', subject: 'Math',             description: 'Solve calculus ex', dueDate: '2025-04-05', status: 'open' },
];

let nextTeacherId    = 4;
let nextAssignmentId = 3;

// ─── HEALTH CHECK API ─────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({ message: 'Teacher Service is running', version: '1.0.0', timestamp: new Date().toISOString() });
});

// ════════════════════════════════════════════════════════════════════════════════
//  TEACHER ENDPOINTS
// ════════════════════════════════════════════════════════════════════════════════

// ─── GET ALL TEACHERS API ─────────────────────────────────────────────────────
// GET /teachers
// GET /teachers?subject=Math
// GET /teachers?status=active
app.get('/teachers', (req, res) => {
    let result = [...teachers];
    if (req.query.subject)
        result = result.filter(t => t.subject.toLowerCase().includes(req.query.subject.toLowerCase()));
    if (req.query.status)
        result = result.filter(t => t.status === req.query.status.toLowerCase());
    res.json({ success: true, count: result.length, data: result });
});

// ─── GET TEACHER BY ID API ────────────────────────────────────────────────────
// GET /teachers/1
app.get('/teachers/:id', (req, res) => {
    const teacher = teachers.find(t => t.id === parseInt(req.params.id));
    if (!teacher) return res.status(404).json({ success: false, message: `Teacher with id ${req.params.id} not found.` });
    res.json({ success: true, data: teacher });
});

// ─── SEARCH TEACHERS API ──────────────────────────────────────────────────────
// GET /teachers/search?q=sokha
app.get('/teachers/search', (req, res) => {
    const q = (req.query.q || '').toLowerCase();
    if (!q) return res.status(400).json({ success: false, message: 'Query param ?q= is required.' });
    const result = teachers.filter(t =>
        t.name.toLowerCase().includes(q)    ||
        t.email.toLowerCase().includes(q)   ||
        t.subject.toLowerCase().includes(q) ||
        t.address.toLowerCase().includes(q)
    );
    res.json({ success: true, count: result.length, data: result });
});

// ─── CREATE TEACHER API ───────────────────────────────────────────────────────
// POST /teachers
// Body: { name, age, subject, email, phone, address }
app.post('/teachers', (req, res) => {
    const { name, age, subject, email, phone, address } = req.body;
    if (!name || !subject || !email)
        return res.status(422).json({ success: false, message: 'name, subject and email are required.' });
    if (teachers.find(t => t.email.toLowerCase() === email.toLowerCase()))
        return res.status(409).json({ success: false, message: `Email '${email}' already exists.` });
    const teacher = { id: nextTeacherId++, name, age: age || null, subject, email, phone: phone || null, address: address || null, status: 'active', createdAt: new Date().toISOString() };
    teachers.push(teacher);
    res.status(201).json({ success: true, message: 'Teacher created successfully.', data: teacher });
});

// ─── UPDATE TEACHER API (FULL) ────────────────────────────────────────────────
// PUT /teachers/1
// Body: { name, age, subject, email, phone, address }
app.put('/teachers/:id', (req, res) => {
    const index = teachers.findIndex(t => t.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ success: false, message: `Teacher with id ${req.params.id} not found.` });
    const { name, age, subject, email, phone, address } = req.body;
    if (!name || !subject || !email)
        return res.status(422).json({ success: false, message: 'name, subject and email are required.' });
    if (teachers.find(t => t.email.toLowerCase() === email.toLowerCase() && t.id !== parseInt(req.params.id)))
        return res.status(409).json({ success: false, message: `Email '${email}' is already used by another teacher.` });
    teachers[index] = { ...teachers[index], name, age: age || null, subject, email, phone: phone || null, address: address || null, updatedAt: new Date().toISOString() };
    res.json({ success: true, message: 'Teacher updated successfully.', data: teachers[index] });
});

// ─── PARTIAL UPDATE TEACHER API ───────────────────────────────────────────────
// PATCH /teachers/1
// Body: any fields e.g. { phone: '012-999-999' }
app.patch('/teachers/:id', (req, res) => {
    const index = teachers.findIndex(t => t.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ success: false, message: `Teacher with id ${req.params.id} not found.` });
    if (Object.keys(req.body).length === 0)
        return res.status(400).json({ success: false, message: 'Request body cannot be empty.' });
    if (req.body.email && teachers.find(t => t.email.toLowerCase() === req.body.email.toLowerCase() && t.id !== parseInt(req.params.id)))
        return res.status(409).json({ success: false, message: `Email '${req.body.email}' is already used by another teacher.` });
    teachers[index] = { ...teachers[index], ...req.body, updatedAt: new Date().toISOString() };
    res.json({ success: true, message: 'Teacher partially updated.', data: teachers[index] });
});

// ─── UPDATE TEACHER STATUS API ────────────────────────────────────────────────
// PATCH /teachers/1/status
// Body: { status: 'active' | 'inactive' }
app.patch('/teachers/:id/status', (req, res) => {
    const index = teachers.findIndex(t => t.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ success: false, message: `Teacher with id ${req.params.id} not found.` });
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status))
        return res.status(422).json({ success: false, message: "status must be 'active' or 'inactive'." });
    teachers[index].status = status;
    teachers[index].updatedAt = new Date().toISOString();
    res.json({ success: true, message: `Teacher status updated to '${status}'.`, data: teachers[index] });
});

// ─── DELETE TEACHER API ───────────────────────────────────────────────────────
// DELETE /teachers/1
app.delete('/teachers/:id', (req, res) => {
    const index = teachers.findIndex(t => t.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ success: false, message: `Teacher with id ${req.params.id} not found.` });
    const [deleted] = teachers.splice(index, 1);
    res.json({ success: true, message: 'Teacher deleted successfully.', data: deleted });
});

// ─── DELETE ALL TEACHERS API ──────────────────────────────────────────────────
// DELETE /teachers
app.delete('/teachers', (req, res) => {
    const total = teachers.length;
    teachers = [];
    nextTeacherId = 1;
    res.json({ success: true, message: `All ${total} teachers deleted successfully.` });
});

// ════════════════════════════════════════════════════════════════════════════════
//  ASSIGNMENT ENDPOINTS
// ════════════════════════════════════════════════════════════════════════════════

// ─── GET ALL ASSIGNMENTS API ──────────────────────────────────────────────────
// GET /assignments
// GET /assignments?teacherId=1
// GET /assignments?status=open
app.get('/assignments', (req, res) => {
    let result = [...assignments];
    if (req.query.teacherId)
        result = result.filter(a => a.teacherId === parseInt(req.query.teacherId));
    if (req.query.status)
        result = result.filter(a => a.status === req.query.status.toLowerCase());
    res.json({ success: true, count: result.length, data: result });
});

// ─── GET ASSIGNMENT BY ID API ─────────────────────────────────────────────────
// GET /assignments/1
app.get('/assignments/:id', (req, res) => {
    const assignment = assignments.find(a => a.id === parseInt(req.params.id));
    if (!assignment) return res.status(404).json({ success: false, message: `Assignment with id ${req.params.id} not found.` });
    res.json({ success: true, data: assignment });
});

// ─── ADD ASSIGNMENT API ───────────────────────────────────────────────────────
// POST /assignments
// Body: { teacherId, title, subject, description, dueDate }
app.post('/assignments', (req, res) => {
    const { teacherId, title, subject, description, dueDate } = req.body;
    if (!teacherId || !title || !subject)
        return res.status(422).json({ success: false, message: 'teacherId, title and subject are required.' });
    if (!teachers.find(t => t.id === parseInt(teacherId)))
        return res.status(404).json({ success: false, message: `Teacher with id ${teacherId} not found.` });
    const assignment = { id: nextAssignmentId++, teacherId: parseInt(teacherId), title, subject, description: description || null, dueDate: dueDate || null, status: 'open', createdAt: new Date().toISOString() };
    assignments.push(assignment);
    res.status(201).json({ success: true, message: 'Assignment added successfully.', data: assignment });
});

// ─── UPDATE ASSIGNMENT API (FULL) ─────────────────────────────────────────────
// PUT /assignments/1
// Body: { teacherId, title, subject, description, dueDate }
app.put('/assignments/:id', (req, res) => {
    const index = assignments.findIndex(a => a.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ success: false, message: `Assignment with id ${req.params.id} not found.` });
    const { teacherId, title, subject, description, dueDate } = req.body;
    if (!teacherId || !title || !subject)
        return res.status(422).json({ success: false, message: 'teacherId, title and subject are required.' });
    if (!teachers.find(t => t.id === parseInt(teacherId)))
        return res.status(404).json({ success: false, message: `Teacher with id ${teacherId} not found.` });
    assignments[index] = { ...assignments[index], teacherId: parseInt(teacherId), title, subject, description: description || null, dueDate: dueDate || null, updatedAt: new Date().toISOString() };
    res.json({ success: true, message: 'Assignment updated successfully.', data: assignments[index] });
});

// ─── PARTIAL UPDATE ASSIGNMENT API ───────────────────────────────────────────
// PATCH /assignments/1
// Body: any fields e.g. { dueDate: '2025-05-01' }
app.patch('/assignments/:id', (req, res) => {
    const index = assignments.findIndex(a => a.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ success: false, message: `Assignment with id ${req.params.id} not found.` });
    if (Object.keys(req.body).length === 0)
        return res.status(400).json({ success: false, message: 'Request body cannot be empty.' });
    assignments[index] = { ...assignments[index], ...req.body, updatedAt: new Date().toISOString() };
    res.json({ success: true, message: 'Assignment partially updated.', data: assignments[index] });
});

// ─── UPDATE ASSIGNMENT STATUS API ─────────────────────────────────────────────
// PATCH /assignments/1/status
// Body: { status: 'open' | 'closed' }
app.patch('/assignments/:id/status', (req, res) => {
    const index = assignments.findIndex(a => a.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ success: false, message: `Assignment with id ${req.params.id} not found.` });
    const { status } = req.body;
    if (!['open', 'closed'].includes(status))
        return res.status(422).json({ success: false, message: "status must be 'open' or 'closed'." });
    assignments[index].status = status;
    assignments[index].updatedAt = new Date().toISOString();
    res.json({ success: true, message: `Assignment status updated to '${status}'.`, data: assignments[index] });
});

// ─── REMOVE ASSIGNMENT API ────────────────────────────────────────────────────
// DELETE /assignments/1
app.delete('/assignments/:id', (req, res) => {
    const index = assignments.findIndex(a => a.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ success: false, message: `Assignment with id ${req.params.id} not found.` });
    const [deleted] = assignments.splice(index, 1);
    res.json({ success: true, message: 'Assignment removed successfully.', data: deleted });
});

// ─── REMOVE ALL ASSIGNMENTS API ───────────────────────────────────────────────
// DELETE /assignments
app.delete('/assignments', (req, res) => {
    const total = assignments.length;
    assignments = [];
    nextAssignmentId = 1;
    res.json({ success: true, message: `All ${total} assignments removed successfully.` });
});

// ─── GET ALL ASSIGNMENTS BY TEACHER API ───────────────────────────────────────
// GET /teachers/1/assignments
app.get('/teachers/:id/assignments', (req, res) => {
    const teacher = teachers.find(t => t.id === parseInt(req.params.id));
    if (!teacher) return res.status(404).json({ success: false, message: `Teacher with id ${req.params.id} not found.` });
    const result = assignments.filter(a => a.teacherId === parseInt(req.params.id));
    res.json({ success: true, teacher: teacher.name, count: result.length, data: result });
});

// ─── SEARCH STUDENT API ───────────────────────────────────────────────────────
// GET /searchstudent?q=dapravith
app.get('/searchstudent', (req, res) => {
    const q = (req.query.q || '').toLowerCase();
    if (!q) return res.status(400).json({ success: false, message: 'Query param ?q= is required.' });
    res.json({ success: true, message: `Search results for '${q}' — connect to StudentAPI on port 5000 for full results.`, query: q });
});

// START THE EXPRESS SERVER. 5001 is the PORT NUMBER
console.clear();
app.listen(5001, () =>
    console.log('EXPRESS Server Started at Port No: 5001'));