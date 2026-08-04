# AKURAT Detailed Development Roadmap
**Last Updated**: July 2026  
**Status**: In Planning Phase

---

## PHASE 1: Exam Question Management Enhancement

### 1.1 Analysis & Planning (Week 1-2)

#### 1.1.1 Current System Audit
- [ ] **Document existing question creation flow**
  - [ ] Map current database schema for questions
  - [ ] Identify all question-related tables and fields
  - [ ] Document relationships between questions, quizzes, students, and classes
  - [ ] List all API endpoints related to question management
  - [ ] Screenshot and document UI for question creation
  - [ ] Review code for question validation logic

- [ ] **Analyze permission model**
  - [ ] Document current user roles in system
  - [ ] Identify how class-level questions are currently created
  - [ ] Identify how system-wide questions are currently created
  - [ ] Check if permission checks exist for question creation
  - [ ] Document how student access is determined for questions

- [ ] **Identify pain points & limitations**
  - [ ] List all issues with current question management
  - [ ] Document feature requests from users
  - [ ] Identify performance bottlenecks
  - [ ] Note any data isolation issues

**System Changes Needed:**
```
- Current: Questions may not have clear scope definition
- Change: Add 'question_scope' field to questions table (CLASS_LEVEL, SYSTEM_WIDE)
- Current: No audit trail for question creation
- Change: Add audit_log table with who created/modified questions and when
```

#### 1.1.2 Requirements Analysis
- [ ] **Define class-level question scope**
  - [ ] Questions belong to specific class only
  - [ ] Only teachers of that class can view/modify
  - [ ] Only students in that class can access in quizzes
  - [ ] Questions should not appear in system-wide listings
  - [ ] Archive/delete only affects that class

- [ ] **Define system-wide question scope**
  - [ ] Questions available to all classes/teachers
  - [ ] Centralized management and governance
  - [ ] Permission hierarchy for modifications
  - [ ] Version control for shared questions
  - [ ] Approval workflow documentation

- [ ] **Interview stakeholders**
  - [ ] Ask teachers about current workflow
  - [ ] Ask school admins about governance needs
  - [ ] Ask IT team about security concerns
  - [ ] Document feedback in shared document

**System Changes Needed:**
```
- New table: question_scope_rules
  - scope_type (CLASS_LEVEL, SYSTEM_WIDE, DEPARTMENT_LEVEL)
  - created_by_role (TEACHER, ADMIN, etc)
  - can_modify_roles
  - can_delete_roles
  - visibility_rules

- New table: question_access_log
  - question_id
  - user_id
  - action (CREATE, VIEW, MODIFY, DELETE)
  - timestamp
  - ip_address
```

#### 1.1.3 Research Materials to Gather

**LMS Benchmarking:**
- [ ] Study Google Classroom's question management
  - https://support.google.com/classroom
  - Document how they handle assignment creation at class vs. system level
  
- [ ] Study Moodle's question bank system
  - https://docs.moodle.org/en/Question_bank
  - Research their context system (course, category)
  - Review their permission system
  
- [ ] Study Canvas question management
  - https://canvas.instructure.com/doc
  - Research their item bank features
  - Document their reusability model

**Best Practices:**
- [ ] FERPA/GDPR compliance for educational systems
  - https://www2.ed.gov/policy/gen/guid/fpco/ferpa/
  - Data isolation requirements
  - Student privacy considerations

- [ ] Access Control Models
  - [ ] Research Role-Based Access Control (RBAC) patterns
  - [ ] Study Attribute-Based Access Control (ABAC)
  - [ ] Document permission inheritance models

**Documentation to Create:**
- [ ] Functional requirements document (FRD)
- [ ] Data flow diagram for question creation
- [ ] Permission matrix spreadsheet
- [ ] User journey diagrams for each user type

---

### 1.2 Database Design (Week 2-3)

#### 1.2.1 Schema Updates
- [ ] **Modify questions table**
  ```sql
  ALTER TABLE questions ADD COLUMN (
    scope_type VARCHAR(50) DEFAULT 'CLASS_LEVEL',
    class_id INT NULL,
    created_by_id INT NOT NULL,
    created_by_role VARCHAR(50) NOT NULL,
    is_locked BOOLEAN DEFAULT FALSE,
    lock_reason VARCHAR(255) NULL,
    version INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (created_by_id) REFERENCES users(id),
    INDEX idx_scope_type (scope_type),
    INDEX idx_class_id (class_id),
    INDEX idx_created_by (created_by_id)
  );
  ```

- [ ] **Create question_versions table** (for version control)
  ```sql
  CREATE TABLE question_versions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    question_id INT NOT NULL,
    version_number INT NOT NULL,
    question_text LONGTEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL,
    options JSON NOT NULL,
    correct_answer JSON NOT NULL,
    explanation LONGTEXT NULL,
    changed_by_id INT NOT NULL,
    change_reason VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by_id) REFERENCES users(id),
    UNIQUE KEY unique_version (question_id, version_number)
  );
  ```

- [ ] **Create question_access_log table**
  ```sql
  CREATE TABLE question_access_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    question_id INT NOT NULL,
    user_id INT NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    action_details JSON NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_question (question_id),
    INDEX idx_user (user_id),
    INDEX idx_timestamp (timestamp)
  );
  ```

- [ ] **Create question_scope_permissions table**
  ```sql
  CREATE TABLE question_scope_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    scope_type VARCHAR(50) NOT NULL,
    role_type VARCHAR(50) NOT NULL,
    can_create BOOLEAN DEFAULT FALSE,
    can_read BOOLEAN DEFAULT TRUE,
    can_update BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    can_approve BOOLEAN DEFAULT FALSE,
    can_share BOOLEAN DEFAULT FALSE,
    UNIQUE KEY unique_permission (scope_type, role_type)
  );
  ```

- [ ] **Create question_sharing_rules table**
  ```sql
  CREATE TABLE question_sharing_rules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    question_id INT NOT NULL,
    shared_with_class_id INT NULL,
    shared_with_user_id INT NULL,
    shared_with_role VARCHAR(50) NULL,
    permission_level VARCHAR(50) NOT NULL,
    shared_by_id INT NOT NULL,
    shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_with_class_id) REFERENCES classes(id),
    FOREIGN KEY (shared_with_user_id) REFERENCES users(id),
    FOREIGN KEY (shared_by_id) REFERENCES users(id)
  );
  ```

**System Changes:**
- Add migration script to categorize existing questions
- Set default scope_type for all existing questions
- Create initial permission matrix in question_scope_permissions table

#### 1.2.2 Data Migration Strategy
- [ ] **Backup strategy**
  - [ ] Create full database backup before any changes
  - [ ] Document backup location and restoration procedure
  - [ ] Test backup restoration on staging environment

- [ ] **Migration steps**
  - [ ] Step 1: Add new columns to questions table
  - [ ] Step 2: Identify class ownership for existing questions
  - [ ] Step 3: Backfill scope_type and class_id
  - [ ] Step 4: Create initial permission matrix
  - [ ] Step 5: Verify data integrity
  - [ ] Step 6: Test on staging environment
  - [ ] Step 7: Execute on production with rollback plan ready

- [ ] **Rollback plan**
  - [ ] Document all rollback steps
  - [ ] Keep backup of old schema
  - [ ] Document point-in-time recovery procedure

---

### 1.3 API Development (Week 3-5)

#### 1.3.1 Create Question Endpoints

- [ ] **POST /api/v1/questions/class-level**
  ```
  Request:
  {
    "class_id": 123,
    "question_text": "What is 2+2?",
    "question_type": "MULTIPLE_CHOICE",
    "options": [
      {"id": 1, "text": "3"},
      {"id": 2, "text": "4"},
      {"id": 3, "text": "5"},
      {"id": 4, "text": "6"}
    ],
    "correct_answer": {"option_id": 2},
    "explanation": "2+2 equals 4",
    "tags": ["math", "basic"]
  }
  
  Response:
  {
    "id": 456,
    "scope_type": "CLASS_LEVEL",
    "class_id": 123,
    "created_by_id": 789,
    "created_at": "2026-07-16T10:30:00Z",
    "status": "CREATED"
  }
  ```

  **Implementation Requirements:**
  - [ ] Validate user is teacher of the class
  - [ ] Validate all required fields
  - [ ] Sanitize question text (XSS prevention)
  - [ ] Validate question format
  - [ ] Log creation action
  - [ ] Return created question ID
  - [ ] Handle database errors gracefully

- [ ] **POST /api/v1/questions/system-wide**
  ```
  Request:
  {
    "question_text": "...",
    "question_type": "MULTIPLE_CHOICE",
    "options": [...],
    "correct_answer": {...},
    "explanation": "...",
    "tags": [...],
    "require_approval": true,
    "visibility": "DRAFT" | "PUBLISHED"
  }
  
  Response:
  {
    "id": 457,
    "scope_type": "SYSTEM_WIDE",
    "status": "DRAFT",
    "created_at": "2026-07-16T10:31:00Z"
  }
  ```

  **Implementation Requirements:**
  - [ ] Validate user has permission to create system-wide questions
  - [ ] Create in DRAFT status if require_approval is true
  - [ ] Notify admins for approval
  - [ ] Log creation and approval flow
  - [ ] Set version number to 1

- [ ] **GET /api/v1/questions/class/:classId**
  ```
  Response:
  {
    "questions": [
      {
        "id": 456,
        "class_id": 123,
        "scope_type": "CLASS_LEVEL",
        "question_text": "What is 2+2?",
        "created_by": {...},
        "created_at": "2026-07-16T10:30:00Z",
        "last_used": "2026-07-15T14:00:00Z",
        "usage_count": 5
      }
    ],
    "total": 45,
    "page": 1,
    "per_page": 20
  }
  ```

  **Implementation Requirements:**
  - [ ] Validate user access to class
  - [ ] Filter by scope_type (CLASS_LEVEL only)
  - [ ] Include usage statistics
  - [ ] Support pagination
  - [ ] Support sorting and filtering
  - [ ] Cache results for performance

- [ ] **GET /api/v1/questions/system-wide**
  ```
  Response:
  {
    "questions": [
      {
        "id": 457,
        "scope_type": "SYSTEM_WIDE",
        "status": "PUBLISHED",
        "question_text": "...",
        "version": 1,
        "created_by": {...},
        "approval_status": "APPROVED",
        "approved_by": {...},
        "approved_at": "2026-07-15T09:00:00Z"
      }
    ],
    "total": 250,
    "page": 1
  }
  ```

  **Implementation Requirements:**
  - [ ] Filter only PUBLISHED questions by default
  - [ ] Show DRAFT only to creator and admins
  - [ ] Include version and approval information
  - [ ] Support advanced filtering
  - [ ] Cache heavily for performance

- [ ] **PUT /api/v1/questions/:questionId**
  ```
  Request:
  {
    "question_text": "Updated question?",
    "options": [...],
    "correct_answer": {...},
    "change_reason": "Fixed typo"
  }
  
  Response:
  {
    "id": 456,
    "version": 2,
    "status": "UPDATED",
    "previous_version": 1
  }
  ```

  **Implementation Requirements:**
  - [ ] Validate user can modify (creator or admin)
  - [ ] Create version entry
  - [ ] Log modification
  - [ ] If system-wide, may require re-approval
  - [ ] Invalidate cache
  - [ ] Notify if question is in-use in active quiz

- [ ] **DELETE /api/v1/questions/:questionId**
  ```
  Response:
  {
    "id": 456,
    "status": "DELETED",
    "deleted_at": "2026-07-16T11:00:00Z",
    "hard_delete": false
  }
  ```

  **Implementation Requirements:**
  - [ ] Soft delete (set deleted_at timestamp)
  - [ ] Check if question is in active quizzes
  - [ ] Prevent deletion if in-use (or archive option)
  - [ ] Log deletion
  - [ ] Clear from cache
  - [ ] Require admin confirmation for system-wide questions

#### 1.3.2 Question Access & Sharing Endpoints

- [ ] **GET /api/v1/questions/:questionId/access-log**
  ```
  Query params: filter_by_user, filter_by_action, date_range
  Response: Array of access records with user, action, timestamp
  ```

  **Implementation Requirements:**
  - [ ] Only admin and creator can view
  - [ ] Support filtering and pagination
  - [ ] Performance: index on question_id, timestamp
  - [ ] Return sanitized user information

- [ ] **POST /api/v1/questions/:questionId/share**
  ```
  Request:
  {
    "share_with_class_id": 124,
    "permission_level": "VIEW" | "EDIT",
    "expires_at": "2026-08-16T23:59:59Z"
  }
  
  Response:
  {
    "sharing_id": 789,
    "status": "SHARED"
  }
  ```

  **Implementation Requirements:**
  - [ ] Validate sharer has permission
  - [ ] Create sharing rule
  - [ ] Notify recipients
  - [ ] Log sharing action
  - [ ] Enforce permission level in GET requests

#### 1.3.3 Question Approval Workflow (for system-wide)

- [ ] **POST /api/v1/questions/:questionId/submit-for-approval**
  ```
  Response: { status: "SUBMITTED_FOR_APPROVAL" }
  ```

- [ ] **POST /api/v1/questions/:questionId/approve**
  ```
  Request: { approval_notes: "..." }
  Response: { status: "APPROVED", approved_at: "..." }
  ```

- [ ] **POST /api/v1/questions/:questionId/reject**
  ```
  Request: { rejection_reason: "..." }
  Response: { status: "REJECTED", rejection_reason: "..." }
  ```

**Implementation Requirements:**
  - [ ] Only admins can approve/reject
  - [ ] Notify creator of decision
  - [ ] Log all approval actions
  - [ ] Store approval metadata

#### 1.3.4 Permission Check Middleware

- [ ] **Create permission checking function**
  ```javascript
  async function checkQuestionAccess(userId, questionId, action) {
    // Get user role and question scope
    // Check question_scope_permissions table
    // Check if user created the question or is admin
    // Return true/false
  }
  ```

  **Implementation Requirements:**
  - [ ] Check user role
  - [ ] Check question scope
  - [ ] Check permission matrix
  - [ ] Consider question creator
  - [ ] Consider admin overrides
  - [ ] Cache permission checks
  - [ ] Audit access attempts

---

### 1.4 Frontend Development (Week 5-7)

#### 1.4.1 Question Creation UI

- [ ] **Create class-level question form**
  - [ ] Class selector (auto-populated based on user's classes)
  - [ ] Question type selector (multiple choice, short answer, etc.)
  - [ ] Question text editor with rich text
  - [ ] Options builder (add/remove/reorder options)
  - [ ] Correct answer selector
  - [ ] Explanation field
  - [ ] Tags input
  - [ ] Submit button with validation
  - [ ] Cancel button
  - [ ] Auto-save draft feature

  **UI/UX Considerations:**
  - [ ] Clean, minimal dark aesthetic (per your preference)
  - [ ] Clear validation messages
  - [ ] Loading states during submission
  - [ ] Success/error notifications
  - [ ] Prevent accidental navigation loss
  - [ ] Mobile responsive design

  **Components Needed:**
  - [ ] QuestionForm component
  - [ ] OptionBuilder sub-component
  - [ ] RichTextEditor component
  - [ ] TagsInput component
  - [ ] ValidationErrorDisplay component

- [ ] **Create system-wide question form**
  - [ ] All fields from class-level form
  - [ ] Additional field: "Require Approval" toggle
  - [ ] Status display (DRAFT, SUBMITTED, APPROVED, REJECTED)
  - [ ] Approval notes display
  - [ ] Share with classes button
  - [ ] Version history link

- [ ] **Question listing & management UI**
  - [ ] Filterable question list
  - [ ] Sort by: date created, usage, relevance
  - [ ] Search bar
  - [ ] Bulk actions (archive, delete, share)
  - [ ] Usage statistics per question
  - [ ] Last modified indicator
  - [ ] Edit and delete buttons
  - [ ] Preview question modal

  **Performance Considerations:**
  - [ ] Virtual scrolling for large lists
  - [ ] Lazy load question preview
  - [ ] Cache question list
  - [ ] Pagination

#### 1.4.2 Permission Display & Management

- [ ] **Show scope indicator on questions**
  - [ ] Badge showing "Class Level" or "System Wide"
  - [ ] Lock icon if question is locked
  - [ ] Approval status badge for system-wide questions

- [ ] **Create access log viewer** (admin only)
  - [ ] Table showing who accessed which questions
  - [ ] Filter by user, date range, action type
  - [ ] Export capability

- [ ] **Question sharing UI**
  - [ ] Modal to share question with other classes
  - [ ] Permission level selector
  - [ ] Expiration date picker
  - [ ] List of classes already shared with

**System Changes Needed:**
```
Frontend changes:
- Update quiz builder to show question scope
- Update quiz editor to warn if using locked questions
- Update student quiz view to only show accessible questions
- Add audit log viewer to admin panel
- Add permission management to question settings
```

---

### 1.5 Testing & QA (Week 7-8)

#### 1.5.1 Unit Tests

- [ ] **API endpoint tests**
  ```javascript
  describe('POST /api/v1/questions/class-level', () => {
    it('should create question if user is teacher of class', () => {...});
    it('should reject if user is not teacher of class', () => {...});
    it('should sanitize question text', () => {...});
    it('should validate all required fields', () => {...});
    it('should log creation action', () => {...});
  });
  ```

  **Test Coverage Needed:**
  - [ ] All endpoints (create, read, update, delete)
  - [ ] Permission checks on each endpoint
  - [ ] Validation logic
  - [ ] Error handling
  - [ ] Edge cases (empty options, invalid scope, etc.)
  - [ ] Target: 90%+ coverage

- [ ] **Permission logic tests**
  ```javascript
  describe('Question access permissions', () => {
    it('should allow teacher to view class questions', () => {...});
    it('should prevent other teacher from viewing class questions', () => {...});
    it('should allow admin to view all questions', () => {...});
    it('should respect scope_type restrictions', () => {...});
  });
  ```

- [ ] **Database schema tests**
  - [ ] Test foreign key constraints
  - [ ] Test data types
  - [ ] Test index performance
  - [ ] Test migration rollback

#### 1.5.2 Integration Tests

- [ ] **End-to-end question creation flow**
  - [ ] Create class-level question → appears in class list → student can see in quiz
  - [ ] Create system-wide question (draft) → submit for approval → admin approves → appears system-wide
  - [ ] Share class question with another class → recipient can access
  - [ ] Modify question → version history updated → users see new version
  - [ ] Delete question → soft delete → appears in trash → can restore

- [ ] **Permission integration tests**
  - [ ] Different roles accessing same endpoint
  - [ ] Permission checks across microservices
  - [ ] Audit logging integration
  - [ ] Cache invalidation after updates

- [ ] **API contract tests**
  - [ ] Response schemas match documentation
  - [ ] Status codes correct
  - [ ] Error messages informative
  - [ ] Pagination works correctly

#### 1.5.3 UI/UX Testing

- [ ] **Functional testing**
  - [ ] Form submission works
  - [ ] Validation displays correctly
  - [ ] Options builder works (add, remove, reorder)
  - [ ] Question preview shows correctly
  - [ ] Bulk actions work
  - [ ] Search and filter work

- [ ] **Cross-browser testing**
  - [ ] Chrome, Firefox, Safari, Edge
  - [ ] Mobile browsers (iOS Safari, Chrome Mobile)
  - [ ] Responsive design verification

- [ ] **Accessibility testing**
  - [ ] WCAG 2.1 AA compliance
  - [ ] Screen reader compatibility
  - [ ] Keyboard navigation
  - [ ] Color contrast

- [ ] **Performance testing**
  - [ ] Question list loads in < 1s (with 1000+ questions)
  - [ ] Question creation form responsive (< 100ms interaction)
  - [ ] Search results appear in < 500ms
  - [ ] Memory usage stable over time

#### 1.5.4 Security Testing (Phase 2 covered detailed, but specific to questions)

- [ ] **Input validation**
  - [ ] Test XSS in question text
  - [ ] Test XSS in options
  - [ ] Test SQL injection (if legacy systems)
  - [ ] Test command injection

- [ ] **Authorization testing**
  - [ ] Try to create question in class you don't teach
  - [ ] Try to modify question you didn't create
  - [ ] Try to delete system-wide question as teacher
  - [ ] Try to approve questions as teacher

- [ ] **Data leakage**
  - [ ] Verify questions from other classes not visible
  - [ ] Verify deleted questions not accessible
  - [ ] Verify access log not exposed to unauthorized users

#### 1.5.5 Test Environment Setup

- [ ] **Staging environment**
  - [ ] Copy of production database (anonymized)
  - [ ] Identical infrastructure
  - [ ] Separate credentials
  - [ ] Full monitoring enabled

- [ ] **Test data creation**
  - [ ] Script to create 100+ questions
  - [ ] Script to create test classes and users
  - [ ] Script to create different permission scenarios
  - [ ] Script to populate access logs

**System Changes Needed:**
```
- Add test database with fixtures
- Add test data factory functions
- Add test API endpoints (only in staging)
- Add test user accounts with different roles
- Add monitoring/alerting for test environment
```

---

### 1.6 Deployment & Rollout (Week 8-9)

#### 1.6.1 Pre-deployment Checklist

- [ ] **Code review**
  - [ ] All code reviewed by 2+ developers
  - [ ] Security review completed
  - [ ] Performance review completed
  - [ ] Documentation reviewed

- [ ] **Testing checklist**
  - [ ] All unit tests passing (90%+ coverage)
  - [ ] All integration tests passing
  - [ ] Load testing results reviewed
  - [ ] Security testing completed
  - [ ] Accessibility testing passed
  - [ ] Browser compatibility verified

- [ ] **Documentation**
  - [ ] API documentation complete
  - [ ] Database schema documented
  - [ ] User guide for teachers written
  - [ ] Admin guide written
  - [ ] Deployment runbook completed

- [ ] **Backup & rollback**
  - [ ] Database backup verified
  - [ ] Rollback procedure documented and tested
  - [ ] Previous version packaged and ready
  - [ ] Feature flags configured for rollback

#### 1.6.2 Deployment Strategy

- [ ] **Blue-green deployment**
  - [ ] Deploy to staging (green)
  - [ ] Run smoke tests on green
  - [ ] Route 10% traffic to green
  - [ ] Monitor for errors
  - [ ] Route 50% traffic to green
  - [ ] Route 100% traffic to green
  - [ ] Keep blue running for 24 hours for rollback

- [ ] **Feature flags**
  - [ ] Create feature flags for new question features
  - [ ] Enable for internal users first
  - [ ] Enable for 10% of teachers
  - [ ] Enable for 50% of teachers
  - [ ] Enable for 100% of users
  - [ ] Allow easy disable if issues

#### 1.6.3 Monitoring & Support

- [ ] **Set up monitoring**
  - [ ] API response time alerts
  - [ ] Error rate alerts
  - [ ] Database query performance
  - [ ] Storage usage
  - [ ] User activity metrics

- [ ] **Create support documentation**
  - [ ] FAQ for teachers
  - [ ] Common issues and fixes
  - [ ] Support ticket template
  - [ ] Escalation procedure

- [ ] **Plan communication**
  - [ ] Email announcement to users
  - [ ] In-app notification of new features
  - [ ] Webinar/training for teachers
  - [ ] Blog post about changes

#### 1.6.4 Post-deployment (Week 9-10)

- [ ] **Monitor closely for 1 week**
  - [ ] Daily review of error logs
  - [ ] Review user feedback
  - [ ] Monitor performance metrics
  - [ ] Watch for security issues

- [ ] **Gather feedback**
  - [ ] Send survey to teachers
  - [ ] Collect support tickets
  - [ ] Note usability issues
  - [ ] Document improvement ideas

- [ ] **Plan iterations**
  - [ ] Fix any critical bugs immediately
  - [ ] Plan improvements based on feedback
  - [ ] Create follow-up feature tickets
  - [ ] Schedule retrospective meeting

---

## PHASE 2: Security Hardening

### 2.1 Security Assessment & Planning (Week 1-2)

#### 2.1.1 Current Security Audit

- [ ] **Framework audit**
  - [ ] Identify all frameworks used (Express, Laravel, etc.)
  - [ ] Check framework version for known vulnerabilities
  - [ ] Review framework security documentation
  - [ ] Check for security middleware already in place

- [ ] **Existing security controls**
  - [ ] Identify authentication mechanisms
  - [ ] List current authorization checks
  - [ ] Check for existing input validation
  - [ ] Review current logging/monitoring
  - [ ] Check for HTTPS enforcement
  - [ ] Review database security

- [ ] **Vulnerability scan**
  - [ ] Run automated security scanner (OWASP ZAP, Burp Suite)
  - [ ] Review dependencies for known CVEs
  - [ ] Check for hardcoded secrets
  - [ ] Review error handling (information disclosure)
  - [ ] Check for default credentials
  - [ ] Identify missing security headers

**Research Materials:**
- [ ] OWASP Top 10 2021: https://owasp.org/www-project-top-ten/
- [ ] OWASP Top 10 for APIs: https://owasp.org/www-project-api-security/
- [ ] CWE Top 25: https://cwe.mitre.org/top25/
- [ ] NIST Cybersecurity Framework: https://www.nist.gov/cyberframework
- [ ] Security Testing Guide: https://owasp.org/www-project-web-security-testing-guide/

**System Changes Needed:**
```
Current state: Unknown security status
Changes needed:
1. Document all findings in security audit report
2. Create vulnerability tracking spreadsheet
3. Categorize issues by severity (Critical, High, Medium, Low)
4. Prioritize fixes based on risk and effort
5. Create remediation timeline
```

#### 2.1.2 Threat Modeling

- [ ] **Identify assets**
  - [ ] Student data (PII, grades, answers)
  - [ ] Teacher data (PII, credentials)
  - [ ] Question bank (intellectual property)
  - [ ] System credentials and API keys
  - [ ] Logs and audit trails

- [ ] **Identify threats**
  - [ ] Unauthorized access to student data
  - [ ] Data tampering (grades, answers)
  - [ ] DoS attacks
  - [ ] Account takeover
  - [ ] Insider threats
  - [ ] Third-party attacks

- [ ] **Risk assessment**
  - [ ] Likelihood assessment
  - [ ] Impact assessment
  - [ ] Risk score calculation
  - [ ] Prioritize mitigation

**Deliverable:** Threat Model Document with STRIDE analysis

---

### 2.2 CSRF Protection Implementation (Week 2-3)

#### 2.2.1 CSRF Token Strategy

- [ ] **Research CSRF protection methods**
  - [ ] Study double-submit cookie pattern
  - [ ] Study synchronizer token pattern
  - [ ] Study custom header pattern
  - [ ] Decide which pattern for AKURAT

**Research Links:**
- [ ] OWASP CSRF: https://owasp.org/www-community/attacks/csrf
- [ ] CSRF Prevention: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- [ ] CSRF Examples: https://portswigger.net/web-security/csrf

- [ ] **Choose implementation library**
  - [ ] Express: use `csurf` middleware
  - [ ] Laravel: built-in CSRF protection
  - [ ] .NET: use AntiForgery tokens
  - [ ] Python: use Flask-WTF or Django CSRF
  - [ ] Research library security track record

#### 2.2.2 Implementation

- [ ] **Add CSRF token generation**
  ```javascript
  // Middleware to generate token on every request
  app.use(csrf({ cookie: false }));
  
  // Store token in session/request context
  res.locals.csrfToken = req.csrfToken();
  ```

- [ ] **Add CSRF token to all forms**
  ```html
  <form method="POST">
    <input type="hidden" name="_csrf" value="<%= csrfToken %>">
  </form>
  ```

- [ ] **Add CSRF token to API requests**
  ```javascript
  // For AJAX requests, add to header
  fetch('/api/questions', {
    method: 'POST',
    headers: {
      'X-CSRF-Token': document.querySelector('[name="_csrf"]').value
    },
    body: JSON.stringify(data)
  });
  ```

- [ ] **Configure token rotation**
  ```javascript
  // Rotate token after each request or per session
  // Configurable based on security requirements
  ```

- [ ] **Handle token errors**
  ```javascript
  // Return 403 Forbidden if token invalid or missing
  // Log CSRF attempts
  // Alert security team
  ```

#### 2.2.3 Testing CSRF Protection

- [ ] **Unit tests**
  ```javascript
  describe('CSRF Protection', () => {
    it('should generate CSRF token on GET request', () => {...});
    it('should validate CSRF token on POST request', () => {...});
    it('should reject request with invalid token', () => {...});
    it('should reject request without token', () => {...});
    it('should rotate token after use', () => {...});
  });
  ```

- [ ] **Integration tests**
  - [ ] Test form submission with valid token
  - [ ] Test form submission without token (should fail)
  - [ ] Test API request with valid token
  - [ ] Test API request without token
  - [ ] Test cross-origin requests

- [ ] **Manual testing**
  - [ ] Try to submit form without CSRF token
  - [ ] Try to craft request from external domain
  - [ ] Verify token in cookies/session
  - [ ] Test with different browsers

**System Changes:**
```
- Add CSRF middleware to all routes
- Add token to all forms
- Add token to AJAX/Fetch requests
- Log all CSRF failures
- Create admin dashboard showing CSRF attempts
- Add configuration for token rotation strategy
```

---

### 2.3 CSS Security Hardening (Week 3-4)

#### 2.3.1 Content Security Policy (CSP)

- [ ] **Research CSP implementation**
  - [ ] Study CSP directive types
  - [ ] Review CSP examples
  - [ ] Understand CSP reporting

**Research Links:**
- [ ] MDN CSP: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
- [ ] CSP Level 3: https://w3c.github.io/webappsec-csp/
- [ ] CSP Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html

- [ ] **Design CSP policy for AKURAT**
  ```
  Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://trusted-cdn.com;
  style-src 'self' https://fonts.googleapis.com;
  img-src 'self' data: https:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.akurat.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  ```

- [ ] **Implement CSP headers**
  ```javascript
  // Middleware to add CSP headers
  app.use((req, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; ..."
    );
    res.setHeader(
      'Content-Security-Policy-Report-Only',
      "..." // For monitoring violations
    );
    next();
  });
  ```

- [ ] **Set up CSP reporting**
  - [ ] Create endpoint to receive CSP violations
  - [ ] Log violations to monitoring system
  - [ ] Alert on suspicious patterns
  - [ ] Create dashboard for CSP violations

#### 2.3.2 CSS Injection Prevention

- [ ] **Audit current CSS sources**
  - [ ] List all CSS files
  - [ ] Identify inline styles
  - [ ] Find CSS generated from user input
  - [ ] Review CSS from third parties

- [ ] **Remove unsafe inline styles**
  - [ ] Refactor inline styles to CSS classes
  - [ ] Use CSS variables instead of inline values
  - [ ] Use CSS-in-JS libraries with proper escaping if needed

- [ ] **Sanitize user-generated CSS**
  ```javascript
  // If users can provide CSS values
  const allowedProperties = ['color', 'font-size', 'text-align'];
  const allowedValues = /^#[0-9a-f]{6}$|^rgb|^hsl|^[0-9]+px$/i;
  
  function sanitizeCSS(userCSS) {
    // Validate against whitelist
    // Escape special characters
    // Return safe CSS
  }
  ```

- [ ] **Implement CSS linting**
  - [ ] Use Stylelint to detect problematic CSS
  - [ ] Add CSS linting to CI/CD
  - [ ] Create CSS style guide
  - [ ] Train team on CSS best practices

**System Changes:**
```
- Add CSP headers to all responses
- Remove all inline styles
- Create CSS classes for dynamic styling
- Add CSS sanitization function
- Add CSP violation logging
- Add CSP monitoring dashboard
- Add Stylelint to build process
```

#### 2.3.3 XSS Prevention in CSS Context

- [ ] **Review CSS property value sanitization**
  - [ ] Backgrounds from user content
  - [ ] Font imports from user content
  - [ ] URL validation in CSS
  - [ ] Attribute value sanitization

- [ ] **Test CSS-based XSS vectors**
  - [ ] CSS expression() (older IE)
  - [ ] CSS import() attacks
  - [ ] CSS @font-face CORS
  - [ ] CSS animation/transition callbacks

**Research Links:**
- [ ] CSS XSS: https://owasp.org/www-community/attacks/xss/
- [ ] CSS Security: https://developer.mozilla.org/en-US/docs/Web/Security

---

### 2.4 Authentication & Authorization Hardening (Week 4-5)

#### 2.4.1 Authentication Audit

- [ ] **Document current authentication**
  - [ ] Identify auth method (sessions, JWT, OAuth)
  - [ ] Review token generation
  - [ ] Check token expiration
  - [ ] Review password storage

- [ ] **Assess authentication strength**
  ```
  Required:
  [ ] Passwords hashed with bcrypt/Argon2 (not MD5 or SHA1)
  [ ] Salted passwords (bcrypt/Argon2 does this automatically)
  [ ] Password minimum 8 characters
  [ ] Password complexity requirements
  [ ] Account lockout after failed attempts
  [ ] Session timeout (15-30 minutes idle)
  [ ] HTTPS only (secure cookie flag)
  [ ] HttpOnly cookie flag (no JavaScript access)
  ```

**Research Materials:**
- [ ] Password Storage: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- [ ] Authentication: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- [ ] Session Management: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html

#### 2.4.2 Password Security Implementation

- [ ] **Implement strong password hashing**
  ```javascript
  const bcrypt = require('bcrypt');
  
  // Hash on registration
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  
  // Verify on login
  const isValid = await bcrypt.compare(password, hashedPassword);
  ```

- [ ] **Implement password requirements**
  ```javascript
  function validatePassword(password) {
    // Minimum 8 characters
    if (password.length < 8) return false;
    // At least one uppercase
    if (!/[A-Z]/.test(password)) return false;
    // At least one lowercase
    if (!/[a-z]/.test(password)) return false;
    // At least one number
    if (!/[0-9]/.test(password)) return false;
    // At least one special character
    if (!/[!@#$%^&*]/.test(password)) return false;
    return true;
  }
  ```

- [ ] **Implement account lockout**
  ```javascript
  // Track failed login attempts
  // Lock account after 5 failed attempts
  // Unlock after 30 minutes or manual unlock
  ```

- [ ] **Force password reset on first login**
  - [ ] When user account created
  - [ ] If password compromised
  - [ ] If account inactive for 90 days
  - [ ] After admin-initiated reset

#### 2.4.3 Session Security

- [ ] **Implement secure session handling**
  ```javascript
  app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true, // HTTPS only
      httpOnly: true, // No JavaScript access
      sameSite: 'Strict', // CSRF protection
      maxAge: 15 * 60 * 1000 // 15 minutes
    }
  }));
  ```

- [ ] **Implement session regeneration**
  - [ ] After successful login
  - [ ] After privilege level change
  - [ ] Periodically (every 30 minutes)

- [ ] **Implement session timeout**
  - [ ] Idle timeout: 15 minutes
  - [ ] Absolute timeout: 8 hours
  - [ ] Warn user before timeout
  - [ ] Clear all data on logout

#### 2.4.4 Multi-Factor Authentication (MFA)

- [ ] **Research MFA options**
  - [ ] TOTP (Time-based One-Time Password) - Google Authenticator
  - [ ] SMS-based OTP
  - [ ] Email verification
  - [ ] Hardware security keys

**Research Links:**
- [ ] TOTP: https://en.wikipedia.org/wiki/Time-based_One-Time_Password
- [ ] MFA Best Practices: https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_for_Sensitive_Accounts_Cheat_Sheet.html

- [ ] **Implement TOTP-based MFA**
  ```javascript
  const speakeasy = require('speakeasy');
  const QRCode = require('qrcode');
  
  // Generate secret
  const secret = speakeasy.generateSecret({ name: 'AKURAT' });
  
  // Generate QR code
  const qrCode = await QRCode.toDataURL(secret.otpauth_url);
  
  // Verify token
  const isValid = speakeasy.totp.verify({
    secret: secret.base32,
    encoding: 'base32',
    token: userProvidedToken
  });
  ```

- [ ] **Make MFA mandatory for admins**
  - [ ] Require setup on first login
  - [ ] Store backup codes securely
  - [ ] Allow device trust (30 days)
  - [ ] Fall back to email verification if phone unavailable

#### 2.4.5 Authorization & RBAC

- [ ] **Document current roles**
  - [ ] Student
  - [ ] Teacher
  - [ ] School Admin
  - [ ] System Admin
  - [ ] Any custom roles

- [ ] **Create RBAC matrix**
  | Role | Create Question | Edit Question | Delete Question | Approve System Q | Manage Users |
  |------|-----------------|---------------|-----------------|------------------|--------------|
  | Student | No | No | No | No | No |
  | Teacher | Class-level | Own only | Own only | No | No |
  | School Admin | All | All | All | Yes | Yes |
  | System Admin | All | All | All | Yes | Yes |

- [ ] **Implement RBAC in code**
  ```javascript
  function authorize(...requiredRoles) {
    return (req, res, next) => {
      if (!req.user) return res.status(401).send('Unauthorized');
      if (!requiredRoles.includes(req.user.role)) {
        return res.status(403).send('Forbidden');
      }
      next();
    };
  }
  
  app.post('/questions', authorize('TEACHER', 'ADMIN'), (req, res) => {
    // Create question
  });
  ```

- [ ] **Implement attribute-based access control for granular permissions**
  - [ ] Check class ownership
  - [ ] Check department affiliation
  - [ ] Check resource ownership
  - [ ] Check time-based access

**System Changes:**
```
- Add password requirements validation
- Implement bcrypt password hashing
- Add account lockout mechanism
- Implement session security headers
- Add TOTP MFA for admins
- Create RBAC middleware
- Add authorization checks to all endpoints
- Create role permission documentation
- Add audit logging for permission changes
```

---

### 2.5 Input Validation & Sanitization (Week 5-6)

#### 2.5.1 Research Input Validation

**Research Materials:**
- [ ] OWASP Input Validation: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
- [ ] Data Validation: https://owasp.org/www-community/attacks/Command_Injection

#### 2.5.2 Server-side Input Validation

- [ ] **Audit all user input fields**
  - [ ] List all form fields
  - [ ] Document expected data type, length, format
  - [ ] Identify current validation (if any)
  - [ ] Note validation gaps

- [ ] **Implement validation middleware**
  ```javascript
  const { body, validationResult } = require('express-validator');
  
  app.post('/questions', [
    body('question_text')
      .notEmpty().withMessage('Question text required')
      .isLength({ min: 10, max: 5000 }).withMessage('Invalid length')
      .trim()
      .escape(), // Escape HTML entities
    body('class_id')
      .isInt().withMessage('Invalid class ID')
      .custom(async (value, { req }) => {
        const class = await Class.findById(value);
        if (!class) throw new Error('Class not found');
        if (!await userTeachesClass(req.user.id, value)) {
          throw new Error('Unauthorized');
        }
      }),
    body('options')
      .isArray({ min: 2, max: 10 }).withMessage('Invalid options'),
    body('options.*.text')
      .notEmpty().withMessage('Option text required')
      .isLength({ max: 500 })
      .trim()
      .escape()
  ], (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  });
  ```

- [ ] **Implement whitelist validation**
  ```javascript
  const ALLOWED_QUESTION_TYPES = ['MULTIPLE_CHOICE', 'SHORT_ANSWER', 'ESSAY'];
  
  function validateQuestionType(type) {
    return ALLOWED_QUESTION_TYPES.includes(type);
  }
  ```

- [ ] **Implement type coercion**
  ```javascript
  // Convert string to appropriate types
  const classId = parseInt(req.body.class_id);
  const isRequired = req.body.is_required === 'true';
  const timeout = parseFloat(req.body.timeout);
  ```

#### 2.5.3 Output Encoding & Sanitization

- [ ] **Sanitize HTML output**
  ```javascript
  const xss = require('xss');
  
  // When displaying user-provided content
  const safeQuestion = xss(question.text, {
    whiteList: {}, // No HTML allowed
    stripIgnoredTag: true,
    stripLeadingAndTrailingWhitespace: true
  });
  ```

- [ ] **Escape data for different contexts**
  ```javascript
  // HTML context
  const escaped = html.escape(userInput);
  
  // JavaScript context
  const jsonString = JSON.stringify(userInput);
  
  // URL context
  const encoded = encodeURIComponent(userInput);
  
  // CSS context (not recommended to use user input)
  ```

- [ ] **Implement content-type validation**
  ```javascript
  const fileTypeFilter = (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  };
  ```

#### 2.5.4 Parameterized Queries

- [ ] **Audit database queries**
  - [ ] Find all dynamic SQL queries
  - [ ] Check for string concatenation
  - [ ] Identify injection risks

- [ ] **Implement parameterized queries**
  ```javascript
  // WRONG - SQL Injection vulnerability
  const query = `SELECT * FROM users WHERE email = '${email}'`;
  const result = db.query(query);
  
  // CORRECT - Using parameterized query
  const query = 'SELECT * FROM users WHERE email = ?';
  const result = db.query(query, [email]);
  
  // With ORM (Sequelize)
  const user = await User.findOne({ where: { email: email } });
  ```

- [ ] **Use ORM instead of raw SQL**
  - [ ] Benefits: Parameterized, easier to maintain
  - [ ] Review all raw SQL queries
  - [ ] Convert to ORM calls

**System Changes:**
```
- Add input validation middleware
- Implement sanitization for all outputs
- Add file upload validation
- Create validation rules documentation
- Add validation error logging
- Implement rate limiting on validation failures
```

---

### 2.6 API & Microservice Security (Week 6-7)

#### 2.6.1 Rate Limiting

- [ ] **Implement rate limiting**
  ```javascript
  const rateLimit = require('express-rate-limit');
  
  // General API limit
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests, please try again later'
  });
  
  // Login limit (stricter)
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true
  });
  
  app.post('/login', loginLimiter, (req, res) => {...});
  app.use(limiter); // Apply to all routes
  ```

- [ ] **Implement rate limiting per user (authenticated)**
  ```javascript
  const userLimiter = rateLimit({
    keyGenerator: (req) => req.user.id, // Rate limit by user ID
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 1000
  });
  ```

- [ ] **Implement rate limiting per resource**
  ```javascript
  // Quiz submission limit
  const quizLimiter = rateLimit({
    keyGenerator: (req) => `${req.user.id}-${req.params.quizId}`,
    windowMs: 60 * 60 * 1000,
    max: 5 // Max 5 submissions per hour per quiz
  });
  ```

#### 2.6.2 API Authentication

- [ ] **Implement API key authentication** (for microservices)
  ```javascript
  const verifyAPIKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || !validAPIKeys.includes(apiKey)) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    next();
  };
  
  app.use('/api/v1/', verifyAPIKey);
  ```

- [ ] **Implement JWT authentication** (if using tokens)
  ```javascript
  const jwt = require('jsonwebtoken');
  
  const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
  
  app.use(verifyToken);
  ```

- [ ] **Implement OAuth2** (if third-party integration needed)
  - [ ] Use `passport` library
  - [ ] Implement authorization code flow
  - [ ] Secure token storage

#### 2.6.3 API Error Handling & Information Disclosure

- [ ] **Audit error messages**
  - [ ] Check if stack traces exposed
  - [ ] Check if database errors exposed
  - [ ] Check if file paths exposed
  - [ ] Check if version information exposed

- [ ] **Implement generic error responses**
  ```javascript
  // WRONG - Exposes database error
  try {
    // database operation
  } catch (error) {
    res.status(500).json({ error: error.message }); // Bad!
  }
  
  // CORRECT - Generic error message
  try {
    // database operation
  } catch (error) {
    logger.error('Database error:', error); // Log internally
    res.status(500).json({ error: 'Internal server error' }); // Generic response
  }
  ```

- [ ] **Implement error codes**
  ```javascript
  const ErrorCodes = {
    INVALID_INPUT: 'ERR_001',
    UNAUTHORIZED: 'ERR_002',
    FORBIDDEN: 'ERR_003',
    NOT_FOUND: 'ERR_004',
    SERVER_ERROR: 'ERR_500'
  };
  
  res.status(400).json({
    error: 'Invalid request',
    code: ErrorCodes.INVALID_INPUT
  });
  ```

- [ ] **Remove version information from headers**
  ```javascript
  app.use((req, res, next) => {
    res.removeHeader('X-Powered-By'); // Remove framework info
    res.setHeader('Server', 'AKURAT'); // Custom server header
    next();
  });
  ```

#### 2.6.4 Microservice Communication Security

- [ ] **Implement service-to-service authentication**
  ```javascript
  // Service A calling Service B
  const serviceKey = process.env.SERVICE_KEY;
  const signature = crypto
    .createHmac('sha256', serviceKey)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  const response = await fetch('https://service-b.akurat.com/api', {
    method: 'POST',
    headers: {
      'X-Service-Signature': signature,
      'X-Service-ID': 'service-a'
    },
    body: JSON.stringify(payload)
  });
  ```

- [ ] **Implement TLS/SSL for inter-service communication**
  - [ ] All microservice communication over HTTPS
  - [ ] Certificate validation
  - [ ] Certificate rotation strategy

- [ ] **Implement service mesh security** (if using Istio/Linkerd)
  - [ ] Mutual TLS (mTLS) between services
  - [ ] Service-to-service authorization policies
  - [ ] Traffic encryption

#### 2.6.5 API Documentation Security

- [ ] **Secure API documentation**
  - [ ] Don't expose documentation publicly
  - [ ] Require authentication to access docs
  - [ ] Don't include sensitive examples
  - [ ] Document security requirements
  - [ ] Document rate limits

**System Changes:**
```
- Add rate limiting middleware
- Implement API authentication
- Add error handling middleware
- Remove version disclosure
- Add security headers middleware
- Implement CORS restrictions
- Add request/response logging
- Create API security documentation
```

---

### 2.7 Security Monitoring & Logging (Week 7-8)

#### 2.7.1 Logging Strategy

- [ ] **Identify events to log**
  - [ ] Authentication: login, logout, failed login, MFA setup
  - [ ] Authorization: permission denied, privilege escalation attempts
  - [ ] Data access: question access, student records access
  - [ ] Data modification: question created, answer submitted, grade changed
  - [ ] Security events: CSRF attempts, rate limit exceeded, injection attempts
  - [ ] Admin actions: user created, role changed, settings modified

- [ ] **Implement structured logging**
  ```javascript
  const logger = require('winston');
  
  logger.info('User login', {
    userId: user.id,
    email: user.email,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: new Date(),
    success: true
  });
  ```

- [ ] **Implement security logging**
  ```javascript
  function logSecurityEvent(event, details) {
    logger.warn('Security Event', {
      event: event,
      ...details,
      timestamp: new Date(),
      severity: calculateSeverity(event)
    });
  }
  
  // Usage
  logSecurityEvent('CSRF_ATTEMPT', {
    userId: req.user?.id,
    endpoint: req.path,
    ipAddress: req.ip
  });
  ```

#### 2.7.2 Log Storage & Retention

- [ ] **Set up centralized logging**
  - [ ] Use ELK Stack (Elasticsearch, Logstash, Kibana)
  - [ ] Or cloud logging (AWS CloudWatch, Google Cloud Logging)
  - [ ] Or third-party service (Loggly, Papertrail)

- [ ] **Configure log retention**
  - [ ] Security logs: 1 year
  - [ ] Access logs: 6 months
  - [ ] Debug logs: 1 month
  - [ ] Archived logs: 3 years

- [ ] **Secure log storage**
  - [ ] Encrypt logs at rest
  - [ ] Encrypt logs in transit
  - [ ] Restrict access to logs (audit trail)
  - [ ] Implement log integrity checks

#### 2.7.3 Security Monitoring & Alerting

- [ ] **Set up monitoring**
  ```javascript
  const prometheus = require('prom-client');
  
  // Track failed login attempts
  const failedLoginCounter = new prometheus.Counter({
    name: 'failed_login_attempts',
    help: 'Number of failed login attempts',
    labelNames: ['email']
  });
  
  // Track CSRF violations
  const csrfViolations = new prometheus.Counter({
    name: 'csrf_violations',
    help: 'Number of CSRF violations detected'
  });
  ```

- [ ] **Create alerting rules**
  - [ ] > 5 failed logins in 1 hour → Alert
  - [ ] > 10 CSRF attempts in 1 hour → Alert
  - [ ] Rate limit exceeded multiple times → Alert
  - [ ] Unauthorized access attempts → Alert
  - [ ] Unusual data access patterns → Alert

- [ ] **Create monitoring dashboard**
  - [ ] Failed login attempts over time
  - [ ] CSRF attempts by endpoint
  - [ ] Rate limiting triggers
  - [ ] Authorization failures
  - [ ] API response times
  - [ ] Error rates by endpoint

**System Changes:**
```
- Add structured logging throughout application
- Implement security logging middleware
- Set up centralized logging service
- Create Prometheus metrics for security events
- Set up alerting rules
- Create security monitoring dashboard
- Implement log retention policy
- Add audit trail for admin actions
```

---

### 2.8 Deployment of Security Hardening (Week 8-9)

#### 2.8.1 Security Testing

- [ ] **Verify all security controls**
  - [ ] Test CSRF protection
  - [ ] Test CSP headers
  - [ ] Test authentication
  - [ ] Test authorization
  - [ ] Test input validation
  - [ ] Test rate limiting
  - [ ] Test logging

- [ ] **Manual security testing**
  - [ ] Attempt unauthorized access
  - [ ] Attempt privilege escalation
  - [ ] Attempt injection attacks
  - [ ] Attempt bypass of security controls

#### 2.8.2 Deployment

- [ ] **Gradual rollout**
  - [ ] Deploy to staging first
  - [ ] Run full security tests
  - [ ] Deploy to production
  - [ ] Monitor closely for issues

- [ ] **Create runbook**
  - [ ] Steps to deploy
  - [ ] Steps to rollback
  - [ ] Monitoring points
  - [ ] Escalation procedure

**System Changes:**
```
- Security controls deployed to production
- Monitoring and alerting active
- Backup and rollback procedures in place
- Security team notified and trained
```

---

## PHASE 3: Penetration Testing & Vulnerability Assessment

### 3.1 Testing Scope & Preparation (Week 1-2)

#### 3.1.1 Define Testing Scope

- [ ] **Scope Documentation**
  ```
  In-Scope:
  - All AKURAT application endpoints
  - Question management system
  - Quiz/exam system
  - User authentication
  - User authorization
  - Data storage and retrieval
  - API endpoints (v1)
  - Microservices (quiz-service, question-service, etc.)
  - Database layer
  
  Out-of-Scope:
  - Third-party services
  - Dependencies (npm packages - covered by CVE scanning)
  - Infrastructure (if managed separately)
  - Email service
  - Payment systems (if any)
  ```

- [ ] **List critical endpoints**
  - [ ] /api/v1/auth/login
  - [ ] /api/v1/auth/logout
  - [ ] /api/v1/users/*
  - [ ] /api/v1/questions/*
  - [ ] /api/v1/quizzes/*
  - [ ] /api/v1/results/*
  - [ ] /api/v1/classes/*
  - [ ] /api/v1/admin/*

- [ ] **Identify critical data**
  - [ ] Student grades and scores
  - [ ] Student personal information
  - [ ] Question answers and explanations
  - [ ] User credentials
  - [ ] System configuration

- [ ] **Risk assessment**
  - [ ] Confidentiality: High (student data)
  - [ ] Integrity: High (grades, answers)
  - [ ] Availability: Medium (exam system must be up)

**Research Materials:**
- [ ] OWASP Testing Guide: https://owasp.org/www-project-web-security-testing-guide/
- [ ] Penetration Testing Methodology: https://www.nist.gov/publications/nist-cybersecurity-framework
- [ ] Testing Checklist: https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/0-Introduction_and_Overview/1-Testing_Checklist

#### 3.1.2 Testing Environment Setup

- [ ] **Prepare testing environment**
  - [ ] Clone production environment (staging)
  - [ ] Load test data
  - [ ] Disable rate limiting (if needed for testing)
  - [ ] Enable verbose logging
  - [ ] Document environment details

- [ ] **Prepare testing tools**
  - [ ] OWASP ZAP (automated scanning)
  - [ ] Burp Suite (manual testing)
  - [ ] Postman (API testing)
  - [ ] curl/wget (command-line testing)
  - [ ] SQLMap (SQL injection testing) - use carefully!
  - [ ] Nikto (web server scanning)

- [ ] **Create test accounts**
  - [ ] Admin account
  - [ ] Teacher accounts (multiple)
  - [ ] Student accounts (multiple)
  - [ ] Different roles for testing

---

### 3.2 Information Gathering & Reconnaissance (Week 2)

#### 3.2.1 Passive Reconnaissance

- [ ] **Gather public information**
  - [ ] Domain registration details
  - [ ] DNS records
  - [ ] Website/blog posts about technologies used
  - [ ] GitHub repositories (if public)
  - [ ] Social media mentions

- [ ] **Identify technologies**
  - [ ] Frameworks (Express, Laravel, etc.)
  - [ ] Databases (MySQL, PostgreSQL, etc.)
  - [ ] Third-party libraries
  - [ ] Web server software
  - [ ] Versions of above

- [ ] **Review documentation**
  - [ ] API documentation (if public)
  - [ ] Release notes
  - [ ] Changelog

#### 3.2.2 Active Reconnaissance

- [ ] **Map application structure**
  - [ ] Identify all pages/routes
  - [ ] Identify API endpoints
  - [ ] Map navigation flow
  - [ ] Document forms and inputs
  - [ ] Identify AJAX calls

- [ ] **Scan for hidden content**
  - [ ] Use burp suite to scan
  - [ ] Check for backup files (.bak, .old, .orig)
  - [ ] Check for hidden directories (.git, .svn)
  - [ ] Check for admin panels
  - [ ] Check for API endpoints not in documentation

- [ ] **Review JavaScript**
  - [ ] Extract API endpoints from JavaScript
  - [ ] Look for hardcoded credentials
  - [ ] Look for sensitive data
  - [ ] Review third-party scripts
  - [ ] Check for console logging sensitive data

- [ ] **Analyze HTTP response headers**
  - [ ] Check for information disclosure
  - [ ] Check for security headers
  - [ ] Check for server version
  - [ ] Check for custom headers
  - [ ] Document all headers

**Deliverable:** Reconnaissance Report with findings

---

### 3.3 Authentication & Session Testing (Week 2-3)

#### 3.3.1 Authentication Testing

- [ ] **Test authentication mechanisms**
  - [ ] [ ] Valid credentials login
  - [ ] [ ] Invalid password rejected
  - [ ] [ ] Invalid username rejected
  - [ ] [ ] Blank credentials rejected
  - [ ] [ ] SQL injection in login
  - [ ] [ ] XSS in login form
  - [ ] [ ] CSRF on login form

- [ ] **Test password policies**
  - [ ] [ ] Minimum length enforced
  - [ ] [ ] Complexity requirements enforced
  - [ ] [ ] Password history enforced
  - [ ] [ ] Password expiration enforced (if applicable)
  - [ ] [ ] Cannot reuse old passwords

- [ ] **Test account lockout**
  - [ ] [ ] Account locked after X failed attempts
  - [ ] [ ] Account unlocks after Y minutes
  - [ ] [ ] Admin can unlock account
  - [ ] [ ] User notified of lockout

- [ ] **Test password reset**
  - [ ] [ ] Password reset token generated
  - [ ] [ ] Token is unpredictable
  - [ ] [ ] Token expires after Y minutes
  - [ ] [ ] Token can only be used once
  - [ ] [ ] New password meets policy

- [ ] **Test multi-factor authentication**
  - [ ] [ ] MFA required for privileged accounts
  - [ ] [ ] MFA token generated correctly
  - [ ] [ ] MFA token validates correctly
  - [ ] [ ] Backup codes work
  - [ ] [ ] Replay attacks prevented

#### 3.3.2 Session Testing

- [ ] **Test session management**
  - [ ] [ ] Session ID generated randomly
  - [ ] [ ] Session ID not predictable
  - [ ] [ ] Session ID sufficiently long (32+ characters)
  - [ ] [ ] Secure cookie flag set
  - [ ] [ ] HttpOnly flag set
  - [ ] [ ] SameSite flag set

- [ ] **Test session fixation**
  - [ ] [ ] Session ID changes after login
  - [ ] [ ] Cannot reuse pre-login session ID
  - [ ] [ ] Session ID changes with privilege escalation

- [ ] **Test session timeout**
  - [ ] [ ] Session expires after idle time
  - [ ] [ ] User redirected to login on expiration
  - [ ] [ ] User data cleared on logout
  - [ ] [ ] Cannot use expired session

- [ ] **Test concurrent sessions**
  - [ ] [ ] Multiple simultaneous sessions allowed (check policy)
  - [ ] [ ] Old session invalidated when new session created (check policy)
  - [ ] [ ] Logout terminates all sessions

- [ ] **Test session hijacking**
  - [ ] [ ] Cannot steal session cookie
  - [ ] [ ] Cannot predict session token
  - [ ] [ ] Cannot manipulate session token

**Research Materials:**
- [ ] Session Management: https://owasp.org/www-community/attacks/Session_hijacking_attack

---

### 3.4 Authorization & Access Control Testing (Week 3)

#### 3.4.1 Horizontal Access Control

- [ ] **Test user-to-user access**
  - [ ] [ ] Student cannot view other student's grades
  - [ ] [ ] Student cannot view other student's answers
  - [ ] [ ] Student cannot modify other student's submissions
  - [ ] [ ] Teacher cannot view other teacher's classes (unless admin)
  - [ ] [ ] Teacher cannot modify other teacher's questions

- [ ] **Test by changing user ID in requests**
  ```
  Original: /api/quiz/results/123?userId=456
  Attempt:  /api/quiz/results/123?userId=789
  Verify:   Access denied or correct data returned
  ```

- [ ] **Test by changing resource ID**
  ```
  Original: /api/questions/100
  Attempt:  /api/questions/101 (from different user)
  Verify:   Access denied or 404 returned
  ```

#### 3.4.2 Vertical Access Control

- [ ] **Test privilege escalation**
  - [ ] [ ] Student cannot create questions
  - [ ] [ ] Student cannot approve questions
  - [ ] [ ] Student cannot manage users
  - [ ] [ ] Teacher cannot manage other teachers
  - [ ] [ ] Teacher cannot approve system-wide questions
  - [ ] [ ] Teacher cannot access admin panel

- [ ] **Test by modifying user role**
  - [ ] [ ] Change role in request body
  - [ ] [ ] Change role in session/cookie
  - [ ] [ ] Verify server-side role check

- [ ] **Test indirect privilege escalation**
  - [ ] [ ] Create object with higher privileges
  - [ ] [ ] Modify object attributes to gain privileges

#### 3.4.3 Functional Authorization

- [ ] **Test business logic authorization**
  - [ ] [ ] Cannot submit quiz after deadline
  - [ ] [ ] Cannot view quiz answers before published
  - [ ] [ ] Cannot modify closed quiz
  - [ ] [ ] Cannot duplicate another teacher's quiz
  - [ ] [ ] Cannot transfer questions to another class (if restricted)

**Deliverable:** Authorization Testing Report with findings

---

### 3.5 Input Validation & Injection Testing (Week 3-4)

#### 3.5.1 SQL Injection Testing

- [ ] **Identify input fields**
  - [ ] Search forms
  - [ ] Login forms
  - [ ] API parameters
  - [ ] Filter parameters

- [ ] **Test for SQL injection**
  - [ ] [ ] Test with single quote: `'`
  - [ ] [ ] Test with double dash: `--`
  - [ ] [ ] Test with semicolon: `;`
  - [ ] [ ] Test with UNION: `' UNION SELECT NULL, NULL --`
  - [ ] [ ] Test with boolean: `' OR '1'='1`
  - [ ] [ ] Test blind SQL injection (time-based)

- [ ] **Document findings**
  - [ ] Field vulnerable to SQL injection
  - [ ] Type of injection (error-based, union-based, blind)
  - [ ] Data exfiltrated
  - [ ] Proof-of-concept query

#### 3.5.2 Cross-Site Scripting (XSS) Testing

- [ ] **Identify input fields**
  - [ ] Question text
  - [ ] Question options
  - [ ] Comments/notes
  - [ ] User profile fields
  - [ ] Search parameters

- [ ] **Test for reflected XSS**
  ```
  Test payload: <script>alert('XSS')</script>
  Test payload: <img src=x onerror=alert('XSS')>
  Test payload: <svg onload=alert('XSS')>
  ```

  - [ ] Submit payload in GET parameter
  - [ ] Verify payload reflected in response
  - [ ] Verify payload executes in browser
  - [ ] Attempt bypasses (encoding, case variation, etc.)

- [ ] **Test for stored XSS**
  - [ ] Submit payload in form that stores data
  - [ ] Retrieve stored data
  - [ ] Verify payload executes in browser
  - [ ] Verify payload executes for other users

- [ ] **Test for DOM-based XSS**
  - [ ] Review JavaScript that uses user input
  - [ ] Look for `innerHTML`, `eval()`, `document.write()`
  - [ ] Test manipulation of DOM

#### 3.5.3 Command Injection Testing

- [ ] **Identify potential command injection points**
  - [ ] File operations (upload, download, delete)
  - [ ] System commands
  - [ ] External service calls

- [ ] **Test for command injection**
  ```
  Test payload: ; ls -la
  Test payload: | whoami
  Test payload: `whoami`
  Test payload: $(whoami)
  ```

#### 3.5.4 Other Injection Tests

- [ ] **Test LDAP injection** (if LDAP used)
- [ ] **Test XML injection** (if XML used)
- [ ] **Test XPath injection** (if XPath used)
- [ ] **Test NoSQL injection** (if MongoDB used)
  ```
  Test payload: {"$ne": null}
  Test payload: {"$gt": ""}
  ```

**Deliverable:** Input Validation Testing Report

---

### 3.6 Business Logic Testing (Week 4)

#### 3.6.1 Quiz/Exam Workflow Testing

- [ ] **Test quiz creation and configuration**
  - [ ] [ ] Cannot modify quiz while students taking it
  - [ ] [ ] Cannot delete quiz while students taking it
  - [ ] [ ] Cannot change correct answers while quiz active
  - [ ] [ ] Cannot extend deadline unfairly
  - [ ] [ ] Cannot view student answers before quiz closed

- [ ] **Test quiz submission**
  - [ ] [ ] Cannot submit after deadline
  - [ ] [ ] Cannot submit multiple times (if limited)
  - [ ] [ ] Cannot modify submitted answers
  - [ ] [ ] Submission time recorded correctly

- [ ] **Test grading**
  - [ ] [ ] Automatic grading calculates correctly
  - [ ] [ ] Manual grade input validated
  - [ ] [ ] Cannot change grade after published
  - [ ] [ ] Grade reflects correct answers

- [ ] **Test question scope**
  - [ ] [ ] Class-level questions not visible to other classes
  - [ ] [ ] System-wide draft questions not visible to students
  - [ ] [ ] Approved system-wide questions visible correctly
  - [ ] [ ] Cannot use questions user doesn't have access to

#### 3.6.2 Data Integrity Testing

- [ ] **Test answer tampering**
  - [ ] [ ] Cannot modify answer after submission
  - [ ] [ ] Cannot tamper with answer in transit (HTTPS validates)
  - [ ] [ ] Cannot manipulate client-side calculations

- [ ] **Test calculation logic**
  - [ ] [ ] Score calculation accurate
  - [ ] [ ] Percentage calculation correct
  - [ ] [ ] Partial credit (if applicable) correct
  - [ ] [ ] Curve calculation (if applicable) correct

- [ ] **Test data consistency**
  - [ ] [ ] Grade matches submitted answers
  - [ ] [ ] Timestamp consistent
  - [ ] [ ] User attribution correct

**Deliverable:** Business Logic Testing Report

---

### 3.7 API & Microservice Testing (Week 4-5)

#### 3.7.1 API Endpoint Testing

- [ ] **Test each endpoint for security**
  - [ ] [ ] Authentication required
  - [ ] [ ] Authorization enforced
  - [ ] [ ] Input validation
  - [ ] [ ] Output validation
  - [ ] [ ] Rate limiting applied
  - [ ] [ ] CORS properly configured

- [ ] **Test CSRF protection**
  - [ ] [ ] POST/PUT/DELETE require CSRF token
  - [ ] [ ] GET requests don't require token
  - [ ] [ ] Invalid tokens rejected
  - [ ] [ ] Expired tokens rejected

- [ ] **Test API responses**
  - [ ] [ ] No sensitive information in error messages
  - [ ] [ ] No stack traces exposed
  - [ ] [ ] Response codes correct (400 vs 401 vs 403)
  - [ ] [ ] No metadata exposure

#### 3.7.2 Microservice Communication Testing

- [ ] **Test service-to-service authentication**
  - [ ] [ ] Service A can call Service B
  - [ ] [ ] Unauthenticated call rejected
  - [ ] [ ] Invalid credentials rejected
  - [ ] [ ] Signature validation works

- [ ] **Test data validation between services**
  - [ ] [ ] Service B validates input from Service A
  - [ ] [ ] Malformed data rejected
  - [ ] [ ] Service A validates response from Service B

- [ ] **Test encryption in transit**
  - [ ] [ ] Service-to-service communication over HTTPS
  - [ ] [ ] Certificate validation enabled
  - [ ] [ ] TLS version secure (1.2+)

**Deliverable:** API Security Testing Report

---

### 3.8 Configuration & Deployment Testing (Week 5)

#### 3.8.1 Security Headers Testing

- [ ] **Test HTTP security headers**
  ```
  [ ] Content-Security-Policy present
  [ ] X-Content-Type-Options: nosniff
  [ ] X-Frame-Options: DENY or SAMEORIGIN
  [ ] X-XSS-Protection: 1; mode=block
  [ ] Strict-Transport-Security (HSTS) present
  [ ] Referrer-Policy configured
  [ ] Permissions-Policy configured
  ```

#### 3.8.2 SSL/TLS Testing

- [ ] **Test HTTPS configuration**
  - [ ] [ ] HTTPS enforced
  - [ ] [ ] HTTP redirects to HTTPS
  - [ ] [ ] Certificate valid
  - [ ] [ ] Certificate not self-signed
  - [ ] [ ] TLS version 1.2+ (no SSL, TLS 1.0, TLS 1.1)
  - [ ] [ ] Strong ciphers configured
  - [ ] [ ] Weak ciphers disabled
  - [ ] [ ] HSTS enabled

- [ ] **Use online tools for testing**
  - [ ] [ ] SSL Labs (https://www.ssllabs.com/ssltest/)
  - [ ] [ ] Mozilla Observatory (https://observatory.mozilla.org/)

#### 3.8.3 Configuration Testing

- [ ] **Test default configurations**
  - [ ] [ ] Default credentials changed
  - [ ] [ ] Default ports changed (if applicable)
  - [ ] [ ] Debug mode disabled
  - [ ] [ ] Verbose errors disabled
  - [ ] [ ] Directory listing disabled

- [ ] **Test environment variables**
  - [ ] [ ] Secrets not in code
  - [ ] [ ] Secrets not in environment dumps
  - [ ] [ ] Secrets not in logs

#### 3.8.4 Dependency Scanning

- [ ] **Scan dependencies for vulnerabilities**
  ```bash
  npm audit
  # or
  yarn audit
  # or
  python -m pip check
  ```

- [ ] **Review findings**
  - [ ] Document critical vulnerabilities
  - [ ] Plan updates for vulnerable packages
  - [ ] Verify updates don't break functionality

**Deliverable:** Configuration & Deployment Report

---

### 3.9 File & Content Security Testing (Week 5)

#### 3.9.1 File Upload Testing

- [ ] **Identify upload functionality**
  - [ ] Question attachments
  - [ ] Answer attachments
  - [ ] User profile pictures
  - [ ] Bulk import files

- [ ] **Test file type validation**
  - [ ] [ ] Upload allowed file type (e.g., PDF)
  - [ ] [ ] Upload disallowed file type (e.g., .exe)
  - [ ] [ ] Upload file with double extension (.pdf.exe)
  - [ ] [ ] Upload file with null byte (.pdf\x00.exe)
  - [ ] [ ] Upload file with MIME type mismatch

- [ ] **Test file size limits**
  - [ ] [ ] Upload file under limit
  - [ ] [ ] Upload file over limit (rejected)
  - [ ] [ ] Upload multiple files (test total size)
  - [ ] [ ] DoS via large files

- [ ] **Test file storage security**
  - [ ] [ ] Uploaded files not executable
  - [ ] [ ] Uploaded files not in web root (if possible)
  - [ ] [ ] Uploaded files not accessible directly
  - [ ] [ ] Uploaded files access controlled

- [ ] **Test filename handling**
  - [ ] [ ] Special characters in filename handled
  - [ ] [ ] Path traversal in filename (e.g., ../../../etc/passwd)
  - [ ] [ ] Null bytes in filename handled

#### 3.9.2 Static Content Security

- [ ] **Test CSS/JavaScript file integrity**
  - [ ] [ ] Files served with correct MIME types
  - [ ] [ ] Files not modified in transit (HTTPS)
  - [ ] [ ] Subresource Integrity (SRI) used if from CDN
  - [ ] [ ] Files not cached indefinitely

**Deliverable:** File & Content Security Report

---

### 3.10 Performance & DoS Testing (Week 5-6)

#### 3.10.1 Rate Limiting Testing

- [ ] **Test rate limits**
  - [ ] [ ] Rate limit enforced on login
  - [ ] [ ] Rate limit enforced on API endpoints
  - [ ] [ ] Rate limit by IP address
  - [ ] [ ] Rate limit by user ID
  - [ ] [ ] Rate limit headers included in response

- [ ] **Test rate limit bypass**
  - [ ] [ ] Bypass by changing IP (X-Forwarded-For)
  - [ ] [ ] Bypass by using proxy
  - [ ] [ ] Bypass by distributed requests

#### 3.10.2 DoS Testing

- [ ] **Test for vulnerabilities to DoS attacks**
  - [ ] [ ] Large request body handling
  - [ ] [ ] Slow requests handling
  - [ ] [ ] Concurrent request handling
  - [ ] [ ] Algorithmic complexity (ReDoS with regex)

- [ ] **Test resource exhaustion**
  - [ ] [ ] Database connection pooling
  - [ ] [ ] Memory usage under load
  - [ ] [ ] Disk space usage
  - [ ] [ ] CPU usage

**Note**: Only perform load testing in staging environment with approval

**Deliverable:** Performance & DoS Report

---

### 3.11 Vulnerability Reporting & Remediation (Week 6-7)

#### 3.11.1 Vulnerability Documentation

- [ ] **For each vulnerability found:**
  - [ ] [ ] Unique ID (e.g., PEN-001)
  - [ ] [ ] Title
  - [ ] [ ] Severity (Critical, High, Medium, Low)
  - [ ] [ ] CVSS score
  - [ ] [ ] Description
  - [ ] [ ] Affected component
  - [ ] [ ] Steps to reproduce
  - [ ] [ ] Proof-of-concept code/screenshots
  - [ ] [ ] Impact assessment
  - [ ] [ ] Recommended remediation
  - [ ] [ ] Remediation effort (Low, Medium, High)
  - [ ] [ ] References/Links

#### 3.11.2 Executive Summary Report

- [ ] **Create summary report**
  - [ ] [ ] Total vulnerabilities by severity
  - [ ] [ ] Statistics (charts/graphs)
  - [ ] [ ] Top 5 critical findings
  - [ ] [ ] Risk assessment
  - [ ] [ ] Recommendations for next steps
  - [ ] [ ] Timeline for remediation

#### 3.11.3 Remediation Planning

- [ ] **Create remediation timeline**
  - [ ] [ ] Critical: 7 days
  - [ ] [ ] High: 30 days
  - [ ] [ ] Medium: 60 days
  - [ ] [ ] Low: 90 days

- [ ] **Create tracking tickets**
  - [ ] [ ] One ticket per vulnerability
  - [ ] [ ] Assign to responsible team
  - [ ] [ ] Set priority and deadline
  - [ ] [ ] Link to test case for validation

- [ ] **Plan retesting**
  - [ ] [ ] Schedule retesting after remediation
  - [ ] [ ] Verify vulnerability fixed
  - [ ] [ ] Check for regression
  - [ ] [ ] Document resolution evidence

**Deliverable:** 
- Penetration Testing Report (detailed findings)
- Executive Summary (high-level overview)
- Remediation Tracking Spreadsheet

---

## PHASE 4: School Role & Hierarchy Implementation

### 4.1 Research & Requirements Analysis (Week 1-3)

#### 4.1.1 School Structure Research

**Research Materials to Gather:**
- [ ] **Educational systems documentation**
  - https://en.wikipedia.org/wiki/School_administration
  - https://www.asha.org/careers/roles-and-responsibilities/
  - Educational administration textbooks
  - Regional/national education standards

- [ ] **Organizational hierarchy study**
  - [ ] Typical school org chart
  - [ ] Principal → Vice Principal → Teachers → Students
  - [ ] Variations by school type (elementary, secondary, university)
  - [ ] Role responsibilities documentation
  - [ ] Reporting relationships

- [ ] **Permission requirements**
  - [ ] What can principal do
  - [ ] What can vice principal do
  - [ ] What can teacher do
  - [ ] What can teacher assistant do
  - [ ] What can student do
  - [ ] What can parent do (if applicable)

- [ ] **School-specific business processes**
  - [ ] Class assignment process
  - [ ] Teacher assignment to classes
  - [ ] Question sharing between teachers
  - [ ] Grade reporting to parents
  - [ ] Compliance requirements (FERPA, etc.)

**Deliverable:** School Structure Requirements Document

#### 4.1.2 Competitive Analysis

- [ ] **Study competitor LMS systems**

**Google Classroom:**
- [ ] https://support.google.com/classroom/answer/3464207
- [ ] Document: class setup, teacher roles, admin roles
- [ ] Teacher management: creating classes, adding students
- [ ] Permission model: what each role can do
- [ ] School-level features: domain administration

**Moodle:**
- [ ] https://docs.moodle.org/en/Roles_overview
- [ ] Study: role system
- [ ] Study: site administrator, course manager, teacher, student
- [ ] Study: custom roles
- [ ] Study: permission inheritance

**Canvas:**
- [ ] https://canvas.instructure.com/doc
- [ ] Study: user roles
- [ ] Study: account hierarchy
- [ ] Study: sub-account management
- [ ] Study: permission delegation

**Blackboard:**
- [ ] Study: institutional role hierarchy
- [ ] Study: course roles
- [ ] Study: permission model

- [ ] **Document best practices from competitors**
  - [ ] How they structure school administration
  - [ ] How they manage teacher assignments
  - [ ] How they handle class creation
  - [ ] How they report up the hierarchy

**Deliverable:** Competitive Analysis Report

#### 4.1.3 Stakeholder Interviews

- [ ] **Interview school administrators**
  - [ ] Questions:
    - What is your current management workflow?
    - How do you assign teachers to classes?
    - How do you monitor teacher performance?
    - What reports do you need?
    - What are your biggest pain points?
    - What features would help you manage school better?
  - [ ] Document responses
  - [ ] Take notes on priorities

- [ ] **Interview teachers**
  - [ ] Questions:
    - How would you like to manage your classes?
    - Do you need to collaborate with other teachers?
    - How should student data be organized?
    - What are your privacy concerns?
  - [ ] Document feedback

- [ ] **Interview IT/Systems team**
  - [ ] Questions:
    - What security requirements exist?
    - What compliance requirements?
    - What integration needs?
    - What are capacity concerns?

**Deliverable:** Stakeholder Interview Summary

#### 4.1.4 Requirements Specification

- [ ] **Functional requirements**
  ```
  F1: School administrators can view all teachers in their school
  F2: School administrators can create classes
  F3: School administrators can assign teachers to classes
  F4: Teachers can manage only their own classes
  F5: Teachers can view only their own students
  F6: School administrators can view student grades
  F7: School administrators can override quiz results
  F8: Teachers can export class roster
  ```

- [ ] **Non-functional requirements**
  ```
  NF1: Response time < 2 seconds for listing 1000 teachers
  NF2: Support 10,000+ students per school
  NF3: Support 90% uptime for exam functionality
  NF4: Audit trail for all admin actions
  NF5: FERPA compliance for student data
  ```

- [ ] **Use cases**
  - [ ] UC1: School admin creates school
  - [ ] UC2: School admin invites teacher to school
  - [ ] UC3: School admin assigns teacher to class
  - [ ] UC4: Teacher manages class
  - [ ] UC5: School admin views school-level reports

**Deliverable:** Requirements Specification Document (FRD)

---

### 4.2 Role Hierarchy Design (Week 3-4)

#### 4.2.1 Define Role Types

- [ ] **School Administrator**
  - **Responsibilities:**
    - Manage teachers
    - Manage classes
    - View all school data
    - Generate reports
    - Configure school settings
    - Manage school permissions

  - **Permissions:**
    - [ ] Create/edit/delete classes
    - [ ] Assign teachers to classes
    - [ ] View all student grades
    - [ ] View all questions (system-wide)
    - [ ] Approve system-wide questions
    - [ ] Override grades
    - [ ] View audit logs
    - [ ] Manage teacher accounts
    - [ ] Export school reports
    - [ ] Access admin dashboard

- [ ] **Teacher**
  - **Responsibilities:**
    - Create and manage questions
    - Create and manage quizzes
    - Grade student submissions
    - View class data
    - Communicate with students

  - **Permissions:**
    - [ ] Create class-level questions
    - [ ] View own class questions
    - [ ] Create quizzes in own classes
    - [ ] Grade quizzes in own classes
    - [ ] View own students
    - [ ] Export class roster
    - [ ] View own grades/analytics
    - [ ] Create system-wide questions (draft, needs approval)

- [ ] **Class Lead Teacher** (optional)
  - **Responsibilities:**
    - Manage specific class
    - Assist school admin with class management

  - **Permissions:**
    - [ ] All teacher permissions
    - [ ] Manage class details
    - [ ] Add students to class
    - [ ] Remove students from class
    - [ ] Edit class settings
    - [ ] Assign other teachers to class (if multi-teacher class)

- [ ] **Student**
  - **Permissions:**
    - [ ] Take quizzes in assigned classes
    - [ ] View own grades
    - [ ] View own submissions
    - [ ] View own questions/assignments

- [ ] **Parent** (if applicable)
  - **Permissions:**
    - [ ] View child's grades
    - [ ] View child's submissions
    - [ ] Communication with teachers

#### 4.2.2 Create Permission Matrix

```
| Feature | Student | Teacher | Class Lead | School Admin | System Admin |
|---------|---------|---------|------------|--------------|--------------|
| Create question (class) | No | Yes | Yes | Yes | Yes |
| Create question (system) | No | Draft | Draft | Yes | Yes |
| Approve question | No | No | No | Yes | Yes |
| View all questions | No | Own only | Own + Class | School + System | All |
| Create quiz | No | Own class | Own class | Any | Any |
| Grade quiz | No | Own class | Own class | Any | Any |
| View grades | Own | Own class | Class | School | All |
| Override grade | No | No | No | Yes | Yes |
| Manage teachers | No | No | No | Yes | Yes |
| Create class | No | No | No | Yes | Yes |
| Manage class | No | Own | Class | Yes | Yes |
| View audit logs | No | No | No | Yes | Yes |
```

#### 4.2.3 Document Role Transitions

- [ ] **Possible transitions**
  - [ ] Student → Teacher (hire)
  - [ ] Teacher → Class Lead Teacher (promotion)
  - [ ] Teacher → School Admin (promotion)
  - [ ] School Admin → System Admin (promotion)

- [ ] **Transition process**
  - [ ] Who can approve
  - [ ] What data migrates
  - [ ] What data is archived
  - [ ] Timeline for transition

**Deliverable:** Role Hierarchy & Permission Matrix Document

---

### 4.3 Architecture Design for School Roles (Week 4-5)

#### 4.3.1 Database Schema Design

- [ ] **Create school entity**
  ```sql
  CREATE TABLE schools (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL UNIQUE,
    address VARCHAR(500),
    city VARCHAR(100),
    country VARCHAR(100),
    phone VARCHAR(20),
    website VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_country (country)
  );
  ```

- [ ] **Create school membership**
  ```sql
  CREATE TABLE school_memberships (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    school_id INT NOT NULL,
    role VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    UNIQUE KEY unique_membership (user_id, school_id),
    INDEX idx_school (school_id),
    INDEX idx_role (role)
  );
  ```

- [ ] **Update classes table**
  ```sql
  ALTER TABLE classes ADD COLUMN (
    school_id INT NOT NULL,
    grade_level VARCHAR(50),
    section VARCHAR(50),
    academic_year VARCHAR(10),
    max_students INT DEFAULT 40,
    FOREIGN KEY (school_id) REFERENCES schools(id),
    INDEX idx_school (school_id)
  );
  ```

- [ ] **Create class teacher assignments**
  ```sql
  CREATE TABLE class_teachers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    class_id INT NOT NULL,
    user_id INT NOT NULL,
    role VARCHAR(50) DEFAULT 'TEACHER',
    is_primary BOOLEAN DEFAULT FALSE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_assignment (class_id, user_id),
    INDEX idx_user (user_id)
  );
  ```

- [ ] **Create school audit log**
  ```sql
  CREATE TABLE school_audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    school_id INT NOT NULL,
    user_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT,
    old_value JSON,
    new_value JSON,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_school_timestamp (school_id, timestamp),
    INDEX idx_action (action)
  );
  ```

- [ ] **Create school settings**
  ```sql
  CREATE TABLE school_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    school_id INT NOT NULL UNIQUE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value VARCHAR(500),
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    UNIQUE KEY unique_setting (school_id, setting_key)
  );
  ```

**Data Migration Strategy:**
- [ ] Map existing data to school entity
- [ ] Create default school for existing data
- [ ] Migrate users to school_memberships
- [ ] Update classes with school_id
- [ ] Test data integrity

#### 4.3.2 API Design for School Management

- [ ] **School endpoints**
  ```
  POST   /api/v1/schools                    - Create school (admin)
  GET    /api/v1/schools/:schoolId          - Get school details
  PUT    /api/v1/schools/:schoolId          - Update school (admin)
  DELETE /api/v1/schools/:schoolId          - Delete school (admin)
  GET    /api/v1/schools/:schoolId/teachers - List teachers in school
  GET    /api/v1/schools/:schoolId/classes  - List classes in school
  ```

- [ ] **Teacher management endpoints**
  ```
  POST   /api/v1/schools/:schoolId/invite-teacher      - Invite teacher
  DELETE /api/v1/schools/:schoolId/teachers/:userId    - Remove teacher
  PUT    /api/v1/schools/:schoolId/teachers/:userId    - Update teacher role
  POST   /api/v1/schools/:schoolId/teachers/:userId/assign-class - Assign to class
  ```

- [ ] **Class management endpoints**
  ```
  POST   /api/v1/schools/:schoolId/classes             - Create class
  GET    /api/v1/schools/:schoolId/classes/:classId    - Get class
  PUT    /api/v1/schools/:schoolId/classes/:classId    - Update class
  DELETE /api/v1/schools/:schoolId/classes/:classId    - Delete class
  POST   /api/v1/classes/:classId/assign-teacher       - Assign teacher to class
  POST   /api/v1/classes/:classId/remove-teacher       - Remove teacher from class
  ```

- [ ] **Reporting endpoints**
  ```
  GET    /api/v1/schools/:schoolId/reports/teachers    - Teacher summary
  GET    /api/v1/schools/:schoolId/reports/quiz-results - Quiz performance
  GET    /api/v1/schools/:schoolId/reports/questions   - Question usage
  ```

#### 4.3.3 Authorization Service Architecture

- [ ] **Create authorization service**
  ```javascript
  class AuthorizationService {
    async canUserAccessSchool(userId, schoolId, action) {
      // Get user's school membership
      // Check role permissions
      // Return true/false
    }
    
    async canUserManageTeacher(adminId, teacherId, schoolId, action) {
      // Check if admin is school admin
      // Check if teacher is in same school
      // Return true/false
    }
    
    async canUserAccessClass(userId, classId, action) {
      // Get user's relationship to class
      // Check permissions
      // Return true/false
    }
  }
  ```

- [ ] **Add authorization middleware**
  ```javascript
  async function authorizeSchoolAccess(req, res, next) {
    const { schoolId } = req.params;
    const canAccess = await authService.canUserAccessSchool(
      req.user.id,
      schoolId,
      'READ'
    );
    if (!canAccess) return res.status(403).send('Forbidden');
    next();
  }
  ```

**System Changes:**
- New tables: schools, school_memberships, class_teachers, school_audit_logs, school_settings
- New columns in classes: school_id, grade_level, section, academic_year, max_students
- New columns in school_memberships: user_id, school_id, role, status, joined_at
- New authorization service with permission checks
- New API endpoints for school management
- Audit logging for school-level actions

---

### 4.4 Implementation (Week 5-7)

#### 4.4.1 Backend Implementation

- [ ] **Database migration**
  ```bash
  npm run migrate:add-school-tables
  npm run migrate:up
  ```

- [ ] **Create school service**
  ```javascript
  class SchoolService {
    async createSchool(data) { }
    async getSchool(schoolId) { }
    async updateSchool(schoolId, data) { }
    async deleteSchool(schoolId) { }
    async addTeacherToSchool(schoolId, userId, role) { }
    async removeTeacherFromSchool(schoolId, userId) { }
    async assignTeacherToClass(classId, userId) { }
  }
  ```

- [ ] **Implement authorization checks**
  - [ ] Create permission matrix in code
  - [ ] Create authorization middleware
  - [ ] Add checks to all school-related endpoints

- [ ] **Implement audit logging**
  ```javascript
  async function logSchoolAction(schoolId, userId, action, entity, changes) {
    await AuditLog.create({
      school_id: schoolId,
      user_id: userId,
      action,
      entity_type: entity,
      old_value: changes.before,
      new_value: changes.after
    });
  }
  ```

- [ ] **Create school reports service**
  - [ ] Teacher roster report
  - [ ] Quiz results aggregation
  - [ ] Question usage statistics
  - [ ] Student performance metrics

#### 4.4.2 Frontend Implementation

- [ ] **Create school admin dashboard**
  - [ ] Overview: school stats (teachers, classes, students)
  - [ ] Teachers list: add, remove, reassign
  - [ ] Classes list: create, edit, delete, manage teachers
  - [ ] Reports section: view various reports
  - [ ] Settings section: configure school

- [ ] **Create teacher management UI**
  - [ ] Invite teachers
  - [ ] View teacher profiles
  - [ ] Assign teachers to classes
  - [ ] View teacher performance metrics
  - [ ] Remove teachers

- [ ] **Create class management UI**
  - [ ] Create new classes
  - [ ] Edit class details
  - [ ] Assign/remove teachers
  - [ ] View class roster
  - [ ] Class settings

- [ ] **Create reports UI**
  - [ ] Teacher summary report
  - [ ] Quiz performance dashboard
  - [ ] Question usage statistics
  - [ ] Student performance tracking
  - [ ] Export reports to CSV/PDF

**UI/UX Considerations:**
- Clean, minimal dark aesthetic (per your preference)
- Clear hierarchy in navigation
- Responsive design
- Accessible forms
- Loading states
- Error handling

#### 4.4.3 Integration Testing

- [ ] **Test school creation workflow**
  - [ ] Create school → Add teachers → Create classes → Verify permissions

- [ ] **Test teacher management**
  - [ ] Invite teacher → Assign to class → Teacher can manage class → Remove teacher

- [ ] **Test permission enforcement**
  - [ ] Teacher A cannot view Teacher B's class
  - [ ] Student cannot access other students' data
  - [ ] Only school admin can view school-level reports

- [ ] **Test audit logging**
  - [ ] All school actions logged
  - [ ] Audit log accessible to admin
  - [ ] Audit log cannot be modified/deleted

---

### 4.5 Deployment & Rollout (Week 7-8)

#### 4.5.1 Migration Plan

- [ ] **Create migration script**
  - [ ] Create default school for existing data
  - [ ] Migrate users to school_memberships
  - [ ] Update classes with school_id
  - [ ] Migrate class-teacher relationships

- [ ] **Test migration on staging**
  - [ ] Run migration
  - [ ] Verify data integrity
  - [ ] Verify existing functionality still works
  - [ ] Performance testing

- [ ] **Backup and rollback plan**
  - [ ] Full database backup before migration
  - [ ] Document rollback procedure
  - [ ] Keep old schema available for fallback

#### 4.5.2 Feature Rollout

- [ ] **Phase 1: Internal testing** (1 week)
  - [ ] Deploy to staging
  - [ ] Test with internal team
  - [ ] Fix any issues

- [ ] **Phase 2: Limited rollout** (1 week)
  - [ ] Deploy to 1-2 schools
  - [ ] Monitor closely
  - [ ] Gather feedback

- [ ] **Phase 3: Full rollout** (1 week)
  - [ ] Deploy to all schools
  - [ ] Continue monitoring
  - [ ] Support users

#### 4.5.3 User Training & Support

- [ ] **Create training materials**
  - [ ] Admin guide: How to manage school
  - [ ] Teacher guide: How to manage classes
  - [ ] Video tutorials
  - [ ] FAQ document

- [ ] **Conduct training**
  - [ ] Webinar for school admins
  - [ ] Webinar for teachers
  - [ ] One-on-one support as needed

- [ ] **Set up support**
  - [ ] Support email address
  - [ ] Support tickets system
  - [ ] FAQ page
  - [ ] Known issues log

#### 4.5.4 Post-Deployment Monitoring

- [ ] **Monitor for issues**
  - [ ] Error logs review
  - [ ] Performance metrics
  - [ ] User feedback
  - [ ] Support tickets

- [ ] **Gather feedback**
  - [ ] Send survey to admins
  - [ ] Review support tickets
  - [ ] Conduct user interviews
  - [ ] Document improvement ideas

---

## Implementation Timeline Summary

```
Week 1  │ Phase 1: Analysis & Planning
Week 2  │ Phase 1: Analysis continued, Schema design
Week 3  │ Phase 1: API Development starts
Week 4  │ Phase 1: API Development continues
Week 5  │ Phase 1: Frontend Development
Week 6  │ Phase 1: Frontend Development continues
Week 7  │ Phase 1: Testing & QA
Week 8  │ Phase 1: Testing & Deployment
Week 9  │ Phase 1: Post-deployment monitoring
        │ Phase 2: Security Assessment starts
Week 10 │ Phase 2: CSRF & CSP Implementation
Week 11 │ Phase 2: Authentication Hardening
Week 12 │ Phase 2: Input Validation
Week 13 │ Phase 2: API Security
Week 14 │ Phase 2: Logging & Monitoring
Week 15 │ Phase 2: Deployment
Week 16 │ Phase 3: Penetration Testing starts
Week 17 │ Phase 3: Scope definition & Reconnaissance
Week 18 │ Phase 3: Authentication & Session Testing
Week 19 │ Phase 3: Authorization Testing
Week 20 │ Phase 3: Input Validation Testing
Week 21 │ Phase 3: Business Logic Testing
Week 22 │ Phase 3: API Testing
Week 23 │ Phase 3: Configuration Testing
Week 24 │ Phase 3: Reporting & Remediation
        │ Phase 4: Research starts (can run parallel)
Week 25 │ Phase 4: Requirements & Design
Week 26 │ Phase 4: Architecture Design
Week 27 │ Phase 4: Backend Implementation
Week 28 │ Phase 4: Frontend Implementation
Week 29 │ Phase 4: Integration Testing
Week 30 │ Phase 4: Deployment & Rollout
```

---

## Success Criteria

All phases completed when:

✅ **Phase 1:**
- All CRUD operations for questions (class & system) working
- All tests passing (90%+ coverage)
- All endpoints documented
- Deployed to production
- Zero critical bugs in first week
- Positive user feedback

✅ **Phase 2:**
- All security vulnerabilities fixed
- CSRF protection on all state-changing operations
- CSP headers configured
- Authentication hardened
- Input validation on all endpoints
- Rate limiting active
- Logging and monitoring working
- Security team approved

✅ **Phase 3:**
- Penetration testing completed
- All critical vulnerabilities remediated
- All high vulnerabilities remediated
- Medium/low vulnerabilities tracked
- Security report published
- Monitoring setup for ongoing security

✅ **Phase 4:**
- School role hierarchy implemented
- Teacher management working
- School admin can oversee all teachers
- All permissions enforced
- Audit logging working
- Deployed to production
- Positive feedback from school admins

---

## Key Resources & Contacts

- [ ] Security Lead: [Assign name]
- [ ] QA Lead: [Assign name]
- [ ] DevOps Lead: [Assign name]
- [ ] Product Manager: [Assign name]

---

**Document Version:** 1.0  
**Last Updated:** July 16, 2026  
**Next Review:** Every 2 weeks during implementation
