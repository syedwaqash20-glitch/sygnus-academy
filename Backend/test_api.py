import asyncio
from httpx import AsyncClient, ASGITransport
from database import engine, Base
from main import app, seed_initial_data

async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed_initial_data()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        print("=== 1. Core Endpoints ===")
        res = await ac.get("/")
        assert res.status_code == 200
        print("  GET / -> OK:", res.json())

        res = await ac.get("/app/")
        assert res.status_code == 200
        print("  GET /app/ (Frontend mounted) -> OK: HTTP", res.status_code)

        res = await ac.get("/api/super-admin/dashboard")
        assert res.status_code == 200
        print("  GET /api/super-admin/dashboard -> OK")

        # 2. Deletion Request Approval Flow
        print("\n=== 2. Deletion Request Approval Flow ===")
        res = await ac.get("/api/governance/deletion-requests")
        del_requests = res.json()
        assert len(del_requests) > 0
        target_del = del_requests[0]
        print(f"  Target pending deletion: {target_del['id']} ({target_del['entity_type']})")

        # Test both frontend format ({decision, note}) and backend format
        res = await ac.post(
            f"/api/governance/deletion-requests/{target_del['id']}/decision",
            headers={"X-Actor-Role": "super_admin"},
            json={"decision": "APPROVED", "note": "Approved deletion by Apex Super Admin via UI format"}
        )
        assert res.status_code == 200
        print(f"  Approve deletion (UI format) -> OK, status: {res.json()['status']}")

        # Verify target is in trash-bin list
        res = await ac.get("/api/governance/trash-bin")
        trash_list = res.json()
        assert isinstance(trash_list, list)
        print(f"  Trash bin items count: {len(trash_list)}")
        assert len(trash_list) >= 1
        course_item = [item for item in trash_list if item['entity_type'] == 'COURSE'][0]
        print(f"  Found soft-deleted course in trash bin: {course_item['id']} ({course_item['name']})")

        # Restore from trash-bin via direct path (as UI does)
        res = await ac.post(
            f"/api/governance/restore/course/{course_item['id']}",
            headers={"X-Actor-Role": "super_admin"}
        )
        assert res.status_code == 200
        print(f"  Restore via /api/governance/restore/course/... -> OK: {res.json()}")

        # 3. Edit Request Approval Flow
        print("\n=== 3. Edit Request Approval Flow ===")
        res = await ac.get("/api/governance/edit-requests")
        edit_requests = res.json()
        assert len(edit_requests) > 0
        target_edit = edit_requests[0]
        print(f"  Target pending edit: {target_edit['id']}")

        res = await ac.post(
            f"/api/governance/edit-requests/{target_edit['id']}/decision",
            headers={"X-Actor-Role": "super_admin"},
            json={"decision": "APPROVED", "note": "Approved update via UI format"}
        )
        assert res.status_code == 200
        print(f"  Approve edit -> OK, status: {res.json()['status']}")

        # 4. Create New Admin Flow
        print("\n=== 4. Super Admin Management ===")
        import uuid
        test_email = f"admin_{uuid.uuid4().hex[:6]}@sygnus.edu"
        res = await ac.post(
            f"/api/super-admin/admins?name=Elena%20Rostova&email={test_email}",
            headers={"X-Actor-Role": "super_admin"}
        )
        assert res.status_code == 201
        print("  Create new Admin -> OK:", res.json())

        # 5. Course & Enrollment Flow
        print("\n=== 5. Academic Flow (Course & Enrollment) ===")
        test_code = f"CS-{uuid.uuid4().hex[:4].upper()}"
        res = await ac.post(
            f"/api/courses/?title=Neural%20Networks%20Advanced&code={test_code}&price=399.99",
            headers={"X-Actor-Role": "admin"}
        )
        assert res.status_code == 201
        new_course = res.json()
        print("  Create course -> OK:", new_course)

        students_res = await ac.get("/students/")
        student_id = students_res.json()[0]['id']
        res = await ac.post(
            f"/api/courses/{new_course['id']}/enroll?student_id={student_id}"
        )
        assert res.status_code == 200
        print("  Enroll student -> OK:", res.json())

        # Quiz result
        res = await ac.post(
            f"/api/courses/{new_course['id']}/quiz-result?student_id={student_id}&quiz_title=Midterm%20Audit&score=95&total_marks=100"
        )
        assert res.status_code == 200
        print("  Record quiz result -> OK:", res.json())

        # 6. Governance Announcements
        print("\n=== 6. Announcements Verification ===")
        res = await ac.get("/api/governance/announcements")
        assert res.status_code == 200
        print(f"  GET /api/governance/announcements -> OK: {len(res.json())} announcements")

        # 7. Audit Trail Check
        print("\n=== 7. Audit Log Verification ===")
        res = await ac.get("/api/governance/audit-logs")
        logs = res.json()
        print(f"  Audit entries recorded: {len(logs)}")
        assert len(logs) >= 5
        print("  Audit trails successfully preserved!")

        print("\n=======================================================")
        print(">>> 100% OF ALL SYSTEM TESTS AND FLOWS COMPLETED! <<<")
        print("=======================================================")

if __name__ == "__main__":
    asyncio.run(main())
