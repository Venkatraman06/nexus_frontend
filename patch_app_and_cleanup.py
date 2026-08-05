import re

# Patch App.tsx
with open('src/App.tsx', 'r') as f:
    app_content = f.read()

imports_to_add = """import ClientFormPage from "@/pages/clients/ClientFormPage";
import ProjectFormPage from "@/pages/projects/ProjectFormPage";
"""
# Insert before "import ClientPage"
app_content = app_content.replace('import ClientPage from "@/pages/clients/ClientPage";', imports_to_add + 'import ClientPage from "@/pages/clients/ClientPage";')

routes_to_add = """        <Route path="clients/new" element={<RequirePermission permission={PERMS.PROJECT_CLIENT_VIEW}><ClientFormPage /></RequirePermission>} />
        <Route path="projects/new" element={<RequirePermission permission={PERMS.PROJECT_VIEW}><ProjectFormPage /></RequirePermission>} />
"""
app_content = app_content.replace('<Route path="clients" element={<RequirePermission permission={PERMS.PROJECT_CLIENT_VIEW}><ClientPage /></RequirePermission>} />',
    routes_to_add + '        <Route path="clients" element={<RequirePermission permission={PERMS.PROJECT_CLIENT_VIEW}><ClientPage /></RequirePermission>} />')

with open('src/App.tsx', 'w') as f:
    f.write(app_content)

# Cleanup ProjectsPage.tsx
with open('src/pages/projects/ProjectsPage.tsx', 'r') as f:
    p_content = f.read()

p_content = re.sub(r'  useEffect\(\(\) => \{\n    if \(new URLSearchParams\(window\.location\.search\)\.get\("action"\) === "new"\) \{\n      openCreate\(\);\n    \}\n  \}, \[\]\);\n', '', p_content)
with open('src/pages/projects/ProjectsPage.tsx', 'w') as f:
    f.write(p_content)

# Cleanup ClientPage.tsx
with open('src/pages/clients/ClientPage.tsx', 'r') as f:
    c_content = f.read()

c_content = re.sub(r'  useEffect\(\(\) => \{\n    if \(new URLSearchParams\(window\.location\.search\)\.get\("action"\) === "new"\) \{\n      openCreate\(\);\n    \}\n  \}, \[\]\);\n', '', c_content)
with open('src/pages/clients/ClientPage.tsx', 'w') as f:
    f.write(c_content)

