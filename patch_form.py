import re

with open('src/pages/expenses/ExpensesPage.tsx', 'r') as f:
    content = f.read()

# 1. Add state for pending files and Upload component imports
content = content.replace(
    'import { PaperClipOutlined } from "@ant-design/icons";',
    'import { PaperClipOutlined, UploadOutlined } from "@ant-design/icons";\nimport { Upload } from "antd";\nimport type { UploadFile } from "antd/es/upload/interface";'
)

content = content.replace(
    'const [attachModal, setAttachModal] = useState<{ open: boolean; id: string }>({ open: false, id: "" });',
    'const [attachModal, setAttachModal] = useState<{ open: boolean; id: string }>({ open: false, id: "" });\n  const [fileList, setFileList] = useState<UploadFile[]>([]);'
)

# 2. Modify createMut and updateMut to upload files
new_mutations = """  const createMut = useMutation({
    mutationFn: async (d: ExpenseCreate) => {
      const res = await expenseApi.create(d);
      for (const f of fileList) {
        if (f.originFileObj) {
          const fd = new FormData();
          fd.append("file", f.originFileObj);
          await expenseApi.uploadAttachment(res.id, fd);
        }
      }
      return res;
    },
    onSuccess: () => { message.success("Expense created"); setFileList([]); setModalOpen(false); invalidate(); },
    onError:   () => message.error("Failed to create expense"),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, d }: { id: string; d: Partial<ExpenseCreate> }) => {
      const res = await expenseApi.update(id, d);
      for (const f of fileList) {
        if (f.originFileObj) {
          const fd = new FormData();
          fd.append("file", f.originFileObj);
          await expenseApi.uploadAttachment(id, fd);
        }
      }
      return res;
    },
    onSuccess: () => { message.success("Expense updated"); setFileList([]); setModalOpen(false); invalidate(); },
    onError:   () => message.error("Failed to update expense"),
  });"""

# Replace existing mutations
content = re.sub(
    r'const createMut = useMutation\(\{.*?onError:\s*\(\)\s*=>\s*message\.error\("Failed to create expense"\),\s*\}\);.*?const updateMut = useMutation\(\{.*?onError:\s*\(\)\s*=>\s*message\.error\("Failed to update expense"\),\s*\}\);',
    new_mutations,
    content,
    flags=re.DOTALL
)

# Reset fileList on modal open
content = content.replace(
    'form.resetFields();',
    'form.resetFields();\n    setFileList([]);'
)
content = content.replace(
    'setEditing(row);',
    'setEditing(row);\n    setFileList([]);'
)

# 3. Add Upload component to the form
upload_field = """          <Form.Item label="Attachments (New)">
            <Upload
              multiple
              fileList={fileList}
              beforeUpload={(file) => {
                setFileList((prev) => [...prev, { uid: file.uid, name: file.name, status: 'done', originFileObj: file }]);
                return false; // prevent auto upload
              }}
              onRemove={(file) => {
                setFileList((prev) => prev.filter((item) => item.uid !== file.uid));
              }}
            >
              <Button icon={<UploadOutlined />}>Select Files</Button>
            </Upload>
            {editing && <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>Use the Attachments button in the table to view/delete existing files.</div>}
          </Form.Item>

          <Form.Item name="notes" label="Notes">"""

content = content.replace('<Form.Item name="notes" label="Notes">', upload_field)

with open('src/pages/expenses/ExpensesPage.tsx', 'w') as f:
    f.write(content)
