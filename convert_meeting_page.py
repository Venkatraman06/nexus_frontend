import re

with open('src/pages/workspace/MeetingsPage.tsx', 'r') as f:
    orig = f.read()

# We need to construct a new MeetingsPage.tsx based on FollowUpsPage.tsx,
# but keeping the mode filters and the existing table from MeetingsPage.tsx.
