import re

# PATCH ClientPage.tsx
with open('src/pages/clients/ClientPage.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'const [modalOpen, setModalOpen] = useState(false);',
    'const [modalOpen, setModalOpen] = useState(false);\n\n  useEffect(() => {\n    if (new URLSearchParams(window.location.search).get("action") === "new") {\n      openCreate();\n    }\n  }, []);'
)
content = content.replace('import React, { useState } from "react";', 'import React, { useState, useEffect } from "react";')

with open('src/pages/clients/ClientPage.tsx', 'w') as f:
    f.write(content)

# PATCH ProjectsPage.tsx
with open('src/pages/projects/ProjectsPage.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'const [modalOpen, setModalOpen] = useState(false);',
    'const [modalOpen, setModalOpen] = useState(false);\n\n  useEffect(() => {\n    if (new URLSearchParams(window.location.search).get("action") === "new") {\n      openCreate();\n    }\n  }, []);'
)
content = content.replace('import React, { useState } from "react";', 'import React, { useState, useEffect } from "react";')

with open('src/pages/projects/ProjectsPage.tsx', 'w') as f:
    f.write(content)

