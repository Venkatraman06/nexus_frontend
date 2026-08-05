import re

def patch_layout_zindex():
    with open('src/components/layout/AppLayout.tsx', 'r') as f:
        content = f.read()

    # We need to replace the way it renders inside <Content>
    # Currently it's:
    # <div style={{ display: (showAddClient || showAddProject) ? "none" : "block" }}>
    #   <Outlet />
    # </div>
    # {showAddClient && <ClientFormPage />}
    # {showAddProject && <ProjectFormPage />}
    
    old_content = """<div style={{ display: (showAddClient || showAddProject) ? "none" : "block" }}>
            <Outlet />
          </div>
          {showAddClient && <ClientFormPage />}
          {showAddProject && <ProjectFormPage />}"""

    new_content = """<Outlet />
          {(showAddClient || showAddProject) && (
            <div style={{
              position: 'fixed',
              top: 64,
              left: isMobile ? 0 : (siderExpanded ? 240 : 64),
              right: 0,
              bottom: 0,
              zIndex: 2000,
              background: pageBg,
              overflow: 'auto',
              padding: 24,
            }}>
              {showAddClient && <ClientFormPage />}
              {showAddProject && <ProjectFormPage />}
            </div>
          )}"""

    if old_content in content:
        content = content.replace(old_content, new_content)
    else:
        print("Warning: old_content not found. Let's try regex.")
        content = re.sub(r'<div style=\{\{ display: \(showAddClient \|\| showAddProject\) \? "none" : "block" \}\}>\s*<Outlet />\s*</div>\s*\{showAddClient && <ClientFormPage />\}\s*\{showAddProject && <ProjectFormPage />\}', new_content, content)

    with open('src/components/layout/AppLayout.tsx', 'w') as f:
        f.write(content)

patch_layout_zindex()
