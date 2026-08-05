import re

with open('src/pages/workspace/FollowUpCreateModal.tsx', 'r') as f:
    content = f.read()

content = re.sub(r':\s*\{\s*value\?:\s*string\s*\|\s*null;\s*onChange\?:\s*\(v:\s*string\)\s*=>\s*void\s*\}\)\s*\{\s*return\s*\(\s*<div.*?</div>\s*\);\s*\}', '', content, flags=re.DOTALL)
with open('src/pages/workspace/FollowUpCreateModal.tsx', 'w') as f:
    f.write(content)

