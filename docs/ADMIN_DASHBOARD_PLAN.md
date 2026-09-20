# AKURAT Admin Dashboard — Comprehensive Redesign Plan

## Audit Summary

### Existing API Routes (21 endpoints)
| Endpoint | Methods | Feature |
|----------|---------|---------|
| `/api/admin/analytics` | GET | Dashboard analytics, KPIs, charts |
| `/api/admin/audit` | GET | Audit log list |
| `/api/admin/bulk` | POST | Bulk user actions |
| `/api/admin/certificates` | GET, PATCH, POST | Certificate CRUD |
| `/api/admin/exam-users` | GET, PATCH | External exam users |
| `/api/admin/exam-users/[uid]` | PATCH | Individual exam user |
| `/api/admin/export` | GET | CSV/JSON export |
| `/api/admin/materials` | GET, POST | Learning materials |
| `/api/admin/materials/[id]` | PATCH, DELETE | Individual material |
| `/api/admin/msat` | GET | MSAT exams overview |
| `/api/admin/msat/[examId]` | GET, PATCH | Individual MSAT exam |
| `/api/admin/msat/create` | POST | Create MSAT exam |
| `/api/admin/msat/questions` | GET, POST | MSAT questions |
| `/api/admin/msat/questions/[id]` | PATCH, DELETE | Individual MSAT question |
| `/api/admin/questions` | GET, POST | Practice questions |
| `/api/admin/questions/[id]` | PATCH, DELETE | Individual question |
| `/api/admin/stats` | GET | Platform stats (CLI) |
| `/api/admin/teachers` | GET | Teacher list with stats |
| `/api/admin/ujian` | GET, POST, PATCH, DELETE | School exams full CRUD |
| `/api/admin/users` | GET, POST | User list + create |
| `/api/admin/users/[uid]` | PATCH, DELETE | Individual user |

### Existing Data Models (from firestore.ts)
- **UserProfile**: uid, email, displayName, role, isActive, profile{school,grade,city}, stats{totalLessons,totalQuizzes}, settings
- **Material**: title, description, topic, content, status(draft/published), order, learningObjectives
- **Question**: topic, difficulty, stem, options, correctAnswer, explanation, usageCount, avgCorrectRate
- **ExamSession**: userId, theta, responses[], result, status(in_progress/completed/abandoned/flagged), anomalyFlags
- **Class**: teacherId, name, joinCode, studentIds[], status
- **ExamSchedule**: teacherId, classId, title, examToken, domainIds, durationMinutes, status
- **ExamQuestion**: domainId, tierPath, difficulty, cognitiveLevel, stem, options, correctAnswer
- **MSATExamSession**: studentId, domainResponses[], numericScore, anomalyFlags, status
- **AuditLog**: actorId, action, targetId, targetType, details, timestamp

---

## Navigation Structure (4 Sections)

### 1. UMUM (General)
| Menu | Sub-menu | Description | Data Source | Status |
|------|----------|-------------|-------------|--------|
| Dashboard Overview | — | KPIs, charts, recent activity | `/api/admin/analytics` | ✅ EXISTS - needs polish |
| Analitik | Analitik Umum | Platform-wide analytics, trends, distributions | `/api/admin/analytics` | ✅ EXISTS |
| | Analitik AKURAT Exam | MSAT-specific analytics, domain performance | NEW: `/api/admin/msat` + results | ⚠️ NEEDS BUILD |

### 2. SEKOLAH (School)
| Menu | Sub-menu | Description | Data Source | Status |
|------|----------|-------------|-------------|--------|
| Data Civitas | Daftar Guru | Teacher management, stats, promote/deactivate | `/api/admin/teachers` | ✅ EXISTS |
| | Daftar Siswa | Student management, stats, role change, bulk | `/api/admin/users` | ✅ EXISTS |
| | Daftar Kelas | Class management, student lists, join codes | `/api/admin/ujian` (classes tab) | ⚠️ PARTIAL - needs dedicated page |
| Bank Soal Sekolah | — | Practice questions CRUD, difficulty/status filters | `/api/admin/questions` | ✅ EXISTS |
| Ujian Sekolah | Jadwal Ujian | Exam schedules management | `/api/admin/ujian` (schedules tab) | ⚠️ PARTIAL |
| | Ujian Berjalan | Live exam monitoring | `/api/admin/ujian` (sessions tab) | ⚠️ PARTIAL |
| | Sesi & Hasil | Exam results, comprehension analysis | `/api/admin/ujian` (sessions+stats tabs) | ⚠️ PARTIAL |
| Materi Belajar | — | Learning materials CRUD, publish/draft | `/api/admin/materials` | ✅ EXISTS (under "content") |

### 3. AKURAT EXAM
| Menu | Sub-menu | Description | Data Source | Status |
|------|----------|-------------|-------------|--------|
| Exam Live Monitor | — | Real-time MSAT session monitoring | `/api/admin/msat` | ✅ EXISTS |
| Bank Soal MSAT | — | MSAT questions by domain/tier/difficulty | `/api/admin/msat/questions` | ✅ EXISTS |
| Buat Ujian MSAT | — | Create new MSAT exam (wizard) | `/api/admin/msat/create` | ✅ EXISTS |
| Hasil & Sertifikasi | Skor & Analisis | MSAT results, per-stage breakdown, cognitive profiles | `/api/admin/msat/results` | ✅ EXISTS |
| | Sertifikat Digital | Certificate approval, sending, generation | `/api/admin/certificates` | ✅ EXISTS |
| Peserta Exam | — | External exam users, verification | `/api/admin/exam-users` | ✅ EXISTS |

### 4. SISTEM & PENGATURAN
| Menu | Sub-menu | Description | Data Source | Status |
|------|----------|-------------|-------------|--------|
| Manajemen Akses | User & Permission | Role management, bulk actions | `/api/admin/users` | ✅ EXISTS |
| | Peserta Eksternal | External exam participants | `/api/admin/exam-users` | ✅ EXISTS |
| Audit Trail | — | Activity log, filter by action/actor | `/api/admin/audit` | ✅ EXISTS |
| Developer Tools | CLI Terminal | In-browser admin CLI | Client-side | ✅ EXISTS |
| | Export Data | CSV/JSON export for all collections | `/api/admin/export` | ✅ EXISTS |
| Pengaturan Platform | — | Platform config, branding, notifications | NEW API needed | ⚠️ NEEDS BUILD |

---

## Implementation Plan

### Phase 1: Sidebar + Layout Refinement (Current)
- [x] Sidebar with search, expandable items, Figma-style
- [x] 4 sections with proper grouping
- [ ] Refine active states, transitions, polish

### Phase 2: Dashboard Enhancement
- [ ] Better stat cards with real data + sparklines
- [ ] Recent activity feed from audit logs
- [ ] Quick actions grid
- [ ] System health indicators

### Phase 3: New Pages to Build
1. **Daftar Kelas** (`/admin/classes`) — Dedicated class management page
   - List all classes with teacher, student count, join code
   - View students in each class
   - Archive/activate classes
   - API: Extend `/api/admin/ujian` or new endpoint

2. **Jadwal Ujian** (`/admin/schedules`) — Dedicated schedule management
   - List all exam schedules across classes
   - Filter by status, teacher, class
   - Edit schedule details
   - API: Use existing `/api/admin/ujian`

3. **Pengaturan Platform** (`/admin/config`) — Platform configuration
   - General settings (platform name, timezone)
   - Email/notification settings
   - Security settings (password policy, session timeout)
   - API: New `/api/admin/config` endpoints

### Phase 4: API Extensions
1. `/api/admin/config` — GET/PATCH platform configuration
2. `/api/admin/classes` — Dedicated class CRUD (if needed)
3. Extend `/api/admin/analytics` — MSAT-specific analytics data

### Phase 5: Polish & Quality
- Consistent loading states (skeleton loaders)
- Empty states with helpful messages
- Error handling with retry
- Responsive design
- Accessibility (keyboard nav, ARIA labels)