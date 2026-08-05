import re

with open('src/pages/followups/FollowUpsPage.tsx', 'r') as f:
    content = f.read()

# Replace FollowUp stuff with Meeting
content = content.replace('FollowUpItem', 'MeetingItem')
content = content.replace('FollowUp', 'Meeting')
content = content.replace('followUpApi', 'meetingApi')
content = content.replace('follow-up', 'meeting')
content = content.replace('follow up', 'meeting')
content = content.replace('Follow-up', 'Meeting')
content = content.replace('Follow up', 'Meeting')
content = content.replace('FOLLOWUP', 'MEETING')
content = content.replace('followup', 'meeting')
content = content.replace('FollowUpsPage', 'MeetingsPage')
content = content.replace('MeetingssPage', 'MeetingsPage')
content = content.replace('MeetingCreateModal', 'MeetingCreateModal')
content = content.replace('MeetingDetailDrawer', 'MeetingDetailDrawer')

# Remove TYPE_OPTIONS because meetings don't have types like Call, WhatsApp, etc.
content = re.sub(r'const TYPE_OPTIONS = \[.*?\];', '', content, flags=re.DOTALL)
# Remove TypeIcon function
content = re.sub(r'function TypeIcon.*?return.*?;.*?\}', '', content, flags=re.DOTALL)

# In MeetingCard (was FollowUpCard), remove type rendering and add Mode
content = re.sub(r'<span className="kanban-card__type">.*?</span>', r'<span className="kanban-card__type">{item.meeting_mode ? (item.meeting_mode === "ONLINE" ? "Online" : "Offline") : "Meeting"}</span>', content, flags=re.DOTALL)

with open('src/pages/workspace/MeetingsPage.tsx', 'w') as f:
    f.write(content)

