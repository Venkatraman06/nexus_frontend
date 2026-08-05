import re

with open('src/pages/projects/ProjectFormPage.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'You can now safely close this tab and return to your original page.',
    'The project has been created. You can now go back to your original page.'
)
content = content.replace(
    '<Button size="large" onClick={() => window.close()}>Close Tab</Button>',
    '<Button size="large" onClick={() => window.history.back()}>Go Back</Button>'
)

with open('src/pages/projects/ProjectFormPage.tsx', 'w') as f:
    f.write(content)
