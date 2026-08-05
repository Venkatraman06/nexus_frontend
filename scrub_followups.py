import re

# FollowUpCreateModal.tsx
with open('src/pages/workspace/FollowUpCreateModal.tsx', 'r') as f:
    content = f.read()

content = re.sub(r'\{\s*value:\s*"MEETING",\s*label:\s*"Meeting",\s*icon:\s*<CalendarOutlined\s*/>\s*\},', '', content)
content = re.sub(r'const MEETING_MODE_OPTIONS = \[.*?\];', '', content, flags=re.DOTALL)
content = re.sub(r'function MeetingModePicker\(.*?\{.*?\}', '', content, flags=re.DOTALL)
content = re.sub(r'meeting_mode:\s*editItem\.meeting_mode\s*\|\|\s*null,', '', content)
content = re.sub(r'meeting_mode:\s*values\.type\s*===\s*"MEETING"\s*\?\s*\(values\.meeting_mode\s*\|\|\s*null\)\s*:\s*null,', '', content)
content = re.sub(r'\{selectedType\s*===\s*"MEETING"\s*&&\s*\(\s*<Form\.Item\s+name="meeting_mode".*?</Form\.Item>\s*\)\}', '', content, flags=re.DOTALL)

with open('src/pages/workspace/FollowUpCreateModal.tsx', 'w') as f:
    f.write(content)

# FollowUpDetailDrawer.tsx
with open('src/pages/followups/FollowUpDetailDrawer.tsx', 'r') as f:
    content = f.read()

content = content.replace('MEETING: <CalendarOutlined />,', '')
content = content.replace('qc.invalidateQueries({ queryKey: ["meetings-list"] });', '')

with open('src/pages/followups/FollowUpDetailDrawer.tsx', 'w') as f:
    f.write(content)

