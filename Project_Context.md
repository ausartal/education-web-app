# AKURAT - Enhanced Project Context

## Project Summary

**AKURAT** (Asesmen Kimia Ukur Adaptif Terpadu) adalah platform edukasi berbasis AI menggunakan teknologi **Multistage Adaptive Testing (MSAT)** khusus untuk asesmen Chemistry Stoichiometry. Platform ini dirancang untuk pembelajaran, latihan, ujian adaptif, dan analisis mendalam profil pemahaman konsep serta miskonsepsi siswa.

**Target Primary**: Asosiasi Kimia Indonesia (eksklusif untuk anggota)  
**Secondary Targets**: SMA, Lembaga Kursus, Guru Privat, Platform Tryout Online, Pelatihan Akademik

---

## 1. DESIGN PHILOSOPHY & VISUAL LANGUAGE

### Core Design Inspiration

Platform AKURAT mengadopsi best practices dari tiga platform edukasi terkemuka:

#### 🎯 **Brilliant.org** - Clean Minimalism
- **White space dominance**: Generous padding dan margin untuk breathability
- **Typography hierarchy**: Clear distinction antara headings, body, dan metadata
- **Card-based layouts**: Modular content blocks dengan subtle shadows
- **Interactive learning**: Visual representations dari konsep abstract
- **Progress indicators**: Clear visual feedback untuk completion status
- **Focused content**: One concept per screen, no clutter

**Key Takeaways:**
- Prioritize content clarity over decoration
- Use geometric shapes untuk iconography
- Minimal color palette dengan strategic accents
- Clean sans-serif typography (modern, readable)

#### 💚 **Duolingo** - Playful Engagement
- **Gamification elements**: XP, streaks, achievements, leaderboards
- **Character/mascot integration**: Friendly visual guides (optional untuk AKURAT)
- **Colorful UI**: Bold, vibrant colors untuk engagement
- **Micro-interactions**: Delightful animations pada user actions
- **Progress visualization**: Linear paths dengan clear milestones
- **Encouragement patterns**: Positive reinforcement messaging
- **Accessible language**: Simple, friendly copy (tidak formal berlebihan)

**Key Takeaways:**
- Make learning fun, not intimidating
- Use bright, energetic colors
- Celebrate small wins dengan animations
- Clear visual progress tracking
- Streak mechanics untuk habit building

#### 👥 **ClassDojo** - Community & Communication
- **User avatars**: Personalized visual identity
- **Activity feeds**: Real-time updates dan notifications
- **Parent-teacher communication**: Structured messaging systems
- **Behavior tracking**: Visual representation dari progress dan achievements
- **Class management**: Simple tools untuk group organization
- **Positive feedback loops**: Points, badges, rewards

**Key Takeaways:**
- Enable meaningful teacher-student interaction
- Visual feedback mechanisms
- Community building features
- Simple, intuitive navigation
- Mobile-first mindset

---

## 2. DESIGN SYSTEM - COMPREHENSIVE

### Color Palette

#### Primary Colors (Brand Identity)
```css
--primary-blue: #1A73E8;        /* Primary CTAs, links, focus states */
--primary-cyan: #00C2FF;        /* Secondary accents, highlights */
--primary-orange: #FF9500;      /* Warnings, important actions */
--primary-bg: #EDF2F2;          /* Page background */
```

#### Extended Palette (Functional)
```css
/* Success States */
--success-green: #00B84D;
--success-light: #D1FAE5;
--success-dark: #065F46;

/* Warning States */
--warning-orange: #FFB800;
--warning-light: #FEF3C7;
--warning-dark: #92400E;

/* Error States */
--error-red: #E63946;
--error-light: #FEE2E2;
--error-dark: #991B1B;

/* Neutral Grays */
--gray-50: #F8FAFB;
--gray-100: #F1F5F9;
--gray-200: #E2E8F0;
--gray-300: #CBD5E1;
--gray-400: #94A3B8;
--gray-500: #64748B;
--gray-600: #475569;
--gray-700: #334155;
--gray-800: #1E293B;
--gray-900: #0F172A;

/* Text Colors */
--text-primary: #0F172A;
--text-secondary: #475569;
--text-tertiary: #94A3B8;
--text-inverted: #FFFFFF;

/* Semantic Colors */
--info-blue: #3B82F6;
--info-light: #DBEAFE;
--achievement-gold: #FFD700;
--achievement-silver: #C0C0C0;
--achievement-bronze: #CD7F32;
```

#### Gradient Definitions
```css
--gradient-primary: linear-gradient(135deg, #1A73E8 0%, #00C2FF 100%);
--gradient-warm: linear-gradient(135deg, #FF9500 0%, #FFB84D 100%);
--gradient-success: linear-gradient(135deg, #00B84D 0%, #4ADE80 100%);
--gradient-purple: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%);
--gradient-hero: linear-gradient(135deg, #1A73E8 0%, #00C2FF 50%, #00D9FF 100%);
```

### Typography System

#### Font Families
```css
--font-display: 'Poppins', 'Nunito', -apple-system, BlinkMacSystemFont, sans-serif;
--font-body: 'Inter', 'Nunito', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'Fira Code', 'JetBrains Mono', monospace;
--font-math: 'KaTeX_Main', 'Latin Modern Math', serif;
```

**Rationale:**
- **Poppins/Nunito**: Playful, friendly untuk headings (Duolingo-inspired)
- **Inter**: Professional, highly readable untuk body text (Brilliant-inspired)
- **Fira Code**: Technical content, code snippets
- **Math fonts**: Chemical formulas, equations

#### Type Scale
```css
/* Display (Hero Sections) */
--text-5xl: 3.5rem;   /* 56px */
--text-4xl: 3rem;     /* 48px */
--text-3xl: 2.5rem;   /* 40px */

/* Headings */
--text-2xl: 2rem;     /* 32px */
--text-xl: 1.5rem;    /* 24px */
--text-lg: 1.25rem;   /* 20px */

/* Body */
--text-base: 1rem;    /* 16px */
--text-sm: 0.875rem;  /* 14px */
--text-xs: 0.75rem;   /* 12px */

/* Line Heights */
--leading-tight: 1.2;
--leading-normal: 1.5;
--leading-relaxed: 1.75;

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
--font-extrabold: 800;
```

### Spacing System

```css
/* Base Unit: 4px */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
```

### Border Radius

```css
--radius-sm: 0.375rem;   /* 6px - buttons, inputs */
--radius-md: 0.5rem;     /* 8px - cards */
--radius-lg: 0.75rem;    /* 12px - modals */
--radius-xl: 1rem;       /* 16px - featured cards */
--radius-2xl: 1.25rem;   /* 20px - hero sections */
--radius-3xl: 1.5rem;    /* 24px - special cards */
--radius-full: 9999px;   /* circular elements */
```

### Shadows & Elevation

```css
/* Subtle to Prominent */
--shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.06);
--shadow-md: 0 4px 20px rgba(0, 0, 0, 0.08);
--shadow-lg: 0 8px 30px rgba(0, 0, 0, 0.12);
--shadow-xl: 0 12px 40px rgba(0, 0, 0, 0.15);
--shadow-2xl: 0 20px 60px rgba(0, 0, 0, 0.20);

/* Colored Shadows (for emphasis) */
--shadow-primary: 0 4px 20px rgba(26, 115, 232, 0.25);
--shadow-success: 0 4px 20px rgba(0, 184, 77, 0.25);
--shadow-warning: 0 4px 20px rgba(255, 149, 0, 0.25);
```

### Animation & Motion

```css
/* Timing Functions */
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);

/* Durations */
--duration-fast: 150ms;
--duration-normal: 300ms;
--duration-slow: 500ms;
--duration-slower: 800ms;
```

**Animation Principles (Duolingo-inspired):**
- **Celebrate success**: Scale + color transitions untuk correct answers
- **Gentle feedback**: Shake animation untuk errors
- **Smooth transitions**: Fade + slide untuk page changes
- **Progress animations**: Linear fill untuk progress bars
- **Micro-interactions**: Hover states dengan subtle scale

---

## 3. UI/UX PATTERNS & COMPONENTS

### Navigation Patterns

#### Primary Navigation (Desktop)
```
┌─────────────────────────────────────────────────────────────┐
│  [LOGO] AKURAT    Dashboard  Materi  Latihan  Ujian  [🔔][👤] │
└─────────────────────────────────────────────────────────────┘
```

**Specifications:**
- **Height**: 64px
- **Background**: White (#FFFFFF) dengan shadow-sm
- **Logo**: 40px icon + brand name
- **Nav links**: 16px font, 600 weight, hover dengan primary color
- **Icons**: 24px, notification badge untuk unread
- **Sticky positioning**: Fixed pada scroll

#### Mobile Navigation (Bottom Tab Bar)
```
┌─────────────────────────────────────────────┐
│  [🏠]   [📚]   [✏️]   [🎓]   [👤]  │
│  Home  Materi Latihan Ujian Profil           │
└─────────────────────────────────────────────┘
```

**Specifications:**
- **Height**: 56px
- **Icons**: 28px, active state dengan primary color
- **Labels**: 12px, optional on small screens
- **Active indicator**: Underline atau background fill

### Dashboard Layouts

#### Student Dashboard Structure

```
┌──────────────────────────────────────────────────────┐
│  [Hero Section - Welcome Banner + Streak Badge]      │
├──────────────────────────────────────────────────────┤
│  [Stats Grid - 4 Cards: XP, Progress, Score, Badges] │
├──────────────────────────────────────────────────────┤
│  [Quick Actions - 4 Buttons: Continue, Practice, etc]│
├──────────────────────────────────────────────────────┤
│  [Learning Path - Material Cards dengan Progress]    │
├──────────────────────────────────────────────────────┤
│  [Achievements - Badge Grid]                         │
├──────────────────────────────────────────────────────┤
│  [Leaderboard - Top 5 + User Position]              │
└──────────────────────────────────────────────────────┘
```

**Hero Section (Duolingo-style):**
- Full-width gradient background
- Large heading: "Selamat Datang Kembali, [Name]! 👋"
- Motivational subtitle
- Streak badge dengan fire emoji 🔥
- Call-to-action button

**Stats Cards (Brilliant-style):**
- Grid layout: 4 columns desktop, 2 columns tablet, 1 column mobile
- Card structure:
  - Icon (48px) dengan gradient background
  - Value (2rem, bold)
  - Label (0.9rem, secondary color)
  - Progress bar (8px height)
- Hover effect: Lift dengan shadow

**Learning Path Cards:**
- Visual header (140px height) dengan gradient + emoji/icon
- Title + description
- Progress indicator (percentage)
- Status badge (Completed, In Progress, Locked)
- Hover: Scale up + shadow increase

### Component Library

#### Buttons

**Primary Button**
```html
<button class="btn-primary">
  Mulai Belajar
</button>
```
- Background: gradient-primary
- Color: white
- Padding: 12px 24px
- Border-radius: radius-lg
- Font-weight: 600
- Hover: Scale 1.05 + shadow
- Active: Scale 0.98

**Secondary Button**
```html
<button class="btn-secondary">
  Lihat Detail
</button>
```
- Background: transparent
- Border: 2px solid primary
- Color: primary
- Same sizing as primary
- Hover: Background primary, color white

**Icon Button**
```html
<button class="btn-icon">
  <svg>...</svg>
</button>
```
- Size: 40px × 40px
- Border-radius: radius-md
- Center icon (24px)
- Hover: Background gray-100

#### Input Fields

**Text Input (Brilliant-style clean)**
```html
<div class="input-group">
  <label>Email Address</label>
  <input type="email" placeholder="name@example.com">
</div>
```
- Label: 14px, semibold, gray-700
- Input height: 48px
- Border: 2px solid gray-200
- Focus: Border primary, shadow-primary
- Border-radius: radius-md
- Padding: 12px 16px

**Text Area**
```html
<textarea rows="4" placeholder="Tulis pertanyaan..."></textarea>
```
- Same styling as text input
- Min-height: 120px
- Resize: vertical only

#### Cards

**Standard Card**
```html
<div class="card">
  <div class="card-header">Title</div>
  <div class="card-body">Content</div>
  <div class="card-footer">Actions</div>
</div>
```
- Background: white
- Border-radius: radius-xl
- Shadow: shadow-md
- Padding: 24px
- Hover: shadow-lg

**Lesson Card (Custom)**
```html
<div class="lesson-card">
  <div class="lesson-visual">🧪</div>
  <div class="lesson-content">
    <h3>Title</h3>
    <p>Description</p>
    <div class="progress-bar">
      <div class="progress-fill" style="width: 75%"></div>
    </div>
  </div>
  <div class="lesson-status">In Progress</div>
</div>
```

#### Progress Indicators

**Linear Progress Bar (Duolingo-style)**
```html
<div class="progress-wrapper">
  <div class="progress-label">
    <span>Progress</span>
    <span>75%</span>
  </div>
  <div class="progress-track">
    <div class="progress-fill" style="width: 75%"></div>
  </div>
</div>
```
- Track: 8px height, gray-200 background
- Fill: gradient-primary
- Border-radius: radius-full
- Animation: Smooth width transition (1s ease-out)

**Circular Progress (for achievements)**
```html
<svg class="circular-progress" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="45" />
  <circle cx="50" cy="50" r="45" stroke-dasharray="282.7" stroke-dashoffset="70.7"/>
</svg>
```
- Size: 80px or 120px
- Stroke-width: 8
- Animated on mount

#### Badges & Tags

**Achievement Badge**
```html
<div class="achievement-badge">
  <div class="badge-icon">🏆</div>
  <div class="badge-name">Quiz Master</div>
</div>
```
- Circle: 80px diameter
- Gradient background based on tier (gold/silver/bronze)
- Shadow: shadow-lg
- Hover: Scale 1.1

**Status Badge**
```html
<span class="badge badge-success">Completed</span>
<span class="badge badge-warning">In Progress</span>
<span class="badge badge-gray">Locked</span>
```
- Padding: 6px 12px
- Border-radius: radius-full
- Font-size: 12px
- Font-weight: 700

#### Modal/Dialog

**Modal Structure**
```html
<div class="modal-overlay">
  <div class="modal-content">
    <div class="modal-header">
      <h2>Title</h2>
      <button class="modal-close">×</button>
    </div>
    <div class="modal-body">
      Content
    </div>
    <div class="modal-footer">
      <button class="btn-secondary">Cancel</button>
      <button class="btn-primary">Confirm</button>
    </div>
  </div>
</div>
```
- Overlay: rgba(0,0,0,0.5) dengan backdrop-filter blur
- Content: max-width 600px, border-radius radius-2xl
- Animation: Fade in overlay + scale in content
- Close on overlay click atau ESC key

#### Toast Notifications (ClassDojo-style)

```html
<div class="toast toast-success">
  <div class="toast-icon">✓</div>
  <div class="toast-message">Materi berhasil diselesaikan!</div>
  <button class="toast-close">×</button>
</div>
```
- Position: Fixed top-right
- Width: 360px max
- Auto-dismiss: 3-5 seconds
- Slide in from right
- Types: success, error, warning, info

---

## 4. PAGE-SPECIFIC DESIGNS

### Homepage / Landing Page

**Structure (Duolingo-inspired):**

```
┌────────────────────────────────────────────┐
│  [Navbar]                                  │
├────────────────────────────────────────────┤
│  [Hero Section]                            │
│  - Headline + Subtitle                     │
│  - CTA Buttons                             │
│  - Hero Illustration (chemistry themed)    │
├────────────────────────────────────────────┤
│  [Features Grid - 3 Columns]               │
│  - Adaptive Learning                       │
│  - Misconception Analysis                  │
│  - Progress Tracking                       │
├────────────────────────────────────────────┤
│  [How It Works - Step-by-Step]             │
│  - Visual timeline dengan icons            │
├────────────────────────────────────────────┤
│  [Testimonials - Student Success Stories]  │
├────────────────────────────────────────────┤
│  [CTA Section - Start Learning]            │
├────────────────────────────────────────────┤
│  [Footer]                                  │
└────────────────────────────────────────────┘
```

**Key Elements:**
- **Hero**: Full-screen gradient background, large heading (3xl), CTA buttons
- **Features**: Icon + title + description cards
- **Process**: Numbered steps dengan connecting lines
- **Social proof**: Student testimonials dengan avatars
- **Final CTA**: Prominent signup section

### Student Dashboard (Detailed)

**Components:**

1. **Welcome Hero**
   - Greeting dengan user name
   - Current streak display
   - Today's goal progress
   - Quick start button

2. **Activity Stats (4-card grid)**
   - Total XP earned
   - Materials completed (x/y)
   - Average quiz score
   - Achievements unlocked

3. **Learning Path**
   - Current lesson highlight
   - Next 3 recommended lessons
   - Each card shows: title, icon, progress, estimated time
   - Clear visual hierarchy dari completed → in progress → locked

4. **Quick Actions**
   - Continue learning (primary)
   - Practice quiz
   - Take exam
   - Ask teacher

5. **Recent Activity Feed**
   - Timeline format
   - Types: lesson completed, quiz passed, achievement earned
   - Timestamps

6. **Leaderboard Widget**
   - Top 5 students
   - User position highlighted
   - Weekly/Monthly toggle

### Material Reading Page (Brilliant-inspired)

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  [Breadcrumb: Home > Materi > Konsep Mol]       │
├─────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────────────────┐  │
│  │ Table of    │  │  [Main Content]          │  │
│  │ Contents    │  │                          │  │
│  │             │  │  # Heading               │  │
│  │ - Section 1 │  │  Paragraph text...       │  │
│  │ - Section 2 │  │                          │  │
│  │ - Section 3 │  │  [Formula Display]       │  │
│  │             │  │                          │  │
│  │ [Progress]  │  │  [Diagram/Image]         │  │
│  │ 65% complete│  │                          │  │
│  └─────────────┘  │  [Interactive Example]   │  │
│                   │                          │  │
│                   │  [Practice Question]     │  │
│                   │                          │  │
│                   └──────────────────────────┘  │
├─────────────────────────────────────────────────┤
│  [Navigation: ← Previous | Next →]              │
│  [Mark as Complete Button]                      │
└─────────────────────────────────────────────────┘
```

**Features:**
- Sidebar TOC dengan auto-highlight active section
- Clean typography dengan generous line-height
- MathJax rendering untuk chemical equations
- Embedded interactive elements
- Progress tracking
- Smooth scroll to sections

### Quiz Interface

**Question Screen:**
```
┌──────────────────────────────────────────┐
│  [Timer: 10:00] [Progress: 5/15]         │
├──────────────────────────────────────────┤
│  Question 5 of 15                        │
│                                          │
│  Berapa mol dalam 88g CO₂?               │
│  (Ar C=12, O=16)                         │
│                                          │
│  ○ A. 1 mol                              │
│  ○ B. 2 mol                              │
│  ○ C. 3 mol                              │
│  ○ D. 4 mol                              │
│  ○ E. 5 mol                              │
│                                          │
│  [Calculator] [Skip] [Submit Answer]     │
└──────────────────────────────────────────┘
```

**Features:**
- Large, readable question text
- Clear option selection (radio buttons)
- Timer dengan color change (green → yellow → red)
- Progress indicator
- Inline calculator tool
- Keyboard navigation (A-E keys)
- Immediate feedback setelah submit (untuk practice mode)

**Feedback Screen (Practice Mode):**
```
┌──────────────────────────────────────────┐
│  ✓ Correct! +10 XP                       │
│                                          │
│  Explanation:                            │
│  88g CO₂ ÷ 44g/mol = 2 mol               │
│                                          │
│  [Next Question →]                       │
└──────────────────────────────────────────┘
```

### Exam Interface (MSAT Mode)

**Stricter Design:**
- No feedback during exam
- No skip option
- Mandatory confidence rating after each question
- Auto-save every response
- Warning before exit
- Disconnect recovery

**Confidence Rating UI:**
```
┌──────────────────────────────────────────┐
│  Seberapa yakin Anda dengan jawaban ini? │
│                                          │
│  ┌──────────┐  ┌──────────┐            │
│  │  YAKIN   │  │ TIDAK    │            │
│  │    😊    │  │ YAKIN 😕 │            │
│  └──────────┘  └──────────┘            │
└──────────────────────────────────────────┘
```

### Results Page

**Summary Card:**
```
┌────────────────────────────────────────────┐
│  🎉 Quiz Completed!                        │
│                                            │
│  Your Score: 85%                           │
│  ████████░░ 17/20 correct                  │
│                                            │
│  Time Spent: 18 minutes                    │
│  XP Earned: +120                           │
│                                            │
│  Competency Level: Paham Konsep            │
│                                            │
│  [View Detailed Report] [Retake]           │
└────────────────────────────────────────────┘
```

**Detailed Analysis:**
- Per-question breakdown (✓/✗)
- Topic mastery chart (radar/bar chart)
- Misconception identification
- Recommended review topics
- Comparison dengan previous attempts

### Teacher Dashboard

**Layout:**
```
┌────────────────────────────────────────────────┐
│  [Top Stats Bar]                               │
│  Total Students | Active Materials | Avg Score │
├────────────────────────────────────────────────┤
│  [Quick Actions]                               │
│  + Create Material | + Create Quiz | + Message │
├────────────────────────────────────────────────┤
│  [Student Management Table]                    │
│  Name | Progress | Last Active | Actions       │
├────────────────────────────────────────────────┤
│  [Recent Activity Feed]                        │
│  Quiz submissions, material completions, etc   │
└────────────────────────────────────────────────┘
```

**Student Detail View:**
- Profile card dengan photo/avatar
- Progress timeline
- Quiz history table
- Misconception profile chart
- Communication thread
- Notes section

### Admin Dashboard

**System Overview:**
```
┌──────────────────────────────────────────┐
│  [KPI Cards - 4 columns]                 │
│  Total Users | Materials | Exams | Usage │
├──────────────────────────────────────────┤
│  [Charts]                                │
│  - User growth (line chart)              │
│  - Engagement metrics (bar chart)        │
│  - Popular topics (pie chart)            │
├──────────────────────────────────────────┤
│  [User Management Table]                 │
│  - Filters: Role, Status, Date           │
│  - Actions: Activate, Deactivate, Edit   │
├──────────────────────────────────────────┤
│  [Content Moderation Queue]              │
│  - Pending materials for approval        │
└──────────────────────────────────────────┘
```

---

## 5. INTERACTION PATTERNS

### Micro-Interactions (Duolingo-inspired)

1. **Correct Answer Animation**
   ```
   - Button scales 1.1x
   - Green checkmark appears dengan bounce
   - Confetti animation (optional)
   - Sound effect (ding!)
   - XP counter animates +10
   ```

2. **Wrong Answer Animation**
   ```
   - Button shakes (horizontal vibration)
   - Red X appears
   - Subtle sad sound
   - Correct answer highlights in green
   ```

3. **Streak Achievement**
   ```
   - Fire emoji grows 1.5x
   - Pulse animation
   - Congratulatory message
   - Share button appears
   ```

4. **Level Up**
   ```
   - Modal popup
   - Fireworks background
   - New level badge reveal
   - Unlock notification for new content
   ```

5. **Progress Bar Fill**
   ```
   - Smooth linear animation (1s duration)
   - Color transition (blue → green when 100%)
   - Particle trail effect (optional)
   ```

### Loading States

**Skeleton Screens (Brilliant-style):**
- Use animated placeholders instead of spinners
- Match actual content layout
- Shimmer effect (gradient moving left-to-right)
- Example:
  ```
  ┌──────────────────────┐
  │ ▓▓▓▓▓▓▓░░░░░░░░     │  ← Title placeholder
  │ ▓▓▓▓░░░░░░░░        │  ← Description line 1
  │ ▓▓▓▓▓░░░░░░         │  ← Description line 2
  └──────────────────────┘
  ```

**Spinner (for actions):**
- Size: 24px or 32px
- Color: Primary blue
- Animation: Rotate 360deg, 1s linear infinite

### Error States

**Empty State Illustrations:**
```
┌────────────────────────────────┐
│                                │
│         [📚 Illustration]       │
│                                │
│    Belum ada materi tersedia   │
│                                │
│  [+ Tambah Materi Pertama]     │
│                                │
└────────────────────────────────┘
```

**Error Messages:**
- Icon + message + action button
- Friendly, helpful copy (not technical jargon)
- Example: "Oops! Koneksi terputus. [Coba Lagi]"

### Responsive Behavior

**Breakpoints:**
```css
/* Mobile First */
@media (min-width: 640px)  { /* sm */ }
@media (min-width: 768px)  { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
@media (min-width: 1536px) { /* 2xl */ }
```

**Mobile Adaptations:**
- Navigation: Bottom tab bar instead of top navbar
- Cards: Stack vertically, full-width
- Font sizes: Reduce by 1 step
- Padding: Reduce by 25-50%
- Hamburger menu untuk secondary navigation
- Touch targets: Minimum 44px × 44px

---

## 6. ACCESSIBILITY (WCAG 2.1 AA)

### Color Contrast

**Text Readability:**
- Normal text (16px): Minimum 4.5:1 contrast ratio
- Large text (24px+): Minimum 3:1 contrast ratio
- Interactive elements: 3:1 against background

**Color Pairings (Verified):**
- `#0F172A` on `#FFFFFF` → 18.4:1 ✓
- `#475569` on `#FFFFFF` → 8.6:1 ✓
- `#1A73E8` on `#FFFFFF` → 4.8:1 ✓
- `#FFFFFF` on `#1A73E8` → 4.8:1 ✓

### Keyboard Navigation

**Tab Order:**
- Logical flow: Top → Bottom, Left → Right
- Skip to main content link
- Focus indicators: 2px solid primary, offset 2px
- All interactive elements keyboard accessible

**Keyboard Shortcuts (Quiz Interface):**
- `1-5` or `A-E`: Select answer
- `Enter`: Submit answer
- `Space`: Toggle calculator
- `Esc`: Exit modal/quiz (dengan confirmation)

### Screen Reader Support

**ARIA Labels:**
```html
<button aria-label="Close modal">×</button>
<div role="progressbar" aria-valuenow="75" aria-valuemin="0" aria-valuemax="100">
  <div class="progress-fill" style="width: 75%"></div>
</div>
<nav aria-label="Main navigation">...</nav>
```

**Semantic HTML:**
- Use `<main>`, `<nav>`, `<aside>`, `<article>`, `<section>`
- Proper heading hierarchy (h1 → h2 → h3)
- `<button>` untuk actions, `<a>` untuk navigation

### Visual Assistance

**Font Sizing:**
- Allow user zoom up to 200% without breaking layout
- Respect user's system font size preferences

**Motion Sensitivity:**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 7. GAMIFICATION STRATEGY (Duolingo-inspired)

### XP System

**Earning Points:**
- Complete lesson: +50 XP
- Finish quiz: +10 XP per correct answer
- Finish exam: +100 XP (bonus based on score)
- Daily login: +5 XP
- Maintain streak: +10 XP per day
- Help another student: +20 XP

**Leveling:**
- Level 1: 0-100 XP
- Level 2: 100-250 XP
- Level 3: 250-500 XP
- Formula: `XP_needed = 100 * (level^1.5)`

### Streak System

**Mechanics:**
- Daily activity requirement: Complete at least 1 lesson OR 1 quiz
- Streak freeze: Use gem/coin to preserve streak (max 2 per month)
- Streak milestones: 3, 7, 14, 30, 60, 90, 180, 365 days
- Visual: Fire emoji dengan counter, changes color at milestones

**Notifications:**
- Reminder: "Jangan putus streak 5 hari Anda! 🔥"
- Encouragement: "1 soal lagi untuk mempertahankan streak!"
- Celebration: "Wow! 30 hari berturut-turut! 🎉"

### Achievement Badges

**Categories:**

1. **Learning Milestones**
   - 🌱 Pemula: Complete first lesson
   - 📚 Pembaca Rajin: Complete 10 lessons
   - 🎓 Sarjana: Complete all lessons in a chapter
   - 🧠 Master: Complete entire curriculum

2. **Performance**
   - 🎯 Perfect Quiz: Score 100% on any quiz
   - ⚡ Speed Demon: Complete quiz under 5 minutes
   - 🔥 Hot Streak: Maintain 7-day streak
   - 💎 Diamond: Maintain 30-day streak

3. **Exploration**
   - 🧪 Experimenter: Use calculator 50 times
   - 💬 Social Butterfly: Send 10 messages to teacher
   - 📊 Analyst: View detailed report 5 times

4. **Special**
   - 🦉 Night Owl: Complete lesson at midnight
   - 🌅 Early Bird: Complete lesson before 6 AM
   - 🎉 Birthday Learner: Study on birthday

### Leaderboard

**Types:**
1. **Global**: All platform users
2. **Class**: Students in same class
3. **Friends**: User-created friend groups

**Time Frames:**
- Daily: Resets at midnight
- Weekly: Monday-Sunday
- Monthly: Calendar month
- All-time: Cumulative

**Display:**
- Top 10 users
- User's position (highlighted)
- Score/XP displayed
- Avatar + username
- Rank change indicator (↑↓)

**Privacy:**
- Opt-out option available
- Nickname instead of real name option
- Hide from global, show only in class

### Rewards & Incentives

**Virtual Currency (Optional):**
- Gems earned from achievements
- Spend on: Streak freezes, cosmetic avatars, themes

**Unlockables:**
- Avatar customization items
- Dashboard themes
- Certificate of completion
- Exam access codes

---

## 8. MOBILE EXPERIENCE

### Mobile-First Considerations

**Touch Interactions:**
- Minimum touch target: 44×44px
- Adequate spacing between tappable elements
- Swipe gestures:
  - Swipe left/right: Navigate questions
  - Pull down: Refresh dashboard
  - Long press: Show context menu

**Performance:**
- Lazy load images
- Infinite scroll pagination
- Compress assets
- Service Worker caching
- Target: FCP < 2s, TTI < 3s on 3G

**Offline Support:**
- Cache lesson content
- Queue quiz submissions
- Offline indicator
- Sync when reconnected

### Mobile Layout Adjustments

**Dashboard:**
- Hero: Reduce height, smaller font
- Stats: 2×2 grid instead of 1×4
- Learning path: Single column
- Leaderboard: Show top 3 instead of 5

**Quiz:**
- Full-screen mode
- Fixed timer at top
- Larger answer buttons (min 60px height)
- Bottom sheet for calculator

**Material Reading:**
- Hide sidebar TOC (collapsible accordion instead)
- Reduce image sizes
- Increase font size (18px base)
- Sticky "Mark Complete" button at bottom

---

## 9. PERFORMANCE OPTIMIZATION

### Image Optimization

**Formats:**
- Use WebP dengan PNG fallback
- SVG untuk icons dan illustrations
- Lazy loading dengan Intersection Observer

**Sizes:**
- Hero images: Max 1920×1080
- Card thumbnails: Max 600×400
- Avatars: 128×128
- Icons: SVG preferred (scalable)

### Code Splitting

**Next.js Dynamic Imports:**
```javascript
const Chart = dynamic(() => import('@/components/Chart'), {
  loading: () => <Skeleton />
})
```

**Route-based splitting:**
- Separate bundles for: Home, Dashboard, Quiz, Exam, Admin
- Shared components bundle
- Vendor bundle (React, libraries)

### Caching Strategy

**Static Assets:**
- Cache-Control: `public, max-age=31536000, immutable`
- Versioned filenames (hash-based)

**API Responses:**
- User profile: 5 minutes
- Material list: 15 minutes
- Leaderboard: 1 minute
- Exam config: 1 hour

**Service Worker:**
- Cache-first: Static assets, fonts
- Network-first: API calls
- Stale-while-revalidate: Images

---

## 10. CONTENT STRATEGY

### Copy Writing Guidelines

**Tone & Voice (Duolingo-inspired):**
- **Friendly**: "Hai! Mari kita pelajari..." (bukan "Anda harus mempelajari...")
- **Encouraging**: "Bagus sekali! Terus semangat!" 
- **Playful**: Use emojis strategically 🎉✨🔥
- **Simple**: Avoid jargon, use everyday language
- **Positive**: Focus on growth, not failure
- **Personal**: "Kamu" instead of "Anda" (informal Indonesian)

**Error Messages:**
```
❌ Generic: "Error 404: Resource not found"
✅ Friendly: "Hmm, halaman ini tidak ditemukan 🤔 Mau kembali ke dashboard?"

❌ Technical: "Failed to submit quiz response"
✅ Helpful: "Koneksi terputus. Tenang, jawaban kamu sudah tersimpan! [Coba Kirim Lagi]"
```

**Empty States:**
```
Instead of: "No data available"
Use: "Belum ada aktivitas hari ini. Yuk mulai belajar! 📚"
```

**Success Messages:**
```
"🎉 Hebat! Materi selesai. +50 XP"
"✨ Perfect! 10/10 benar. Kamu amazing!"
"🔥 Streak 7 hari! Tetap semangat!"
```

### Instructional Design

**Material Structure:**
1. **Learning Objective**: "Setelah mempelajari ini, kamu bisa..."
2. **Prerequisite Check**: "Pastikan kamu sudah paham tentang..."
3. **Content Delivery**: 
   - Explain concept
   - Show example
   - Interactive practice
4. **Summary**: Key takeaways
5. **Practice**: Apply knowledge
6. **Assessment**: Quick quiz

**Question Writing:**
- Clear, unambiguous stem
- Plausible distractors
- Avoid negative phrasing unless testing that specifically
- Include visuals when helpful
- Vary difficulty within quiz

---

## 11. ANALYTICS & TRACKING

### User Events to Track

**Engagement:**
- `page_view`: Every page load
- `session_start`: New session initiated
- `session_duration`: Time spent
- `feature_usage`: Which features used

**Learning:**
- `lesson_started`: User begins reading material
- `lesson_completed`: Material marked complete
- `quiz_started`: Quiz initiated
- `quiz_submitted`: Quiz answers submitted
- `quiz_completed`: Quiz finished
- `exam_started`, `exam_completed`: Exam flow
- `answer_selected`: Each question response
- `confidence_rated`: Confidence level chosen

**Gamification:**
- `xp_earned`: Points gained
- `level_up`: New level achieved
- `streak_continued`: Daily streak maintained
- `streak_broken`: Streak lost
- `achievement_unlocked`: New badge earned
- `leaderboard_viewed`: User checks rankings

**Social:**
- `message_sent`: Student contacts teacher
- `message_received`: Teacher response
- `profile_viewed`: User checks own/others' profile

### Dashboard Metrics (Admin)

**KPIs:**
- DAU (Daily Active Users)
- WAU (Weekly Active Users)
- MAU (Monthly Active Users)
- Retention rate (Day 1, Day 7, Day 30)
- Average session duration
- Lessons completed per user
- Quiz completion rate
- Exam participation rate

**Learning Metrics:**
- Material completion rate by topic
- Average quiz score by topic
- Common wrong answers (misconception analysis)
- Time spent per material
- Re-attempt rate (quizzes)

**Engagement:**
- Streak distribution (how many users at each streak level)
- Achievement unlock rate
- Leaderboard participation
- Feature adoption (calculator, communication, etc)

### A/B Testing

**Test Ideas:**
- Button copy: "Mulai Belajar" vs "Yuk Belajar"
- Color schemes: Blue vs Orange primary
- Gamification: XP visible vs hidden
- Notification timing: Immediate vs delayed
- Onboarding flow: Guided tour vs explore freely

---

## 12. DEVELOPMENT WORKFLOW

### Design-to-Code Process

1. **Design Phase**
   - Figma mockups (all pages)
   - Component library in Figma
   - Interactive prototype
   - Accessibility audit

2. **Implementation**
   - Create design tokens (CSS variables)
   - Build component library (Storybook)
   - Develop pages
   - Integrate backend APIs

3. **Testing**
   - Unit tests (Jest)
   - Component tests (Testing Library)
   - E2E tests (Playwright)
   - Accessibility tests (axe)
   - Performance tests (Lighthouse)

4. **Review**
   - Design QA (pixel-perfect check)
   - Code review (PR process)
   - UX review (user flows)
   - Accessibility review (WCAG compliance)

5. **Deploy**
   - Staging environment testing
   - Production deployment (Vercel)
   - Monitoring (Sentry, Analytics)

### Component Documentation

**Storybook Stories:**
```javascript
export default {
  title: 'Components/Button',
  component: Button,
}

export const Primary = () => <Button variant="primary">Click Me</Button>
export const Secondary = () => <Button variant="secondary">Click Me</Button>
export const Disabled = () => <Button disabled>Click Me</Button>
```

**JSDoc Comments:**
```javascript
/**
 * Primary button component with multiple variants
 * @param {string} variant - Button style: primary, secondary, ghost
 * @param {string} size - Button size: sm, md, lg
 * @param {boolean} disabled - Disabled state
 * @param {function} onClick - Click handler
 */
```

---

## 13. FUTURE ENHANCEMENTS

### Phase 2 Features

**AI Explanations:**
- Natural language explanations for wrong answers
- Adaptive depth based on user proficiency
- Multi-modal explanations (text + visual + analogy)

**Personalized Learning Paths:**
- AI-recommended lesson sequence
- Skip mastered topics
- Focus on weak areas
- Estimated time to mastery

**Social Features:**
- Study groups
- Peer-to-peer messaging
- Collaborative problem solving
- Share achievements on social media

**Advanced Analytics:**
- Predictive modeling (will student pass?)
- Optimal study time recommendations
- Personalized practice problems
- Learning style detection

### Phase 3 Features

**Mobile App (React Native):**
- Native push notifications
- Offline mode
- Camera for scanning chemical equations
- AR visualization of molecules (optional)

**Teacher Tools:**
- Question generator (AI-powered)
- Auto-grading for short answers
- Class performance heatmaps
- Intervention recommendations

**Institutional Features:**
- Multi-school deployment
- District-level analytics
- LMS integration (Moodle, Canvas)
- API for third-party apps

**Research Platform:**
- Data export for researchers
- Anonymized datasets
- Educational research publications
- Partnership programs

---

## 14. APPENDIX

### Design Resources

**Figma Files:**
- Main Design System
- Component Library
- Page Mockups (Desktop)
- Page Mockups (Mobile)
- Icon Library
- Illustration Set

**Assets:**
- Logo files (SVG, PNG)
- Brand guidelines PDF
- Color palette swatches
- Typography specimens
- Example content

### Reference Links

- [Brilliant.org](https://brilliant.org) - Clean minimalism inspiration
- [Duolingo](https://www.duolingo.com) - Gamification & engagement
- [ClassDojo](https://www.classdojo.com) - Teacher-student communication
- [Khan Academy](https://www.khanacademy.org) - Educational content structure
- [Notion](https://www.notion.so) - Modular interface design

### Code Examples

**React Component Template:**
```tsx
import { FC } from 'react'
import styles from './Component.module.css'

interface ComponentProps {
  title: string
  description?: string
  onClick?: () => void
}

export const Component: FC<ComponentProps> = ({ 
  title, 
  description, 
  onClick 
}) => {
  return (
    <div className={styles.container} onClick={onClick}>
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
    </div>
  )
}
```

**CSS Module Template:**
```css
.container {
  background: var(--white);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  box-shadow: var(--shadow-md);
  transition: all var(--duration-normal) var(--ease-out);
}

.container:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.title {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.description {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: var(--leading-relaxed);
}
```

---

## 15. IMPLEMENTATION CHECKLIST

### Design Phase ✓
- [ ] Create comprehensive design system in Figma
- [ ] Design all major pages (Homepage, Dashboard, Quiz, Exam, Results)
- [ ] Build component library
- [ ] Create interactive prototypes
- [ ] Conduct user testing with prototypes
- [ ] Accessibility audit of designs

### Development Phase
- [ ] Set up Next.js project dengan TypeScript
- [ ] Implement design tokens (CSS variables)
- [ ] Build component library dengan Storybook
- [ ] Develop homepage (public)
- [ ] Develop authentication flow
- [ ] Develop student dashboard
- [ ] Develop material reading interface
- [ ] Develop quiz system
- [ ] Develop MSAT exam system
- [ ] Develop results & analytics
- [ ] Develop teacher dashboard
- [ ] Develop admin dashboard
- [ ] Develop communication system

### Testing Phase
- [ ] Unit tests (80%+ coverage)
- [ ] Integration tests (critical flows)
- [ ] E2E tests (Playwright)
- [ ] Accessibility testing (axe, manual)
- [ ] Performance testing (Lighthouse 90+)
- [ ] Cross-browser testing
- [ ] Mobile responsive testing
- [ ] User acceptance testing

### Launch Phase
- [ ] Beta testing dengan pilot group
- [ ] Fix critical bugs
- [ ] Performance optimization
- [ ] SEO optimization
- [ ] Analytics setup
- [ ] Monitoring setup (Sentry)
- [ ] Production deployment
- [ ] Post-launch monitoring
- [ ] Gather user feedback
- [ ] Iterate based on feedback

---

**Document Version**: 3.0 Enhanced  
**Last Updated**: May 2026  
**Authors**: Product Team + Design Team  
**Status**: Design Implementation Ready

---

## QUICK REFERENCE CARD

### Color Variables (Copy-Paste Ready)
```css
:root {
  --primary-blue: #1A73E8;
  --primary-cyan: #00C2FF;
  --primary-orange: #FF9500;
  --bg: #EDF2F2;
  --white: #FFFFFF;
  --text-dark: #0F172A;
  --text-light: #475569;
  --success: #00B84D;
  --warning: #FFB800;
  --error: #E63946;
  
  --gradient-primary: linear-gradient(135deg, #1A73E8 0%, #00C2FF 100%);
  --shadow-md: 0 4px 20px rgba(0, 0, 0, 0.08);
  --radius-xl: 1rem;
}
```

### Component Snippets

**Button:**
```html
<button class="btn btn-primary">Mulai Belajar</button>
```

**Card:**
```html
<div class="card">
  <div class="card-body">
    <h3>Title</h3>
    <p>Description</p>
  </div>
</div>
```

**Progress Bar:**
```html
<div class="progress-bar">
  <div class="progress-fill" style="width: 75%"></div>
</div>
```

### Responsive Breakpoints
```
sm: 640px   (Mobile landscape)
md: 768px   (Tablet)
lg: 1024px  (Desktop)
xl: 1280px  (Large desktop)
```

### Animation Easings
```
Fast: 150ms ease-out
Normal: 300ms ease-in-out
Slow: 500ms ease-in-out
Bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55)
```

---

*End of Enhanced Project Context*