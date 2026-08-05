import re

with open('src/pages/workspace/MeetingCreateModal.tsx', 'r') as f:
    content = f.read()

# Remove meetingTypeApi import
content = re.sub(r',\s*meetingTypeApi\s*', '', content)
content = re.sub(r'import\s+\{\s*meetingTypeApi\s*\}\s+from\s+[\'"]@/services/master[\'"];?', '', content)

# Remove TYPE_OPTIONS, allTypeOptions, createTypeMutation
content = re.sub(r'const\s+\{\s*data:\s*customFollowupTypes.*?\}\s*=\s*useQuery\(\{.*?\}\);', '', content, flags=re.DOTALL)
content = re.sub(r'const\s+allTypeOptions\s*=\s*useMemo\(\(\)\s*=>\s*\{.*?\},\s*\[customFollowupTypes\]\);', '', content, flags=re.DOTALL)
content = re.sub(r'const\s+createTypeMutation\s*=\s*useMutation\(\{.*?\}\);', '', content, flags=re.DOTALL)

# Remove type related effects
content = re.sub(r'const initialType = defaultType \|\| "CALL";\s*form\.setFieldsValue\(\{ type: initialType \}\);', '', content, flags=re.DOTALL)

with open('src/pages/workspace/MeetingCreateModal.tsx', 'w') as f:
    f.write(content)
