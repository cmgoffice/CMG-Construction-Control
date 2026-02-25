# Database Schema (Relational Structure)

This schema represents the required collections/tables for the CMG Construction App. It is designed to be compatible with relational databases (e.g., Supabase/PostgreSQL) as well as Firebase Firestore with references.

## Core Authorization
### `users` / `roles`
* `uid` (Primary Key, UUID)
* `name` (String: Full Name)
* `role` (Enum: 'MD', 'GM', 'CD', 'PM', 'CM', 'Supervisor')
* `email` (String)

---

## Part A: Project & Resource Management

### `projects` (A1)
* `id` (Primary Key, UUID)
* `project_no` (String: e.g., 'PRJ-2026-001')
* `name` (String: Project Title)
* `location` (String: Site Address)
* `pm_id` (Foreign Key -> users.uid: Assigned Project Manager)
* `cm_id` (Foreign Key -> users.uid: Assigned Construction Manager)
* `start_date` (Date)
* `finish_date` (Date)
* `status` (Enum: 'ACTIVE', 'LOCKED')

### `project_supervisors` (A2)
* `id` (Primary Key, UUID)
* `project_id` (Foreign Key -> projects.id)
* `supervisor_id` (Foreign Key -> users.uid)
* `scope_type` (String: e.g., 'Structural', 'MEP', 'Finishing')
* `start_date` (Date)
* `finish_date` (Date)
* `work_format` (String: e.g., 'Day Shift', 'Night Shift')

### `project_equipments` (A3)
* `id` (Primary Key, UUID)
* `project_id` (Foreign Key -> projects.id)
* `eqm_name` (String: e.g., 'Excavator PC200')
* `po_no` (String: Purchase Order Number)
* `total_po` (Integer/Decimal: Total authorized quantity/hours)
* `type` (String: e.g., 'Heavy Machinery', 'Hand Tool')
* `fuel_condition` (String: e.g., 'Requires Fuel', 'Electric')
* `start_date` (Date)
* `finish_date` (Date)

### `project_worker_teams` (A4)
* `id` (Primary Key, UUID)
* `project_id` (Foreign Key -> projects.id)
* `team_code` (String: e.g., 'TM-STR-01')
* `name` (String: e.g., 'Steel Fixers Alpha')
* `leader_name` (String)
* `type` (String: e.g., 'Subcontractor', 'Direct Labor')
* `total_headcount` (Integer)

---

## Part B: Site Work Order (SWO) Assignment

### `site_work_orders` (B)
* `id` (Primary Key, UUID)
* `project_id` (Foreign Key -> projects.id)
* `swo_no` (String: 'SWO-001')
* `work_name` (String: Description of the work package)
* `supervisor_id` (Foreign Key -> project_supervisors.supervisor_id)
* `status` (Enum: 'Draft', 'Acknowledged', 'In Progress', 'Complete')
* `created_by` (Foreign Key -> users.uid: Usually PM or CM)

### `swo_activities` (B1)
* `id` (Primary Key, UUID)
* `swo_id` (Foreign Key -> site_work_orders.id)
* `description` (String: e.g., 'Pour concrete foundation')
* `unit` (String: e.g., 'm³', 'm²', 'kg')
* `qty_total` (Decimal: Total required quantity for this SWO)

### `swo_equipments` (B2)
* `id` (Primary Key, UUID)
* `swo_id` (Foreign Key -> site_work_orders.id)
* `equipment_id` (Foreign Key -> project_equipments.id)

### `swo_worker_teams` (B3)
* `id` (Primary Key, UUID)
* `swo_id` (Foreign Key -> site_work_orders.id)
* `team_id` (Foreign Key -> project_worker_teams.id)

---

## Part C: Daily Progress Report & Approval Workflow

### `daily_reports` (C)
* `id` (Primary Key, UUID)
* `swo_id` (Foreign Key -> site_work_orders.id)
* `date` (Date: Report Date)
* `supervisor_id` (Foreign Key -> users.uid: Submitter)
* `status` (Enum: 'Pending CM Review', 'Pending PM Review', 'Approved', 'Rejected')
* `cm_notes` (Text: Optional feedback during CM review)
* `pm_notes` (Text: Optional feedback during PM review)
* `created_at` (Timestamp)

### `daily_report_activities` (C1)
* `id` (Primary Key, UUID)
* `report_id` (Foreign Key -> daily_reports.id)
* `activity_id` (Foreign Key -> swo_activities.id)
* `today_progress_qty` (Decimal: Quantity completed today)
* `total_up_to_date` (Decimal: Computed/Stored cumulative total)

### `daily_report_equipments` (C2)
* `id` (Primary Key, UUID)
* `report_id` (Foreign Key -> daily_reports.id)
* `swo_equipment_id` (Foreign Key -> swo_equipments.id)
* `status` (String: e.g., 'Working', 'Broken Down', 'Idle')
* `work_detail` (String: What the eqm was used for today)
* `qty_done` (Decimal: e.g., hours worked)

### `daily_report_workers` (C3)
* `id` (Primary Key, UUID)
* `report_id` (Foreign Key -> daily_reports.id)
* `swo_team_id` (Foreign Key -> swo_worker_teams.id)
* `actual_headcount` (Integer: Number of workers present)
* `male_count` (Integer)
* `female_count` (Integer)
