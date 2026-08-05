import os

with open('src/services/followups.ts', 'r') as f:
    content = f.read()

content = content.replace('FollowUpItem', 'MeetingItem')
content = content.replace('FollowUp', 'Meeting')
content = content.replace('followUpApi', 'meetingApi')
content = content.replace('/followups/', '/meetings/')
content = content.replace('FOLLOWUP_', 'MEETING_')
content = content.replace('followup', 'meeting')

with open('src/services/meetings.ts', 'w') as f:
    f.write(content)

