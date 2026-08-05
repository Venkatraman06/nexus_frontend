import re

with open('src/pages/projects/ProjectsPage.tsx', 'r') as f:
    content = f.read()

# Replace existing dropdownRender for client
pattern = r'dropdownRender=\{\(menu\) => \([\s\S]*?Create New Client\s*</Button>\s*</div>\s*</>\s*\)\}'
replacement = 'dropdownRender={renderClientDropdown}'
content = re.sub(pattern, replacement, content)

if 'import { renderClientDropdown' not in content:
    content = 'import { renderClientDropdown } from "@/components/common/DropdownRenderers";\n' + content

with open('src/pages/projects/ProjectsPage.tsx', 'w') as f:
    f.write(content)
