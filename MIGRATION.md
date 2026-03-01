# การย้าย Firestore ไปใต้ ConstructionControlData/root

แอปใช้ path ใหม่: ข้อมูลทั้งหมดอยู่ใต้ `ConstructionControlData` > document `root` > collections ต่างๆ  
**ข้อมูลเดิมที่ root ไม่ถูกลบ** — เป็นการคัดลอกเท่านั้น

---

## ขั้นตอน (ทำตามลำดับ)

### 1. เตรียม Service Account (สำหรับสคริปต์ย้ายข้อมูล)

- เปิด [Firebase Console](https://console.firebase.google.com) → โปรเจกต์ของคุณ → Project settings → Service accounts
- กด "Generate new private key" แล้วบันทึกไฟล์ JSON
- ตั้งตัวแปรสภาพแวดล้อม (Windows PowerShell):
  ```powershell
  $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\your-service-account.json"
  ```

### 2. รันย้ายข้อมูล (ไม่ลบของเดิม)

```bash
# ดูจำนวนเอกสารที่จะย้าย (ไม่เขียนข้อมูล)
npm run migrate:firestore:dry

# ย้ายข้อมูลจริง
npm run migrate:firestore
```

สคริปต์จะ **คัดลอก** จาก collection ที่ root ไปยัง `ConstructionControlData/root/{ชื่อ collection}`  
รายการที่ย้าย: activity_logs, daily_reports, project_equipments, project_supervisors, project_worker_teams, projects, site_work_orders, users  
สำหรับ `daily_reports` ถ้ามี subcollections (activities, attachments) จะถูกรวมเข้าไปใน document ที่ path ใหม่

### 3. อัปเดต Firestore Rules

แอปอ่าน/เขียนเฉพาะที่ `ConstructionControlData/root/...` แล้ว — การบันทึกครั้งถัดไปจะไปที่ path ใหม่เสมอ

ในโปรเจกต์มีไฟล์ **`firestore.rules`** เป็นตัวอย่าง ให้ไปที่ Firebase Console → Firestore Database → Rules แล้วเพิ่มหรือแทนที่ด้วยกฎที่อนุญาต path ใหม่ เช่น:

- path ที่ใช้จริง: `ConstructionControlData/root/{collection}/{document}`
- ตัวอย่างใน `firestore.rules`: อนุญาต read/write สำหรับผู้ใช้ที่ล็อกอินแล้ว (`request.auth != null`) — ถ้าเดิมมีกฎตาม role ให้ copy มาใส่แล้วปรับ path ให้ตรงกับ `ConstructionControlData/root/...`

### 4. Deploy แอป

หลังรัน migration แล้ว ให้ build และ deploy แอปเวอร์ชันที่อัปเดตแล้ว แอปจะอ่าน/เขียนจาก path ใหม่เท่านั้น

### 5. (ถ้าต้องการ) ลบข้อมูลเก่า

หลังจากทดสอบว่าแอปทำงานปกติกับ path ใหม่แล้ว ถ้าต้องการลบ collection เก่าที่ root ให้ลบจาก Firebase Console เอง (ไม่บังคับ)

---

## หมายเหตุ

- **ไม่มีการลบข้อมูลในสคริปต์** — มีแต่การคัดลอกจาก path เดิมไป path ใหม่
- ข้อมูลเดิมที่ root ยังอยู่จนกว่าคุณจะลบเอง
- ถ้ารัน migration ซ้ำ จะ overwrite เอกสารที่ path ใหม่ (ปลอดภัย)
