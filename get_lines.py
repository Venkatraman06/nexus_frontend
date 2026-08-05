with open("/home/dharshini/Desktop/nexus_test/nexus_frontend/src/pages/employees/EmployeesPage.tsx") as f:
    lines = f.readlines()
for i, l in enumerate(lines):
    if "const canManage = usePermission" in l:
        print(f"{i}: {l.strip()}")
