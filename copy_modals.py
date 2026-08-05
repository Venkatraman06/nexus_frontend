import os

def process_file(src, dest):
    with open(src, 'r') as f:
        content = f.read()

    # Replace specific follow up things with meeting
    content = content.replace('FollowUpItem', 'MeetingItem')
    content = content.replace('FollowUp', 'Meeting')
    content = content.replace('followUpApi', 'meetingApi')
    content = content.replace('follow-up', 'meeting')
    content = content.replace('follow up', 'meeting')
    content = content.replace('Follow-up', 'Meeting')
    content = content.replace('Follow up', 'Meeting')
    content = content.replace('FOLLOWUP', 'MEETING')
    content = content.replace('followup', 'meeting')

    with open(dest, 'w') as f:
        f.write(content)

process_file('src/pages/followups/FollowUpDetailDrawer.tsx', 'src/pages/workspace/MeetingDetailDrawer.tsx')
process_file('src/pages/workspace/FollowUpCreateModal.tsx', 'src/pages/workspace/MeetingCreateModal.tsx')
