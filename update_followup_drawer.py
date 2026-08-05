import re

with open("src/pages/followups/FollowUpDetailDrawer.tsx", "r") as f:
    content = f.read()

content_ui = """
      {item.description && extractCustomColor(item.description).cleanText && (
        <Section icon={<FileTextOutlined />} label="Description">
          <Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>{extractCustomColor(item.description).cleanText}</Paragraph>
        </Section>
      )}

      {item.content && extractCustomColor(item.content).cleanText && (
        <Section icon={<FileTextOutlined />} label="Content">
          <Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>{extractCustomColor(item.content).cleanText}</Paragraph>
        </Section>
      )}
"""

content = re.sub(r'      \{item\.description && extractCustomColor\(item\.description\)\.cleanText && \(\n        <Section icon=\{<FileTextOutlined />\} label="Description">\n          <Paragraph style=\{\{ marginBottom: 0, whiteSpace: "pre-wrap" \}\}>\{extractCustomColor\(item\.description\)\.cleanText\}</Paragraph>\n        </Section>\n      \)\}', content_ui, content, flags=re.DOTALL)

with open("src/pages/followups/FollowUpDetailDrawer.tsx", "w") as f:
    f.write(content)
