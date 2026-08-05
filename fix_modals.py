import re

def fix_modal(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Remove type-related stuff in MeetingCreateModal & Drawer
    content = re.sub(r'const TYPE_OPTIONS.*?;', '', content, flags=re.DOTALL)
    content = re.sub(r'<Form\.Item\s+name="type".*?</Form\.Item>', '', content, flags=re.DOTALL)
    content = re.sub(r'FOLLOWUP_PRIORITIES', 'MEETING_PRIORITIES', content)
    content = re.sub(r'import\s+\{\s*.*?FOLLOWUP_PRIORITIES.*?\s*\}\s+from\s+[\'"]@/services/followups[\'"];?', 'import { MEETING_PRIORITIES, meetingApi, MeetingItem, MeetingCreate } from "@/services/meetings";', content)

    with open(file_path, 'w') as f:
        f.write(content)

fix_modal('src/pages/workspace/MeetingCreateModal.tsx')
fix_modal('src/pages/workspace/MeetingDetailDrawer.tsx')
