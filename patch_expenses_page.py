import re

with open('src/pages/expenses/ExpensesPage.tsx', 'r') as f:
    content = f.read()

# 1. Add imports
content = content.replace(
    'import ExpenseStatusTag from "@/components/common/ExpenseStatusTag";',
    'import ExpenseStatusTag from "@/components/common/ExpenseStatusTag";\nimport ExpenseAttachmentsModal from "./ExpenseAttachmentsModal";\nimport { PaperClipOutlined } from "@ant-design/icons";'
)

# 2. Add state
content = content.replace(
    'const [rejectModal, setRejectModal] = useState<{ open: boolean; id: string }>({ open: false, id: "" });',
    'const [rejectModal, setRejectModal] = useState<{ open: boolean; id: string }>({ open: false, id: "" });\n  const [attachModal, setAttachModal] = useState<{ open: boolean; id: string }>({ open: false, id: "" });'
)

# 3. Add Attachments button for DRAFT status
draft_btn = """              <Tooltip title="Attachments">
                <Button size="small" icon={<PaperClipOutlined />} onClick={() => setAttachModal({ open: true, id: row.id })} />
              </Tooltip>
              <Tooltip title="Edit">"""
content = content.replace('              <Tooltip title="Edit">', draft_btn, 1)

# Add Attachments button for non-DRAFT statuses? We should let anyone view attachments anytime.
# Actually, let's put it outside the conditional blocks in the actions column so it's always available!
# Look at lines 215-216:
#           {row.status === "DRAFT" && (
# Let's insert it right after `<Space size={4} wrap>`
content = content.replace(
    '<Space size={4} wrap>',
    '<Space size={4} wrap>\n          <Tooltip title="Attachments">\n            <Button size="small" icon={<PaperClipOutlined />} onClick={() => setAttachModal({ open: true, id: row.id })} />\n          </Tooltip>'
)

# Since we put it outside, remove the one we just added to DRAFT
content = content.replace(draft_btn, '              <Tooltip title="Edit">')

# 4. Add the component at the end
component = """      <ExpenseAttachmentsModal
        open={attachModal.open}
        expenseId={attachModal.id || null}
        onClose={() => setAttachModal({ open: false, id: "" })}
      />
    </div>
  );
}"""

content = content.replace('    </div>\n  );\n}', component)

with open('src/pages/expenses/ExpensesPage.tsx', 'w') as f:
    f.write(content)
