import re

with open("/home/dharshini/Desktop/nexus_test/nexus_frontend/src/pages/employees/EmployeesPage.tsx") as f:
    text = f.read()

print("EmployeeTable actions:")
lines = text.split('\n')
for i, line in enumerate(lines):
    if "key: \"action\"," in line:
        print("\n".join(lines[i:i+20]))
        break
